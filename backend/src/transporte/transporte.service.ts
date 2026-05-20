import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TransporteService {
  private readonly logger = new Logger(TransporteService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  // ==========================================
  // RUTAS
  // ==========================================
  async getRutas() {
    const result = await this.databaseService.query('SELECT * FROM "rutas" ORDER BY "id" ASC');
    return result.rows;
  }

  async createRuta(data: { nombre: string; origen: string; destino: string; paradas: any[] }) {
    const result = await this.databaseService.query(
      'INSERT INTO "rutas" ("nombre", "origen", "destino", "paradas") VALUES ($1, $2, $3, $4) RETURNING *',
      [data.nombre, data.origen, data.destino, JSON.stringify(data.paradas)]
    );
    return result.rows[0];
  }

  async updateRuta(id: number, data: { nombre: string; origen: string; destino: string; paradas: any[]; activo: boolean }) {
    const result = await this.databaseService.query(
      'UPDATE "rutas" SET "nombre" = $1, "origen" = $2, "destino" = $3, "paradas" = $4, "activo" = $5 WHERE "id" = $6 RETURNING *',
      [data.nombre, data.origen, data.destino, JSON.stringify(data.paradas), data.activo, id]
    );
    return result.rows[0];
  }

  async deleteRuta(id: number) {
    await this.databaseService.query('DELETE FROM "rutas" WHERE "id" = $1', [id]);
    return { success: true };
  }

  // ==========================================
  // VEHÍCULOS
  // ==========================================
  async getVehiculos() {
    const result = await this.databaseService.query('SELECT * FROM "vehiculos" ORDER BY "id" ASC');
    return result.rows;
  }

  async createVehiculo(data: { patente: string; modelo: string; capacidad: number; proveedor_nombre: string }) {
    const result = await this.databaseService.query(
      'INSERT INTO "vehiculos" ("patente", "modelo", "capacidad", "proveedor_nombre") VALUES ($1, $2, $3, $4) RETURNING *',
      [data.patente, data.modelo, data.capacidad, data.proveedor_nombre]
    );
    return result.rows[0];
  }

  async updateVehiculo(id: number, data: { patente: string; modelo: string; capacidad: number; proveedor_nombre: string }) {
    const result = await this.databaseService.query(
      'UPDATE "vehiculos" SET "patente" = $1, "modelo" = $2, "capacidad" = $3, "proveedor_nombre" = $4 WHERE "id" = $5 RETURNING *',
      [data.patente, data.modelo, data.capacidad, data.proveedor_nombre, id]
    );
    return result.rows[0];
  }

  async deleteVehiculo(id: number) {
    await this.databaseService.query('DELETE FROM "vehiculos" WHERE "id" = $1', [id]);
    return { success: true };
  }

  // ==========================================
  // CONDUCTORES Y PASAJEROS (USUARIOS)
  // ==========================================
  async getConductores() {
    const result = await this.databaseService.query(
      'SELECT "id", "email", "nombre", "rol", "gestor_code" FROM "usuarios" WHERE "rol" = \'conductor\' ORDER BY "nombre" ASC'
    );
    return result.rows;
  }

  async getPasajeros() {
    const result = await this.databaseService.query(
      'SELECT "id", "email", "nombre", "rol", "identificador_tarjeta" FROM "usuarios" WHERE "rol" = \'pasajero\' ORDER BY "nombre" ASC'
    );
    return result.rows;
  }

  // ==========================================
  // VIAJES (SERVICIOS PROGRAMADOS)
  // ==========================================
  async getViajes(conductorId?: string) {
    let query = `
      SELECT v.*, r.nombre as ruta_nombre, r.origen, r.destino, r.paradas,
             ve.patente, ve.modelo, ve.capacidad, u.nombre as conductor_nombre
      FROM "viajes" v
      LEFT JOIN "rutas" r ON v.ruta_id = r.id
      LEFT JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
      LEFT JOIN "usuarios" u ON v.conductor_id = u.id
    `;
    const params: any[] = [];
    if (conductorId) {
      query += ' WHERE v.conductor_id = $1';
      params.push(conductorId);
    }
    query += ' ORDER BY v.fecha_hora_salida DESC';
    const result = await this.databaseService.query(query, params);
    return result.rows;
  }

  async createViaje(data: { ruta_id: number; vehiculo_id: number; conductor_id: string; fecha_hora_salida: string }) {
    const result = await this.databaseService.query(
      'INSERT INTO "viajes" ("ruta_id", "vehiculo_id", "conductor_id", "fecha_hora_salida") VALUES ($1, $2, $3, $4) RETURNING *',
      [data.ruta_id, data.vehiculo_id, data.conductor_id, data.fecha_hora_salida]
    );
    return result.rows[0];
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
       WHERE r.viaje_id = $1
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
    return result.rows[0];
  }

  async updateReservaEstado(id: number, estado: string) {
    const result = await this.databaseService.query(
      'UPDATE "reservas" SET "estado" = $1 WHERE "id" = $2 RETURNING *',
      [estado, id]
    );
    return result.rows[0];
  }

  // ==========================================
  // GPS / UBICACIONES DE FLOTA
  // ==========================================
  async saveLocation(data: { viaje_id: number; latitud: number; longitud: number; velocidad?: number }) {
    const result = await this.databaseService.query(
      'INSERT INTO "ubicaciones_flota" ("viaje_id", "latitud", "longitud", "velocidad") VALUES ($1, $2, $3, $4) RETURNING *',
      [data.viaje_id, data.latitud, data.longitud, data.velocidad || 0]
    );
    return result.rows[0];
  }

  async getLatestLocations() {
    const result = await this.databaseService.query(`
      SELECT DISTINCT ON (uf.viaje_id) 
        uf.viaje_id, uf.latitud, uf.longitud, uf.velocidad, uf.timestamp,
        r.nombre as ruta_nombre, ve.patente, u.nombre as conductor_nombre
      FROM "ubicaciones_flota" uf
      LEFT JOIN "viajes" v ON uf.viaje_id = v.id
      LEFT JOIN "rutas" r ON v.ruta_id = r.id
      LEFT JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
      LEFT JOIN "usuarios" u ON v.conductor_id = u.id
      ORDER BY uf.viaje_id, uf.timestamp DESC
    `);
    return result.rows;
  }

  // ==========================================
  // ALERTAS DE VIAJE
  // ==========================================
  async getAlertas() {
    const result = await this.databaseService.query(`
      SELECT a.*, r.nombre as ruta_nombre, ve.patente
      FROM "alertas_viaje" a
      LEFT JOIN "viajes" v ON a.viaje_id = v.id
      LEFT JOIN "rutas" r ON v.ruta_id = r.id
      LEFT JOIN "vehiculos" ve ON v.vehiculo_id = ve.id
      ORDER BY a.timestamp DESC
    `);
    return result.rows;
  }

  async createAlerta(data: { viaje_id: number; tipo: string; descripcion: string }) {
    const result = await this.databaseService.query(
      'INSERT INTO "alertas_viaje" ("viaje_id", "tipo", "descripcion") VALUES ($1, $2, $3) RETURNING *',
      [data.viaje_id, data.tipo, data.descripcion]
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
}
