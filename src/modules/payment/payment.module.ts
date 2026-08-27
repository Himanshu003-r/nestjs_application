import { Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';

@Module({
    providers:[PaymentService],
    controllers:[PaymentController]
})
export class PaymentModule {}
