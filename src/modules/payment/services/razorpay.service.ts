import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  private razorpay: Razorpay;

  constructor(private readonly configService: ConfigService) {
    this.razorpay = new Razorpay({
      key_id: this.configService.getOrThrow<string>('RAZORPAY_API_KEY'),
      key_secret: this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  // Razorpay order creation
  async createOrder(amount: number, receipt: string) {
    const razorpayOrder = this.razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt,
    });

    return razorpayOrder;
  }

  // Verification of payment from client
  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    const body = `${razorpayOrderId}|${razorpayPaymentId}`;

    const expectedSignature = crypto
      .createHmac('sha256',this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET'))
      .update(body)
      .digest('hex');

    return expectedSignature === razorpaySignature;
  }

  // Method to send api key to client
  getKeyId(): string {
    return this.configService.getOrThrow<string>('RAZORPAY_API_KEY');
  }

  // Verification of the webhooks
  verifyWebhooksSignature(rawBody: Buffer, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256',this.configService.getOrThrow<string>('RAZORPAY_WEBHOOK_SECRET'))
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }
}
