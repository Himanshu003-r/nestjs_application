import { Module } from '@nestjs/common';
import { OrderService } from './service/order.service';
import { OrderController } from './controllers/order.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
    imports:[PaymentModule],
    providers:[OrderService],
    controllers:[OrderController]
})
export class OrderModule {}
