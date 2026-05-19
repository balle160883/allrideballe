import { Controller, Get, Param, Query, UseGuards, Request, Patch, Body, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PortfolioService } from './portfolio.service';
import { AuthGuard } from '@nestjs/passport';
import { RentaGuard } from '../renta/renta.guard';

@UseGuards(AuthGuard('jwt'), RentaGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  private isAdmin(req: any): boolean {
    const rol = req.user?.rol;
    return rol === 'admin' || rol === 'admin_cliente' || rol === 'admin_proveedor' || rol === 'superadmin';
  }

  @Get('socios')
  async getSocios(@Request() req: any, @Query('limit') limit: number, @Query('gestorId') gestorId?: string) {
    const rawGestorId = this.isAdmin(req) ? gestorId : req.user.gestorId;
    const effectiveGestorId = (rawGestorId && rawGestorId.trim() !== '') ? rawGestorId : undefined;
    return this.portfolioService.getSocios(limit, effectiveGestorId);
  }

  @Get('socios/:id/prestamos')
  async getPrestamos(@Request() req: any, @Param('id') id: string) {
    // Para préstamos específicos, el service ya maneja si el admin puede verlo (si no pasa gestorId)
    const effectiveGestorId = this.isAdmin(req) ? undefined : req.user.gestorId;
    return this.portfolioService.getPrestamosPorSocio(id, effectiveGestorId);
  }

  @Get('vencida')
  async getCarteraVencida(@Request() req: any, @Query('gestorId') gestorId?: string) {
    const rawGestorId = this.isAdmin(req) ? gestorId : req.user.gestorId;
    const effectiveGestorId = (rawGestorId && rawGestorId.trim() !== '') ? rawGestorId : undefined;
    return this.portfolioService.getCarteraVencida(effectiveGestorId);
  }

  @Get('asignaciones')
  async getAsignaciones(
    @Request() req: any,
    @Query('limit') limit: number,
    @Query('gestorId') gestorId?: string,
  ) {
    const rawGestorId = this.isAdmin(req) ? gestorId : (gestorId || req.user.gestorId);
    const effectiveGestorId = (rawGestorId && rawGestorId.trim() !== '') ? rawGestorId : undefined;
    return this.portfolioService.getAsignaciones(limit, effectiveGestorId);
  }

  @Get('recuperacion')
  async getRecuperacion(
    @Request() req: any, 
    @Query('gestorId') gestorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const rawGestorId = this.isAdmin(req) ? gestorId : req.user.gestorId;
    const effectiveGestorId = (rawGestorId && rawGestorId.trim() !== '') ? rawGestorId : undefined;
    return this.portfolioService.getRecuperacion(effectiveGestorId, startDate, endDate);
  }
  
  @Get('locations')
  async getLocations() {
    return this.portfolioService.getAllGestoresLocations();
  }

  @Get('gestores')
  async getGestores() {
    return this.portfolioService.getAllGestores();
  }

  @Patch('asignaciones/:noCuenta')
  async updateAsignacion(@Param('noCuenta') noCuenta: string, @Body() data: any) {
    return this.portfolioService.updateAsignacion(noCuenta, data);
  }

  @Post('import-avales')
  @UseInterceptors(FileInterceptor('file'))
  async importAvales(@UploadedFile() file: Express.Multer.File) {
    return this.portfolioService.importAvales(file.buffer);
  }

  @Get('avales')
  async getAvales(@Request() req: any, @Query('gestorId') gestorId?: string) {
    const rawGestorId = this.isAdmin(req) ? gestorId : req.user.gestorId;
    const effectiveGestorId = (rawGestorId && rawGestorId.trim() !== '') ? rawGestorId : undefined;
    return this.portfolioService.getAvales(effectiveGestorId);
  }

  @Post('locations')
  async saveLocation(@Request() req: any, @Body() data: any) {
    const gestorId = req.user.userId || data.gestor_id;
    return this.portfolioService.saveLocation(gestorId, data.latitud, data.longitud, data.timestamp);
  }
}

