import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddToCartDto } from '../dto/add-to-cart.dto';
import { CartItem } from '@prisma/client';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prismaService: PrismaService) {}

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const { productId, quantity } = addToCartDto;

    const product = await this.prismaService.product.findFirst({
      where: { id: productId, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product with id does not exist');
    }

    if (quantity > product.stock) {
      throw new BadRequestException(
        'Requested quantity exceeds available stock. Please reduce the quantity.',
      );
    }

    let cart = await this.prismaService.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prismaService.cart.create({
        data: { userId },
      });
    }

    const existingCartItem = await this.prismaService.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: cart.id, productId: product.id },
      },
    });

    let cartItem: CartItem;

    if (existingCartItem) {
      const newQuantity = existingCartItem.quantity + quantity;

      if (newQuantity > product.stock) {
        throw new BadRequestException(
          'Requested quantity exceeds available stock',
        );
      }

      cartItem = await this.prismaService.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      cartItem = await this.prismaService.cartItem.create({
        data: { cartId: cart.id, productId: product.id, quantity },
      });
    }

    return {
      data: cartItem,
      message: 'Product added to cart successfully',
    };
  }

  async getCart(userId: string) {
    const cart = await this.prismaService.cart.findFirst({
      where: { userId: userId },
      include: {
        cartItem: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart does not exist');
    }

    return {
      data: cart,
    };
  }

  async updateCartItem(
    userId: string,
    cartItemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const { quantity } = updateCartItemDto;

    const cart = await this.prismaService.cart.findUnique({
      where: { userId: userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart does not exist');
    }

    const cartItem = await this.prismaService.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item does not exist');
    }

    const product = await this.prismaService.product.findFirst({
      where: {
        id: cartItem.productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product does not exist');
    }

    if (quantity > product.stock) {
      throw new BadRequestException(
        'Requested quantity exceeds available stock',
      );
    }

    const updateCartItem = await this.prismaService.cartItem.update({
      where: { id: cartItem.id },
      data: { quantity },
    });

    return {
      data: updateCartItem,
      message: 'Cart data updated successfully',
    };
  }

  async deleteCartItem(userId: string, cartItemId: string) {
    const cart = await this.prismaService.cart.findUnique({
      where: { userId: userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart does not exist');
    }

    const cartItem = await this.prismaService.cartItem.findFirst({
      where: {
        id: cartItemId,
        cartId: cart.id,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item does not exist');
    }

    await this.prismaService.cartItem.delete({
      where: { id: cartItem.id },
    });

    return {
      message: 'Cart item deleted successfully',
    };
  }
}
