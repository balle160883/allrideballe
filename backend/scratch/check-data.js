const API_URL = 'http://2.24.81.205:4000';

async function main() {
  console.log('🔍 Verificando datos existentes...');
  console.log('API URL:', API_URL);

  try {
    // 1. Iniciar sesión
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@allride.com', password: 'password' }),
    });
    const loginData = await loginRes.json();
    const authToken = loginData.access_token;
    const authHeaders = { 'Authorization': `Bearer ${authToken}` };
    console.log('✅ Sesión iniciada\n');

    // 2. Ver rutas existentes
    console.log('📋 Rutas existentes:');
    const rutasRes = await fetch(`${API_URL}/transporte/rutas`, { headers: authHeaders });
    const rutas = await rutasRes.json();
    if (rutas.length === 0) {
      console.log('   (ninguna)');
    } else {
      for (const r of rutas) {
        console.log('   -', r.id, '→', r.nombre);
        console.log('     Origen:', r.origen, '→ Destino:', r.destino);
        console.log('     Paradas:', r.paradas?.length || 0);
      }
    }
    console.log();

    // 3. Ver viajes existentes
    console.log('🚗 Viajes existentes:');
    const viajesRes = await fetch(`${API_URL}/transporte/viajes`, { headers: authHeaders });
    const viajes = await viajesRes.json();
    if (viajes.length === 0) {
      console.log('   (ninguno)');
    } else {
      for (const v of viajes) {
        console.log('   - ID:', v.id, '| Estado:', v.estado);
        console.log('     Ruta:', v.ruta_nombre);
        console.log('     Conductor:', v.conductor_nombre);
        console.log('     Salida:', new Date(v.fecha_hora_salida).toLocaleString());
      }
    }
    console.log();

    console.log('📝 Para crear la ruta y el viaje manualmente:');
    console.log('1. Ve a la sección Rutas en el panel');
    console.log('2. Agrega la ruta "Ruta Centro → Flex Norte"');
    console.log('3. Luego ve a Viajes y crea el viaje asociado');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
