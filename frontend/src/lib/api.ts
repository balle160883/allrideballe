let API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL && typeof window !== 'undefined') {
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    API_URL = `${protocol}//${hostname}:4000`;
  } else {
    API_URL = `${protocol}//api.${hostname.replace(/^(app|www)\./, '')}`;
  }
}

if (!API_URL) {
  API_URL = 'https://api.allride.com';
}

function getAuthHeader(): Record<string, string> {
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

export async function fetchPasajeros(): Promise<any[]> {
  const res = await fetch(`${API_URL}/transporte/pasajeros`, { headers: getAuthHeader() });
  if (!res.ok) throw new Error('Failed to fetch pasajeros');
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
