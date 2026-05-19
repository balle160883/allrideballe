import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RentaService {
  private readonly logger = new Logger(RentaService.name);

  constructor(private databaseService: DatabaseService) {}

  async findAll() {
    try {
      const result = await this.databaseService.query(
        'SELECT * FROM rentas_mensuales ORDER BY cliente_email ASC'
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
        `INSERT INTO rentas_mensuales (cliente_email, status, monto, fecha_ultimo_pago, proximo_vencimiento)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (cliente_email)
         DO UPDATE SET
           status = EXCLUDED.status,
           monto = EXCLUDED.monto,
           fecha_ultimo_pago = EXCLUDED.fecha_ultimo_pago,
           proximo_vencimiento = EXCLUDED.proximo_vencimiento
         RETURNING *`,
        [
          data.cliente_email,
          data.status,
          data.monto || 0,
          data.fecha_ultimo_pago,
          data.proximo_vencimiento,
        ]
      );
      return result.rows;
    } catch (error) {
      this.logger.error(`Error upserting renta: ${error.message}`);
      throw error;
    }
  }
}
