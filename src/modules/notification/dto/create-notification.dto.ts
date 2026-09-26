import { NotificationType } from "@prisma/client"
import { IsEnum, IsString } from "class-validator"

export class CreateNotificationDto{
    @IsEnum(NotificationType)
    type: NotificationType

    @IsString()
    title: string

    @IsString()
    message: string
}