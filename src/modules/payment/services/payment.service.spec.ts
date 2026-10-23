jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class EventEmitter2 {},
}));
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from './payment.service';
import { RazorpayService } from './razorpay.service';
import {jest, expect} from '@jest/globals'

describe('PaymentService', () => {
  let service: PaymentService;
  let prisma: any;
  let tx: any;
  let razorpayService: any;
  let eventEmitter: any;

  const userId = 'user-1';
//   const EVENT_EMITTER = 'EVENT_EMITTER';

  const order = {
    id: 'order-1',
    userId,
    totalAmount: 100,
    status: OrderStatus.PENDING,
  };

  const payment = {
    id: 'payment-1',
    orderId: order.id,
    amount: 100,
    status: PaymentStatus.PENDING,
    razorpayOrderId: 'rzp-order-1',
  };

  beforeEach(async () => {
    tx = {
      payment: {
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      order: {
        update: jest.fn(),
      },
      product: {
        update: jest.fn(),
      },
    };

    prisma = {
      order: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        update: jest.fn(),
      },
      $transaction: jest.fn((callback: (transaction: any) => Promise<any>) =>
        callback(tx),
      ),
    };

    razorpayService = {
      createOrder: jest.fn(),
      getKeyId: jest.fn(),
      verifyPaymentSignature: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: prisma },
        { provide: RazorpayService, useValue: razorpayService },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    const dto = {
      orderId: order.id,
      paymentMethod: 'CARD',
    };

    it('creates a payment for a pending order', async () => {
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.payment.findUnique.mockResolvedValue(null);

      razorpayService.createOrder.mockResolvedValue({
        id: 'rzp-order-1',
        currency: 'INR',
      });
      razorpayService.getKeyId.mockReturnValue('rzp-test-key');

      prisma.payment.create.mockResolvedValue(payment);

      const result = await service.createPayment(userId, dto as any);

      expect(razorpayService.createOrder).toHaveBeenCalledWith(10000, order.id);
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(result.data.amount).toBe(10000);
      expect(result.data.keyId).toBe('rzp-test-key');
    });

    it('rejects an order that does not exist', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.createPayment(userId, dto as any)).rejects.toThrow(
        NotFoundException,
      );

      expect(razorpayService.createOrder).not.toHaveBeenCalled();
    });

    it('rejects payment creation for a non-pending order', async () => {
      prisma.order.findFirst.mockResolvedValue({
        ...order,
        status: OrderStatus.CONFIRMED,
      });

      await expect(service.createPayment(userId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a duplicate payment for the same order', async () => {
      prisma.order.findFirst.mockResolvedValue(order);
      prisma.payment.findUnique.mockResolvedValue(payment);

      await expect(service.createPayment(userId, dto as any)).rejects.toThrow(
        ConflictException,
      );

      expect(razorpayService.createOrder).not.toHaveBeenCalled();
    });
  });

  describe('confirmPayment', () => {
    const dto = {
      razorpay_order_id: 'rzp-order-1',
      razorpay_payment_id: 'rzp-payment-1',
      razorpay_signature: 'valid-signature',
    };

    beforeEach(() => {
      prisma.payment.findFirst.mockResolvedValue(payment);
      razorpayService.verifyPaymentSignature.mockReturnValue(true);
      tx.payment.updateMany.mockResolvedValue({ count: 1 });
      tx.order.update.mockResolvedValue({
        ...order,
        status: OrderStatus.CONFIRMED,
      });
    });

    it('confirms payment and updates the order', async () => {
      const result = await service.confirmPayment(userId, dto as any);

      expect(tx.payment.updateMany).toHaveBeenCalledWith({
        where: {
          id: payment.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.SUCCESS,
          razorpayPaymentId: dto.razorpay_payment_id,
          razorpaySignature: dto.razorpay_signature,
        },
      });

      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'payment.success',
        expect.anything(),
      );
      expect(result.message).toBe('Payment confirmed successfully');
    });

    it('rejects confirmation when payment is not found', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.confirmPayment(userId, dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects an invalid Razorpay signature', async () => {
      razorpayService.verifyPaymentSignature.mockReturnValue(false);

      await expect(service.confirmPayment(userId, dto as any)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('rejects a payment that is no longer pending', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        ...payment,
        status: PaymentStatus.SUCCESS,
      });

      await expect(service.confirmPayment(userId, dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not emit the success event if payment was already processed concurrently', async () => {
      tx.payment.updateMany.mockResolvedValue({ count: 0 });
      tx.payment.findUnique.mockResolvedValue({
        ...payment,
        status: PaymentStatus.SUCCESS,
      });

      const result = await service.confirmPayment(userId, dto as any);

      expect(result.data.message).toBe('Payment already successful');
      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(tx.order.update).not.toHaveBeenCalled();
    });
  });

  describe('getPayment', () => {
    it('returns a payment belonging to the user', async () => {
      prisma.payment.findFirst.mockResolvedValue(payment);

      const result = await service.getPayment(userId, payment.id);

      expect(result.data).toEqual(payment);
      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: {
          id: payment.id,
          order: { userId },
        },
        include: { order: true },
      });
    });

    it('throws when the payment does not exist or is not owned by the user', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.getPayment(userId, 'unknown-payment'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('paymentRefund', () => {
    const refundablePayment = {
      ...payment,
      status: PaymentStatus.SUCCESS,
      order: {
        ...order,
        orderItem: [
          { productId: 'product-1', quantity: 2 },
          { productId: 'product-2', quantity: 1 },
        ],
      },
    };

    it('refunds a successful payment, restores stock and cancels the order', async () => {
      prisma.payment.findFirst.mockResolvedValue(refundablePayment);
      tx.payment.update.mockResolvedValue({
        ...payment,
        status: PaymentStatus.REFUNDED,
      });

      const result = await service.paymentRefund(userId, payment.id);

      expect(tx.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
      });

      expect(tx.product.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'product-1' },
        data: { stock: { increment: 2 } },
      });

      expect(tx.product.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'product-2' },
        data: { stock: { increment: 1 } },
      });

      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      expect(result.message).toBe('Payment refunded successfully');
    });

    it('rejects a payment that does not exist', async () => {
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.paymentRefund(userId, payment.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a payment that has already been refunded', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        ...refundablePayment,
        status: PaymentStatus.REFUNDED,
      });

      await expect(service.paymentRefund(userId, payment.id)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects refunding a payment that was not successful', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        ...refundablePayment,
        status: PaymentStatus.PENDING,
      });

      await expect(service.paymentRefund(userId, payment.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleWebhook', () => {
    it('processes a payment.captured webhook', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment);
      tx.payment.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.handleWebhook(
        'payment.captured',
        payment.razorpayOrderId,
        'rzp-payment-1',
      );

      expect(tx.payment.updateMany).toHaveBeenCalledWith({
        where: {
          id: payment.id,
          status: PaymentStatus.PENDING,
        },
        data: {
          status: PaymentStatus.SUCCESS,
          razorpayPaymentId: 'rzp-payment-1',
        },
      });

      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });

      expect(result.message).toBe('Payment captured successfully');
    });

    it('does not process a captured payment twice', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        ...payment,
        status: PaymentStatus.SUCCESS,
      });

      const result = await service.handleWebhook(
        'payment.captured',
        payment.razorpayOrderId,
        'rzp-payment-1',
      );

      expect(result.message).toBe('Payment already processed');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('marks a payment as failed from a payment.failed webhook', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment);
      prisma.payment.update.mockResolvedValue({
        ...payment,
        status: PaymentStatus.FAILED,
      });

      const result = await service.handleWebhook(
        'payment.failed',
        payment.razorpayOrderId,
        'rzp-payment-1',
      );

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          razorpayPaymentId: 'rzp-payment-1',
        },
      });

      expect(result.message).toBe('Payment transaction failed');
    });

    it('returns an unhandled-event message for unknown events', async () => {
      prisma.payment.findUnique.mockResolvedValue(payment);

      const result = await service.handleWebhook(
        'some.unknown.event',
        payment.razorpayOrderId,
        'rzp-payment-1',
      );

      expect(result.message).toBe('Unhandled event: some.unknown.event');
      expect(prisma.payment.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
