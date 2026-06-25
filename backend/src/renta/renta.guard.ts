import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { RentaService } from './renta.service';

@Injectable()
export class RentaGuard implements CanActivate {
  private readonly logger = new Logger(RentaGuard.name);

  // Lista blanca de correos y dominios con inmunidad (CPO y Soporte)
  private readonly WHITELIST_EMAILS = [
    'natalie.torres@allride.com',
    'ricardo.almaraz@allride.com',
    'sergio.elizondo@allride.com',
    'ing.ballesteros16@gmail.com'
  ];

  private readonly WHITELIST_DOMAINS = [
    'allride.com',
    'cajapopularoblatos.com.mx'
  ];

  constructor(private rentaService: RentaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.email) return true;

    const email = user.email.toLowerCase();
    const domain = email.split('@')[1];

    // 1. INMUNIDAD TOTAL: Superadmins, Soporte y CPO Staff
    if (user.rol === 'superadmin' || 
        this.WHITELIST_EMAILS.includes(email) || 
        this.WHITELIST_DOMAINS.includes(domain) ||
        email.includes('oblatos')) {
      return true;
    }

    try {
      const rentas = await this.rentaService.findAll();

      // 2. BLOQUEO POR PROVEEDOR: Si el usuario tiene proveedor_id, verificar la renta de su empresa
      const proveedorId = await this.rentaService.getUserProveedorId(email);
      if (proveedorId) {
        const rentaBloqueada = rentas.find(r =>
          r.proveedor_id === proveedorId && r.status === 'bloqueado'
        );
        if (rentaBloqueada) {
          this.logger.warn(`Acceso bloqueado por falta de pago para proveedor_id: ${proveedorId} (usuario: ${email})`);
          throw new ForbiddenException({
            message: 'Servicio Suspendido',
            detail: 'Tu suscripción mensual ha vencido o ha sido bloqueada por el administrador. Favor de contactar a soporte.',
            error: 'PAYMENT_REQUIRED'
          });
        }
        return true;
      }

      // 3. FALLBACK LEGACY: Cuentas sin proveedor_id (dominios/emails directos)
      const rentaBloqueada = rentas.find(r => 
        (r.cliente_email.toLowerCase() === email || r.cliente_email.toLowerCase() === domain) && 
        r.status === 'bloqueado'
      );

      if (rentaBloqueada) {
        this.logger.warn(`Acceso bloqueado por falta de pago para: ${email}`);
        throw new ForbiddenException({
          message: 'Servicio Suspendido',
          detail: 'Tu suscripción mensual ha vencido o ha sido bloqueada por el administrador. Favor de contactar a soporte.',
          error: 'PAYMENT_REQUIRED'
        });
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(`Error verificando renta para ${email}: ${error.message}`);
      // En caso de error de base de datos, permitimos acceso para no afectar la operación
      return true;
    }

    return true;
  }
}
