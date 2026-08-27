import { PaymentMethod } from "@prisma/client"
import { IsEnum, IsString } from "class-validator"

export class CreatePaymentDto{
    @IsString()
    orderId: string

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod
}