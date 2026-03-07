import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';

@Injectable()
export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST'),
            port: this.configService.get<number>('SMTP_PORT'),
            secure: false,
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        });
    }

    async sendOtpEmail(to: string, name: string, otp: string): Promise<void> {
        const templatePath = path.join(process.cwd(), 'src', 'templates', 'otp.ejs');

        let html: string;
        try {
            html = await ejs.renderFile(templatePath, { name, otp, expiryMinutes: 10 });
        } catch {
            throw new InternalServerErrorException('Failed to render email template');
        }

        try {
            await this.transporter.sendMail({
                from: `"Haircare Market" <${this.configService.get<string>('smtp.user')}>`,
                to,
                subject: 'Verify your Haircare Market account',
                html,
            });
        } catch {
            throw new InternalServerErrorException('Failed to send OTP email. Please try again.');
        }
    }

    async sendPasswordResetOtpEmail(to: string, name: string, otp: string): Promise<void> {
        const templatePath = path.join(process.cwd(), 'src', 'templates', 'password-reset-otp.ejs');

        let html: string;
        try {
            html = await ejs.renderFile(templatePath, { name, otp, expiryMinutes: 10 });
        } catch {
            throw new InternalServerErrorException('Failed to render password reset email template');
        }

        try {
            await this.transporter.sendMail({
                from: `"Haircare Market" <${this.configService.get<string>('smtp.user')}>`,
                to,
                subject: 'Reset your Haircare Market password',
                html,
            });
        } catch {
            throw new InternalServerErrorException('Failed to send password reset OTP email. Please try again.');
        }
    }
}
