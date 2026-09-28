import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderCreatedEvent } from 'src/events/order-created.event';
import { NotificationService } from '../service/notification.service';
import { NotificationType } from '@prisma/client';

@Injectable()
export class OrderCreatedListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent('order.created')
  async handleOrderCreatedListner(payload: OrderCreatedEvent) {
    await this.notificationService.createNotification(
      payload.userId,
      NotificationType.ORDER,
      'Order placed',
      `Your order ${payload.orderId} has been placed successfully.`,
    );
  }
}
