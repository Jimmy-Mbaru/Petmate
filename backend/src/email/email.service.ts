import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Email verification payload
 */
export interface SendVerificationEmailDto {
  email: string;
  name: string;
  verificationToken: string;
}

/**
 * Password reset email payload
 */
export interface SendResetPasswordEmailDto {
  email: string;
  name: string;
  resetToken: string;
}

/**
 * Welcome email payload (sent after email is verified)
 */
export interface SendWelcomeEmailDto {
  email: string;
  name: string;
}

/**
 * Email service - abstraction layer for sending emails.
 * Currently uses console logging for development.
 * Ready for Brevo (Sendinblue) integration when BREVO_API_KEY is configured.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevoApiKey: string | undefined;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY');
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
  }

  /**
   * Check if Brevo is configured
   */
  private isBrevoConfigured(): boolean {
    return !!this.brevoApiKey;
  }

  /**
   * Send email verification link
   * @param dto - Email verification data
   */
  async sendVerificationEmail(dto: SendVerificationEmailDto): Promise<void> {
    const verificationLink = `${this.frontendUrl}/auth/verify-email?token=${dto.verificationToken}`;

    if (this.isBrevoConfigured()) {
      await this.sendViaBrevo({
        to: dto.email,
        subject: 'Verify Your Email - PetMate',
        templateId: 1, // Brevo template ID for email verification (configure in Brevo dashboard)
        params: {
          name: dto.name,
          verificationLink,
        },
      });
    } else {
      // Development mode: log the verification link
      this.logger.log('===========================================');
      this.logger.log('EMAIL VERIFICATION LINK (Development Mode)');
      this.logger.log('===========================================');
      this.logger.log(`To: ${dto.email}`);
      this.logger.log(`Name: ${dto.name}`);
      this.logger.log(`Verification Link: ${verificationLink}`);
      this.logger.log('===========================================');
      this.logger.log(
        `Direct API: ${this.frontendUrl.replace('http://localhost:4200', 'http://localhost:3000')}/auth/verify-email?token=${dto.verificationToken}`,
      );
      this.logger.log('===========================================');
    }
  }

  /**
   * Send password reset link
   * @param dto - Password reset data
   */
  async sendResetPasswordEmail(dto: SendResetPasswordEmailDto): Promise<void> {
    const resetLink = `${this.frontendUrl}/auth/reset-password?token=${dto.resetToken}`;

    if (this.isBrevoConfigured()) {
      await this.sendViaBrevo({
        to: dto.email,
        subject: 'Reset Your Password - PetMate',
        templateId: 2, // Brevo template ID for password reset (configure in Brevo dashboard)
        params: {
          name: dto.name,
          resetLink,
        },
      });
    } else {
      // Development mode: log the reset link
      this.logger.log('===========================================');
      this.logger.log('PASSWORD RESET LINK (Development Mode)');
      this.logger.log('===========================================');
      this.logger.log(`To: ${dto.email}`);
      this.logger.log(`Name: ${dto.name}`);
      this.logger.log(`Reset Link: ${resetLink}`);
      this.logger.log('===========================================');
      this.logger.log(
        `Direct API: ${this.frontendUrl.replace('http://localhost:4200', 'http://localhost:3000')}/auth/reset-password?token=${dto.resetToken}`,
      );
      this.logger.log('===========================================');
    }
  }

  /**
   * Send welcome email (after email is verified)
   * @param dto - Welcome email data
   */
  async sendWelcomeEmail(dto: SendWelcomeEmailDto): Promise<void> {
    if (this.isBrevoConfigured()) {
      await this.sendViaBrevo({
        to: dto.email,
        subject: 'Welcome to PetMate!',
        templateId: 3, // Brevo template ID for welcome email (configure in Brevo dashboard)
        params: {
          name: dto.name,
        },
      });
    } else {
      this.logger.log('===========================================');
      this.logger.log('WELCOME EMAIL (Development Mode)');
      this.logger.log('===========================================');
      this.logger.log(`To: ${dto.email}`);
      this.logger.log(`Name: ${dto.name}`);
      this.logger.log('Welcome to PetMate! Your email has been verified.');
      this.logger.log('===========================================');
    }
  }

  /**
   * Send email via Brevo API
   * @param options - Email options
   */
  private async sendViaBrevo(options: {
    to: string;
    subject: string;
    templateId: number;
    params: Record<string, string>;
  }): Promise<void> {
    try {
      const response = await fetch(
        'https://api.brevo.com/v3/smtp/email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.brevoApiKey!,
          },
          body: JSON.stringify({
            sender: {
              name: 'PetMate',
              email: this.configService.get<string>('BREVO_SENDER_EMAIL') || 'noreply@petmate.com',
            },
            to: [{ email: options.to }],
            subject: options.subject,
            templateId: options.templateId,
            params: options.params,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error('Brevo API error:', errorData);
        throw new Error(`Brevo API error: ${response.status}`);
      }

      this.logger.log(`Email sent via Brevo to ${options.to}`);
    } catch (error) {
      this.logger.error('Failed to send email via Brevo', error);
      throw error;
    }
  }
}
