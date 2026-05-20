import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

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
    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.log('Conexión con PostgreSQL establecida correctamente.');

      // Verificar si existe la tabla 'usuarios'
      const tableCheck = await this.pool.query(`
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
          await this.pool.query(sql);
          this.logger.log('Esquema AllRide inicializado exitosamente con datos semilla.');
        } else {
          this.logger.error(`No se encontró el archivo init_transport_schema.sql en la ruta: ${sqlPath}`);
        }
      }

      // Asegurar que el usuario ing.ballesteros16@gmail.com siempre exista en la tabla usuarios
      await this.pool.query(`
        INSERT INTO "usuarios" ("id", "email", "password_hash", "nombre", "rol")
        VALUES ('4d4d4d4d-4d4d-4d4d-4d4d-4d4d4d4d4d4d', 'ing.ballesteros16@gmail.com', 'Seguridad2026@', 'Administrador Global', 'admin_cliente')
        ON CONFLICT (email) DO UPDATE SET password_hash = 'Seguridad2026@', rol = 'admin_cliente';
      `);
      this.logger.log('Usuario administrador global asegurado en la tabla de usuarios.');

      // Ejecutar alteraciones de esquema para el flujo de aprobación gerencial y smart routing
      await this.pool.query(`
        -- Alterar constraint de rol en usuarios para soportar 'gerente'
        ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_rol_check";
        ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_check" CHECK ("rol" IN ('admin_cliente', 'admin_proveedor', 'conductor', 'pasajero', 'gerente'));

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
      `);
      this.logger.log('Esquema de base de datos actualizado para el flujo de aprobación gerencial y smart routing.');
    } catch (error) {
      this.initError = error.message;
      this.logger.error('Error al conectar con PostgreSQL:', error.message);
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
