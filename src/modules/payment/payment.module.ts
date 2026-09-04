import { Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { RazorpayService } from './services/razorpay.service';

@Module({
    providers:[PaymentService,RazorpayService],
    controllers:[PaymentController]
})
export class PaymentModule {}
