import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request, Query } from '@nestjs/common';
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

  @Post('conductores')
  async createConductor(@Body() data: { email: string; nombre: string; gestor_code?: string }) {
    return this.transporteService.createConductor(data);
  }

  @Patch('conductores/:id')
  async updateConductor(@Param('id') id: string, @Body() data: any) {
    return this.transporteService.updateConductor(id, data);
  }

  @Delete('conductores/:id')
  async deleteConductor(@Param('id') id: string) {
    return this.transporteService.deleteConductor(id);
  }

  @Get('pasajeros')
  async getPasajeros() {
    return this.transporteService.getPasajeros();
  }

  @Post('pasajeros')
  async createPasajero(@Body() data: { email: string; nombre: string; identificador_tarjeta: string }) {
    return this.transporteService.createPasajero(data);
  }

  @Patch('pasajeros/:id')
  async updatePasajero(@Param('id') id: string, @Body() data: any) {
    return this.transporteService.updatePasajero(id, data);
  }

  @Delete('pasajeros/:id')
  async deletePasajero(@Param('id') id: string) {
    return this.transporteService.deletePasajero(id);
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
  @Get('reservas/pasajero')
  async getReservasPasajero(@Request() req: any) {
    return this.transporteService.getReservasPasajero(req.user.userId);
  }

  @Get('viajes/disponibles')
  async getViajesDisponibles(@Request() req: any) {
    return this.transporteService.getViajesDisponibles(req.user.userId);
  }

  @Post('reservas/solicitar')
  async solicitarReserva(@Request() req: any, @Body() data: { viaje_id: number }) {
    return this.transporteService.solicitarReserva(req.user.userId, Number(data.viaje_id));
  }

  @Get('reservas/pendientes')
  async getReservasPendientes() {
    return this.transporteService.getReservasPendientes();
  }

  @Patch('reservas/:id/aprobar')
  async aprobarReserva(@Request() req: any, @Param('id') id: string, @Body() data?: { notas?: string }) {
    return this.transporteService.aprobarReserva(Number(id), req.user.userId, data?.notas);
  }

  @Patch('reservas/:id/rechazar')
  async rechazarReserva(@Request() req: any, @Param('id') id: string, @Body() data?: { notas?: string }) {
    return this.transporteService.rechazarReserva(Number(id), req.user.userId, data?.notas);
  }

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

  @Post('viajes/:id/abordar')
  async abordarPasajero(
    @Param('id') id: string,
    @Body() data: { identificador_tarjeta: string }
  ) {
    return this.transporteService.abordarPasajero(Number(id), data.identificador_tarjeta);
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

  @Post('viajes/location')
  async saveLocationAlias(@Request() req: any, @Body() data: any) {
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

  @Patch('pasajeros/domicilio')
  async setDomicilioPasajero(@Request() req: any, @Body() data: { direccion: string; latitud: number; longitud: number }) {
    return this.transporteService.setDomicilioPasajero(req.user.userId, data);
  }

  @Post('routing/simular')
  async simularSmartRutas(@Body() data: { maxDistanciaKm?: number; maxPasajerosPorRuta?: number }) {
    const dist = data.maxDistanciaKm !== undefined ? Number(data.maxDistanciaKm) : 2.5;
    const cap = data.maxPasajerosPorRuta !== undefined ? Number(data.maxPasajerosPorRuta) : 15;
    return this.transporteService.generarSmartRutas(dist, cap);
  }

  @Post('routing/aplicar')
  async aplicarSmartRutas(@Body() data: { rutasSugeridas: any[] }) {
    return this.transporteService.aplicarSmartRutas(data.rutasSugeridas);
  }

  // ==========================================
  // REPORTES Y AUDITORÍA
  // ==========================================
  @Get('reportes/kpis')
  async getReporteKPIs() {
    return this.transporteService.getReporteKPIs();
  }

  @Get('reportes/eficiencia')
  async getEficienciaRutas() {
    return this.transporteService.getEficienciaRutas();
  }

  @Get('reportes/asistencia')
  async getAuditoriaAsistencia(
    @Query('rutaId') rutaId?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string
  ) {
    return this.transporteService.getAuditoriaAsistencia({
      rutaId: rutaId ? Number(rutaId) : undefined,
      fechaInicio,
      fechaFin
    });
  }
}
