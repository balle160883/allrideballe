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
      
      return { tables, users };
    } catch (err: any) {
      return { error: err.message };
    }
  }
}
