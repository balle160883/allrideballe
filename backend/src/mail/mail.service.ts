import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT') || 587;
    const secure = port === 465;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      this.logger.log(`SMTP configured: ${host}:${port}`);
    } else {
      this.logger.warn('SMTP credentials not configured. Outgoing mail will be logged to console.');
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const subject = 'Restablecer contraseña - PRO MOBILE';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #1e3a8a; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">PRO MOBILE</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Sistema de Transporte Corporativo</p>
        </div>
        
        <div style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          <p style="margin: 0 0 16px 0; font-weight: 700;">Hola,</p>
          <p style="margin: 0 0 16px 0;">Recibimos una solicitud para restablecer la contraseña de acceso asociada a tu cuenta corporativa.</p>
          <p style="margin: 0 0 24px 0;">Para ingresar una nueva contraseña, haz clic en el botón a continuación:</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); transition: background-color 0.2s;">Restablecer Contraseña</a>
          </div>
          
          <p style="margin: 0; font-size: 13px; color: #64748b;"><em>Este enlace es temporal y expirará automáticamente en 1 hora por razones de seguridad. Si tú no realizaste esta solicitud, puedes ignorar este correo con total tranquilidad.</em></p>
        </div>
        
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;">
        
        <div style="text-align: center; font-size: 11px; color: #94a3b8;">
          <p style="margin: 0 0 4px 0;">© 2026 PRO MOBILE AllRide. Todos los derechos reservados.</p>
          <p style="margin: 0;">Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </div>
    `;

    this.logger.log(`Enlace de restablecimiento generado para ${email}: ${resetLink}`);

    if (this.transporter) {
      const from = this.configService.get<string>('SMTP_FROM') || '"PRO MOBILE" <noreply@allride.com>';
      try {
        await this.transporter.sendMail({
          from,
          to: email,
          subject,
          html,
        });
        this.logger.log(`Correo de restablecimiento enviado exitosamente a: ${email}`);
      } catch (err: any) {
        this.logger.error(`Error al enviar correo a ${email}: ${err.message}`);
        throw new Error('Error al enviar el correo de recuperación.');
      }
    } else {
      this.logger.log(`[SIMULACIÓN] SMTP no configurado. Correo no enviado. Detalles:`);
      this.logger.log(`  Para: ${email}`);
      this.logger.log(`  Enlace: ${resetLink}`);
    }
  }
}
