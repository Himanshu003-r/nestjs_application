import { Module } from '@nestjs/common';
import { OrderService } from './service/order.service';
import { OrderController } from './controllers/order.controller';

@Module({
    providers:[OrderService],
    controllers:[OrderController]
})
export class OrderModule {}
