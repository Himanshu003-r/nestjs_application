import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '../../services/auth.service';
import { RegisterDto } from '../../dto/register.dto';
import { LoginDto } from '../../dto/login.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth/jwt-auth.guard';
import { CurrentUser } from '../../decorator/current-user.decorator';
import type { JwtPayload } from '../../interfaces/jwt-payload.interface';
import { RefreshTokenDto } from '../../dto/referesh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user:JwtPayload) {
    return user
  }

  @Post('refresh')
  refresh(@Body() refreshToken: RefreshTokenDto){
    return this.authService.refresh(refreshToken)
  }

  @Post('logout')
  logout(@Body() refreshToken: RefreshTokenDto){
    return this.authService.logout(refreshToken)
  }
}
