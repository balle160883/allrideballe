import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RentaModule } from '../renta/renta.module';
import { TransporteController } from './transporte.controller';
import { TransporteService } from './transporte.service';

@Module({
  imports: [DatabaseModule, RentaModule],
  controllers: [TransporteController],
  providers: [TransporteService],
  exports: [TransporteService],
})
export class TransporteModule {}
