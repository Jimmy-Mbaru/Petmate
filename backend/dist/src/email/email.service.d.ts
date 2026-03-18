import { ConfigService } from '@nestjs/config';
export interface SendVerificationEmailDto {
    email: string;
    name: string;
    verificationToken: string;
}
export interface SendResetPasswordEmailDto {
    email: string;
    name: string;
    resetToken: string;
}
export interface SendWelcomeEmailDto {
    email: string;
    name: string;
}
export interface OrderConfirmationDto {
    email: string;
    name: string;
    orderId: string;
    total: number;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
}
export interface BookingUpdateDto {
    email: string;
    name: string;
    bookingId: string;
    status: string;
    hostName: string;
    startDate: string;
    endDate: string;
}
export declare class EmailService {
    private readonly configService;
    private readonly logger;
    private readonly transporter;
    private readonly senderEmail;
    private readonly frontendUrl;
    constructor(configService: ConfigService);
    private renderTemplate;
    private sendMail;
    sendVerificationEmail(dto: SendVerificationEmailDto): Promise<void>;
    sendResetPasswordEmail(dto: SendResetPasswordEmailDto): Promise<void>;
    sendWelcomeEmail(dto: SendWelcomeEmailDto): Promise<void>;
    sendOrderConfirmation(dto: OrderConfirmationDto): Promise<void>;
    sendBookingUpdate(dto: BookingUpdateDto): Promise<void>;
}
