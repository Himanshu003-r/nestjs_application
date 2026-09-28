import { Injectable } from '@nestjs/common';
import { NotificationService } from '../service/notification.service';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderShippedEvent } from 'src/events/order-shipped.event';
import { NotificationType } from '@prisma/client';

@Injectable()
export class OrderShippedListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('order.shipped')
  async handleOrderShippedEvent(payload: OrderShippedEvent) {
    await this.notificationService.createNotification(
      payload.userId,
      NotificationType.ORDER,
      'Order shipped',
      `Your order ${payload.orderId} has been shipped.`,
    );
  }
}
