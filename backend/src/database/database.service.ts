import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  private readonly logger = new Logger(DatabaseService.name);
  public initError: string | null = null;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>('DATABASE_URL') || 
      'postgresql://postgres:postgres@localhost:5432/postgres';

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async onModuleInit() {
    let client: any;
    try {
      // Intentar obtener una conexión del pool (ahora dentro del try para manejar fallos de BD)
      client = await this.pool.connect();

      // 1. Obtener lock consultivo a nivel de transacción
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(792837492)');
      
      this.logger.log('Conexión con PostgreSQL establecida y lock de migración adquirido.');

      // Verificar si existe la tabla 'usuarios'
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'usuarios'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        this.logger.warn('La tabla "usuarios" no existe. Inicializando esquema AllRide...');
        const fs = require('fs');
        const path = require('path');
        const sqlPath = path.join(process.cwd(), 'init_transport_schema.sql');
        if (fs.existsSync(sqlPath)) {
          const sql = fs.readFileSync(sqlPath, 'utf8');
          await client.query(sql);
          this.logger.log('Esquema AllRide inicializado exitosamente con datos semilla.');
        } else {
          this.logger.error(`No se encontró el archivo init_transport_schema.sql en la ruta: ${sqlPath}`);
        }
      }

      // Asegurar que el usuario administrador exista SOLO si no está registrado aún.
      // Se usa ON CONFLICT DO NOTHING para NO sobreescribir contraseñas existentes en cada reinicio.
      const plainPassword = 'Seguridad2026@';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      await client.query(`
        INSERT INTO "usuarios" ("id", "email", "password_hash", "nombre", "rol")
        VALUES ('4d4d4d4d-4d4d-4d4d-4d4d-4d4d4d4d4d4d', 'ing.ballesteros16@gmail.com', $1, 'Administrador Global', 'admin_cliente')
        ON CONFLICT (email) DO NOTHING;
      `, [hashedPassword]);
      this.logger.log('Verificación de usuario administrador global completada.');

      // Ejecutar alteraciones de esquema para el flujo de aprobación gerencial y smart routing
      await client.query(`
        -- Alterar constraint de rol en usuarios para soportar 'gerente'
        ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_rol_check";
        ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_check" CHECK ("rol" IN ('admin_cliente', 'admin_proveedor', 'conductor', 'pasajero', 'gerente'));

        -- Agregar columna para tokens de notificación push
        ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "push_token" VARCHAR(255);

        -- Agregar columnas para restablecimiento de contraseña
        ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "reset_password_token" VARCHAR(255);
        ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "reset_password_expires" TIMESTAMP;

        -- Alterar constraint de estado en reservas para nuevos estados de aprobación
        ALTER TABLE "reservas" DROP CONSTRAINT IF EXISTS "reservas_estado_check";
        ALTER TABLE "reservas" ADD CONSTRAINT "reservas_estado_check" CHECK ("estado" IN ('pendiente_aprobacion', 'reservado', 'confirmado', 'no_abordado', 'cancelado', 'rechazado'));

        -- Agregar columnas de auditoría y notas de aprobación
        ALTER TABLE "reservas" ADD COLUMN IF NOT EXISTS "aprobado_por" UUID REFERENCES "usuarios"("id") ON DELETE SET NULL;
        ALTER TABLE "reservas" ADD COLUMN IF NOT EXISTS "fecha_aprobacion" TIMESTAMP;
        ALTER TABLE "reservas" ADD COLUMN IF NOT EXISTS "notas_gerente" TEXT;

        -- Agregar campos de dirección y geocoordenadas a usuarios
        ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "direccion" VARCHAR(500);
        ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "latitud" NUMERIC(10, 8);
        ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "longitud" NUMERIC(11, 8);

        -- Tabla para auditorías de parada (Geofencing)
        CREATE TABLE IF NOT EXISTS "tiempos_paradas" (
          "id" SERIAL PRIMARY KEY,
          "viaje_id" INTEGER REFERENCES "viajes"("id") ON DELETE CASCADE,
          "parada_nombre" VARCHAR(255) NOT NULL,
          "orden" INTEGER NOT NULL,
          "fecha_hora_llegada" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "fecha_hora_salida" TIMESTAMP,
          UNIQUE("viaje_id", "orden")
        );

        -- Soporte para alertas SOS y reporte de acoso
        ALTER TABLE "alertas_viaje" DROP CONSTRAINT IF EXISTS "alertas_viaje_tipo_check";
        ALTER TABLE "alertas_viaje" ADD CONSTRAINT "alertas_viaje_tipo_check" CHECK ("tipo" IN ('desvio_ruta', 'atraso_proyectado', 'inicio_tardio', 'no_abordado', 'sos', 'acoso'));
        ALTER TABLE "alertas_viaje" ADD COLUMN IF NOT EXISTS "latitud" NUMERIC(10, 8);
        ALTER TABLE "alertas_viaje" ADD COLUMN IF NOT EXISTS "longitud" NUMERIC(11, 8);
        ALTER TABLE "alertas_viaje" ADD COLUMN IF NOT EXISTS "prioridad" VARCHAR(50) DEFAULT 'media';

        -- Tablas para Multi-Proveedor y Multi-Sede
        CREATE TABLE IF NOT EXISTS "proveedores" (
          "id" SERIAL PRIMARY KEY,
          "nombre" VARCHAR(255) NOT NULL UNIQUE,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS "sedes" (
          "id" SERIAL PRIMARY KEY,
          "nombre" VARCHAR(255) NOT NULL UNIQUE,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Poblar catálogos iniciales
        INSERT INTO "proveedores" ("nombre") VALUES ('Transportes del Valle') ON CONFLICT DO NOTHING;
        INSERT INTO "proveedores" ("nombre") VALUES ('Autobuses de Occidente') ON CONFLICT DO NOTHING;
        INSERT INTO "sedes" ("nombre") VALUES ('Planta Industrial Norte') ON CONFLICT DO NOTHING;
        INSERT INTO "sedes" ("nombre") VALUES ('Campus Tecnológico Sur') ON CONFLICT DO NOTHING;

        -- Agregar llaves foráneas a usuarios, vehículos, rutas y viajes
        ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "proveedor_id" INTEGER REFERENCES "proveedores"("id") ON DELETE SET NULL;
        ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "sede_id" INTEGER REFERENCES "sedes"("id") ON DELETE SET NULL;

        ALTER TABLE "vehiculos" ADD COLUMN IF NOT EXISTS "proveedor_id" INTEGER REFERENCES "proveedores"("id") ON DELETE SET NULL;

        ALTER TABLE "rutas" ADD COLUMN IF NOT EXISTS "sede_id" INTEGER REFERENCES "sedes"("id") ON DELETE SET NULL;

        ALTER TABLE "viajes" ADD COLUMN IF NOT EXISTS "proveedor_id" INTEGER REFERENCES "proveedores"("id") ON DELETE SET NULL;
        ALTER TABLE "viajes" ADD COLUMN IF NOT EXISTS "sede_id" INTEGER REFERENCES "sedes"("id") ON DELETE SET NULL;

        -- Relacionar rentas con proveedores
        ALTER TABLE "rentas_mensuales" ADD COLUMN IF NOT EXISTS "proveedor_id" INTEGER REFERENCES "proveedores"("id") ON DELETE SET NULL;

        -- Asegurar restricción UNIQUE para evitar múltiples rentas por proveedor
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'rentas_mensuales_proveedor_id_key'
            ) THEN
                ALTER TABLE "rentas_mensuales" ADD CONSTRAINT "rentas_mensuales_proveedor_id_key" UNIQUE ("proveedor_id");
            END IF;
        END $$;
      `);
      
      await client.query('COMMIT');
      this.logger.log('Esquema de base de datos inicializado y actualizado correctamente.');
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK').catch(() => {});
      }
      this.initError = error.message;
      this.logger.error('Error al conectar con PostgreSQL o ejecutar esquema:', error.message);
    } finally {
      if (client) {
        client.release();
      }
    }
  }


  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Pool de conexiones a PostgreSQL cerrado.');
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const res = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Consulta ejecutada en ${duration}ms: ${text.slice(0, 100)}`);
      return res;
    } catch (error) {
      this.logger.error(`Error en consulta: ${text}. Detalle: ${error.message}`);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // Helper dinámico para insertar una fila y retornar el registro insertado
  async insertOne<T extends QueryResultRow = any>(table: string, data: any): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const columns = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
    
    const sql = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) RETURNING *`;
    const res = await this.query<T>(sql, values);
    return res.rows[0];
  }

  // Helper dinámico para actualizar una fila y retornar el registro actualizado
  async updateOne<T extends QueryResultRow = any>(table: string, idColumn: string, idValue: any, data: any): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = keys.map((k, idx) => `"${k}" = $${idx + 1}`).join(', ');
    const sql = `UPDATE "${table}" SET ${setClause} WHERE "${idColumn}" = $${keys.length + 1} RETURNING *`;
    
    const res = await this.query<T>(sql, [...values, idValue]);
    return res.rows[0];
  }

  // Helper dinámico para insertar múltiples filas en un solo query
  async insertMany<T extends QueryResultRow = any>(table: string, dataArray: any[]): Promise<T[]> {
    if (!dataArray || dataArray.length === 0) return [];
    
    const keys = Object.keys(dataArray[0]);
    const columns = keys.map(k => `"${k}"`).join(', ');
    
    const values: any[] = [];
    const valuePlaceholders: string[] = [];
    
    dataArray.forEach((data, rowIdx) => {
      const rowPlaceholders = keys.map((_, colIdx) => `$${rowIdx * keys.length + colIdx + 1}`);
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
      keys.forEach(k => values.push(data[k]));
    });
    
    const sql = `INSERT INTO "${table}" (${columns}) VALUES ${valuePlaceholders.join(', ')} RETURNING *`;
    const res = await this.query<T>(sql, values);
    return res.rows;
  }
}
