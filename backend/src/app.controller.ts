import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';

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
