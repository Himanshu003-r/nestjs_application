import { Module } from '@nestjs/common';
import { PasswordService } from './services/password.service';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth/auth.controller';
import { TokenService } from './services/token.service';
import {JwtModule} from '@nestjs/jwt'
import {ConfigModule, ConfigService} from '@nestjs/config'
import { JwtStrategy } from './strategies/jwt.strategy/jwt.strategy';
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow('JWT_ACCESS_EXPIRES_IN'),
        },
      }),
    }),
  
  ],
  providers: [PasswordService, AuthService, TokenService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
