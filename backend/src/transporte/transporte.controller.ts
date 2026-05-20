import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RentaGuard } from '../renta/renta.guard';
import { TransporteService } from './transporte.service';

@UseGuards(AuthGuard('jwt'), RentaGuard)
@Controller('transporte')
export class TransporteController {
  constructor(private readonly transporteService: TransporteService) {}

  // ==========================================
  // RUTAS
  // ==========================================
  @Get('rutas')
  async getRutas() {
    return this.transporteService.getRutas();
  }

  @Post('rutas')
  async createRuta(@Body() data: any) {
    return this.transporteService.createRuta(data);
  }

  @Patch('rutas/:id')
  async updateRuta(@Param('id') id: string, @Body() data: any) {
    return this.transporteService.updateRuta(Number(id), data);
  }

  @Delete('rutas/:id')
  async deleteRuta(@Param('id') id: string) {
    return this.transporteService.deleteRuta(Number(id));
  }

  // ==========================================
  // VEHÍCULOS
  // ==========================================
  @Get('vehiculos')
  async getVehiculos() {
    return this.transporteService.getVehiculos();
  }

  @Post('vehiculos')
  async createVehiculo(@Body() data: any) {
    return this.transporteService.createVehiculo(data);
  }

  @Patch('vehiculos/:id')
  async updateVehiculo(@Param('id') id: string, @Body() data: any) {
    return this.transporteService.updateVehiculo(Number(id), data);
  }

  @Delete('vehiculos/:id')
  async deleteVehiculo(@Param('id') id: string) {
    return this.transporteService.deleteVehiculo(Number(id));
  }

  // ==========================================
  // CONDUCTORES Y PASAJEROS
  // ==========================================
  @Get('conductores')
  async getConductores() {
    return this.transporteService.getConductores();
  }

  @Get('pasajeros')
  async getPasajeros() {
    return this.transporteService.getPasajeros();
  }

  // ==========================================
  // VIAJES
  // ==========================================
  @Get('viajes')
  async getViajes(@Request() req: any) {
    // Si es un conductor, solo cargamos los viajes asignados a él
    const conductorId = req.user.rol === 'conductor' ? req.user.userId : undefined;
    return this.transporteService.getViajes(conductorId);
  }

  @Post('viajes')
  async createViaje(@Body() data: any) {
    return this.transporteService.createViaje(data);
  }

  @Patch('viajes/:id/estado')
  async updateViajeEstado(@Param('id') id: string, @Body() data: { estado: string }) {
    return this.transporteService.updateViajeEstado(Number(id), data.estado);
  }

  @Delete('viajes/:id')
  async deleteViaje(@Param('id') id: string) {
    return this.transporteService.deleteViaje(Number(id));
  }

  // ==========================================
  // RESERVAS
  // ==========================================
  @Get('viajes/:id/reservas')
  async getReservas(@Param('id') id: string) {
    return this.transporteService.getReservas(Number(id));
  }

  @Post('reservas')
  async createReserva(@Body() data: any) {
    return this.transporteService.createReserva(data);
  }

  @Patch('reservas/:id/estado')
  async updateReservaEstado(@Param('id') id: string, @Body() data: { estado: string }) {
    return this.transporteService.updateReservaEstado(Number(id), data.estado);
  }

  // ==========================================
  // GPS
  // ==========================================
  @Post('locations')
  async saveLocation(@Request() req: any, @Body() data: any) {
    return this.transporteService.saveLocation({
      viaje_id: Number(data.viaje_id),
      latitud: Number(data.latitud),
      longitud: Number(data.longitud),
      velocidad: data.velocidad ? Number(data.velocidad) : undefined,
    });
  }

  @Get('locations/latest')
  async getLatestLocations() {
    return this.transporteService.getLatestLocations();
  }

  // ==========================================
  // ALERTAS
  // ==========================================
  @Get('alertas')
  async getAlertas() {
    return this.transporteService.getAlertas();
  }

  @Post('alertas')
  async createAlerta(@Body() data: any) {
    return this.transporteService.createAlerta(data);
  }

  @Patch('alertas/:id/resolver')
  async resolverAlerta(@Param('id') id: string) {
    return this.transporteService.resolverAlerta(Number(id));
  }
}
