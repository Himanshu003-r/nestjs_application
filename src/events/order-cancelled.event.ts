export class OrderCancelledEvent {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
  ) {}
}
