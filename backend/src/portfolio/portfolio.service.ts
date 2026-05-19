import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);

  constructor(private databaseService: DatabaseService) {}

  async getSocios(limit = 50, gestorId?: string) {
    try {
      // En contexto transporte, retornamos los pasajeros autorizados asignados a viajes activos
      const sql = `
        SELECT 
          u.id AS socio_id,
          u.nombre AS nombre_completo,
          u.email AS correo,
          u.identificador_tarjeta AS telefono
        FROM "usuarios" u
        WHERE u.rol = 'pasajero'
        LIMIT $1
      `;
      const res = await this.databaseService.query(sql, [limit]);
      return res.rows;
    } catch (error) {
      this.logger.error(`Error fetching socios (pasajeros): ${error.message}`);
      throw error;
    }
  }

  async getPrestamosPorSocio(socioId: string, gestorId?: string) {
    try {
      // Retornar las reservas activas del pasajero
      const sql = `
        SELECT 
          r.id AS num_cuenta,
          r.viaje_id AS socio_id,
          v.fecha_hora_salida AS fecha_vencimiento,
          0 AS saldo_total,
          0 AS saldo_mora
        FROM "reservas" r
        JOIN "viajes" v ON r.viaje_id = v.id
        WHERE r.pasajero_id = $1
      `;
      const res = await this.databaseService.query(sql, [socioId]);
      return res.rows;
    } catch (error) {
      this.logger.error(`Error fetching reservas por pasajero: ${error.message}`);
      throw error;
    }
  }

  async getCarteraVencida(gestorId?: string) {
    try {
      // Retornamos viajes con alertas activas
      const sql = `
        SELECT 
          v.id AS num_cuenta,
          r.nombre AS "socios_datos_nombre_completo",
          0 AS saldo_total,
          1 AS saldo_mora,
          r.nombre AS tipo_credito
        FROM "viajes" v
        JOIN "rutas" r ON v.ruta_id = r.id
        JOIN "alertas_viaje" a ON a.viaje_id = v.id
        WHERE a.resuelta = FALSE
        LIMIT 100
      `;
      const res = await this.databaseService.query(sql);
      return res.rows.map(row => {
        const { socios_datos_nombre_completo, ...rest } = row;
        return {
          ...rest,
          socios_datos: socios_datos_nombre_completo ? { nombre_completo: socios_datos_nombre_completo } : null
        };
      });
    } catch (error) {
      this.logger.error(`Error fetching viajes con incidencias: ${error.message}`);
      throw error;
    }
  }

  async getAsignaciones(limit = 100, gestorId?: string) {
    try {
      let sql = `
        SELECT 
          v.id AS "NoCUENTA",
          v.id::text AS "NoSOCIO",
          r.nombre AS "NOMBRE",
          (r.origen || ' a ' || r.destino) AS "DOMICILIO",
          1 AS "DIAS MORA",
          CASE 
            WHEN v.estado = 'completado' THEN 'VISITADO'
            ELSE 'VIGENTE'
          END AS "SITUACIÓN DEL CRÉDITO",
          u.gestor_code AS "GESTOR ASIGNADO",
          v.fecha_hora_salida AS "FECHA ASIGNACION",
          0::numeric AS "SALDO TOTAL",
          0::numeric AS "SALDO AL DIA",
          0::numeric AS "PRINCIPAL",
          0::numeric AS "INTERÉS",
          0::numeric AS "INTERÉS MORATORIO",
          0::numeric AS "CAPITAL MOROSO",
          0::numeric AS "CARGO SEGURO",
          0::numeric AS "CARGO COBRANZA",
          '' AS "TELEFONOS",
          r.nombre AS "COLONIA",
          r.nombre AS "Producto",
          r.destino AS "MUNICIPIO",
          '' AS "ESTADO",
          '' AS "CRUCES",
          (r.paradas->0->>'latitud')::numeric AS "LATITUD",
          (r.paradas->0->>'longitud')::numeric AS "LONGITUD"
        FROM "viajes" v
        JOIN "rutas" r ON v.ruta_id = r.id
        JOIN "usuarios" u ON v.conductor_id = u.id
      `;
      const params: any[] = [];
      
      if (gestorId) {
        params.push(gestorId);
        sql += ` WHERE u.gestor_code = $1 AND v.estado <> 'completado'`;
      }
      
      sql += ` ORDER BY v.fecha_hora_salida DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const res = await this.databaseService.query(sql, params);
      return res.rows;
    } catch (error) {
      this.logger.error(`Error fetching asignaciones (viajes): ${error.message}`);
      throw error;
    }
  }

  async getRecuperacion(gestorId?: string, startDate?: string, endDate?: string) {
    const recoveryDocs: any[] = [];
    try {
      let sql = `
        SELECT 
          res.id,
          r.nombre AS ruta_nombre,
          u_pas.nombre AS pasajero_nombre,
          u_pas.identificador_tarjeta AS pasajero_tarjeta,
          v.id AS viaje_id,
          res.fecha_reserva AS fecha_real,
          u_cond.nombre AS conductor_nombre,
          res.estado
        FROM "reservas" res
        JOIN "viajes" v ON res.viaje_id = v.id
        JOIN "rutas" r ON v.ruta_id = r.id
        JOIN "usuarios" u_pas ON res.pasajero_id = u_pas.id
        JOIN "usuarios" u_cond ON v.conductor_id = u_cond.id
        WHERE res.estado = 'abordado'
      `;
      const params: any[] = [];
      if (gestorId) {
        params.push(gestorId);
        sql += ` AND u_cond.gestor_code = $1`;
      }
      sql += ` ORDER BY res.fecha_reserva DESC LIMIT 200`;
      
      const res = await this.databaseService.query(sql, params);
      return res.rows.map(row => ({
        id: row.id,
        abono_total: 1,
        nombre: row.pasajero_nombre,
        numero_socio: row.pasajero_tarjeta || 'Sin Tarjeta',
        num_credito: row.viaje_id.toString(),
        fecha_real: row.fecha_real,
        gestor: row.conductor_nombre,
        tipo: 'ABORDAJE'
      }));
    } catch (err) {
      this.logger.error(`Error in getRecuperacion: ${err.message}`);
    }
    return recoveryDocs;
  }

  async getAllGestoresLocations() {
    try {
      const sql = `
        SELECT DISTINCT ON (uf.viaje_id) 
          uf.id,
          uf.viaje_id AS gestor_id,
          uf.latitud,
          uf.longitud,
          uf.timestamp,
          (r.nombre || ' - Bus: ' || v.patente) AS gestor_name
        FROM "ubicaciones_flota" uf
        JOIN "viajes" vi ON uf.viaje_id = vi.id
        JOIN "rutas" r ON vi.ruta_id = r.id
        JOIN "vehiculos" v ON vi.vehiculo_id = v.id
        ORDER BY uf.viaje_id, uf.timestamp DESC
      `;
      const res = await this.databaseService.query(sql);
      return res.rows;
    } catch (error) {
      this.logger.error(`Error fetching fleet locations: ${error.message}`);
      throw error;
    }
  }

  async getAllGestores() {
    try {
      const sql = `SELECT id, nombre AS gestor FROM "usuarios" WHERE rol = 'conductor' ORDER BY nombre ASC`;
      const res = await this.databaseService.query(sql);
      return res.rows.map(g => ({
        gestor_id: g.gestor_code || g.id,
        gestor_name: g.gestor
      }));
    } catch (error) {
      this.logger.error(`Error fetching all conductors: ${error.message}`);
      throw error;
    }
  }

  async updateAsignacion(noCuenta: string, data: any) {
    try {
      const viajeId = parseInt(noCuenta, 10);
      const situacion = data['SITUACIÓN DEL CRÉDITO'] || data['situacion'];
      let estado = 'programado';
      if (situacion === 'VISITADO' || situacion === 'completado') {
        estado = 'completado';
      } else if (situacion === 'VIGENTE') {
        estado = 'programado';
      } else if (situacion) {
        estado = situacion;
      }
      
      const sql = `UPDATE "viajes" SET "estado" = $1 WHERE "id" = $2 RETURNING *`;
      const res = await this.databaseService.query(sql, [estado, viajeId]);
      
      return {
        NoCUENTA: noCuenta,
        'SITUACIÓN DEL CRÉDITO': estado === 'completado' ? 'VISITADO' : 'VIGENTE'
      };
    } catch (error) {
      this.logger.error(`Error updating asignacion (viaje) ${noCuenta}: ${error.message}`);
      throw error;
    }
  }

  async getAvales(gestorId?: string) {
    // No hay avales en transporte, retornamos un arreglo vacío
    return [];
  }

  async importAvales(file: Buffer) {
    return { success: true, message: 'Función desactivada temporalmente en módulo de transporte.' };
  }

  async saveLocation(gestorId: string, latitud: number, longitud: number, timestamp?: string) {
    try {
      // Buscar el viaje activo para este conductor
      const activeTripRes = await this.databaseService.query(
        `SELECT id FROM "viajes" WHERE conductor_id = (SELECT id FROM "usuarios" WHERE gestor_code = $1 OR id::text = $1 LIMIT 1) AND estado = 'programado' LIMIT 1`,
        [gestorId]
      );
      const viajeId = activeTripRes.rows[0]?.id || 1;
      
      return await this.databaseService.insertOne('ubicaciones_flota', {
        viaje_id: viajeId,
        latitud,
        longitud,
        timestamp: timestamp || new Date().toISOString()
      });
    } catch (error) {
      this.logger.error(`Error saving location: ${error.message}`);
      throw error;
    }
  }
}
