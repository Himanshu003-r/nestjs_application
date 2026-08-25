import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

        await tx.product.update({
          where: {
            id: cartItem.productId,
          },
          data: {
            stock: {
              decrement: cartItem.quantity,
            },
          },
        });
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
}
