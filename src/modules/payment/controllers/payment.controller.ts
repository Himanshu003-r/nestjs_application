import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createPayment(
    @CurrentUser() user: JwtPayload,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(user.sub, createPaymentDto);
  }

  @Post('confirm/:id')
  @UseGuards(JwtAuthGuard)
  confirmPayment(@CurrentUser() user: JwtPayload, @Param('id') paymentId: string) {
    return this.paymentService.confirmPayment(user.sub, paymentId);
  }
}
