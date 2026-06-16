const API_URL = 'http://2.24.81.205:4000';

// -------------------------------
// PASO 1: INICIA SESIÓN PARA OBTENER EL TOKEN
// -------------------------------
async function login() {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@allride.com', password: 'password' }),
    });
    const data = await res.json();
    return data.access_token;
  } catch (e) {
    console.error('Error login:', e);
    return null;
  }
}

// -------------------------------
// PASO 2: OBTIENE LOS VIAJES PARA ENCONTRAR UNO ACTIVO
// -------------------------------
async function getViajes(token) {
  try {
    const res = await fetch(`${API_URL}/transporte/viajes`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('Error obteniendo viajes:', e);
    return [];
  }
}

// -------------------------------
// PASO 3: ENVÍA UNA UBICACIÓN DE PRUEBA
// -------------------------------
async function sendTestLocation(token, viajeId) {
  try {
    const res = await fetch(`${API_URL}/transporte/viajes/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        viaje_id: viajeId,
        latitud: 20.6736, // Centro de Guadalajara
        longitud: -103.3496,
        velocidad: 30,
        timestamp: new Date().toISOString(),
      }),
    });

    const data = await res.json();
    console.log('✅ Ubicación enviada:', data);
  } catch (e) {
    console.error('❌ Error enviando ubicación:', e);
  }
}

// -------------------------------
// PASO 4: OBTIENE LAS UBICACIONES RECIENTES
// -------------------------------
async function getLatestLocations(token) {
  try {
    const res = await fetch(`${API_URL}/transporte/locations/latest`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    console.log('📍 Ubicaciones recientes:', data);
  } catch (e) {
    console.error('❌ Error obteniendo ubicaciones:', e);
  }
}

// -------------------------------
// EJECUCIÓN
// -------------------------------
async function main() {
  const token = await login();
  if (!token) return;
  
  // Obtiene los viajes y busca uno activo
  const viajes = await getViajes(token);
  console.log('📋 Viajes disponibles:', viajes);
  
  const viajeActivo = viajes.find((v) => v.estado === 'en_ruta' || v.estado === 'programado');
  if (!viajeActivo) {
    console.error('❌ No hay viajes activos!');
    return;
  }
  
  console.log('✅ Viaje activo encontrado:', viajeActivo.id);
  
  // Envía la ubicación de prueba
  await sendTestLocation(token, viajeActivo.id);
  
  // Verifica que la ubicación se guardó
  await getLatestLocations(token);
  
  console.log('🎉 Listo! Ahora actualiza la página del mapa para ver el vehículo.');
}

main();