import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId: userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart does not exist');
    }

    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: true },
    });

    if (cartItems.length === 0) {
      throw new NotFoundException('No cart items found');
    }

    let totalAmount = new Prisma.Decimal(0);

    for (const cartItem of cartItems) {
      const product = cartItem.product;

      if (!product.isActive) {
        throw new BadRequestException('Product is not active');
      }

      if (cartItem.quantity > product.stock) {
        throw new BadRequestException('Insufficient stock for product');
      }

      const totalItem = product.price.mul(cartItem.quantity);

      totalAmount = totalAmount.add(totalItem);
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
        },
      });

      for (const cartItem of cartItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            price: cartItem.product.price,
          },
        });

        const updatedProduct = await tx.product.updateMany({
          where: {
            id: cartItem.productId,
            stock: {
              gte: cartItem.quantity,
            },
          },
          data: {
            stock: {
              decrement: cartItem.quantity,
            },
          },
        });

        if (updatedProduct.count === 0) {
          throw new BadRequestException('Insufficient stock for product');
        }
      }

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return order;
    });

    return {
      data: order,
      message: 'Order created successfully',
    };
  }

  async getOrders(userId: string, paginationQueryDto: PaginationQueryDto) {
    const { page, limit } = paginationQueryDto;
    const skip = (page - 1) * limit;

    const [total, orders] = await Promise.all([
      this.prisma.order.count({
        where: { userId: userId },
      }),
      this.prisma.order.findMany({
        where: { userId: userId },
        include: {
          orderItem: {
            include: { product: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (orders.length === 0) {
      throw new NotFoundException('No order found');
    }

    const totalPages = Math.ceil(total / limit);

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
      message: 'Order fetched successfully',
    };
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: userId },
      include: {
        orderItem: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order does not exist');
    }

    return {
      data: order,
      message: 'Order fetched successfully',
    };
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { orderItem: true },
    });

    if (!order) {
      throw new NotFoundException('Order does not exist');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending order can be cancelled');
    }

    const cancel = await this.prisma.$transaction(async (tx) => {
      for (const orderItem of order.orderItem) {
        await tx.product.update({
          where: { id: orderItem?.productId },
          data: {
            stock: {
              increment: orderItem?.quantity,
            },
          },
        });
      }

      const updateOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });

      return updateOrder;
    });

    return {
      data: cancel,
      message: 'Order cancelled successfully',
    };
  }

  async shipOrder(orderId: string){
   const order = await this.prisma.order.findFirst({
    where:{id: orderId}
   })

   if(!order){
    throw new NotFoundException('Order does not exist')
   }

   if(order.status !== OrderStatus.CONFIRMED){
    throw new BadRequestException('Order cannot be shipped')
   }

   const updateOrderStatus = await this.prisma.order.update({
    where:{id: order.id},
    data:{
      status: OrderStatus.SHIPPED
    }
   })

   return{
    data: updateOrderStatus,
    message: 'Order status updated successfully'
   }
  }

  async completeOrder(orderId: string){
    const order = await this.prisma.order.findFirst({
      where:{id: orderId}
    })

    if(!order){
      throw new NotFoundException('Order does not exist')
    }

    if(order.status !== OrderStatus.SHIPPED){
      throw new BadRequestException('Order cannot be completed')
    }

    const updateOrder = await this.prisma.order.update({
      where:{id: order.id},
      data:{
        status: OrderStatus.COMPLETED
      }
    })

    return{
      data: updateOrder,
      message: 'Order status updated successfully'
    }
  }
}

