import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import * as bcrypt from 'bcrypt';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      dbInitError: this.databaseService.initError || null,
      version: '2.0.0',
    };
  }

  // Endpoint temporal para corregir la contraseña del admin si quedó sobreescrita.
  // EJECUTAR UNA VEZ EN PRODUCCIÓN: GET http://2.24.81.205:4000/fix-admin-password
  // Después de ejecutarlo, puede ser deshabilitado comentando el @Get.
  @Get('fix-admin-password')
  async fixAdminPassword() {
    try {
      const newHash = await bcrypt.hash('Seguridad2027@', 10);
      await this.databaseService.query(
        'UPDATE "usuarios" SET "password_hash" = $1 WHERE "email" = $2',
        [newHash, 'ing.ballesteros16@gmail.com']
      );
      return { success: true, message: 'Contraseña del administrador actualizada correctamente.' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // Seeding completed successfully. Endpoint disabled to prevent unauthorized runs in production.
  // @Get('seed-asvi')
  async seedAsvi() {
    try {
      // 1. Asegurar columna proveedor_id en sedes
      await this.databaseService.query(`
        ALTER TABLE "sedes" ADD COLUMN IF NOT EXISTS "proveedor_id" INTEGER REFERENCES "proveedores"("id") ON DELETE SET NULL;
      `);

      // 2. Crear Proveedor
      let proveedorId: number;
      const provCheck = await this.databaseService.query('SELECT id FROM "proveedores" WHERE "nombre" = $1', ['Transportes ASVI']);
      if (provCheck.rows.length > 0) {
        proveedorId = provCheck.rows[0].id;
      } else {
        const provRes = await this.databaseService.query('INSERT INTO "proveedores" ("nombre") VALUES ($1) RETURNING id', ['Transportes ASVI']);
        proveedorId = provRes.rows[0].id;
      }

      // 3. Crear Sede
      let sedeId: number;
      const sedeCheck = await this.databaseService.query('SELECT id FROM "sedes" WHERE "nombre" = $1', ['Cliente Planta ASVI']);
      if (sedeCheck.rows.length > 0) {
        sedeId = sedeCheck.rows[0].id;
        await this.databaseService.query('UPDATE "sedes" SET "proveedor_id" = $1 WHERE id = $2', [proveedorId, sedeId]);
      } else {
        const SedeRes = await this.databaseService.query(
          'INSERT INTO "sedes" ("nombre", "proveedor_id") VALUES ($1, $2) RETURNING id',
          ['Cliente Planta ASVI', proveedorId]
        );
        sedeId = SedeRes.rows[0].id;
      }

      // Hashes
      const hashAdmin = await bcrypt.hash('Proveedor2026@', 10);
      const hashConductor = await bcrypt.hash('Conductor2026@', 10);
      const hashPasajero = await bcrypt.hash('Pasajero2026@', 10);

      // 4. Admin
      const adminCheck = await this.databaseService.query('SELECT id FROM "usuarios" WHERE "email" = $1', ['admin@transportesasvi.com']);
      if (adminCheck.rows.length > 0) {
        await this.databaseService.query(`
          UPDATE "usuarios" 
          SET "nombre" = $1, "password_hash" = $2, "rol" = $3, "proveedor_id" = $4
          WHERE "email" = $5
        `, ['Admin Transportes ASVI', hashAdmin, 'admin_proveedor', proveedorId, 'admin@transportesasvi.com']);
      } else {
        await this.databaseService.query(`
          INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id")
          VALUES ($1, $2, $3, $4, $5)
        `, ['admin@transportesasvi.com', hashAdmin, 'Admin Transportes ASVI', 'admin_proveedor', proveedorId]);
      }

      // 5. Conductor
      const driverCheck = await this.databaseService.query('SELECT id FROM "usuarios" WHERE "email" = $1', ['conductor.asvi@transportesasvi.com']);
      if (driverCheck.rows.length > 0) {
        await this.databaseService.query(`
          UPDATE "usuarios" 
          SET "nombre" = $1, "password_hash" = $2, "rol" = $3, "proveedor_id" = $4, "gestor_code" = $5
          WHERE "email" = $6
        `, ['Juan Conductor ASVI', hashConductor, 'conductor', proveedorId, 'ASVI_COND_01', 'conductor.asvi@transportesasvi.com']);
      } else {
        await this.databaseService.query(`
          INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id", "gestor_code")
          VALUES ($1, $2, $3, $4, $5, $6)
        `, ['conductor.asvi@transportesasvi.com', hashConductor, 'Juan Conductor ASVI', 'conductor', proveedorId, 'ASVI_COND_01']);
      }

      // 6. Pasajero 1
      const p1Check = await this.databaseService.query('SELECT id FROM "usuarios" WHERE "email" = $1', ['pasajero1.asvi@transportesasvi.com']);
      if (p1Check.rows.length > 0) {
        await this.databaseService.query(`
          UPDATE "usuarios" 
          SET "nombre" = $1, "password_hash" = $2, "rol" = $3, "proveedor_id" = $4, "sede_id" = $5, "identificador_tarjeta" = $6
          WHERE "email" = $7
        `, ['Pedro Pasajero ASVI', hashPasajero, 'pasajero', proveedorId, sedeId, 'TARJETA-ASVI-01', 'pasajero1.asvi@transportesasvi.com']);
      } else {
        await this.databaseService.query(`
          INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id", "sede_id", "identificador_tarjeta")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['pasajero1.asvi@transportesasvi.com', hashPasajero, 'Pedro Pasajero ASVI', 'pasajero', proveedorId, sedeId, 'TARJETA-ASVI-01']);
      }

      // 7. Pasajero 2
      const p2Check = await this.databaseService.query('SELECT id FROM "usuarios" WHERE "email" = $1', ['pasajero2.asvi@transportesasvi.com']);
      if (p2Check.rows.length > 0) {
        await this.databaseService.query(`
          UPDATE "usuarios" 
          SET "nombre" = $1, "password_hash" = $2, "rol" = $3, "proveedor_id" = $4, "sede_id" = $5, "identificador_tarjeta" = $6
          WHERE "email" = $7
        `, ['Ana Pasajero ASVI', hashPasajero, 'pasajero', proveedorId, sedeId, 'TARJETA-ASVI-02', 'pasajero2.asvi@transportesasvi.com']);
      } else {
        await this.databaseService.query(`
          INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id", "sede_id", "identificador_tarjeta")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['pasajero2.asvi@transportesasvi.com', hashPasajero, 'Ana Pasajero ASVI', 'pasajero', proveedorId, sedeId, 'TARJETA-ASVI-02']);
      }

      return {
        success: true,
        message: 'Transportes ASVI seeded successfully',
        proveedorId,
        sedeId
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message
      };
    }
  }

  @Get('temp-check-db')
  async checkDb() {
    try {
      const result = await this.databaseService.query('SELECT tablename FROM pg_tables WHERE schemaname = \'public\'');
      const tables = result.rows.map(r => r.tablename);
      
      let users: any[] = [];
      try {
        const uResult = await this.databaseService.query('SELECT email, rol, nombre FROM usuarios');
        users = uResult.rows;
      } catch (e: any) {
        users = [e.message];
      }
      
      return { 
        initError: this.databaseService.initError,
        tables, 
        users 
      };
    } catch (err: any) {
      return { 
        initError: this.databaseService.initError,
        error: err.message 
      };
    }
  }

  @Get('temp-check-viajes')
  async checkViajes() {
    try {
      const viajesRes = await this.databaseService.query(`
        SELECT v.id, v.estado, v.fecha_hora_salida, r.nombre as ruta_nombre, u.email as conductor_email
        FROM viajes v
        LEFT JOIN rutas r ON v.ruta_id = r.id
        LEFT JOIN usuarios u ON v.conductor_id = u.id
        ORDER BY v.fecha_hora_salida DESC
      `);
      const locationsRes = await this.databaseService.query(`
        SELECT uf.id, uf.viaje_id, uf.latitud, uf.longitud, uf.velocidad, uf.timestamp, r.nombre as ruta_nombre
        FROM ubicaciones_flota uf
        LEFT JOIN viajes v ON uf.viaje_id = v.id
        LEFT JOIN rutas r ON v.ruta_id = r.id
        ORDER BY uf.timestamp DESC
        LIMIT 30
      `);
      return {
        viajes: viajesRes.rows,
        locations: locationsRes.rows
      };
    } catch (e: any) {
      return { error: e.message };
    }
  }
}
