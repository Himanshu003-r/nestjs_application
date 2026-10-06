import { Injectable } from '@nestjs/common';
import { NotificationService } from '../service/notification.service';
import { OnEvent } from '@nestjs/event-emitter';
import { PaymentSuccessEvent } from 'src/events/payment-success.event';
import { NotificationType } from '@prisma/client';

@Injectable()
export class PaymentSuccessListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('payment.success')
  async handlePaymentSuccessEvent(payload: PaymentSuccessEvent) {
    await this.notificationService.createNotification(
      payload.userId,
      NotificationType.PAYMENT,
      'Payment success',
      `Your payment for order ${payload.orderId} has been made successfully`,
    );
  }
}
