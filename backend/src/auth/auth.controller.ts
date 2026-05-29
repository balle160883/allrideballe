import { Controller, Post, Body, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    this.logger.log(`Intento de login para: ${body.email}`);
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      this.logger.warn(`Login fallido para: ${body.email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.authService.login(user);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    this.logger.log(`Solicitud de recuperación de contraseña para: ${body.email}`);
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; password_hash?: string; password?: string }) {
    this.logger.log(`Intento de cambio de contraseña con token.`);
    const rawPassword = body.password || body.password_hash || '';
    return this.authService.resetPassword(body.token, rawPassword);
  }
}
