import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { RentaModule } from './renta/renta.module';
import { DatabaseModule } from './database/database.module';
import { TransporteModule } from './transporte/transporte.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    TransporteModule,
    RentaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

