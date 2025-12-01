import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.isConfigured = !!(host && user && pass);

    if (this.isConfigured) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port || 587,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('📧 Email service not configured. Email would be sent to:', options.to);
      console.warn('📧 Subject:', options.subject);
      console.warn('📧 Configure SMTP_HOST, SMTP_USER, SMTP_PASS to enable email sending.');
      return false;
    }

    try {
      const from = this.configService.get<string>('SMTP_FROM') || 'Agendoo <noreply@agendoo.com>';

      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log(`📧 Email sent successfully to: ${options.to}`);
      return true;
    } catch (error) {
      console.error('📧 Failed to send email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:4200';
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinir Senha - Agendoo</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0;">
              <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">📅 Agendoo</h1>
                    <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Sistema de Agendamento</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1e293b; font-size: 24px; font-weight: 600;">Redefinir sua senha</h2>
                    <p style="margin: 0 0 20px; color: #64748b; font-size: 16px; line-height: 1.6;">
                      Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez essa solicitação, pode ignorar este email.
                    </p>
                    <p style="margin: 0 0 30px; color: #64748b; font-size: 16px; line-height: 1.6;">
                      Clique no botão abaixo para criar uma nova senha:
                    </p>
                    
                    <!-- Button -->
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="text-align: center;">
                          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                            Redefinir Senha
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 30px 0 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                      Ou copie e cole o link abaixo no seu navegador:
                    </p>
                    <p style="margin: 10px 0 0; word-break: break-all;">
                      <a href="${resetLink}" style="color: #3b82f6; font-size: 14px;">${resetLink}</a>
                    </p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                        ⚠️ Este link expira em <strong>1 hora</strong>.
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 25px 30px; text-align: center;">
                    <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                      Este email foi enviado automaticamente pelo sistema Agendoo.
                    </p>
                    <p style="margin: 10px 0 0; color: #94a3b8; font-size: 13px;">
                      Se você não solicitou esta redefinição, ignore este email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '🔐 Redefinir sua senha - Agendoo',
      html,
    });
  }
}

