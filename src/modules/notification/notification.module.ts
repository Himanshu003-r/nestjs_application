import { Module } from '@nestjs/common';
import { NotificationService } from './service/notification.service';
import { NotificationController } from './controller/notification.controller';
import { OrderCreatedListener } from './listeners/order-created.listener';
import { OrderShippedListener } from './listeners/order-shipped.listener';

@Module({
  providers: [NotificationService, OrderCreatedListener, OrderShippedListener],
  controllers: [NotificationController],
})
export class NotificationModule {}
