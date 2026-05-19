import { Module } from '@nestjs/common';
import { RentaService } from './renta.service';
import { RentaController } from './renta.controller';

@Module({
  providers: [RentaService],
  controllers: [RentaController],
  exports: [RentaService],
})
export class RentaModule {}

