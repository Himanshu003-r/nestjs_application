export class OrderShippedEvent{
    constructor(
        public readonly userId:string,
        public readonly orderId:string
    ){}
}