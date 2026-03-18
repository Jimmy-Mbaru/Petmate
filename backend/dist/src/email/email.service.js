"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
const ejs = __importStar(require("ejs"));
const path = __importStar(require("path"));
let EmailService = EmailService_1 = class EmailService {
    configService;
    logger = new common_1.Logger(EmailService_1.name);
    transporter;
    senderEmail;
    frontendUrl;
    constructor(configService) {
        this.configService = configService;
        this.senderEmail =
            this.configService.get('BREVO_SENDER_EMAIL') ||
                this.configService.get('SMTP_FROM') ||
                'PetMate <noreply@petmate.com>';
        this.frontendUrl =
            this.configService.get('FRONTEND_URL') || 'http://localhost:4200';
        const host = this.configService.get('SMTP_HOST') || 'smtp-relay.brevo.com';
        const port = Number(this.configService.get('SMTP_PORT') ?? 587);
        const secure = (this.configService.get('SMTP_SECURE') ?? 'false').toLowerCase() ===
            'true';
        const user = this.configService.get('SMTP_USER') ||
            this.configService.get('BREVO_SMTP_USER') ||
            'apikey';
        const pass = this.configService.get('SMTP_PASS') ||
            this.configService.get('BREVO_API_KEY') ||
            '';
        this.logger.debug(`SMTP config -> host=${host}, port=${port}, secure=${secure}, user=${user}, passLength=${pass?.length ?? 0}`);
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
    async renderTemplate(templateName, data) {
        const templatePath = path.join(process.cwd(), 'src/email/templates', `${templateName}.ejs`);
        return ejs.renderFile(templatePath, data);
    }
    async sendMail(to, subject, html) {
        try {
            await this.transporter.sendMail({
                from: this.senderEmail,
                to,
                subject,
                html,
            });
            this.logger.log(`Email sent successfully to ${to}`);
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error);
        }
    }
    async sendVerificationEmail(dto) {
        const verificationLink = `${this.frontendUrl}/auth/verify-email?token=${dto.verificationToken}`;
        const html = await this.renderTemplate('welcome', {
            name: dto.name,
            verificationLink,
        });
        await this.sendMail(dto.email, 'Welcome to PetMate - Verify Your Email', html);
    }
    async sendResetPasswordEmail(dto) {
        const resetLink = `${this.frontendUrl}/auth/reset-password?token=${dto.resetToken}`;
        const html = await this.renderTemplate('reset-password', {
            name: dto.name,
            resetLink,
        });
        await this.sendMail(dto.email, 'Reset Your Password - PetMate', html);
    }
    async sendWelcomeEmail(dto) {
        const html = await this.renderTemplate('header', {}) +
            `<h2>Account Verified!</h2><p>Hi ${dto.name},</p><p>Your PetMate account has been successfully verified. You can now access all features of the platform.</p>` +
            `<div style="text-align: center;"><a href="${this.frontendUrl}/auth/login" class="btn">Login to PetMate</a></div>` +
            await this.renderTemplate('footer', {});
        await this.sendMail(dto.email, 'Account Verified - Welcome to PetMate', html);
    }
    async sendOrderConfirmation(dto) {
        const orderLink = `${this.frontendUrl}/app/store/orders`;
        const html = await this.renderTemplate('order-confirmation', {
            ...dto,
            orderLink,
        });
        await this.sendMail(dto.email, `Order Confirmation #${dto.orderId} - PetMate`, html);
    }
    async sendBookingUpdate(dto) {
        const bookingLink = `${this.frontendUrl}/app/bookings`;
        const html = await this.renderTemplate('booking-update', {
            ...dto,
            bookingLink,
        });
        await this.sendMail(dto.email, `Booking Update #${dto.bookingId} - PetMate`, html);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map