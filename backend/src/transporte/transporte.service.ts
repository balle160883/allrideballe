import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TransporteService {
  private readonly logger = new Logger(TransporteService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  // ==========================================
  // RUTAS
  // ==========================================
  async getRutas(userId?: string) {
    let sql = 'SELECT * FROM "rutas"';
    const params: any[] = [];
    if (userId) {
      const userRes = await this.databaseService.query('SELECT rol, sede_id, proveedor_id FROM "usuarios" WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      if (user) {
        if (user.rol === 'admin_proveedor' && user.proveedor_id) {
          sql += ' WHERE "sede_id" IN (SELECT id FROM "sedes" WHERE "proveedor_id" = $1)';
          params.push(user.proveedor_id);
        } else if (user.sede_id) {
          sql += ' WHERE "sede_id" = $1 OR "sede_id" IS NULL';
          params.push(user.sede_id);
        }
      }
    }
    sql += ' ORDER BY "id" ASC';
    const result = await this.databaseService.query(sql, params);
    return result.rows;
  }

  async createRuta(data: { nombre: string; origen: string; destino: string; paradas: any[]; sede_id?: number }, creatorId?: string) {
    let sede_id = data.sede_id || null;
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        if (sede_id) {
          const check = await this.databaseService.query('SELECT id FROM "sedes" WHERE id = $1 AND "proveedor_id" = $2', [sede_id, user.proveedor_id]);
          if (check.rows.length === 0) {
            throw new Error('La sede especificada no pertenece a tu empresa.');
          }
        }
      }
    }
    const result = await this.databaseService.query(
      'INSERT INTO "rutas" ("nombre", "origen", "destino", "paradas", "sede_id") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.nombre, data.origen, data.destino, JSON.stringify(data.paradas), sede_id]
    );
    return result.rows[0];
  }

  async updateRuta(id: number, data: { nombre: string; origen: string; destino: string; paradas: any[]; activo: boolean; sede_id?: number }, creatorId?: string) {
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const routeCheck = await this.databaseService.query(
          'SELECT sede_id FROM "rutas" WHERE id = $1',
          [id]
        );
        const route = routeCheck.rows[0];
        if (route && route.sede_id) {
          const check = await this.databaseService.query('SELECT id FROM "sedes" WHERE id = $1 AND "proveedor_id" = $2', [route.sede_id, user.proveedor_id]);
          if (check.rows.length === 0) {
            throw new Error('No tienes permisos para modificar esta ruta.');
          }
        }
      }
    }
    const result = await this.databaseService.query(
      'UPDATE "rutas" SET "nombre" = $1, "origen" = $2, "destino" = $3, "paradas" = $4, "activo" = $5, "sede_id" = COALESCE($6, "sede_id") WHERE "id" = $7 RETURNING *',
      [data.nombre, data.origen, data.destino, JSON.stringify(data.paradas), data.activo, data.sede_id || null, id]
    );
    return result.rows[0];
  }

  async deleteRuta(id: number, creatorId?: string) {
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const routeCheck = await this.databaseService.query('SELECT sede_id FROM "rutas" WHERE id = $1', [id]);
        const route = routeCheck.rows[0];
        if (route && route.sede_id) {
          const check = await this.databaseService.query('SELECT id FROM "sedes" WHERE id = $1 AND "proveedor_id" = $2', [route.sede_id, user.proveedor_id]);
          if (check.rows.length === 0) {
            throw new Error('No tienes permisos para eliminar esta ruta.');
          }
        }
      }
    }
    await this.databaseService.query('DELETE FROM "rutas" WHERE "id" = $1', [id]);
    return { success: true };
  }

  // ==========================================
  // VEHÍCULOS
  // ==========================================
  async getVehiculos(userId?: string) {
    let sql = 'SELECT * FROM "vehiculos"';
    const params: any[] = [];
    if (userId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        sql += ' WHERE "proveedor_id" = $1';
        params.push(user.proveedor_id);
      }
    }
    sql += ' ORDER BY "id" ASC';
    const result = await this.databaseService.query(sql, params);
    return result.rows;
  }

  async createVehiculo(data: { patente: string; modelo: string; capacidad: number; proveedor_nombre: string; proveedor_id?: number }, creatorId?: string) {
    let proveedorId = data.proveedor_id || null;
    let proveedorNombre = data.proveedor_nombre;
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id, nombre FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        proveedorId = user.proveedor_id;
        const provRes = await this.databaseService.query('SELECT nombre FROM "proveedores" WHERE id = $1', [proveedorId]);
        if (provRes.rows.length > 0) {
          proveedorNombre = provRes.rows[0].nombre;
        }
      }
    }
    const result = await this.databaseService.query(
      'INSERT INTO "vehiculos" ("patente", "modelo", "capacidad", "proveedor_nombre", "proveedor_id") VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [data.patente, data.modelo, data.capacidad, proveedorNombre, proveedorId]
    );
    return result.rows[0];
  }

  async updateVehiculo(id: number, data: { patente: string; modelo: string; capacidad: number; proveedor_nombre: string; proveedor_id?: number }, creatorId?: string) {
    let proveedorId = data.proveedor_id || null;
    let proveedorNombre = data.proveedor_nombre;
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id, nombre FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const check = await this.databaseService.query('SELECT proveedor_id FROM "vehiculos" WHERE id = $1', [id]);
        if (check.rows.length > 0 && check.rows[0].proveedor_id !== user.proveedor_id) {
          throw new Error('No tienes permisos para modificar este vehículo.');
        }
        proveedorId = user.proveedor_id;
        const provRes = await this.databaseService.query('SELECT nombre FROM "proveedores" WHERE id = $1', [proveedorId]);
        if (provRes.rows.length > 0) {
          proveedorNombre = provRes.rows[0].nombre;
        }
      }
    }
    const result = await this.databaseService.query(
      'UPDATE "vehiculos" SET "patente" = $1, "modelo" = $2, "capacidad" = $3, "proveedor_nombre" = $4, "proveedor_id" = COALESCE($5, "proveedor_id") WHERE "id" = $6 RETURNING *',
      [data.patente, data.modelo, data.capacidad, proveedorNombre, proveedorId, id]
    );
    return result.rows[0];
  }

  async deleteVehiculo(id: number, creatorId?: string) {
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const check = await this.databaseService.query('SELECT proveedor_id FROM "vehiculos" WHERE id = $1', [id]);
        if (check.rows.length > 0 && check.rows[0].proveedor_id !== user.proveedor_id) {
          throw new Error('No tienes permisos para eliminar este vehículo.');
        }
      }
    }
    await this.databaseService.query('DELETE FROM "vehiculos" WHERE "id" = $1', [id]);
    return { success: true };
  }

  // ==========================================
  // CONDUCTORES Y PASAJEROS (USUARIOS)
  // ==========================================
  async getConductores(userId?: string) {
    let sql = 'SELECT "id", "email", "nombre", "rol", "gestor_code", "proveedor_id" FROM "usuarios" WHERE "rol" = \'conductor\'';
    const params: any[] = [];
    if (userId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        sql += ' AND "proveedor_id" = $1';
        params.push(user.proveedor_id);
      }
    }
    sql += ' ORDER BY "nombre" ASC';
    const result = await this.databaseService.query(sql, params);
    return result.rows;
  }

  async getPasajeros(userId?: string) {
    let sql = 'SELECT "id", "email", "nombre", "rol", "identificador_tarjeta", "proveedor_id", "sede_id" FROM "usuarios" WHERE "rol" = \'pasajero\'';
    const params: any[] = [];
    if (userId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        sql += ' AND "proveedor_id" = $1';
        params.push(user.proveedor_id);
      }
    }
    sql += ' ORDER BY "nombre" ASC';
    const result = await this.databaseService.query(sql, params);
    return result.rows;
  }

  async getReservasPasajero(pasajeroId: string) {
    const result = await this.databaseService.query(
      `SELECT
        r.id              AS reserva_id,
        r.asiento_numero,
        r.estado          AS reserva_estado,
        v.id              AS viaje_id,
        v.estado          AS viaje_estado,
        v.fecha_hora_salida,
        ru.nombre         AS ruta_nombre,
        ru.origen,
        ru.destino,
        ru.paradas,
        ve.patente,
        ve.modelo,
        ve.capacidad,
        u.nombre          AS conductor_nombre,
        (
          SELECT row_to_json(ul)
          FROM (
            SELECT latitud, longitud, velocidad, timestamp
            FROM ubicaciones_flota
            WHERE viaje_id = v.id
            ORDER BY timestamp DESC
            LIMIT 1
          ) ul
        ) AS ultima_ubicacion
      FROM reservas r
      JOIN viajes v   ON r.viaje_id   = v.id
      JOIN rutas  ru  ON v.ruta_id    = ru.id
      JOIN vehiculos ve ON v.vehiculo_id = ve.id
      LEFT JOIN usuarios u ON v.conductor_id = u.id
      WHERE r.pasajero_id = $1
      ORDER BY v.fecha_hora_salida DESC`,
      [pasajeroId]
    );
    return result.rows;
  }

  // ==========================================
  // VIAJES (SERVICIOS PROGRAMADOS)
  // ==========================================
  async getViajes(conductorId?: string, userId?: string) {
    let query = `
      SELECT v.*, r.nombre as ruta_nombre, r.origen, r.destino, r.paradas,
             ve.patente, ve.modelo, ve.capacidad, u.nombre as conductor_nombre
      FROM "viajes" v
      LEFT JOIN "rutas" r ON v.ruta_id = r.id
      LEFT JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
      LEFT JOIN "usuarios" u ON v.conductor_id = u.id
    `;
    const params: any[] = [];
    let conditions: string[] = [];

    if (conductorId) {
      conditions.push('v.conductor_id = $' + (params.length + 1));
      params.push(conductorId);
    }

    if (userId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id, sede_id FROM "usuarios" WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      if (user) {
        if (user.rol === 'admin_proveedor' && user.proveedor_id) {
          conditions.push('v.proveedor_id = $' + (params.length + 1));
          params.push(user.proveedor_id);
        } else if (user.rol === 'pasajero' && user.sede_id) {
          conditions.push('v.sede_id = $' + (params.length + 1));
          params.push(user.sede_id);
        }
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY v.fecha_hora_salida DESC';
    const result = await this.databaseService.query(query, params);
    return result.rows;
  }

  async createViaje(data: { ruta_id: number; vehiculo_id: number; conductor_id: string; fecha_hora_salida: string; proveedor_id?: number; sede_id?: number }, creatorId?: string) {
    let proveedorId = data.proveedor_id || null;
    let sedeId = data.sede_id || null;

    // 1. Obtener sede_id de la ruta
    const routeRes = await this.databaseService.query('SELECT "sede_id" FROM "rutas" WHERE "id" = $1', [data.ruta_id]);
    const route = routeRes.rows[0];
    if (route && route.sede_id) {
      sedeId = route.sede_id;
      // Obtener proveedor_id de la sede
      const SedeRes = await this.databaseService.query('SELECT "proveedor_id" FROM "sedes" WHERE "id" = $1', [sedeId]);
      if (SedeRes.rows.length > 0 && SedeRes.rows[0].proveedor_id) {
        proveedorId = SedeRes.rows[0].proveedor_id;
      }
    }

    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        proveedorId = user.proveedor_id;
      }
    }

    const result = await this.databaseService.query(
      'INSERT INTO "viajes" ("ruta_id", "vehiculo_id", "conductor_id", "fecha_hora_salida", "proveedor_id", "sede_id") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.ruta_id, data.vehiculo_id, data.conductor_id, data.fecha_hora_salida, proveedorId, sedeId]
    );
    const createdViaje = result.rows[0];
    if (createdViaje) {
      this.notifyDriverNewTrip(createdViaje.id).catch(err => {
        this.logger.error(`Error al notificar al conductor del viaje #${createdViaje.id}: ${err.message}`);
      });
    }
    return createdViaje;
  }

  async updateViajeEstado(id: number, estado: string) {
    const result = await this.databaseService.query(
      'UPDATE "viajes" SET "estado" = $1 WHERE "id" = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0];
  }

  async deleteViaje(id: number) {
    await this.databaseService.query('DELETE FROM "viajes" WHERE "id" = $1', [id]);
    return { success: true };
  }

  // ==========================================
  // RESERVAS
  // ==========================================
  async getReservas(viajeId: number) {
    const result = await this.databaseService.query(
      `SELECT r.*, u.nombre as pasajero_nombre, u.email as pasajero_email, u.identificador_tarjeta
       FROM "reservas" r
       LEFT JOIN "usuarios" u ON r.pasajero_id = u.id
       WHERE r.viaje_id = $1 AND r.estado IN ('reservado', 'confirmado')
       ORDER BY r.asiento_numero ASC`,
      [viajeId]
    );
    return result.rows;
  }

  async createReserva(data: { viaje_id: number; pasajero_id: string; asiento_numero: number }) {
    const result = await this.databaseService.query(
      'INSERT INTO "reservas" ("viaje_id", "pasajero_id", "asiento_numero") VALUES ($1, $2, $3) RETURNING *',
      [data.viaje_id, data.pasajero_id, data.asiento_numero]
    );
    const createdReserva = result.rows[0];
    if (createdReserva) {
      this.notifyPassengerReservaStatus(createdReserva.id, 'creada').catch(err => {
        this.logger.error(`Error al notificar al pasajero de creación de reserva #${createdReserva.id}: ${err.message}`);
      });
    }
    return createdReserva;
  }

  async updateReservaEstado(id: number, estado: string) {
    const result = await this.databaseService.query(
      'UPDATE "reservas" SET "estado" = $1 WHERE "id" = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0];
  }

  async getViajesDisponibles(pasajeroId: string) {
    const result = await this.databaseService.query(
      `SELECT v.id, v.fecha_hora_salida, v.estado as viaje_estado,
              ru.nombre as ruta_nombre, ru.origen, ru.destino, ru.paradas,
              ve.patente, ve.modelo, ve.capacidad,
              (
                SELECT count(*)::int
                FROM "reservas" res
                WHERE res.viaje_id = v.id AND res.estado != 'cancelado' AND res.estado != 'rechazado'
              ) AS ocupados
       FROM "viajes" v
       JOIN "rutas" ru ON v.ruta_id = ru.id
       JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
       WHERE v.estado = 'programado'
         AND NOT EXISTS (
           SELECT 1 FROM "reservas" res2
           WHERE res2.viaje_id = v.id AND res2.pasajero_id = $1 AND res2.estado != 'cancelado' AND res2.estado != 'rechazado'
         )
       ORDER BY v.fecha_hora_salida ASC`,
      [pasajeroId]
    );
    return result.rows;
  }

  async solicitarReserva(pasajeroId: string, viajeId: number) {
    // 1. Obtener capacidad y validar viaje
    const viajeResult = await this.databaseService.query(
      `SELECT v.*, ve.capacidad
       FROM "viajes" v
       JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
       WHERE v.id = $1`,
      [viajeId]
    );
    if (viajeResult.rows.length === 0) {
      throw new Error('Viaje no encontrado');
    }
    const viaje = viajeResult.rows[0];
    if (viaje.estado !== 'programado') {
      throw new Error('El viaje ya no está programado para reservas');
    }

    // 2. Verificar duplicado
    const dupCheck = await this.databaseService.query(
      `SELECT id FROM "reservas" 
       WHERE viaje_id = $1 AND pasajero_id = $2 AND estado != 'cancelado' AND estado != 'rechazado'`,
      [viajeId, pasajeroId]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error('Ya tienes una solicitud o reserva activa para este viaje');
    }

    // 3. Buscar asientos ocupados para auto-asignar el siguiente libre (Opción A)
    const asientosResult = await this.databaseService.query(
      `SELECT asiento_numero FROM "reservas" 
       WHERE viaje_id = $1 AND estado != 'cancelado' AND estado != 'rechazado' 
       ORDER BY asiento_numero ASC`,
      [viajeId]
    );
    const ocupados = new Set(asientosResult.rows.map(r => r.asiento_numero));
    
    let asientoSugerido = -1;
    for (let i = 1; i <= viaje.capacidad; i++) {
      if (!ocupados.has(i)) {
        asientoSugerido = i;
        break;
      }
    }

    if (asientoSugerido === -1) {
      throw new Error('El vehículo de este viaje ya se encuentra a su máxima capacidad');
    }

    // 4. Crear reserva en estado pendiente_aprobacion
    const insertResult = await this.databaseService.query(
      `INSERT INTO "reservas" ("viaje_id", "pasajero_id", "asiento_numero", "estado")
       VALUES ($1, $2, $3, 'pendiente_aprobacion') RETURNING *`,
      [viajeId, pasajeroId, asientoSugerido]
    );
    return insertResult.rows[0];
  }

  async getReservasPendientes() {
    const result = await this.databaseService.query(
      `SELECT r.*, 
              u.nombre as pasajero_nombre, u.email as pasajero_email,
              v.fecha_hora_salida, v.estado as viaje_estado,
              ru.nombre as ruta_nombre, ru.origen, ru.destino,
              ve.patente, ve.modelo
       FROM "reservas" r
       JOIN "usuarios" u ON r.pasajero_id = u.id
       JOIN "viajes" v ON r.viaje_id = v.id
       JOIN "rutas" ru ON v.ruta_id = ru.id
       JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
       WHERE r.estado = 'pendiente_aprobacion'
       ORDER BY v.fecha_hora_salida ASC`
    );
    return result.rows;
  }

  async aprobarReserva(reservaId: number, approvedBy: string, notas?: string) {
    const result = await this.databaseService.query(
      `UPDATE "reservas"
       SET "estado" = 'reservado',
           "aprobado_por" = $1,
           "fecha_aprobacion" = CURRENT_TIMESTAMP,
           "notas_gerente" = $2
       WHERE "id" = $3 RETURNING *`,
      [approvedBy, notas || null, reservaId]
    );
    if (result.rows.length === 0) {
      throw new Error('Reserva no encontrada');
    }
    
    const reserva = result.rows[0];
    this.notifyPassengerReservaStatus(reservaId, 'aprobada').catch(err => {
      this.logger.error(`Error al notificar al pasajero de aprobación de reserva #${reservaId}: ${err.message}`);
    });
    
    return reserva;
  }

  async rechazarReserva(reservaId: number, approvedBy: string, notas?: string) {
    const result = await this.databaseService.query(
      `UPDATE "reservas"
       SET "estado" = 'rechazado',
           "aprobado_por" = $1,
           "fecha_aprobacion" = CURRENT_TIMESTAMP,
           "notas_gerente" = $2
       WHERE "id" = $3 RETURNING *`,
      [approvedBy, notas || null, reservaId]
    );
    if (result.rows.length === 0) {
      throw new Error('Reserva no encontrada');
    }
    
    const reserva = result.rows[0];
    this.notifyPassengerReservaStatus(reservaId, 'rechazada').catch(err => {
      this.logger.error(`Error al notificar al pasajero de rechazo de reserva #${reservaId}: ${err.message}`);
    });
    
    return reserva;
  }

  private async notifyPassengerReservaStatus(reservaId: number, status: 'aprobada' | 'rechazada' | 'creada') {
    try {
      const res = await this.databaseService.query(
        `SELECT u.push_token, u.nombre as pasajero_nombre, r.nombre as ruta_nombre, v.fecha_hora_salida
         FROM "reservas" res
         JOIN "usuarios" u ON res.pasajero_id = u.id
         JOIN "viajes" v ON res.viaje_id = v.id
         JOIN "rutas" r ON v.ruta_id = r.id
         WHERE res.id = $1`,
        [reservaId]
      );
      
      if (res.rows.length === 0) return;
      const { push_token, pasajero_nombre, ruta_nombre, fecha_hora_salida } = res.rows[0];
      
      if (push_token) {
        const localTime = new Date(fecha_hora_salida).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Mexico_City',
        });
        
        let title = '';
        let body = '';
        if (status === 'aprobada') {
          title = '🎫 Reserva Aprobada';
          body = `Hola ${pasajero_nombre}, tu reservación para la ruta "${ruta_nombre}" con salida a las ${localTime} ha sido aprobada.`;
        } else if (status === 'rechazada') {
          title = '❌ Reserva Rechazada';
          body = `Hola ${pasajero_nombre}, tu reservación para la ruta "${ruta_nombre}" con salida a las ${localTime} ha sido rechazada.`;
        } else if (status === 'creada') {
          title = '🚌 Viaje Reservado';
          body = `Hola ${pasajero_nombre}, se te ha reservado un asiento en la ruta "${ruta_nombre}" con salida a las ${localTime}.`;
        }
        
        await this.sendExpoPushNotification(push_token, title, body, { reserva_id: reservaId });
      }
    } catch (e: any) {
      this.logger.error(`Error en notifyPassengerReservaStatus para reserva #${reservaId}: ${e.message}`);
    }
  }


  // ==========================================
  // GPS / UBICACIONES DE FLOTA
  // ==========================================
  async saveLocation(data: { viaje_id: number; latitud: number; longitud: number; velocidad?: number }) {
    const result = await this.databaseService.query(
      'INSERT INTO "ubicaciones_flota" ("viaje_id", "latitud", "longitud", "velocidad") VALUES ($1, $2, $3, $4) RETURNING *',
      [data.viaje_id, data.latitud, data.longitud, data.velocidad || 0]
    );

    // Procesamiento en segundo plano para no demorar la respuesta de la petición API
    this.processGeofencing(data.viaje_id, Number(data.latitud), Number(data.longitud)).catch(err => {
      this.logger.error(`Error al procesar geofencing del viaje ${data.viaje_id}: ${err.message}`);
    });

    return result.rows[0];
  }

  private async processGeofencing(viajeId: number, currentLat: number, currentLng: number) {
    const routeRes = await this.databaseService.query(
      `SELECT r.paradas, v.ruta_id
       FROM viajes v 
       JOIN rutas r ON v.ruta_id = r.id 
       WHERE v.id = $1`,
      [viajeId]
    );

    if (routeRes.rows.length === 0) return;
    const paradas = routeRes.rows[0].paradas;
    if (!Array.isArray(paradas)) return;

    // Obtener los arribos y salidas ya registrados de este viaje en una sola consulta
    const existingTimesRes = await this.databaseService.query(
      'SELECT orden, "fecha_hora_llegada", "fecha_hora_salida" FROM "tiempos_paradas" WHERE "viaje_id" = $1',
      [viajeId]
    );
    const existingTimes = new Map<number, { llegada: any; salida: any }>();
    existingTimesRes.rows.forEach((row: any) => {
      existingTimes.set(Number(row.orden), { llegada: row.fecha_hora_llegada, salida: row.fecha_hora_salida });
    });

    const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // Radio en km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    for (const parada of paradas) {
      const pLat = Number(parada.latitud);
      const pLng = Number(parada.longitud);
      const dist = calculateDistanceKm(currentLat, currentLng, pLat, pLng);
      const orden = Number(parada.orden);

      if (dist <= 0.1) { // 100 metros
        // Validar si ya se registró la llegada en memoria
        const record = existingTimes.get(orden);
        if (!record || !record.llegada) {
          // Registrar arribo real
          await this.databaseService.query(
            `INSERT INTO "tiempos_paradas" ("viaje_id", "parada_nombre", "orden", "fecha_hora_llegada") 
             VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
             ON CONFLICT ("viaje_id", "orden") DO UPDATE SET "fecha_hora_llegada" = COALESCE("tiempos_paradas"."fecha_hora_llegada", CURRENT_TIMESTAMP)`,
            [viajeId, parada.nombre, orden]
          );
          this.logger.log(`[Geofencing] Autobús ingresó a la parada "${parada.nombre}" del viaje #${viajeId}`);

          // Notificar de manera inteligente a los pasajeros de la siguiente parada
          await this.notifyApproachingPassengers(viajeId, parada.nombre, orden);
        }
      } else if (dist > 0.25) { // 250 metros
        // Si ya ingresó pero no ha marcado salida, registrar la salida real
        const record = existingTimes.get(orden);
        if (record && record.llegada && !record.salida) {
          await this.databaseService.query(
            `UPDATE "tiempos_paradas" 
             SET "fecha_hora_salida" = CURRENT_TIMESTAMP 
             WHERE "viaje_id" = $1 AND "orden" = $2 AND "fecha_hora_salida" IS NULL`,
            [viajeId, orden]
          );
        }
      }
    }
  }

  private async notifyApproachingPassengers(viajeId: number, paradaActualNombre: string, ordenParadaActual: number) {
    try {
      const routeRes = await this.databaseService.query(
        `SELECT r.paradas, r.nombre as ruta_nombre FROM viajes v JOIN rutas r ON v.ruta_id = r.id WHERE v.id = $1`,
        [viajeId]
      );
      if (routeRes.rows.length === 0) return;
      const { paradas, ruta_nombre } = routeRes.rows[0];
      if (!Array.isArray(paradas)) return;

      // Buscar si existe la siguiente parada
      const nextParada = paradas.find(p => p.orden === ordenParadaActual + 1);
      if (!nextParada) return; // Parada final, no hay siguiente

      // Buscar pasajeros que tengan reservación para este viaje
      const passengers = await this.databaseService.query(
        `SELECT u.id, u.nombre, u.email, u.push_token 
         FROM reservas r
         JOIN usuarios u ON r.pasajero_id = u.id
         WHERE r.viaje_id = $1 AND r.estado = 'reservado'`,
        [viajeId]
      );

      for (const p of passengers.rows) {
        this.logger.log(
          `[Notificación de Proximidad] Enviando alerta a ${p.nombre} (${p.email}): El autobús de la ruta "${ruta_nombre}" cruzó "${paradaActualNombre}" y está próximo a su parada "${nextParada.nombre}".`
        );
        
        if (p.push_token) {
          const title = '🚌 Autobús Próximo';
          const body = `Hola ${p.nombre}, el autobús de la ruta "${ruta_nombre}" cruzó "${paradaActualNombre}" y se dirige hacia la parada "${nextParada.nombre}".`;
          await this.sendExpoPushNotification(p.push_token, title, body, { viaje_id: viajeId });
        }
      }
    } catch (e: any) {
      this.logger.error(`Error al enviar notificaciones de proximidad: ${e.message}`);
    }
  }

  async getLatestLocations() {
    const result = await this.databaseService.query(`
      SELECT DISTINCT ON (uf.viaje_id) 
        uf.viaje_id, uf.latitud, uf.longitud, uf.velocidad, uf.timestamp,
        COALESCE(r.nombre, 'Ruta sin nombre') as ruta_nombre, 
        COALESCE(ve.patente, 'S/D') as patente, 
        COALESCE(u.nombre, 'Conductor no asignado') as conductor_nombre
      FROM "ubicaciones_flota" uf
      INNER JOIN "viajes" v ON uf.viaje_id = v.id
      LEFT JOIN "rutas" r ON v.ruta_id = r.id
      LEFT JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
      LEFT JOIN "usuarios" u ON v.conductor_id = u.id
      WHERE uf.timestamp >= NOW() - INTERVAL '2 hours'
        AND v.estado IN ('en_ruta', 'programado')
      ORDER BY uf.viaje_id, uf.timestamp DESC
    `);
    return result.rows;
  }

  // ==========================================
  // ALERTAS DE VIAJE
  // ==========================================
  async getAlertas(userId?: string) {
    let sql = `
      SELECT a.*, r.nombre as ruta_nombre, ve.patente
      FROM "alertas_viaje" a
      LEFT JOIN "viajes" v ON a.viaje_id = v.id
      LEFT JOIN "rutas" r ON v.ruta_id = r.id
      LEFT JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
    `;
    const params: any[] = [];
    if (userId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id, sede_id FROM "usuarios" WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      if (user) {
        let conditions: string[] = [];
        if (user.rol === 'admin_proveedor' && user.proveedor_id) {
          conditions.push('v.proveedor_id = $1');
          params.push(user.proveedor_id);
        } else if (user.rol === 'pasajero' && user.sede_id) {
          conditions.push('v.sede_id = $1');
          params.push(user.sede_id);
        }
        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }
      }
    }
    sql += ' ORDER BY a.timestamp DESC';
    const result = await this.databaseService.query(sql, params);
    return result.rows;
  }

  async createAlerta(data: { viaje_id?: number | null; tipo: string; descripcion: string; latitud?: number; longitud?: number; prioridad?: string }) {
    const prioridad = data.prioridad || ((data.tipo === 'sos' || data.tipo === 'acoso') ? 'alta' : 'media');
    const result = await this.databaseService.query(
      'INSERT INTO "alertas_viaje" ("viaje_id", "tipo", "descripcion", "latitud", "longitud", "prioridad") VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.viaje_id || null, data.tipo, data.descripcion, data.latitud || null, data.longitud || null, prioridad]
    );
    return result.rows[0];
  }

  async resolverAlerta(id: number) {
    const result = await this.databaseService.query(
      'UPDATE "alertas_viaje" SET "resuelta" = TRUE WHERE "id" = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  async abordarPasajero(viajeId: number, identificadorTarjeta: string) {
    // 1. Buscar pasajero por su identificador de tarjeta (QR o RFID)
    const userResult = await this.databaseService.query(
      'SELECT id, nombre, email, rol, "identificador_tarjeta" FROM "usuarios" WHERE "identificador_tarjeta" = $1 AND "rol" = \'pasajero\'',
      [identificadorTarjeta]
    );

    if (userResult.rows.length === 0) {
      throw new BadRequestException('La tarjeta o código QR no pertenece a ningún pasajero registrado.');
    }

    const passenger = userResult.rows[0];

    // 2. Buscar la reservación para este pasajero en este viaje específico
    const reservaResult = await this.databaseService.query(
      'SELECT * FROM "reservas" WHERE "viaje_id" = $1 AND "pasajero_id" = $2',
      [viajeId, passenger.id]
    );

    if (reservaResult.rows.length === 0) {
      throw new BadRequestException(`El pasajero ${passenger.nombre} no tiene una reservación activa para este viaje.`);
    }

    const reserva = reservaResult.rows[0];

    if (reserva.estado === 'pendiente_aprobacion') {
      throw new BadRequestException(`La solicitud de reservación de ${passenger.nombre} aún está pendiente de aprobación por su gerente.`);
    }

    if (reserva.estado === 'rechazado') {
      throw new BadRequestException(`La solicitud de reservación de ${passenger.nombre} fue rechazada.`);
    }

    if (reserva.estado === 'confirmado' || reserva.estado === 'abordado') {
      return {
        success: true,
        reserva: {
          ...reserva,
          pasajero_nombre: passenger.nombre,
          pasajero_email: passenger.email,
          identificador_tarjeta: passenger.identificador_tarjeta,
        },
      };
    }

    if (reserva.estado === 'cancelado') {
      throw new BadRequestException(`La reservación de ${passenger.nombre} para este viaje está cancelada.`);
    }

    // 3. Registrar el abordaje marcando la reserva como 'confirmado' (abordado)
    // El frontend Next.js y la app de Expo usan 'confirmado' para marcar el abordaje exitoso
    const updateResult = await this.databaseService.query(
      'UPDATE "reservas" SET "estado" = \'confirmado\' WHERE "id" = $1 RETURNING *',
      [reserva.id]
    );

    const updatedReserva = updateResult.rows[0];

    return {
      success: true,
      reserva: {
        ...updatedReserva,
        pasajero_nombre: passenger.nombre,
        pasajero_email: passenger.email,
        identificador_tarjeta: passenger.identificador_tarjeta,
      },
    };
  }

  async createPasajero(data: { email: string; nombre: string; identificador_tarjeta: string; sede_id?: number; proveedor_id?: number }, creatorId?: string) {
    const emailLower = data.email.trim().toLowerCase();
    const emailCheck = await this.databaseService.query(
      'SELECT id FROM "usuarios" WHERE "email" = $1',
      [emailLower]
    );
    if (emailCheck.rows.length > 0) {
      throw new Error('El correo electrónico ya está registrado.');
    }

    let proveedorId = data.proveedor_id || null;
    let sedeId = data.sede_id || null;

    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        proveedorId = user.proveedor_id;
        if (sedeId) {
          const check = await this.databaseService.query('SELECT id FROM "sedes" WHERE id = $1 AND "proveedor_id" = $2', [sedeId, user.proveedor_id]);
          if (check.rows.length === 0) {
            throw new Error('La sede especificada no pertenece a tu empresa.');
          }
        }
      }
    }

    const passwordHash = await bcrypt.hash('Pasajero2026@', 10);

    const result = await this.databaseService.query(
      'INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "identificador_tarjeta", "proveedor_id", "sede_id") VALUES ($1, $2, $3, \'pasajero\', $4, $5, $6) RETURNING "id", "email", "nombre", "rol", "identificador_tarjeta", "proveedor_id", "sede_id"',
      [emailLower, passwordHash, data.nombre.trim(), data.identificador_tarjeta?.trim() || null, proveedorId, sedeId]
    );

    return result.rows[0];
  }

  async updatePasajero(id: string, data: { email?: string; nombre?: string; identificador_tarjeta?: string; sede_id?: number; proveedor_id?: number }, creatorId?: string) {
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const check = await this.databaseService.query('SELECT proveedor_id FROM "usuarios" WHERE id = $1 AND "rol" = \'pasajero\'', [id]);
        if (check.rows.length > 0 && check.rows[0].proveedor_id !== user.proveedor_id) {
          throw new Error('No tienes permisos para modificar este pasajero.');
        }
      }
    }

    if (data.email) {
      const emailLower = data.email.trim().toLowerCase();
      const emailCheck = await this.databaseService.query(
        'SELECT id FROM "usuarios" WHERE "email" = $1 AND "id" != $2',
        [emailLower, id]
      );
      if (emailCheck.rows.length > 0) {
        throw new Error('El correo electrónico ya está registrado por otro usuario.');
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let placeholderIdx = 1;

    if (data.nombre !== undefined) {
      fields.push(`"nombre" = $${placeholderIdx++}`);
      values.push(data.nombre.trim());
    }
    if (data.email !== undefined) {
      fields.push(`"email" = $${placeholderIdx++}`);
      values.push(data.email.trim().toLowerCase());
    }
    if (data.identificador_tarjeta !== undefined) {
      fields.push(`"identificador_tarjeta" = $${placeholderIdx++}`);
      values.push(data.identificador_tarjeta?.trim() || null);
    }
    if (data.sede_id !== undefined) {
      fields.push(`"sede_id" = $${placeholderIdx++}`);
      values.push(data.sede_id || null);
    }
    if (data.proveedor_id !== undefined) {
      fields.push(`"proveedor_id" = $${placeholderIdx++}`);
      values.push(data.proveedor_id || null);
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar.');
    }

    values.push(id);
    const sql = `UPDATE "usuarios" SET ${fields.join(', ')} WHERE "id" = $${placeholderIdx} RETURNING "id", "email", "nombre", "rol", "identificador_tarjeta", "proveedor_id", "sede_id"`;
    const result = await this.databaseService.query(sql, values);

    if (result.rows.length === 0) {
      throw new Error('Pasajero no encontrado.');
    }

    return result.rows[0];
  }

  async deletePasajero(id: string, creatorId?: string) {
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const check = await this.databaseService.query('SELECT proveedor_id FROM "usuarios" WHERE id = $1 AND "rol" = \'pasajero\'', [id]);
        if (check.rows.length > 0 && check.rows[0].proveedor_id !== user.proveedor_id) {
          throw new Error('No tienes permisos para eliminar este pasajero.');
        }
      }
    }
    const result = await this.databaseService.query(
      'DELETE FROM "usuarios" WHERE "id" = $1 AND "rol" = \'pasajero\' RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      throw new Error('Pasajero no encontrado o no tiene rol de pasajero.');
    }
    return { success: true, message: 'Pasajero eliminado correctamente.' };
  }

  async createConductor(data: { email: string; nombre: string; gestor_code?: string; proveedor_id?: number }, creatorId?: string) {
    const emailLower = data.email.trim().toLowerCase();
    const emailCheck = await this.databaseService.query(
      'SELECT id FROM "usuarios" WHERE "email" = $1',
      [emailLower]
    );
    if (emailCheck.rows.length > 0) {
      throw new Error('El correo electrónico ya está registrado.');
    }

    let proveedorId = data.proveedor_id || null;
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        proveedorId = user.proveedor_id;
      }
    }

    const passwordHash = await bcrypt.hash('Conductor2026@', 10);

    const result = await this.databaseService.query(
      'INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "gestor_code", "proveedor_id") VALUES ($1, $2, $3, \'conductor\', $4, $5) RETURNING "id", "email", "nombre", "rol", "gestor_code", "proveedor_id"',
      [emailLower, passwordHash, data.nombre.trim(), data.gestor_code?.trim() || null, proveedorId]
    );

    return result.rows[0];
  }

  async updateConductor(id: string, data: { email?: string; nombre?: string; gestor_code?: string; proveedor_id?: number }, creatorId?: string) {
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const check = await this.databaseService.query('SELECT proveedor_id FROM "usuarios" WHERE id = $1 AND "rol" = \'conductor\'', [id]);
        if (check.rows.length > 0 && check.rows[0].proveedor_id !== user.proveedor_id) {
          throw new Error('No tienes permisos para modificar este conductor.');
        }
      }
    }

    if (data.email) {
      const emailLower = data.email.trim().toLowerCase();
      const emailCheck = await this.databaseService.query(
        'SELECT id FROM "usuarios" WHERE "email" = $1 AND "id" != $2',
        [emailLower, id]
      );
      if (emailCheck.rows.length > 0) {
        throw new Error('El correo electrónico ya está registrado por otro usuario.');
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let placeholderIdx = 1;

    if (data.nombre !== undefined) {
      fields.push(`"nombre" = $${placeholderIdx++}`);
      values.push(data.nombre.trim());
    }
    if (data.email !== undefined) {
      fields.push(`"email" = $${placeholderIdx++}`);
      values.push(data.email.trim().toLowerCase());
    }
    if (data.gestor_code !== undefined) {
      fields.push(`"gestor_code" = $${placeholderIdx++}`);
      values.push(data.gestor_code?.trim() || null);
    }
    if (data.proveedor_id !== undefined) {
      fields.push(`"proveedor_id" = $${placeholderIdx++}`);
      values.push(data.proveedor_id || null);
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar.');
    }

    values.push(id);
    const sql = `UPDATE "usuarios" SET ${fields.join(', ')} WHERE "id" = $${placeholderIdx} AND "rol" = 'conductor' RETURNING "id", "email", "nombre", "rol", "gestor_code", "proveedor_id"`;
    const result = await this.databaseService.query(sql, values);

    if (result.rows.length === 0) {
      throw new Error('Conductor no encontrado o no tiene rol de conductor.');
    }

    return result.rows[0];
  }

  async deleteConductor(id: string, creatorId?: string) {
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const check = await this.databaseService.query('SELECT proveedor_id FROM "usuarios" WHERE id = $1 AND "rol" = \'conductor\'', [id]);
        if (check.rows.length > 0 && check.rows[0].proveedor_id !== user.proveedor_id) {
          throw new Error('No tienes permisos para eliminar este conductor.');
        }
      }
    }
    const result = await this.databaseService.query(
      'DELETE FROM "usuarios" WHERE "id" = $1 AND "rol" = \'conductor\' RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      throw new Error('Conductor no encontrado o no tiene rol de conductor.');
    }
    return { success: true, message: 'Conductor eliminado correctamente.' };
  }

  async getAdminProveedores() {
    const result = await this.databaseService.query(
      'SELECT "id", "email", "nombre", "rol", "gestor_code", "proveedor_id" FROM "usuarios" WHERE "rol" = \'admin_proveedor\' ORDER BY "nombre" ASC'
    );
    return result.rows;
  }

  async createAdminProveedor(data: { email: string; nombre: string; gestor_code?: string; proveedor_id?: number }) {
    const emailLower = data.email.trim().toLowerCase();
    const emailCheck = await this.databaseService.query(
      'SELECT id FROM "usuarios" WHERE "email" = $1',
      [emailLower]
    );
    if (emailCheck.rows.length > 0) {
      throw new Error('El correo electrónico ya está registrado.');
    }

    const passwordHash = await bcrypt.hash('Proveedor2026@', 10);
    const proveedorId = data.proveedor_id || null;

    const result = await this.databaseService.query(
      'INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "gestor_code", "proveedor_id") VALUES ($1, $2, $3, \'admin_proveedor\', $4, $5) RETURNING "id", "email", "nombre", "rol", "gestor_code", "proveedor_id"',
      [emailLower, passwordHash, data.nombre.trim(), data.gestor_code?.trim() || null, proveedorId]
    );

    return result.rows[0];
  }

  async updateAdminProveedor(id: string, data: { email?: string; nombre?: string; gestor_code?: string; proveedor_id?: number }) {
    if (data.email) {
      const emailLower = data.email.trim().toLowerCase();
      const emailCheck = await this.databaseService.query(
        'SELECT id FROM "usuarios" WHERE "email" = $1 AND "id" != $2',
        [emailLower, id]
      );
      if (emailCheck.rows.length > 0) {
        throw new Error('El correo electrónico ya está registrado por otro usuario.');
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let placeholderIdx = 1;

    if (data.nombre !== undefined) {
      fields.push(`"nombre" = $${placeholderIdx++}`);
      values.push(data.nombre.trim());
    }
    if (data.email !== undefined) {
      fields.push(`"email" = $${placeholderIdx++}`);
      values.push(data.email.trim().toLowerCase());
    }
    if (data.gestor_code !== undefined) {
      fields.push(`"gestor_code" = $${placeholderIdx++}`);
      values.push(data.gestor_code?.trim() || null);
    }
    if (data.proveedor_id !== undefined) {
      fields.push(`"proveedor_id" = $${placeholderIdx++}`);
      values.push(data.proveedor_id || null);
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar.');
    }

    values.push(id);
    const sql = `UPDATE "usuarios" SET ${fields.join(', ')} WHERE "id" = $${placeholderIdx} AND "rol" = 'admin_proveedor' RETURNING "id", "email", "nombre", "rol", "gestor_code", "proveedor_id"`;
    const result = await this.databaseService.query(sql, values);

    if (result.rows.length === 0) {
      throw new Error('Proveedor no encontrado o no tiene rol de admin_proveedor.');
    }

    return result.rows[0];
  }

  async deleteAdminProveedor(id: string) {
    const result = await this.databaseService.query(
      'DELETE FROM "usuarios" WHERE "id" = $1 AND "rol" = \'admin_proveedor\' RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      throw new Error('Proveedor no encontrado o no tiene rol de admin_proveedor.');
    }
    return { success: true, message: 'Proveedor eliminado correctamente.' };
  }

  async setDomicilioPasajero(pasajeroId: string, data: { direccion: string; latitud: number; longitud: number }) {
    const result = await this.databaseService.query(
      'UPDATE "usuarios" SET "direccion" = $1, "latitud" = $2, "longitud" = $3 WHERE "id" = $4 RETURNING "id", "direccion", "latitud", "longitud"',
      [data.direccion, data.latitud, data.longitud, pasajeroId]
    );
    if (result.rows.length === 0) {
      throw new Error('Pasajero no encontrado.');
    }
    return result.rows[0];
  }

  async updatePushToken(userId: string, token: string) {
    await this.databaseService.query(
      'UPDATE "usuarios" SET "push_token" = $1 WHERE "id" = $2',
      [token || null, userId]
    );
    return { success: true };
  }

  private async notifyDriverNewTrip(viajeId: number) {
    try {
      const res = await this.databaseService.query(
        `SELECT v.fecha_hora_salida, r.nombre as ruta_nombre, u.push_token, u.nombre as conductor_nombre
         FROM "viajes" v
         JOIN "rutas" r ON v.ruta_id = r.id
         JOIN "usuarios" u ON v.conductor_id = u.id
         WHERE v.id = $1`,
        [viajeId]
      );
      
      if (res.rows.length === 0) return;
      const { fecha_hora_salida, ruta_nombre, push_token } = res.rows[0];
      
      if (push_token) {
        const localTime = new Date(fecha_hora_salida).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Mexico_City',
        });
        const title = '🚌 Nuevo Viaje Asignado';
        const body = `Hola, se te ha asignado la ruta "${ruta_nombre}" con salida a las ${localTime}.`;
        
        await this.sendExpoPushNotification(push_token, title, body, { viaje_id: viajeId });
      }
    } catch (e: any) {
      this.logger.error(`Error en notifyDriverNewTrip para viaje #${viajeId}: ${e.message}`);
    }
  }

  private async sendExpoPushNotification(token: string, title: string, body: string, data?: any) {
    if (!token || !token.startsWith('ExponentPushToken')) {
      this.logger.warn(`Token de notificación push ausente o inválido: ${token}`);
      return;
    }
    
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          sound: 'default',
          title,
          body,
          data,
        }),
      });
      
      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Error de envío push a Expo: ${errText}`);
      } else {
        const resJson: any = await response.json();
        this.logger.log(`Notificación push enviada con éxito a ${token}: ${JSON.stringify(resJson)}`);
      }
    } catch (e: any) {
      this.logger.error(`Fallo al enviar notificación push a Expo: ${e.message}`);
    }
  }

  async generarSmartRutas(maxDistanciaKm: number = 2.5, maxPasajerosPorRuta: number = 15) {
    const res = await this.databaseService.query(
      `SELECT id, nombre, email, direccion, latitud, longitud 
       FROM "usuarios" 
       WHERE rol = 'pasajero' AND latitud IS NOT NULL AND longitud IS NOT NULL`
    );
    const passengers = res.rows.map(r => ({
      id: r.id,
      nombre: r.nombre,
      email: r.email,
      direccion: r.direccion,
      latitud: Number(r.latitud),
      longitud: Number(r.longitud)
    }));

    if (passengers.length === 0) {
      return [];
    }

    const destinoBase = {
      nombre: "Planta Industrial Norte",
      latitud: 20.753,
      longitud: -103.415
    };

    const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    interface Cluster {
      id: number;
      centroidLat: number;
      centroidLng: number;
      passengers: typeof passengers;
    }
    const clusters: Cluster[] = [];
    let clusterCounter = 0;

    for (const passenger of passengers) {
      let assignedCluster: Cluster | null = null;
      let minDistance = Infinity;

      for (const cluster of clusters) {
        if (cluster.passengers.length >= maxPasajerosPorRuta) continue;
        const dist = getDistanceKm(passenger.latitud, passenger.longitud, cluster.centroidLat, cluster.centroidLng);
        if (dist <= maxDistanciaKm && dist < minDistance) {
          minDistance = dist;
          assignedCluster = cluster;
        }
      }

      if (assignedCluster) {
        assignedCluster.passengers.push(passenger);
        const total = assignedCluster.passengers.length;
        assignedCluster.centroidLat = assignedCluster.passengers.reduce((sum, p) => sum + p.latitud, 0) / total;
        assignedCluster.centroidLng = assignedCluster.passengers.reduce((sum, p) => sum + p.longitud, 0) / total;
      } else {
        clusters.push({
          id: ++clusterCounter,
          centroidLat: passenger.latitud,
          centroidLng: passenger.longitud,
          passengers: [passenger]
        });
      }
    }

    const suggestedRoutes: any[] = [];
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let idx = 0; idx < clusters.length; idx++) {
      const cluster = clusters[idx];
      const routeLabel = alphabet[idx % alphabet.length];
      
      interface ParadaSugerida {
        nombre: string;
        latitud: number;
        longitud: number;
        pasajeros: typeof passengers;
      }
      const paradasTemp: ParadaSugerida[] = [];

      for (const p of cluster.passengers) {
        let foundParada: ParadaSugerida | null = null;
        for (const pt of paradasTemp) {
          if (getDistanceKm(p.latitud, p.longitud, pt.latitud, pt.longitud) <= 0.3) {
            foundParada = pt;
            break;
          }
        }

        if (foundParada) {
          foundParada.pasajeros.push(p);
          const count = foundParada.pasajeros.length;
          foundParada.latitud = foundParada.pasajeros.reduce((sum, px) => sum + px.latitud, 0) / count;
          foundParada.longitud = foundParada.pasajeros.reduce((sum, px) => sum + px.longitud, 0) / count;
        } else {
          paradasTemp.push({
            nombre: `Parada ${routeLabel}-${paradasTemp.length + 1}`,
            latitud: p.latitud,
            longitud: p.longitud,
            pasajeros: [p]
          });
        }
      }

      const sortedParadas = paradasTemp.map(p => ({
        ...p,
        distanceToDest: getDistanceKm(p.latitud, p.longitud, destinoBase.latitud, destinoBase.longitud)
      })).sort((a, b) => b.distanceToDest - a.distanceToDest);

      const finalParadas = sortedParadas.map((p, index) => ({
        orden: index + 1,
        nombre: p.nombre,
        latitud: p.latitud,
        longitud: p.longitud,
        pasajeros: p.pasajeros
      }));

      const vehiculoRes = await this.databaseService.query('SELECT id, patente FROM "vehiculos" LIMIT 1 OFFSET $1', [idx]);
      const conductorRes = await this.databaseService.query('SELECT id, nombre FROM "usuarios" WHERE rol = \'conductor\' LIMIT 1 OFFSET $1', [idx]);

      const vehiculo = vehiculoRes.rows[0] ?? null;
      const conductor = conductorRes.rows[0] ?? null;

      suggestedRoutes.push({
        id: cluster.id,
        nombre: `Ruta Inteligente ${routeLabel} (Zona: ${cluster.centroidLat.toFixed(4)}, ${cluster.centroidLng.toFixed(4)})`,
        origen: finalParadas[0]?.nombre || "Origen Personalizado",
        destino: destinoBase.nombre,
        destinoLat: destinoBase.latitud,
        destinoLng: destinoBase.longitud,
        paradas: finalParadas,
        pasajeros: cluster.passengers,
        vehiculo_id: vehiculo?.id ?? null,
        vehiculo_patente: vehiculo?.patente ?? null,
        conductor_id: conductor?.id ?? null,
        conductor_nombre: conductor?.nombre ?? null,
      });
    }

    return suggestedRoutes;
  }

  async aplicarSmartRutas(rutasSugeridas: any[]) {
    const client = await this.databaseService.getClient();
    try {
      await client.query('BEGIN');
      const createdViajes: any[] = [];

      for (const rs of rutasSugeridas) {
        const paradasDb = rs.paradas.map((p: any) => ({
          orden: p.orden,
          nombre: p.nombre,
          latitud: p.latitud,
          longitud: p.longitud
        }));

        const rutaResult = await client.query(
          `INSERT INTO "rutas" ("nombre", "origen", "destino", "paradas")
           VALUES ($1, $2, $3, $4::jsonb) RETURNING id`,
          [rs.nombre, rs.origen, rs.destino, JSON.stringify(paradasDb)]
        );
        const rutaId = rutaResult.rows[0].id;

        const fechaSalida = new Date();
        fechaSalida.setDate(fechaSalida.getDate() + 1);
        fechaSalida.setHours(7, 0, 0, 0);

        const viajeResult = await client.query(
          `INSERT INTO "viajes" ("ruta_id", "vehiculo_id", "conductor_id", "fecha_hora_salida", "estado")
           VALUES ($1, $2, $3, $4, 'programado') RETURNING id`,
          [rutaId, rs.vehiculo_id || null, rs.conductor_id || null, fechaSalida]
        );
        const viajeId = viajeResult.rows[0].id;

        for (let sIdx = 0; sIdx < rs.pasajeros.length; sIdx++) {
          const p = rs.pasajeros[sIdx];
          const asiento = sIdx + 1;
          await client.query(
            `INSERT INTO "reservas" ("viaje_id", "pasajero_id", "asiento_numero", "estado")
             VALUES ($1, $2, $3, 'reservado')`,
            [viajeId, p.id, asiento]
          );
        }

        createdViajes.push({
          viajeId,
          rutaId,
          rutaNombre: rs.nombre,
          pasajerosCount: rs.pasajeros.length
        });
      }

      await client.query('COMMIT');
      return { success: true, viajes: createdViajes };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getReporteKPIs() {
    const queryOcupacion = `
      SELECT COALESCE(AVG(ocupados * 100.0 / NULLIF(capacidad, 0)), 0)::float as promedio_ocupacion
      FROM (
        SELECT 
          v.id, 
          ve.capacidad,
          (SELECT COUNT(*)::int FROM "reservas" r WHERE r.viaje_id = v.id AND r.estado IN ('reservado', 'confirmado', 'no_abordado')) as ocupados
        FROM "viajes" v
        JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
        WHERE v.estado = 'finalizado'
      ) q
    `;
    const queryViajes = `SELECT COUNT(*)::int as total_viajes FROM "viajes" WHERE estado = 'finalizado'`;
    const queryAsistencia = `
      SELECT 
        COUNT(CASE WHEN r.estado = 'confirmado' THEN 1 END)::int as abordados,
        COUNT(CASE WHEN r.estado = 'no_abordado' THEN 1 END)::int as no_shows
      FROM "reservas" r
      JOIN "viajes" v ON r.viaje_id = v.id
      WHERE v.estado = 'finalizado' AND r.estado IN ('confirmado', 'no_abordado')
    `;
    const queryPasajeros = `
      SELECT COUNT(DISTINCT r.pasajero_id)::int as pasajeros_unicos 
      FROM "reservas" r
      JOIN "viajes" v ON r.viaje_id = v.id
      WHERE v.estado = 'finalizado' AND r.estado = 'confirmado'
    `;

    const [resOcupacion, resViajes, resAsistencia, resPasajeros] = await Promise.all([
      this.databaseService.query(queryOcupacion),
      this.databaseService.query(queryViajes),
      this.databaseService.query(queryAsistencia),
      this.databaseService.query(queryPasajeros)
    ]);

    const promOcupacion = resOcupacion.rows[0]?.promedio_ocupacion || 0;
    const totalViajes = resViajes.rows[0]?.total_viajes || 0;
    const abordados = resAsistencia.rows[0]?.abordados || 0;
    const noShows = resAsistencia.rows[0]?.no_shows || 0;
    const pasajerosUnicos = resPasajeros.rows[0]?.pasajeros_unicos || 0;

    const totalReservasFinalizadas = abordados + noShows;
    const tasaAsistencia = totalReservasFinalizadas > 0 
      ? Math.round((abordados * 100) / totalReservasFinalizadas) 
      : 100;

    return {
      promedioOcupacion: Math.round(promOcupacion),
      tasaAsistencia,
      noShows,
      totalViajes,
      pasajerosUnicos
    };
  }

  async getEficienciaRutas() {
    const sql = `
      SELECT 
        ru.id as ruta_id,
        ru.nombre as ruta_nombre,
        COUNT(v.id)::int as viajes_count,
        COALESCE(AVG(
          (SELECT COUNT(*)::int FROM "reservas" r WHERE r.viaje_id = v.id AND r.estado IN ('reservado', 'confirmado', 'no_abordado')) * 100.0 / NULLIF(ve.capacidad, 0)
        ), 0)::float as promedio_ocupacion
      FROM "viajes" v
      JOIN "rutas" ru ON v.ruta_id = ru.id
      JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
      WHERE v.estado = 'finalizado'
      GROUP BY ru.id, ru.nombre
      ORDER BY promedio_ocupacion DESC
    `;
    const res = await this.databaseService.query(sql);
    return res.rows.map((row: any) => ({
      ...row,
      promedio_ocupacion: Math.round(row.promedio_ocupacion)
    }));
  }

  async getAuditoriaAsistencia(filtros: { rutaId?: number; fechaInicio?: string; fechaFin?: string }) {
    let sql = `
      SELECT 
        r.id as reserva_id,
        r.asiento_numero,
        r.estado as reserva_estado,
        r.fecha_aprobacion,
        u.nombre as pasajero_nombre,
        u.email as pasajero_email,
        ru.nombre as ruta_nombre,
        v.fecha_hora_salida,
        c.nombre as conductor_nombre,
        ve.patente as vehiculo_patente
      FROM "reservas" r
      JOIN "usuarios" u ON r.pasajero_id = u.id
      JOIN "viajes" v ON r.viaje_id = v.id
      JOIN "rutas" ru ON v.ruta_id = ru.id
      LEFT JOIN "usuarios" c ON v.conductor_id = c.id
      LEFT JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
      WHERE v.estado = 'finalizado' AND r.estado IN ('confirmado', 'no_abordado')
    `;
    const params: any[] = [];
    let paramCounter = 1;

    if (filtros.rutaId) {
      sql += ` AND v.ruta_id = $${paramCounter++}`;
      params.push(filtros.rutaId);
    }
    if (filtros.fechaInicio) {
      sql += ` AND v.fecha_hora_salida >= $${paramCounter++}`;
      params.push(filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      sql += ` AND v.fecha_hora_salida <= $${paramCounter++}`;
      params.push(filtros.fechaFin);
    }

    sql += ` ORDER BY v.fecha_hora_salida DESC`;

    const res = await this.databaseService.query(sql, params);
    return res.rows;
  }

  async getAuditoriaSLA() {
    const sql = `
      SELECT 
        tp.id as tiempo_parada_id,
        tp.viaje_id,
        tp.parada_nombre,
        tp.orden,
        tp.fecha_hora_llegada,
        tp.fecha_hora_salida as fecha_hora_salida_real,
        v.fecha_hora_salida as viaje_fecha_hora_salida,
        v.proveedor_id,
        prov.nombre as proveedor_nombre,
        r.nombre as ruta_nombre,
        r.paradas
      FROM "tiempos_paradas" tp
      JOIN "viajes" v ON tp.viaje_id = v.id
      JOIN "rutas" r ON v.ruta_id = r.id
      LEFT JOIN "proveedores" prov ON v.proveedor_id = prov.id
      ORDER BY tp.fecha_hora_llegada DESC
    `;
    const res = await this.databaseService.query(sql);

    const detalles = res.rows.map((row: any) => {
      const paradasList = Array.isArray(row.paradas) ? row.paradas : [];
      // Buscar la parada en la ruta para ver si tiene offset de tiempo
      const paradaRuta = paradasList.find((p: any) => Number(p.orden) === Number(row.orden) || p.nombre === row.parada_nombre);
      
      // Offset estimado en minutos (si la parada no tiene, asumimos 15 minutos por parada)
      let offsetMinutos = 0;
      if (paradaRuta && paradaRuta.minutos_desde_inicio !== undefined) {
        offsetMinutos = Number(paradaRuta.minutos_desde_inicio);
      } else {
        // Fallback: 15 minutos por cada parada adicional en la ruta
        offsetMinutos = (Number(row.orden) - 1) * 15;
      }

      const scheduledArrival = new Date(new Date(row.viaje_fecha_hora_salida).getTime() + offsetMinutos * 60 * 1000);
      const actualArrival = new Date(row.fecha_hora_llegada);
      
      // Desviación en minutos
      const desviacionMinutos = Math.round((actualArrival.getTime() - scheduledArrival.getTime()) / (60 * 1000));
      
      // SLA de puntualidad: ±10 minutos tolerables
      let estadoPuntualidad = 'A tiempo';
      let cumpleSLA = true;
      if (desviacionMinutos > 10) {
        estadoPuntualidad = 'Retrasado';
        cumpleSLA = false;
      } else if (desviacionMinutos < -10) {
        estadoPuntualidad = 'Adelantado';
        cumpleSLA = false;
      }

      return {
        tiempoParadaId: row.tiempo_parada_id,
        viajeId: row.viaje_id,
        rutaNombre: row.ruta_nombre,
        proveedorNombre: row.proveedor_nombre || 'Sin Proveedor Asignado',
        paradaNombre: row.parada_nombre,
        orden: row.orden,
        programado: scheduledArrival.toISOString(),
        real: actualArrival.toISOString(),
        desviacion: desviacionMinutos,
        estado: estadoPuntualidad,
        cumpleSLA
      };
    });

    // Calcular KPIs generales
    const totalParadas = detalles.length;
    const paradasATiempo = detalles.filter(d => d.cumpleSLA).length;
    const porcentajeSLA = totalParadas > 0 ? Math.round((paradasATiempo * 100) / totalParadas) : 100;

    // Agrupar por proveedor
    const resumenProveedores: { [key: string]: { total: number; aTiempo: number; desviacionAcumulada: number } } = {};
    
    detalles.forEach(d => {
      const pNombre = d.proveedorNombre;
      if (!resumenProveedores[pNombre]) {
        resumenProveedores[pNombre] = { total: 0, aTiempo: 0, desviacionAcumulada: 0 };
      }
      resumenProveedores[pNombre].total++;
      if (d.cumpleSLA) {
        resumenProveedores[pNombre].aTiempo++;
      }
      resumenProveedores[pNombre].desviacionAcumulada += d.desviacion;
    });

    const proveedoresStats = Object.keys(resumenProveedores).map(pNombre => {
      const stats = resumenProveedores[pNombre];
      return {
        proveedorNombre: pNombre,
        totalVisitas: stats.total,
        visitasATiempo: stats.aTiempo,
        porcentajeSLA: Math.round((stats.aTiempo * 100) / stats.total),
        desviacionPromedioMinutos: Math.round(stats.desviacionAcumulada / stats.total)
      };
    });

    return {
      kpis: {
        totalParadas,
        paradasATiempo,
        porcentajeSLA
      },
      proveedores: proveedoresStats,
      detalles
    };
  }

  async importarDatosExcel(datos: any) {
    const client = await this.databaseService.getClient();
    try {
      await client.query('BEGIN');

      const resultados: any = {
        rutas_creadas: 0,
        empleados_creados: 0,
        viajes_creados: 0,
        rutas: [],
        empleados: [],
        viajes: [],
        errores: [],
      };

      // 1. Importar Rutas
      if (datos.rutas && datos.rutas.length > 0) {
        for (const rutaData of datos.rutas) {
          try {
            const nombreRuta = rutaData.nombre_ruta || rutaData.nombre;
            const origen = rutaData.origen;
            const destino = rutaData.destino;
            const activa = (rutaData.activa || 'si').toString().toLowerCase() === 'si';

            if (!nombreRuta || !origen || !destino) {
              resultados.errores.push(`Ruta incompleta: ${nombreRuta || 'Sin nombre'}`);
              continue;
            }

            // Extraer paradas
            const paradas: any[] = [];
            for (let i = 1; i <= 20; i++) {
              const nombreParada = rutaData[`parada_${i}_nombre`];
              const lat = rutaData[`parada_${i}_latitud`];
              const lng = rutaData[`parada_${i}_longitud`];
              
              if (nombreParada) {
                paradas.push({
                  nombre: nombreParada,
                  latitud: Number(lat) || 0,
                  longitud: Number(lng) || 0,
                });
              }
            }

            // Crear la ruta
            const rutaResult = await client.query(
              'INSERT INTO "rutas" ("nombre", "origen", "destino", "paradas", "activa") VALUES ($1, $2, $3, $4, $5) RETURNING "id"',
              [nombreRuta, origen, destino, JSON.stringify(paradas), activa]
            );
            resultados.rutas_creadas++;
            resultados.rutas.push({ id: rutaResult.rows[0].id, nombre: nombreRuta });
          } catch (err) {
            resultados.errores.push(`Error al crear ruta: ${(err as Error).message}`);
          }
        }
      }

      // 2. Importar Empleados/Pasajeros
      if (datos.empleados && datos.empleados.length > 0) {
        for (const empData of datos.empleados) {
          try {
            const email = empData.email;
            const nombre = empData.nombre_completo || empData.nombre;
            const identificadorTarjeta = empData.identificador_tarjeta || empData.identificador;

            if (!email || !nombre) {
              resultados.errores.push(`Empleado incompleto: ${nombre || email || 'Sin datos'}`);
              continue;
            }

            // Verificar si el email ya existe
            const emailCheck = await client.query(
              'SELECT id FROM "usuarios" WHERE "email" = $1',
              [email.toLowerCase()]
            );

            if (emailCheck.rows.length > 0) {
              // Si existe, lo saltamos
              continue;
            }

            const passwordHash = await bcrypt.hash('Pasajero2026@', 10);

            await client.query(
              'INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "identificador_tarjeta") VALUES ($1, $2, $3, \'pasajero\', $4)',
              [email.toLowerCase(), passwordHash, nombre, identificadorTarjeta || null]
            );
            resultados.empleados_creados++;
            resultados.empleados.push({ email, nombre });
          } catch (err) {
            resultados.errores.push(`Error al crear empleado: ${(err as Error).message}`);
          }
        }
      }

      // 3. Importar Viajes
      if (datos.viajes && datos.viajes.length > 0) {
        for (const viajeData of datos.viajes) {
          try {
            const nombreRuta = viajeData.nombre_ruta;
            const matriculaVehiculo = viajeData.matricula_vehiculo;
            const emailConductor = viajeData.email_conductor;
            const fechaHoraSalida = viajeData.fecha_hora_salida;

            if (!nombreRuta || !matriculaVehiculo || !emailConductor || !fechaHoraSalida) {
              resultados.errores.push(`Viaje incompleto: ${nombreRuta || 'Sin ruta'}`);
              continue;
            }

            // Buscar la ruta por nombre
            const rutaResult = await client.query(
              'SELECT "id" FROM "rutas" WHERE "nombre" = $1',
              [nombreRuta]
            );
            if (rutaResult.rows.length === 0) {
              resultados.errores.push(`Ruta no encontrada: ${nombreRuta}`);
              continue;
            }
            const rutaId = rutaResult.rows[0].id;

            // Buscar el vehículo por matrícula
            const vehiculoResult = await client.query(
              'SELECT "id" FROM "vehiculos" WHERE "patente" = $1',
              [matriculaVehiculo]
            );
            if (vehiculoResult.rows.length === 0) {
              resultados.errores.push(`Vehículo no encontrado: ${matriculaVehiculo}`);
              continue;
            }
            const vehiculoId = vehiculoResult.rows[0].id;

            // Buscar el conductor por email
            const conductorResult = await client.query(
              'SELECT "id" FROM "usuarios" WHERE "email" = $1 AND "rol" = \'conductor\'',
              [emailConductor.toLowerCase()]
            );
            if (conductorResult.rows.length === 0) {
              resultados.errores.push(`Conductor no encontrado: ${emailConductor}`);
              continue;
            }
            const conductorId = conductorResult.rows[0].id;

            // Crear el viaje
            await client.query(
              'INSERT INTO "viajes" ("ruta_id", "vehiculo_id", "conductor_id", "fecha_hora_salida", "estado") VALUES ($1, $2, $3, $4, \'programado\')',
              [rutaId, vehiculoId, conductorId, fechaHoraSalida]
            );
            resultados.viajes_creados++;
            resultados.viajes.push({ ruta: nombreRuta, fecha: fechaHoraSalida });
          } catch (err) {
            resultados.errores.push(`Error al crear viaje: ${(err as Error).message}`);
          }
        }
      }

      await client.query('COMMIT');
      return resultados;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // CATÁLOGO DE PROVEEDORES (COMPAÑÍAS)
  // ==========================================
  async getCatalogoProveedores() {
    const result = await this.databaseService.query(
      'SELECT id, nombre, created_at FROM "proveedores" ORDER BY nombre ASC'
    );
    return result.rows;
  }

  async createCatalogoProveedor(data: { nombre: string }) {
    const result = await this.databaseService.query(
      'INSERT INTO "proveedores" ("nombre") VALUES ($1) RETURNING *',
      [data.nombre.trim()]
    );
    return result.rows[0];
  }

  async updateCatalogoProveedor(id: number, data: { nombre: string }) {
    const result = await this.databaseService.query(
      'UPDATE "proveedores" SET "nombre" = $1 WHERE "id" = $2 RETURNING *',
      [data.nombre.trim(), id]
    );
    return result.rows[0];
  }

  async deleteCatalogoProveedor(id: number) {
    await this.databaseService.query('DELETE FROM "proveedores" WHERE "id" = $1', [id]);
    return { success: true };
  }

  // ==========================================
  // CATÁLOGO DE SEDES (EMPRESAS CLIENTES)
  // ==========================================
  async getCatalogoSedes(userId?: string) {
    let sql = 'SELECT s.id, s.nombre, s.created_at, s.proveedor_id, p.nombre AS proveedor_nombre FROM "sedes" s LEFT JOIN "proveedores" p ON s.proveedor_id = p.id';
    const params: any[] = [];
    if (userId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        sql += ' WHERE s.proveedor_id = $1';
        params.push(user.proveedor_id);
      }
    }
    sql += ' ORDER BY s.nombre ASC';
    const result = await this.databaseService.query(sql, params);
    return result.rows;
  }

  async createCatalogoSede(data: { nombre: string; proveedor_id?: number }, creatorId?: string) {
    let proveedorId = data.proveedor_id || null;
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        proveedorId = user.proveedor_id;
      }
    }
    const result = await this.databaseService.query(
      'INSERT INTO "sedes" ("nombre", "proveedor_id") VALUES ($1, $2) RETURNING *',
      [data.nombre.trim(), proveedorId]
    );
    return result.rows[0];
  }

  async updateCatalogoSede(id: number, data: { nombre: string; proveedor_id?: number }, creatorId?: string) {
    let proveedorId = data.proveedor_id;
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const check = await this.databaseService.query('SELECT proveedor_id FROM "sedes" WHERE id = $1', [id]);
        if (check.rows.length > 0 && check.rows[0].proveedor_id !== user.proveedor_id) {
          throw new Error('No tienes permisos para modificar esta sede.');
        }
        proveedorId = user.proveedor_id;
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let placeholderIdx = 1;

    if (data.nombre !== undefined) {
      fields.push(`"nombre" = $${placeholderIdx++}`);
      values.push(data.nombre.trim());
    }
    if (proveedorId !== undefined) {
      fields.push(`"proveedor_id" = $${placeholderIdx++}`);
      values.push(proveedorId);
    }

    values.push(id);
    const sql = `UPDATE "sedes" SET ${fields.join(', ')} WHERE "id" = $${placeholderIdx} RETURNING *`;
    const result = await this.databaseService.query(sql, values);
    return result.rows[0];
  }

  async deleteCatalogoSede(id: number, creatorId?: string) {
    if (creatorId) {
      const userRes = await this.databaseService.query('SELECT rol, proveedor_id FROM "usuarios" WHERE id = $1', [creatorId]);
      const user = userRes.rows[0];
      if (user && user.rol === 'admin_proveedor' && user.proveedor_id) {
        const check = await this.databaseService.query('SELECT proveedor_id FROM "sedes" WHERE id = $1', [id]);
        if (check.rows.length > 0 && check.rows[0].proveedor_id !== user.proveedor_id) {
          throw new Error('No tienes permisos para eliminar esta sede.');
        }
      }
    }
    await this.databaseService.query('DELETE FROM "sedes" WHERE "id" = $1', [id]);
    return { success: true };
  }
}

