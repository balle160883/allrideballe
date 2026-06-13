import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    try {
      const result = await this.databaseService.query(
        'SELECT id, email, password_hash, nombre, rol, identificador_tarjeta, gestor_code AS gestor, proveedor_id, sede_id FROM usuarios WHERE email = $1',
        [email]
      );

      const users = result.rows;

      if (!users || users.length === 0) {
        return null;
      }

      const user = users[0];
      
      let isMatch = false;
      let needsMigration = false;
      
      // Si el hash parece un hash de bcrypt, intentamos comparar con bcrypt
      if (user.password_hash && user.password_hash.startsWith('$2')) {
        try {
          isMatch = await bcrypt.compare(pass, user.password_hash);
        } catch (e) {
          isMatch = pass === user.password_hash;
        }
      } else {
        // Si no parece bcrypt, comparamos directamente (texto plano para migración)
        isMatch = pass === user.password_hash;
        if (isMatch) {
          needsMigration = true;
        }
      }
      
      if (isMatch) {
        if (needsMigration) {
          // Actualización asíncrona en segundo plano
          bcrypt.hash(pass, 10).then(newHash => {
            return this.databaseService.query(
              'UPDATE "usuarios" SET "password_hash" = $1 WHERE "id" = $2',
              [newHash, user.id]
            );
          }).then(() => {
            this.logger.log(`Contraseña del usuario ${email} migrada exitosamente a bcrypt.`);
          }).catch(err => {
            this.logger.error(`Error al migrar contraseña para ${email}: ${err.message}`);
          });
        }
        
        const { password_hash, ...res } = user;
        return res;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async login(user: any) {
    let effectiveRole = user.rol;
    if (user.rol === 'admin_cliente' || user.rol === 'admin_proveedor') {
      effectiveRole = 'admin';
    }

    const payload = { 
      email: user.email, 
      sub: user.id, 
      gestorId: user.gestor,
      rol: effectiveRole 
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        gestor: user.gestor,
        rol: user.rol, // Return actual role ('admin_cliente', 'admin_proveedor', etc.)
        proveedor_id: user.proveedor_id,
        sede_id: user.sede_id
      }
    };
  }

  async requestPasswordReset(email: string) {
    const emailLower = email.trim().toLowerCase();
    const result = await this.databaseService.query(
      'SELECT id FROM "usuarios" WHERE "email" = $1',
      [emailLower]
    );

    if (result.rows.length === 0) {
      // Devolver éxito ficticio por seguridad para evitar enumeración de correos
      return { success: true, message: 'Si el correo electrónico está registrado, recibirás un enlace de restablecimiento.' };
    }

    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Expiración en 1 hora

    await this.databaseService.query(
      'UPDATE "usuarios" SET "reset_password_token" = $1, "reset_password_expires" = $2 WHERE "email" = $3',
      [token, expires, emailLower]
    );

    await this.mailService.sendPasswordResetEmail(emailLower, token);

    return { success: true, message: 'Si el correo electrónico está registrado, recibirás un enlace de restablecimiento.' };
  }

  async resetPassword(token: string, pass: string) {
    if (!token || !pass) {
      throw new BadRequestException('Token y contraseña son requeridos.');
    }

    const result = await this.databaseService.query(
      'SELECT id, reset_password_expires FROM "usuarios" WHERE "reset_password_token" = $1',
      [token]
    );

    if (result.rows.length === 0) {
      throw new BadRequestException('Token de restablecimiento inválido o expirado.');
    }

    const user = result.rows[0];
    const now = new Date();
    const expires = new Date(user.reset_password_expires);

    if (now > expires) {
      // Limpiar token expirado
      await this.databaseService.query(
        'UPDATE "usuarios" SET "reset_password_token" = NULL, "reset_password_expires" = NULL WHERE "id" = $1',
        [user.id]
      );
      throw new BadRequestException('Token de restablecimiento inválido o expirado.');
    }

    const newHash = await bcrypt.hash(pass, 10);

    await this.databaseService.query(
      'UPDATE "usuarios" SET "password_hash" = $1, "reset_password_token" = NULL, "reset_password_expires" = NULL WHERE "id" = $2',
      [newHash, user.id]
    );

    return { success: true, message: 'Contraseña restablecida correctamente.' };
  }
}
