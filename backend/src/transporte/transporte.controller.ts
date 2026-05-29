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
  async getRutas(@Request() req: any) {
    return this.transporteService.getRutas(req.user.userId);
  }

  @Post('rutas')
  async createRuta(@Request() req: any, @Body() data: any) {
    return this.transporteService.createRuta(data, req.user.userId);
  }

  @Patch('rutas/:id')
  async updateRuta(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.transporteService.updateRuta(Number(id), data, req.user.userId);
  }

  @Delete('rutas/:id')
  async deleteRuta(@Request() req: any, @Param('id') id: string) {
    return this.transporteService.deleteRuta(Number(id), req.user.userId);
  }

  // ==========================================
  // VEHÍCULOS
  // ==========================================
  @Get('vehiculos')
  async getVehiculos(@Request() req: any) {
    return this.transporteService.getVehiculos(req.user.userId);
  }

  @Post('vehiculos')
  async createVehiculo(@Request() req: any, @Body() data: any) {
    return this.transporteService.createVehiculo(data, req.user.userId);
  }

  @Patch('vehiculos/:id')
  async updateVehiculo(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.transporteService.updateVehiculo(Number(id), data, req.user.userId);
  }

  @Delete('vehiculos/:id')
  async deleteVehiculo(@Request() req: any, @Param('id') id: string) {
    return this.transporteService.deleteVehiculo(Number(id), req.user.userId);
  }

  // ==========================================
  // CONDUCTORES Y PASAJEROS
  // ==========================================
  @Get('conductores')
  async getConductores(@Request() req: any) {
    return this.transporteService.getConductores(req.user.userId);
  }

  @Post('conductores')
  async createConductor(@Request() req: any, @Body() data: { email: string; nombre: string; gestor_code?: string }) {
    return this.transporteService.createConductor(data, req.user.userId);
  }

  @Patch('conductores/:id')
  async updateConductor(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.transporteService.updateConductor(id, data, req.user.userId);
  }

  @Delete('conductores/:id')
  async deleteConductor(@Request() req: any, @Param('id') id: string) {
    return this.transporteService.deleteConductor(id, req.user.userId);
  }

  // ==========================================
  // ADMIN PROVEEDORES
  // ==========================================
  @Get('proveedores')
  async getAdminProveedores() {
    return this.transporteService.getAdminProveedores();
  }

  @Post('proveedores')
  async createAdminProveedor(@Body() data: { email: string; nombre: string; gestor_code?: string; proveedor_id?: number }) {
    return this.transporteService.createAdminProveedor(data);
  }

  @Patch('proveedores/:id')
  async updateAdminProveedor(@Param('id') id: string, @Body() data: any) {
    return this.transporteService.updateAdminProveedor(id, data);
  }

  @Delete('proveedores/:id')
  async deleteAdminProveedor(@Param('id') id: string) {
    return this.transporteService.deleteAdminProveedor(id);
  }

  @Post('importar-excel')
  async importarDatosExcel(@Body() data: any) {
    return this.transporteService.importarDatosExcel(data);
  }

  @Get('pasajeros')
  async getPasajeros(@Request() req: any) {
    return this.transporteService.getPasajeros(req.user.userId);
  }

  @Post('pasajeros')
  async createPasajero(@Request() req: any, @Body() data: { email: string; nombre: string; identificador_tarjeta: string; sede_id?: number; proveedor_id?: number }) {
    return this.transporteService.createPasajero(data, req.user.userId);
  }

  @Patch('pasajeros/:id')
  async updatePasajero(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.transporteService.updatePasajero(id, data, req.user.userId);
  }

  @Delete('pasajeros/:id')
  async deletePasajero(@Request() req: any, @Param('id') id: string) {
    return this.transporteService.deletePasajero(id, req.user.userId);
  }

  // ==========================================
  // VIAJES
  // ==========================================
  @Get('viajes')
  async getViajes(@Request() req: any) {
    const conductorId = req.user.rol === 'conductor' ? req.user.userId : undefined;
    return this.transporteService.getViajes(conductorId, req.user.userId);
  }

  @Post('viajes')
  async createViaje(@Request() req: any, @Body() data: any) {
    return this.transporteService.createViaje(data, req.user.userId);
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
  async getAlertas(@Request() req: any) {
    return this.transporteService.getAlertas(req.user.userId);
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

  @Patch('usuarios/push-token')
  async updatePushToken(@Request() req: any, @Body() data: { push_token: string }) {
    return this.transporteService.updatePushToken(req.user.userId, data.push_token);
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

  @Get('reportes/sla')
  async getAuditoriaSLA() {
    return this.transporteService.getAuditoriaSLA();
  }

  // ==========================================
  // CATÁLOGO DE PROVEEDORES (COMPAÑÍAS)
  // ==========================================
  @Get('catalogo-proveedores')
  async getCatalogoProveedores() {
    return this.transporteService.getCatalogoProveedores();
  }

  @Post('catalogo-proveedores')
  async createCatalogoProveedor(@Body() data: { nombre: string }) {
    return this.transporteService.createCatalogoProveedor(data);
  }

  @Patch('catalogo-proveedores/:id')
  async updateCatalogoProveedor(@Param('id') id: string, @Body() data: { nombre: string }) {
    return this.transporteService.updateCatalogoProveedor(Number(id), data);
  }

  @Delete('catalogo-proveedores/:id')
  async deleteCatalogoProveedor(@Param('id') id: string) {
    return this.transporteService.deleteCatalogoProveedor(Number(id));
  }

  // ==========================================
  // CATÁLOGO DE SEDES (EMPRESAS CLIENTES)
  // ==========================================
  @Get('catalogo-sedes')
  async getCatalogoSedes(@Request() req: any) {
    return this.transporteService.getCatalogoSedes(req.user.userId);
  }

  @Post('catalogo-sedes')
  async createCatalogoSede(@Request() req: any, @Body() data: { nombre: string; proveedor_id?: number }) {
    return this.transporteService.createCatalogoSede(data, req.user.userId);
  }

  @Patch('catalogo-sedes/:id')
  async updateCatalogoSede(@Request() req: any, @Param('id') id: string, @Body() data: { nombre: string; proveedor_id?: number }) {
    return this.transporteService.updateCatalogoSede(Number(id), data, req.user.userId);
  }

  @Delete('catalogo-sedes/:id')
  async deleteCatalogoSede(@Request() req: any, @Param('id') id: string) {
    return this.transporteService.deleteCatalogoSede(Number(id), req.user.userId);
  }
}
