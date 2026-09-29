import { Injectable } from '@nestjs/common';
import { NotificationService } from '../service/notification.service';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderShippedEvent } from 'src/events/order-shipped.event';
import { NotificationType } from '@prisma/client';

@Injectable()
export class OrderCompletedListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('order.completed')
  async handleOrderCompletEvent(payload: OrderShippedEvent) {
    await this.notificationService.createNotification(
      payload.userId,
      NotificationType.ORDER,
      'Order completed',
      `Your order ${payload.orderId} has been delivered successfully.`,
    );
  }
}
