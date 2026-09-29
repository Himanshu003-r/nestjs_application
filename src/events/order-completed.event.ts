export class OrderCompletedEvent {
  constructor(
    public readonly userId: string,
    public readonly orderId: string,
  ) {}
}
