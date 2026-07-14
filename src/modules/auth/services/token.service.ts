import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken (payload: JwtPayload): Promise<string>{
   return this.jwtService.signAsync(payload,{
    secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
    expiresIn: this.configService.getOrThrow('JWT_ACCESS_EXPIRES_IN')
   })
  }

  generateRefreshToken (payload: JwtPayload): Promise<string>{
    return this.jwtService.signAsync(payload,{
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.getOrThrow('JWT_REFRESH_EXPIRES_IN')
    })
  }

  verifyRefreshToken (token: string):Promise<JwtPayload>{
     try {
      return this.jwtService.verifyAsync<JwtPayload>(token,{
        secret: this.configService.getOrThrow('JWT_REFRESH_SECRET')
      })
     } catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
     }
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    return await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
    });
  } catch {
    throw new UnauthorizedException('Invalid access token');
  }
}
}
