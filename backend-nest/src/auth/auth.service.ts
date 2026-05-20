import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

const VERIFICATION_EMAIL_EXPIRY = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private generateToken(id: string, role: UserRole): string {
    const payload: JwtPayload = { id, role };
    return this.jwtService.sign(payload);
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + VERIFICATION_EMAIL_EXPIRY);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone ?? null,
        role: UserRole.TRAINEE,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    const appUrl = this.configService.get<string>('APP_URL')!;
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`;

    let emailSent = false;
    try {
      await this.emailService.sendVerificationEmail(user.email, user.name, verificationToken, verificationLink);
      emailSent = true;
    } catch {
      // Don't fail registration if email sending fails
    }

    return {
      message: emailSent
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Account created but we could not send the verification email. Please double-check your email address, then use "Resend verification code" to try again.',
      emailSent,
      token: this.generateToken(user.id, user.role),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { trainer: { select: { id: true, name: true } } },
    });

    if (!user) throw new NotFoundException('No user found with this email');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Incorrect password');

    if (!user.isEmailVerified) {
      throw new HttpException(
        {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email not verified. Please verify your email to login.',
          email: user.email,
          name: user.name,
        },
        HttpStatus.FORBIDDEN,
      );
    }

    const userResponse: Record<string, unknown> = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
    };

    if (user.trainerId && user.trainer) {
      userResponse.trainerId = user.trainerId;
      userResponse.trainer = user.trainer;
    }

    return {
      message: 'Login successful',
      token: this.generateToken(user.id, user.role),
      user: userResponse,
    };
  }

  async validate(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        trainer: { select: { id: true, name: true, profilePicture: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const { password: _password, ...safeUser } = user;
    return { message: 'Token is valid', user: safeUser };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { trainer: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const userResponse: Record<string, unknown> = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      isEmailVerified: user.isEmailVerified,
    };

    if (user.trainerId && user.trainer) {
      userResponse.trainerId = user.trainerId;
      userResponse.trainer = {
        id: user.trainer.id,
        name: user.trainer.name,
        profilePicture: user.trainer.profilePicture,
      };
    }

    return { message: 'User retrieved successfully', user: userResponse };
  }

  async verifyEmail(verificationToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: verificationToken },
    });

    if (!user) throw new BadRequestException('Invalid verification token');

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    try {
      await this.emailService.sendWelcomeEmail(updatedUser.email, updatedUser.name);
    } catch {
      // Welcome email failure should not block verification
    }

    return {
      message: 'Email verified successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
      },
    };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new NotFoundException('User not found');
    if (user.isEmailVerified) throw new ConflictException('Email is already verified');

    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + VERIFICATION_EMAIL_EXPIRY);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: verificationToken, emailVerificationExpires: verificationExpires },
    });

    const appUrl = this.configService.get<string>('APP_URL')!;
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`;
    await this.emailService.sendVerificationEmail(email, user.name, verificationToken, verificationLink);

    return { message: 'Verification code sent successfully. Please check your email.' };
  }

  async verifyCodeAndLogin(email: string, code: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { trainer: { select: { id: true, name: true } } },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerificationToken !== code) throw new BadRequestException('Invalid verification code');

    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    try {
      await this.emailService.sendWelcomeEmail(updatedUser.email, updatedUser.name);
    } catch {
      // Welcome email failure should not block login
    }

    const userResponse: Record<string, unknown> = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
    };

    if (updatedUser.trainerId && user.trainer) {
      userResponse.trainerId = updatedUser.trainerId;
      userResponse.trainer = user.trainer;
    }

    return {
      message: 'Email verified and login successful',
      token: this.generateToken(updatedUser.id, updatedUser.role),
      user: userResponse,
    };
  }
}
