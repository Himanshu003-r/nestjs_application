import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthModule, CatalogModule, OrderModule, PaymentModule, NotificationModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
