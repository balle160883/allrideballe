// URL base para las llamadas a la API.
// Usa un path relativo (/api-backend) que Next.js server-side re-dirige internamente
// al contenedor del backend (http://backend:4000) via rewrite en next.config.mjs.
// Esto evita el error de "Mixed Content" (HTTPS → HTTP) y problemas de CORS.
//
// Para desarrollo local sin Docker: crear frontend/.env.local con:
//   NEXT_PUBLIC_API_URL=http://localhost:4000
export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api-backend';

export function getAuthHeader(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
  return {};
}

export async function login(email: string, pass: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Credenciales inválidas');
  }
  const data = await res.json();
  localStorage.setItem('auth_token', data.access_token);
  localStorage.setItem('user_info', JSON.stringify(data.user));
  return data;
}

export async function fetchGestoresLocations(): Promise<any[]> {
  const headers = getAuthHeader();
  const response = await fetch(`${API_URL}/portfolio/locations`, { headers });
  if (!response.ok) throw new Error("Failed to fetch gestores locations");
  return response.json();
}

export async function fetchAllGestores() {
  const response = await fetch(`${API_URL}/portfolio/gestores`, {
    headers: getAuthHeader(),
  });
  if (!response.ok) throw new Error('Failed to fetch all gestores');
  return response.json();
}

export function logout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  window.location.href = '/login';
}

export async function fetchRutas(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/rutas`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch rutas');
  return res.json();
}

export async function createRuta(data: any) {
  const res = await fetch(`${API_URL}/transporte/rutas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create ruta');
  return res.json();
}

export async function updateRuta(id: number, data: any) {
  const res = await fetch(`${API_URL}/transporte/rutas/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update ruta');
  return res.json();
}

export async function deleteRuta(id: number) {
  const res = await fetch(`${API_URL}/transporte/rutas/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete ruta');
  return res.json();
}

export async function fetchVehiculos(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/vehiculos`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch vehiculos');
  return res.json();
}

export async function createVehiculo(data: any) {
  const res = await fetch(`${API_URL}/transporte/vehiculos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create vehiculo');
  return res.json();
}

export async function updateVehiculo(id: number, data: any) {
  const res = await fetch(`${API_URL}/transporte/vehiculos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update vehiculo');
  return res.json();
}

export async function deleteVehiculo(id: number) {
  const res = await fetch(`${API_URL}/transporte/vehiculos/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete vehiculo');
  return res.json();
}

export async function fetchConductores(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/conductores`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch conductores');
  return res.json();
}

export async function createConductor(data: any) {
  const res = await fetch(`${API_URL}/transporte/conductores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create conductor');
  return res.json();
}

export async function updateConductor(id: string, data: any) {
  const res = await fetch(`${API_URL}/transporte/conductores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update conductor');
  return res.json();
}

export async function deleteConductor(id: string) {
  const res = await fetch(`${API_URL}/transporte/conductores/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete conductor');
  return res.json();
}

export async function fetchProveedores(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/proveedores`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch proveedores');
  return res.json();
}

export async function createProveedor(data: any) {
  const res = await fetch(`${API_URL}/transporte/proveedores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create proveedor');
  return res.json();
}

export async function updateProveedor(id: string, data: any) {
  const res = await fetch(`${API_URL}/transporte/proveedores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update proveedor');
  return res.json();
}

export async function deleteProveedor(id: string) {
  const res = await fetch(`${API_URL}/transporte/proveedores/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete proveedor');
  return res.json();
}

export async function fetchPasajeros(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/pasajeros`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch pasajeros');
  return res.json();
}

export async function createPasajero(data: any) {
  const res = await fetch(`${API_URL}/transporte/pasajeros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al registrar pasajero' }));
    throw new Error(err.message || 'Failed to create pasajero');
  }
  return res.json();
}

export async function updatePasajero(id: string, data: any) {
  const res = await fetch(`${API_URL}/transporte/pasajeros/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al actualizar pasajero' }));
    throw new Error(err.message || 'Failed to update passenger');
  }
  return res.json();
}

export async function deletePasajero(id: string) {
  const res = await fetch(`${API_URL}/transporte/pasajeros/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al eliminar pasajero' }));
    throw new Error(err.message || 'Failed to delete passenger');
  }
  return res.json();
}

export async function fetchReservasPasajero(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/reservas/pasajero`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch reservas del pasajero');
  return res.json();
}

export async function fetchViajesDisponibles(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/viajes/disponibles`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch viajes disponibles');
  return res.json();
}

export async function solicitarReserva(viajeId: number): Promise<any> {
  const res = await fetch(`${API_URL}/transporte/reservas/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ viaje_id: viajeId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al solicitar reserva' }));
    throw new Error(err.message || 'Failed to request reservation');
  }
  return res.json();
}

export async function fetchReservasPendientes(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/reservas/pendientes`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch pending reservations');
  return res.json();
}

export async function aprobarReserva(reservaId: number, notas?: string): Promise<any> {
  const res = await fetch(`${API_URL}/transporte/reservas/${reservaId}/aprobar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ notas }),
  });
  if (!res.ok) throw new Error('Failed to approve reservation');
  return res.json();
}

export async function rechazarReserva(reservaId: number, notas?: string): Promise<any> {
  const res = await fetch(`${API_URL}/transporte/reservas/${reservaId}/rechazar`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ notas }),
  });
  if (!res.ok) throw new Error('Failed to reject reservation');
  return res.json();
}


export async function fetchViajes(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/viajes`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch viajes');
  return res.json();
}

export async function createViaje(data: any) {
  const res = await fetch(`${API_URL}/transporte/viajes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create viaje');
  return res.json();
}

export async function updateViajeEstado(id: number, estado: string) {
  const res = await fetch(`${API_URL}/transporte/viajes/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) throw new Error('Failed to update viaje estado');
  return res.json();
}

export async function deleteViaje(id: number) {
  const res = await fetch(`${API_URL}/transporte/viajes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete viaje');
  return res.json();
}

export async function fetchReservas(viajeId: number): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/viajes/${viajeId}/reservas`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch reservas');
  return res.json();
}

export async function createReserva(data: any) {
  const res = await fetch(`${API_URL}/transporte/reservas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create reserva');
  return res.json();
}

export async function updateReservaEstado(id: number, estado: string) {
  const res = await fetch(`${API_URL}/transporte/reservas/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ estado }),
  });
  if (!res.ok) throw new Error('Failed to update reserva estado');
  return res.json();
}

export async function fetchLatestLocations(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/locations/latest`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch latest locations');
  return res.json();
}

export async function saveLocation(data: any) {
  const res = await fetch(`${API_URL}/transporte/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save location');
  return res.json();
}

export async function fetchAlertas(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/alertas`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch alertas');
  return res.json();
}

export async function createAlerta(data: any) {
  const res = await fetch(`${API_URL}/transporte/alertas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create alerta');
  return res.json();
}

export async function resolverAlerta(id: number) {
  const res = await fetch(`${API_URL}/transporte/alertas/${id}/resolver`, {
    method: 'PATCH',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to resolve alerta');
  return res.json();
}

export async function fetchRentas(): Promise<any[]> {
  const response = await fetch(`${API_URL}/renta`, {
    headers: getAuthHeader(),
  });
  if (!response.ok) throw new Error("Failed to fetch rent data");
  return response.json();
}

export async function upsertRenta(data: any) {
  const res = await fetch(`${API_URL}/renta`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update rent info');
  return res.json();
}

export async function updateDomicilioPasajero(data: { direccion: string; latitud: number; longitud: number }) {
  const res = await fetch(`${API_URL}/transporte/pasajeros/domicilio`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error al actualizar domicilio' }));
    throw new Error(err.message || 'Failed to update passenger address');
  }
  return res.json();
}

export async function simularSmartRutas(maxDistanciaKm?: number, maxPasajerosPorRuta?: number) {
  const res = await fetch(`${API_URL}/transporte/routing/simular`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ maxDistanciaKm, maxPasajerosPorRuta }),
  });
  if (!res.ok) throw new Error('Failed to run smart routing simulation');
  return res.json();
}

export async function aplicarSmartRutas(rutasSugeridas: any[]) {
  const res = await fetch(`${API_URL}/transporte/routing/aplicar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ rutasSugeridas }),
  });
  if (!res.ok) throw new Error('Failed to apply smart routing plan');
  return res.json();
}

export async function fetchReporteKPIs(): Promise<any> {
  const res = await fetch(`${API_URL}/transporte/reportes/kpis`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch KPI reports');
  return res.json();
}

export async function fetchEficienciaRutas(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/reportes/eficiencia`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch routes efficiency reports');
  return res.json();
}

export async function fetchAuditoriaAsistencia(filtros: { rutaId?: number; fechaInicio?: string; fechaFin?: string }): Promise<any[]> {
  const params = new URLSearchParams();
  if (filtros.rutaId) params.append('rutaId', filtros.rutaId.toString());
  if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
  if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_URL}/transporte/reportes/asistencia${queryStr}`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch attendance audit log');
  return res.json();
}

// ==========================================
// CATÁLOGO DE PROVEEDORES (COMPAÑÍAS)
// ==========================================
export async function fetchCatalogoProveedores(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/catalogo-proveedores`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch catalogo proveedores');
  return res.json();
}

export async function createCatalogoProveedor(data: any) {
  const res = await fetch(`${API_URL}/transporte/catalogo-proveedores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create catalogo proveedor');
  return res.json();
}

export async function updateCatalogoProveedor(id: number, data: any) {
  const res = await fetch(`${API_URL}/transporte/catalogo-proveedores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update catalogo proveedor');
  return res.json();
}

export async function deleteCatalogoProveedor(id: number) {
  const res = await fetch(`${API_URL}/transporte/catalogo-proveedores/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete catalogo proveedor');
  return res.json();
}

// ==========================================
// CATÁLOGO DE SEDES (EMPRESAS CLIENTES)
// ==========================================
export async function fetchCatalogoSedes(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/catalogo-sedes`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch catalogo sedes');
  return res.json();
}

export async function createCatalogoSede(data: any) {
  const res = await fetch(`${API_URL}/transporte/catalogo-sedes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create catalogo sede');
  return res.json();
}

export async function updateCatalogoSede(id: number, data: any) {
  const res = await fetch(`${API_URL}/transporte/catalogo-sedes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update catalogo sede');
  return res.json();
}

export async function deleteCatalogoSede(id: number) {
  const res = await fetch(`${API_URL}/transporte/catalogo-sedes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete catalogo sede');
  return res.json();
}

export async function forgotPassword(email: string) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error al solicitar el restablecimiento');
  }
  return res.json();
}

export async function resetPassword(token: string, pass: string) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: pass }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Error al restablecer la contraseña');
  }
  return res.json();
}

