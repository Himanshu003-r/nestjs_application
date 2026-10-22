import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;

  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  let passwordService: {
    hashPassword: jest.Mock;
    comparePassword: jest.Mock;
  };

  let tokenService: {
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
    verifyRefreshToken: jest.Mock;
  };

  const activeUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashed-password',
    role: 'USER',
    deletedAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    passwordService = {
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
    };

    tokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordService, useValue: passwordService },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'Password123!',
    };

    it('registers a new user', async () => {
      const newUser = {
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        role: 'USER',
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue(newUser);

      const result = await service.register(dto as any);

      expect(result.data).toEqual(newUser);
      expect(result.message).toBe('User registered successfully');

      expect(passwordService.hashPassword).toHaveBeenCalledWith(dto.password);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          name: dto.name,
          password: 'hashed-password',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
    });

    it('rejects duplicate email registration', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);

      await expect(service.register(dto as any)).rejects.toThrow(
        ConflictException,
      );

      expect(passwordService.hashPassword).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('logs in with valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      passwordService.comparePassword.mockResolvedValue(true);

      tokenService.generateAccessToken.mockResolvedValue('access-token');
      tokenService.generateRefreshToken.mockResolvedValue('refresh-token');

      passwordService.hashPassword.mockResolvedValue('hashed-refresh-token');

      const result = await service.login(dto as any);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
      });

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: 'hashed-refresh-token',
          userId: activeUser.id,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('rejects a nonexistent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(passwordService.comparePassword).not.toHaveBeenCalled();
    });

    it('rejects an incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      passwordService.comparePassword.mockResolvedValue(false);

      await expect(service.login(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(tokenService.generateAccessToken).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects a deleted user', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        deletedAt: new Date(),
      });

      await expect(service.login(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    const dto = { refreshToken: 'old-refresh-token' };

    it('rotates a valid refresh token', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
      });

      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        refreshTokens: [{ id: 'rt-1', token: 'hashed-old-refresh-token' }],
      });

      passwordService.comparePassword.mockResolvedValue(true);

      tokenService.generateAccessToken.mockResolvedValue('new-access-token');
      tokenService.generateRefreshToken.mockResolvedValue('new-refresh-token');

      passwordService.hashPassword.mockResolvedValue(
        'hashed-new-refresh-token',
      );

      const result = await service.refresh(dto as any);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: activeUser.id },
      });

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: 'hashed-new-refresh-token',
          userId: activeUser.id,
          expiresAt: expect.any(Date),
        },
      });
    });

    it('rejects a refresh token not stored for the user', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
      });

      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        refreshTokens: [{ id: 'rt-1', token: 'some-other-hashed-token' }],
      });

      passwordService.comparePassword.mockResolvedValue(false);

      await expect(service.refresh(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('rejects a refresh token when the user no longer exists', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
      });

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refresh(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    const dto = { refreshToken: 'refresh-token' };

    it('logs out and deletes stored refresh tokens', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
      });

      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        refreshTokens: [{ id: 'rt-1', token: 'hashed-refresh-token' }],
      });

      passwordService.comparePassword.mockResolvedValue(true);

      const result = await service.logout(dto as any);

      expect(result).toEqual({
        message: 'Logged out successfully',
      });

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: activeUser.id },
      });
    });

    it('rejects logout when the refresh token is not stored', async () => {
      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
      });

      prisma.user.findUnique.mockResolvedValue({
        ...activeUser,
        refreshTokens: [],
      });

      await expect(service.logout(dto as any)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });
  });
});
