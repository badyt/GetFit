import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const emailUser = this.configService.get<string>('EMAIL_USER')!;
    this.from = `"GetFit App" <${emailUser}>`;

    // family: 4 forces IPv4 — required in Minikube/GKE environments lacking IPv6
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
      tls: { servername: 'smtp.gmail.com' },
      family: 4,
    } as any);
  }

  async sendVerificationEmail(
    email: string,
    name: string,
    verificationToken: string,
    verificationLink: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Verify Your Email - GetFit',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #111827;">Welcome to GetFit, ${name}!</h1>
            <p style="color: #6b7280; font-size: 16px;">
              Thank you for registering. Please verify your email address to get started.
            </p>
            <p style="color: #6b7280; font-size: 16px;">
              Copy this verification code and enter it in the GetFit app:
            </p>
            <div style="margin: 20px 0; background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
              <code style="font-size: 18px; font-weight: 600; color: #111827; letter-spacing: 1px; word-break: break-all;">
                ${verificationToken}
              </code>
            </div>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
              This verification code expires in ${VERIFICATION_EXPIRY_HOURS} hours.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px;">
              If you didn't create this account, please ignore this email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Welcome to GetFit!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #111827;">Welcome to GetFit, ${name}!</h1>
            <p style="color: #6b7280; font-size: 16px;">
              Your email has been verified and your account is ready to use.
            </p>
            <div style="margin: 30px 0; background: #f0fdf4; padding: 20px; border-radius: 8px;">
              <h2 style="color: #10b981; margin-top: 0;">What's Next?</h2>
              <ul style="color: #6b7280; line-height: 1.8;">
                <li>Complete your profile</li>
                <li>If you're a trainee, ask your trainer for an invite code</li>
                <li>If you're a trainer, start inviting your trainees</li>
              </ul>
            </div>
            <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
              For support, contact us at ${this.configService.get('EMAIL_USER')}
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.warn(`Failed to send welcome email to ${email}`, error);
    }
  }

  async sendTrainerInviteEmail(
    email: string,
    trainerName: string,
    inviteCode: string,
    message?: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: `${trainerName} invited you to join GetFit`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #111827;">You've Been Invited!</h1>
            <p style="color: #6b7280; font-size: 16px;">
              <strong>${trainerName}</strong> has invited you to be their trainee on GetFit.
            </p>
            ${message ? `
            <div style="margin: 20px 0; background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
              <p style="color: #065f46; font-size: 15px; margin: 0; font-style: italic;">"${message}"</p>
            </div>
            ` : ''}
            <p style="color: #6b7280; font-size: 16px;">Use this invite code to join:</p>
            <div style="margin: 20px 0; background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
              <code style="font-size: 24px; font-weight: 600; color: #111827; letter-spacing: 2px;">
                ${inviteCode}
              </code>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">
              Copy this code and enter it in your GetFit app under your profile.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
              If you don't know who this is, please ignore this email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(`Failed to send invite email to ${email}`, error);
      throw error;
    }
  }
}
