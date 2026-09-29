import { Injectable } from '@nestjs/common';
import { NotificationService } from '../service/notification.service';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCancelledEvent } from 'src/events/order-cancelled.event';
import { NotificationType } from '@prisma/client';

@Injectable()
export class OrderCancelListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('order.cancelled')
  async handleOrderCancelEvent(payload: OrderCancelledEvent) {
    await this.notificationService.createNotification(
      payload.userId,
      NotificationType.ORDER,
      'Order cancelled',
      `Your order ${payload.orderId} has been cancelled.`,
    );
  }
}
