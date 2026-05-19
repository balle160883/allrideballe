import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(private databaseService: DatabaseService) {}

  async registrarInteraccion(interaccion: any) {
    try {
      const viajeId = parseInt(interaccion.num_cuenta || '1', 10);
      const conductorId = interaccion.gestor_id;
      const resultado = interaccion.resultado || 'no_abordado';
      const observaciones = interaccion.descripcion || '';
      
      // Encontrar al pasajero correspondiente usando su id o identificador QR/tarjeta
      const socioId = interaccion.socio_id; // id de socio (pasajero) en la app anterior
      
      let pasajeroRes = await this.databaseService.query(
        `SELECT id FROM "usuarios" WHERE id::text = $1 OR identificador_tarjeta = $1 LIMIT 1`,
        [socioId]
      );
      
      if (pasajeroRes.rows.length === 0) {
        // Fallback: usar el primer pasajero de prueba
        pasajeroRes = await this.databaseService.query(
          `SELECT id FROM "usuarios" WHERE rol = 'pasajero' LIMIT 1`
        );
      }
      
      const pasajeroId = pasajeroRes.rows[0]?.id;
      
      if (resultado === 'promesa_pago') {
        // En el móvil, el flujo de "Promesa de Pago" se convierte en reservar cupo
        const asiento = Math.floor(Math.random() * 40) + 1; // Asiento aleatorio si no se especifica
        
        await this.databaseService.query(
          `INSERT INTO "reservas" (viaje_id, pasajero_id, asiento_numero, estado) 
           VALUES ($1, $2, $3, 'reservado')
           ON CONFLICT (viaje_id, pasajero_id) 
           DO UPDATE SET estado = 'reservado', asiento_numero = $3`,
          [viajeId, pasajeroId, asiento]
        );
      } else {
        // Cualquier otro registro de visita se convierte en confirmación de abordaje (check-in)
        const estadoReserva = resultado === 'visita_exitosa' ? 'abordado' : 'no_abordado';
        
        await this.databaseService.query(
          `INSERT INTO "reservas" (viaje_id, pasajero_id, asiento_numero, estado) 
           VALUES ($1, $2, (SELECT COALESCE(MAX(asiento_numero), 0) + 1 FROM "reservas" WHERE viaje_id = $1), $3)
           ON CONFLICT (viaje_id, pasajero_id) 
           DO UPDATE SET estado = $3`,
          [viajeId, pasajeroId, estadoReserva]
        );
        
        // Si hubo contingencia (ej: desvío o atraso reportado en observaciones), insertamos alerta
        if (observaciones.toLowerCase().includes('atraso') || observaciones.toLowerCase().includes('contingencia')) {
          await this.databaseService.insertOne('alertas_viaje', {
            viaje_id: viajeId,
            tipo: observaciones.toLowerCase().includes('atraso') ? 'atraso_proyectado' : 'desvio_ruta',
            descripcion: observaciones,
            resuelta: false
          });
        }
      }

      // Retornar un mock compatible con el formato antiguo
      return {
        id: Math.floor(Math.random() * 100000),
        socio_id: socioId,
        resultado,
        descripcion: observaciones
      };
    } catch (error) {
      this.logger.error(`Error registrando check-in de abordaje: ${error.message}`);
      throw error;
    }
  }

  async registrarPromesa(promesa: any) {
    try {
      const viajeId = parseInt(promesa.num_cuenta || '1', 10);
      const asiento = parseInt(promesa.monto || '14', 10) || 14;
      
      // Encontrar al pasajero
      const pasajeroRes = await this.databaseService.query(
        `SELECT id FROM "usuarios" WHERE rol = 'pasajero' LIMIT 1`
      );
      const pasajeroId = pasajeroRes.rows[0]?.id;

      await this.databaseService.query(
        `INSERT INTO "reservas" (viaje_id, pasajero_id, asiento_numero, estado) 
         VALUES ($1, $2, $3, 'reservado')
         ON CONFLICT (viaje_id, pasajero_id) 
         DO UPDATE SET estado = 'reservado', asiento_numero = $3`,
        [viajeId, pasajeroId, asiento]
      );

      return {
        id: Math.floor(Math.random() * 10000),
        monto_prometido: asiento,
        fecha_promesa: promesa.fecha_pago
      };
    } catch (error) {
      this.logger.error(`Error al registrar reserva: ${error.message}`);
      throw error;
    }
  }

  async getInteraccionesSocio(socioId: string) {
    try {
      // Retorna el historial de abordajes (check-ins) para este pasajero
      const sql = `
        SELECT 
          r.id,
          v.id AS num_cuenta,
          ru.nombre AS nombre_visitado,
          v.fecha_hora_salida AS fecha_gestion,
          r.estado AS resultado,
          ('Asiento: ' || r.asiento_numero) AS descripcion,
          u_cond.nombre AS gestor_nombre
        FROM "reservas" r
        JOIN "viajes" v ON r.viaje_id = v.id
        JOIN "rutas" ru ON v.ruta_id = ru.id
        JOIN "usuarios" u_cond ON v.conductor_id = u_cond.id
        WHERE r.pasajero_id = (SELECT id FROM "usuarios" WHERE id::text = $1 OR identificador_tarjeta = $1 LIMIT 1)
        ORDER BY v.fecha_hora_salida DESC
      `;
      const res = await this.databaseService.query(sql, [socioId]);
      return res.rows.map(row => ({
        ...row,
        usuarios_gestor: row.gestor_nombre ? { gestor: row.gestor_nombre } : null
      }));
    } catch (error) {
      this.logger.error(`Error fetching passenger history: ${error.message}`);
      throw error;
    }
  }

  async getInteracciones(gestorId?: string, startDate?: string, endDate?: string) {
    try {
      // Retorna la bitácora de abordajes/check-ins para los administradores
      let sql = `
        SELECT 
          res.id,
          v.id AS num_cuenta,
          r.nombre AS nombre_visitado,
          res.fecha_reserva AS fecha_gestion,
          res.estado AS resultado,
          u_pas.nombre AS descripcion,
          u_cond.nombre AS gestor_nombre
        FROM "reservas" res
        JOIN "viajes" v ON res.viaje_id = v.id
        JOIN "rutas" r ON v.ruta_id = r.id
        JOIN "usuarios" u_pas ON res.pasajero_id = u_pas.id
        JOIN "usuarios" u_cond ON v.conductor_id = u_cond.id
        WHERE 1=1
      `;
      const params: any[] = [];
      
      if (gestorId) {
        params.push(gestorId);
        sql += ` AND u_cond.gestor_code = $1`;
      }
      
      sql += ` ORDER BY res.fecha_reserva DESC LIMIT 500`;
      const res = await this.databaseService.query(sql, params);
      
      return res.rows.map(row => ({
        ...row,
        usuarios_gestor: row.gestor_nombre ? { gestor: row.gestor_nombre } : null
      }));
    } catch (error) {
      this.logger.error(`Error fetching interactions: ${error.message}`);
      throw error;
    }
  }

  async getPromesasPendientes(gestorId?: string, startDate?: string, endDate?: string) {
    try {
      // Mapea a reservas activas ("reservado" o "pendiente")
      let sql = `
        SELECT 
          r.id,
          v.id AS num_cuenta,
          r.asiento_numero AS monto,
          r.fecha_reserva AS fecha_pago,
          r.estado,
          u_pas.nombre AS nombre_visitado,
          u_pas.identificador_tarjeta AS socio_id,
          ru.nombre AS descripcion,
          u_cond.nombre AS gestor_nombre
        FROM "reservas" r
        JOIN "viajes" v ON r.viaje_id = v.id
        JOIN "rutas" ru ON v.ruta_id = ru.id
        JOIN "usuarios" u_pas ON r.pasajero_id = u_pas.id
        JOIN "usuarios" u_cond ON v.conductor_id = u_cond.id
        WHERE r.estado = 'reservado'
      `;
      const params: any[] = [];
      
      if (gestorId) {
        params.push(gestorId);
        sql += ` AND u_cond.gestor_code = $1`;
      }
      
      sql += ` ORDER BY r.fecha_reserva DESC`;
      const res = await this.databaseService.query(sql, params);
      
      return res.rows.map(row => ({
        ...row,
        monto_prometido: row.monto,
        fecha_promesa: row.fecha_pago,
        prestamos_datos: {
          socios_datos: {
            nombre_completo: row.nombre_visitado
          }
        }
      }));
    } catch (error) {
      this.logger.error(`Error fetching seat bookings: ${error.message}`);
      throw error;
    }
  }
}
