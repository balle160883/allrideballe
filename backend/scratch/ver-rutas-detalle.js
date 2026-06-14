const API_URL = 'http://2.24.81.205:4000';

async function main() {
  console.log('🔍 Ver estructura de rutas existentes...\n');

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

    // 2. Ver rutas detalladas
    console.log('🛣️ Rutas detalladas:');
    const rutasRes = await fetch(`${API_URL}/transporte/rutas`, { headers: authHeaders });
    const rutas = await rutasRes.json();
    
    for (const r of rutas) {
      console.log('\n📌 Ruta ID:', r.id, '-', r.nombre);
      console.log('   Origen:', r.origen);
      console.log('   Destino:', r.destino);
      console.log('   Activa:', r.activo);
      console.log('   Paradas (JSON):');
      console.log(JSON.stringify(r.paradas, null, 2));
    }
    console.log();

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
