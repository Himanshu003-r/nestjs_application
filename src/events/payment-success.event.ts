export class PaymentSuccessEvent {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
  ) {}
}
