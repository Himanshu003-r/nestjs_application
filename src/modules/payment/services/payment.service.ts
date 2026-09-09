import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { RazorpayService } from './razorpay.service';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
  ) {}

  async createPayment(userId: string, createPaymentDto: CreatePaymentDto) {
    const { orderId, paymentMethod } = createPaymentDto;

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: userId },
    });

    if (!order) {
      throw new NotFoundException('Order does not exist');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Payment cannot be created for this order');
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: {
        orderId,
      },
    });

    if (existingPayment) {
      throw new ConflictException('Payment already exists for this order');
    }

    // Conversion to paisa
    const amount = Math.round(Number(order.totalAmount) * 100);
    const razorpayOrder = await this.razorpayService.createOrder(
      amount,
      order.id,
    );

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod,
        razorpayOrderId: razorpayOrder.id,
      },
    });

    return {
      data: {
        paymentId: payment.id,
        razorpayOrderId: payment.razorpayOrderId,
        amount,
        currency: razorpayOrder.currency,
        keyId: this.razorpayService.getKeyId(),
      },
      message: 'Payment created successfully',
    };
  }

  async confirmPayment(userId: string, verifyPaymentDto: VerifyPaymentDto) {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      verifyPaymentDto;

    const payment = await this.prisma.payment.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        order: {
          userId,
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('No payment found');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment cannot be confirmed');
    }

    const isValid = this.razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CONFIRMED,
        },
      });

      return updatedPayment;
    });

    return {
      data: result,
      message: 'Payment confirmed successfully',
    };
  }

  async getPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        order: {
          userId,
        },
      },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment does not exist');
    }

    return {
      data: payment,
      message: 'Payment fetched successfully',
    };
  }

  async paymentRefund(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, order: { userId } },
      include: { order: { include: { orderItem: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      throw new ConflictException('Cannot refund already refunded payment');
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException('Cannot refund for payment');
    }

    const refundPayment = await this.prisma.$transaction(async (tx) => {
      // Refund the payment
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.REFUNDED,
        },
      });

      // Increment the stock for the refunded purchase
      for (const orderItem of payment.order.orderItem) {
        await tx.product.update({
          where: { id: orderItem.productId },
          data: {
            stock: {
              increment: orderItem.quantity,
            },
          },
        });
      }

      // Update the order as cancelled
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });

      return updatedPayment;
    });

    return {
      data: refundPayment,
      message: 'Payment refunded successfully',
    };
  }

  async handleWebhook(razorpayOrderId: string, razorpayPaymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        razorpayOrderId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found for Razorpay order');
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        message: 'Payment already processed',
      };
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment cannot be marked as successful');
    }

    // database update
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.SUCCESS,
          razorpayPaymentId,
        },
      });

      await tx.order.update({
        where: {
          id: payment.orderId,
        },
        data: {
          status: OrderStatus.CONFIRMED,
        },
      });

      return updatedPayment;
    });

    return {
      data: result,
      message: 'Payment captured successfully',
    };
  }
}
