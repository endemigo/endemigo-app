import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * EmailService — Stub implementation
 * Development: console.log ile mail çıktısı
 * Production: SMTP_HOST env tanımlanınca gerçek mail gönderimi
 * 
 * TODO: Production'da nodemailer veya @nestjs-modules/mailer kullanılacak
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `${this.appUrl}/auth/verify-email?token=${token}`;
    
    // TODO: Replace with real SMTP transport when SMTP_HOST is configured
    this.logger.log(
      `[EMAIL STUB] Verification email to ${email}: ${verifyUrl}`,
    );
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.appUrl}/auth/reset-password?token=${token}`;
    
    // TODO: Replace with real SMTP transport when SMTP_HOST is configured
    this.logger.log(
      `[EMAIL STUB] Password reset email to ${email}: ${resetUrl}`,
    );
  }
}
