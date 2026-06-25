import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RentaService {
  private readonly logger = new Logger(RentaService.name);

  constructor(private databaseService: DatabaseService) {}

  async findAll() {
    try {
      const result = await this.databaseService.query(
        `SELECT r.*, p.nombre as proveedor_nombre 
         FROM rentas_mensuales r
         LEFT JOIN proveedores p ON r.proveedor_id = p.id
         ORDER BY r.cliente_email ASC`
      );
      return result.rows;
    } catch (error) {
      this.logger.error(`Error fetching rentas: ${error.message}`);
      throw error;
    }
  }

  async upsert(data: any) {
    try {
      const result = await this.databaseService.query(
        `INSERT INTO rentas_mensuales (cliente_email, status, monto, fecha_ultimo_pago, proximo_vencimiento, proveedor_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (cliente_email)
         DO UPDATE SET
           status = EXCLUDED.status,
           monto = EXCLUDED.monto,
           fecha_ultimo_pago = EXCLUDED.fecha_ultimo_pago,
           proximo_vencimiento = EXCLUDED.proximo_vencimiento,
           proveedor_id = EXCLUDED.proveedor_id
         RETURNING *`,
        [
          data.cliente_email,
          data.status,
          data.monto || 0,
          data.fecha_ultimo_pago,
          data.proximo_vencimiento,
          data.proveedor_id || null,
        ]
      );
      return result.rows;
    } catch (error) {
      this.logger.error(`Error upserting renta: ${error.message}`);
      throw error;
    }
  }

  async getUserProveedorId(email: string): Promise<number | null> {
    try {
      const result = await this.databaseService.query(
        'SELECT proveedor_id FROM "usuarios" WHERE LOWER(email) = LOWER($1)',
        [email.trim()]
      );
      if (result.rows.length > 0) {
        return result.rows[0].proveedor_id;
      }
      return null;
    } catch (error) {
      this.logger.error(`Error fetching user proveedor_id: ${error.message}`);
      return null;
    }
  }
}
