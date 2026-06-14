const API_URL = 'http://2.24.81.205:4000';

async function main() {
  console.log('🔍 Verificando conductor CONDU01...\n');

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

    // 2. Obtener conductores
    console.log('👥 Conductores disponibles:');
    const conductoresRes = await fetch(`${API_URL}/transporte/conductores`, { headers: authHeaders });
    const conductores = await conductoresRes.json();
    
    let conductor01 = null;
    for (const c of conductores) {
      console.log('   -', c.nombre, '(' + c.email + ')');
      if (c.email === 'conductor1@allride.com') {
        conductor01 = c;
        console.log('   ✅ ENCONTRADO: CONDU01!');
      }
    }
    console.log();

    if (!conductor01) {
      console.log('⚠️  No se encontró el conductor conductor1@allride.com');
      console.log('Por favor, usa el panel para crear el viaje manualmente.');
      return;
    }

    // 3. Obtener viajes del conductor01
    console.log('🚗 Viajes de CONDU01:');
    const viajesRes = await fetch(`${API_URL}/transporte/viajes`, { headers: authHeaders });
    const viajes = await viajesRes.json();
    
    let viajesConductor01 = viajes.filter(v => v.conductor_id === conductor01.id);
    if (viajesConductor01.length === 0) {
      console.log('   (ninguno)');
    } else {
      for (const v of viajesConductor01) {
        console.log('   - ID:', v.id, '|', v.ruta_nombre, '|', v.estado);
      }
    }
    console.log();

    // 4. Obtener rutas disponibles
    console.log('🛣️ Rutas disponibles:');
    const rutasRes = await fetch(`${API_URL}/transporte/rutas`, { headers: authHeaders });
    const rutas = await rutasRes.json();
    for (const r of rutas) {
      console.log('   - ID:', r.id, '|', r.nombre);
    }
    console.log();

    // 5. Obtener vehículos
    console.log('🚙 Vehículos disponibles:');
    const vehiculosRes = await fetch(`${API_URL}/transporte/vehiculos`, { headers: authHeaders });
    const vehiculos = await vehiculosRes.json();
    for (const v of vehiculos) {
      console.log('   - ID:', v.id, '|', v.patente, '-', v.modelo);
    }
    console.log();

    console.log('📋 PASOS PARA CREAR EL VIAJE MANUALMENTE:');
    console.log('1. Ve al panel de administración: http://2.24.81.205:3080');
    console.log('2. Inicia sesión como admin@allride.com / password');
    console.log('3. Ve a la sección "Viajes"');
    console.log('4. Haz clic en "Agregar Viaje"');
    console.log('5. Llena los datos:');
    console.log('   - Ruta: elige cualquiera (ej: Ruta Central → Planta Norte)');
    console.log('   - Vehículo: elige cualquiera');
    console.log('   - Conductor: selecciona CONDU01 (conductor1@allride.com)');
    console.log('   - Fecha y Hora: mañana a las 7:00 AM');
    console.log('6. Guarda el viaje');
    console.log();
    console.log('¡Listo! El conductor CONDU01 verá el viaje en su app.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
