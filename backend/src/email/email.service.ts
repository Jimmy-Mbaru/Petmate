import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';

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
 * Welcome email payload
 */
export interface SendWelcomeEmailDto {
  email: string;
  name: string;
}

/**
 * Order confirmation payload
 */
export interface OrderConfirmationDto {
  email: string;
  name: string;
  orderId: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}

/**
 * Booking update payload
 */
export interface BookingUpdateDto {
  email: string;
  name: string;
  bookingId: string;
  status: string;
  hostName: string;
  startDate: string;
  endDate: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly senderEmail: string;
  private readonly frontendUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.senderEmail =
      this.configService.get<string>('BREVO_SENDER_EMAIL') ||
      this.configService.get<string>('SMTP_FROM') ||
      'PetMate <noreply@petmate.com>';
    const frontendUrlRaw = this.configService.get<string>('FRONTEND_URL')?.trim();
    const nodeEnv =
      this.configService.get<string>('NODE_ENV')?.trim().toLowerCase() ?? 'development';

    if (!frontendUrlRaw) {
      if (nodeEnv === 'production') {
        // Avoid accidentally sending password/verification links to localhost in prod.
        throw new Error('FRONTEND_URL must be set in production to generate email links.');
      }

      this.frontendUrl = 'http://localhost:4200';
    } else {
      // Remove trailing slashes to avoid double slashes in links.
      this.frontendUrl = frontendUrlRaw.replace(/\/+$/, '');
    }

    // SMTP config. For Brevo: use your Brevo login EMAIL as SMTP_USER and SMTP KEY (from
    // https://app.brevo.com/settings/keys/smtp) as SMTP_PASS — not the API key.
    const host =
      this.configService.get<string>('SMTP_HOST') || 'smtp-relay.brevo.com';
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const secure =
      (this.configService.get<string>('SMTP_SECURE') ?? 'false').toLowerCase() ===
      'true';
    const user =
      this.configService.get<string>('SMTP_USER') ||
      this.configService.get<string>('BREVO_SMTP_USER') ||
      'apikey';
    const pass =
      this.configService.get<string>('SMTP_PASS') ||
      this.configService.get<string>('BREVO_API_KEY') ||
      '';

    this.logger.debug(
      `SMTP config -> host=${host}, port=${port}, secure=${secure}, user=${user}, passLength=${pass?.length ?? 0}`,
    );

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Render EJS template
   */
  private async renderTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = path.join(process.cwd(), 'src/email/templates', `${templateName}.ejs`);
    return ejs.renderFile(templatePath, data);
  }

  /**
   * Send mail wrapper
   */
  private async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.senderEmail,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error);
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(dto: SendVerificationEmailDto): Promise<void> {
    const verificationLink = `${this.frontendUrl}/auth/verify-email?token=${dto.verificationToken}`;
    
    const html = await this.renderTemplate('welcome', {
      name: dto.name,
      verificationLink,
    });

    await this.sendMail(dto.email, 'Welcome to PetMate - Verify Your Email', html);
  }

  /**
   * Send password reset email
   */
  async sendResetPasswordEmail(dto: SendResetPasswordEmailDto): Promise<void> {
    const resetLink = `${this.frontendUrl}/auth/reset-password?token=${dto.resetToken}`;
    
    const html = await this.renderTemplate('reset-password', {
      name: dto.name,
      resetLink,
    });

    await this.sendMail(dto.email, 'Reset Your Password - PetMate', html);
  }

  /**
   * Send welcome email (after verified)
   */
  async sendWelcomeEmail(dto: SendWelcomeEmailDto): Promise<void> {
    // We can reuse the welcome template without the verification link or have a simplified one
    // For now, let's just send a plain text or simple HTML welcome
    const html = await this.renderTemplate('header', {}) + 
                 `<h2>Account Verified!</h2><p>Hi ${dto.name},</p><p>Your PetMate account has been successfully verified. You can now access all features of the platform.</p>` +
                 `<div style="text-align: center;"><a href="${this.frontendUrl}/auth/login" class="btn">Login to PetMate</a></div>` +
                 await this.renderTemplate('footer', {});

    await this.sendMail(dto.email, 'Account Verified - Welcome to PetMate', html);
  }

  /**
   * Send order confirmation
   */
  async sendOrderConfirmation(dto: OrderConfirmationDto): Promise<void> {
    const orderLink = `${this.frontendUrl}/app/store/orders`;
    
    const html = await this.renderTemplate('order-confirmation', {
      ...dto,
      orderLink,
    });

    await this.sendMail(dto.email, `Order Confirmation #${dto.orderId} - PetMate`, html);
  }

  /**
   * Send booking update
   */
  async sendBookingUpdate(dto: BookingUpdateDto): Promise<void> {
    const bookingLink = `${this.frontendUrl}/app/bookings`;
    
    const html = await this.renderTemplate('booking-update', {
      ...dto,
      bookingLink,
    });

    await this.sendMail(dto.email, `Booking Update #${dto.bookingId} - PetMate`, html);
  }
}
