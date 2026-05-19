import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    try {
      const result = await this.databaseService.query(
        'SELECT id, email, password_hash, nombre, rol, identificador_tarjeta, gestor_code AS gestor FROM usuarios WHERE email = $1',
        [email]
      );

      const users = result.rows;

      if (!users || users.length === 0) {
        return null;
      }

      const user = users[0];
      
      let isMatch = false;
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
      }
      
      if (isMatch) {
        const { password_hash, ...res } = user;
        return res;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async login(user: any) {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      gestorId: user.gestor,
      rol: user.rol 
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        gestor: user.gestor,
        rol: user.rol
      }
    };
  }
}
