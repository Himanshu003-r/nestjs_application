import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { VerifyPaymentDto } from '../dto/verify-payment.dto';
import type { Request } from 'express';
import { RazorpayService } from '../services/razorpay.service';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly razorpayService: RazorpayService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createPayment(
    @CurrentUser() user: JwtPayload,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(user.sub, createPaymentDto);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  confirmPayment(
    @CurrentUser() user: JwtPayload,
    @Body() verifyPaymentDto: VerifyPaymentDto,
  ) {
    return this.paymentService.confirmPayment(user.sub, verifyPaymentDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getPayment(@CurrentUser() user: JwtPayload, @Param('id') paymentId: string) {
    return this.paymentService.getPayment(user.sub, paymentId);
  }

  @Post('refund/:id')
  @UseGuards(JwtAuthGuard)
  makeRefund(@CurrentUser() user: JwtPayload, @Param('id') paymentId: string) {
    return this.paymentService.paymentRefund(user.sub, paymentId);
  }

  @Post('webhook')
  webhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature || Array.isArray(signature)) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const isValid = this.razorpayService.verifyWebhooksSignature(
      req.rawBody!,
      signature,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return {
      message: 'Webhook signature verified',
    };
  }
}
