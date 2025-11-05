import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly frontendUrl: string;
  private readonly transporter: Transporter | null;
  private readonly fromEmail: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@example.com';
    this.enabled = this.configService.get<string>('EMAIL_ENABLED') !== 'false';

    if (this.enabled) {
      this.transporter = this.createTransporter();
    } else {
      this.logger.warn('Email service is disabled. Emails will be logged only.');
    }
  }

  /**
   * Creates and configures the nodemailer transporter
   */
  private createTransporter(): Transporter {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = parseInt(this.configService.get<string>('EMAIL_PORT') || '587', 10);
    const secure = this.configService.get<string>('EMAIL_SECURE') === 'true';
    const user = this.configService.get<string>('EMAIL_USER');
    const password = this.configService.get<string>('EMAIL_PASSWORD');

    if (!host || !user || !password) {
      this.logger.warn('Email configuration incomplete. Using console logging only.');
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass: password,
      },
    });
  }

  /**
   * Sends a password reset email with the reset code
   * @param email - User email address
   * @param code - Reset password code
   */
  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    const resetLink = `${this.frontendUrl}/reset-senha?code=${code}`;
    const emailContent = this.buildPasswordResetEmail(resetLink);
    this.logger.log(`Sending password reset email to ${email}`);
    this.logger.debug(`Reset link: ${resetLink}`);
    await this.sendEmail(email, 'Password Reset Request', emailContent);
  }

  private buildPasswordResetEmail(resetLink: string): string {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Password Reset Request</h2>
            </div>
            <div class="content">
              <p>You requested to reset your password. Click on the button below to proceed:</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetLink}</p>
              <p><strong>Important:</strong></p>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you did not request this, please ignore this email</li>
                <li>For security reasons, do not share this link with anyone</li>
              </ul>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private async sendEmail(to: string, subject: string, content: string): Promise<void> {
    if (!this.enabled || !this.transporter) {
      this.logger.log(`[EMAIL DISABLED] Would send email to: ${to}`);
      this.logger.log(`[EMAIL DISABLED] Subject: ${subject}`);
      this.logger.debug(`[EMAIL DISABLED] Content: ${content}`);
      return;
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to,
        subject,
        html: content,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }
}

