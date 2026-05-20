import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed'),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-1',
  name: 'Alice',
  email: 'alice@example.com',
  password: '$hashed',
  role: UserRole.TRAINEE,
  isEmailVerified: true,
  emailVerificationToken: null,
  emailVerificationExpires: null,
  profilePicture: null,
  phone: null,
  trainerId: null,
  trainer: null,
  createdAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwt = { sign: jest.fn().mockReturnValue('mock-token') };
const mockEmail = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
};
const mockConfig = { get: jest.fn().mockReturnValue('http://localhost:3001') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: EmailService, useValue: mockEmail },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue('mock-token');
    mockEmail.sendVerificationEmail.mockResolvedValue(undefined);
    mockEmail.sendWelcomeEmail.mockResolvedValue(undefined);
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = { name: 'Alice', email: 'alice@example.com', password: 'password123' };

    it('throws ConflictException when email already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('creates user and returns token on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...mockUser, isEmailVerified: false });

      const result = await service.register(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      expect(result.token).toBe('mock-token');
      expect(result.user.email).toBe(dto.email);
      expect(result.message).toContain('Registration successful');
    });

    it('does not fail registration when email sending throws', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...mockUser, isEmailVerified: false });
      mockEmail.sendVerificationEmail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.register(dto);
      expect(result.token).toBe('mock-token');
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    const dto = { email: 'alice@example.com', password: 'correctpassword' };

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(NotFoundException);
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws 403 HttpException when email not verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isEmailVerified: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const err = await service.login(dto).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(403);
      expect((err as HttpException).getResponse()).toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    });

    it('returns token and user on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result.token).toBe('mock-token');
      expect(result.user.email).toBe(dto.email);
      expect(result.message).toBe('Login successful');
    });

    it('includes trainer info in response when trainee has a trainer', async () => {
      const userWithTrainer = {
        ...mockUser,
        trainerId: 'trainer-1',
        trainer: { id: 'trainer-1', name: 'Bob' },
      };
      mockPrisma.user.findUnique.mockResolvedValue(userWithTrainer);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);
      expect(result.user.trainerId).toBe('trainer-1');
    });
  });

  // ─── verifyEmail ───────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('throws BadRequestException for unknown token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isEmailVerified: false,
        emailVerificationToken: 'tok',
        emailVerificationExpires: new Date(Date.now() - 1000),
      });
      await expect(service.verifyEmail('tok')).rejects.toThrow(BadRequestException);
    });

    it('marks email verified and returns user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isEmailVerified: false,
        emailVerificationToken: 'tok',
        emailVerificationExpires: new Date(Date.now() + 60_000),
      });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isEmailVerified: true });

      const result = await service.verifyEmail('tok');
      expect(result.user.isEmailVerified).toBe(true);
    });

    it('still succeeds when welcome email fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isEmailVerified: false,
        emailVerificationToken: 'tok',
        emailVerificationExpires: new Date(Date.now() + 60_000),
      });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isEmailVerified: true });
      mockEmail.sendWelcomeEmail.mockRejectedValue(new Error('SMTP'));

      const result = await service.verifyEmail('tok');
      expect(result.user.isEmailVerified).toBe(true);
    });
  });

  // ─── resendVerification ────────────────────────────────────────────────────

  describe('resendVerification', () => {
    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resendVerification('x@x.com')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.resendVerification(mockUser.email)).rejects.toThrow(ConflictException);
    });

    it('generates new token, updates DB, and sends email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isEmailVerified: false });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.resendVerification(mockUser.email);

      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(result.message).toContain('sent');
    });
  });

  // ─── verifyCodeAndLogin ────────────────────────────────────────────────────

  describe('verifyCodeAndLogin', () => {
    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyCodeAndLogin('x@x.com', '123')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for wrong code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, emailVerificationToken: 'correct' });
      await expect(service.verifyCodeAndLogin(mockUser.email, 'wrong')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired code', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        emailVerificationToken: 'tok',
        emailVerificationExpires: new Date(Date.now() - 1000),
      });
      await expect(service.verifyCodeAndLogin(mockUser.email, 'tok')).rejects.toThrow(BadRequestException);
    });

    it('verifies code, marks email verified, returns token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isEmailVerified: false,
        emailVerificationToken: 'tok',
        emailVerificationExpires: new Date(Date.now() + 60_000),
      });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isEmailVerified: true });

      const result = await service.verifyCodeAndLogin(mockUser.email, 'tok');

      expect(result.token).toBe('mock-token');
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    });
  });
});
