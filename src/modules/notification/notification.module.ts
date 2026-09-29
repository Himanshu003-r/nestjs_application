import { Module } from '@nestjs/common';
import { NotificationService } from './service/notification.service';
import { NotificationController } from './controller/notification.controller';
import { OrderCreatedListener } from './listeners/order-created.listener';
import { OrderShippedListener } from './listeners/order-shipped.listener';
import { OrderCompletedListener } from './listeners/order-completed.listener';
import { OrderCancelListener } from './listeners/order-cancel.listener';

@Module({
  providers: [NotificationService, OrderCreatedListener, OrderShippedListener, OrderCompletedListener,OrderCancelListener],
  controllers: [NotificationController],
})
export class NotificationModule {}
