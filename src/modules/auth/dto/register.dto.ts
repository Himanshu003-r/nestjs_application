import {Transform} from 'class-transformer'
import {IsEmail, IsString, MinLength} from 'class-validator'
export class RegisterDto {

    @Transform(({ value }) => value.trim())
    @IsEmail({},{message: 'Please provide a valid email'})
    email:string

    @IsString()
    name:string

    @IsString()
    @MinLength(6,{message: 'Password must be 6 character long'})
    password:string
}