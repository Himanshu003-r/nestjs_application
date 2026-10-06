import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { PaymentRefundEvent } from 'src/events/payment-refunded.event';
import { NotificationService } from '../service/notification.service';

@Injectable()
export class PaymentRefundedListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('payment.refunded')
  async handlePaymentRefundedEvent(payload: PaymentRefundEvent) {
    await this.notificationService.createNotification(
      payload.userId,
      NotificationType.PAYMENT,
      'Payment refunded',
      `Your payment for order ${payload.orderId} has been refunded.`,
    );
  }
}
