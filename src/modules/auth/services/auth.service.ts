import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PasswordService } from './password.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { TokenService } from './token.service';
import { RefreshTokenDto } from '../dto/referesh-token.dto';
import { RefreshToken } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, name, password } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with the email already exists');
    }

    const hashedPassword = await this.passwordService.hashPassword(password);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // const {password:_, ...user} = newUser
    return {
      data: newUser,
      message: 'User registered successfully',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(payload),
      this.tokenService.generateRefreshToken(payload),
    ]);

    const hashedToken = await this.passwordService.hashPassword(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { refreshTokens: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    let matchedToken: RefreshToken | null = null;

    for (const storedToken of user.refreshTokens) {
      const isMatch = await this.passwordService.comparePassword(
        refreshToken,
        storedToken.token,
      );

      if (isMatch) {
        matchedToken = storedToken;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // await this.prisma.refreshToken.delete({
    //   where: { id: matchedToken.id },
    // });

    await this.prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, newRefreshToken] = await Promise.all([
      this.tokenService.generateAccessToken(jwtPayload),
      this.tokenService.generateRefreshToken(jwtPayload),
    ]);

    const hashedToken =
      await this.passwordService.hashPassword(newRefreshToken);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { refreshTokens: true },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    let matchedToken: RefreshToken | null = null;

    for (const storedToken of user.refreshTokens) {
      const isMatch = await this.passwordService.comparePassword(
        refreshToken,
        storedToken.token,
      );

      if (isMatch) {
        matchedToken = storedToken;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // await this.prisma.refreshToken.delete({
    //   where: {
    //     id: matchedToken.id,
    //   },
    // });

    await this.prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }
}
