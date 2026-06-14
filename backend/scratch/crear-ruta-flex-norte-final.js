const API_URL = 'http://2.24.81.205:4000';

async function main() {
  console.log('🚀 Creando ruta Flex Norte y viaje para CONDU01...\n');

  try {
    // 1. Iniciar sesión
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@allride.com', password: 'password' }),
    });
    const loginData = await loginRes.json();
    const authToken = loginData.access_token;
    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };
    console.log('✅ Sesión iniciada\n');

    // 2. Obtener datos necesarios
    console.log('📋 Obteniendo datos...');
    const conductoresRes = await fetch(`${API_URL}/transporte/conductores`, { headers: authHeaders });
    const conductores = await conductoresRes.json();
    const conductorId = conductores.find(c => c.email === 'conductor1@allride.com').id;

    const vehiculosRes = await fetch(`${API_URL}/transporte/vehiculos`, { headers: authHeaders });
    const vehiculos = await vehiculosRes.json();
    const vehiculoId = vehiculos[0].id;

    console.log('   Conductor ID:', conductorId);
    console.log('   Vehículo ID:', vehiculoId);
    console.log();

    // 3. Verificar si la ruta ya existe
    console.log('🛣️ Verificando ruta...');
    const rutasRes = await fetch(`${API_URL}/transporte/rutas`, { headers: authHeaders });
    const rutas = await rutasRes.json();
    
    const rutaNombre = 'Ruta Centro → Flex Norte';
    let rutaId = null;
    
    for (const r of rutas) {
      if (r.nombre === rutaNombre) {
        rutaId = r.id;
        console.log('   ℹ️  Ruta ya existe con ID:', rutaId);
        break;
      }
    }

    // 4. Crear la ruta si no existe
    if (!rutaId) {
      console.log('   Creando ruta...');
      const rutaData = {
        nombre: rutaNombre,
        origen: 'Centro Histórico, Guadalajara',
        destino: 'Flex Norte, Tlaquepaque, Jalisco',
        paradas: [
          { orden: 1, nombre: 'Centro Histórico, Guadalajara', latitud: 20.6736, longitud: -103.3496 },
          { orden: 2, nombre: 'Av. Vallarta', latitud: 20.6745, longitud: -103.3701 },
          { orden: 3, nombre: 'Plaza del Sol', latitud: 20.6789, longitud: -103.3850 },
          { orden: 4, nombre: 'Periférico Norte', latitud: 20.7102, longitud: -103.3950 },
          { orden: 5, nombre: 'Industrial Norte', latitud: 20.7250, longitud: -103.3800 },
          { orden: 6, nombre: 'Flex Norte, Tlaquepaque', latitud: 20.7350, longitud: -103.3650 },
        ],
      };

      const createRutaRes = await fetch(`${API_URL}/transporte/rutas`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(rutaData),
      });

      if (!createRutaRes.ok) {
        console.error('❌ Error al crear ruta:', createRutaRes.status);
        const errText = await createRutaRes.text();
        console.error('Respuesta:', errText);
      } else {
        const nuevaRuta = await createRutaRes.json();
        rutaId = nuevaRuta.id;
        console.log('   ✅ Ruta creada con ID:', rutaId);
      }
    }
    console.log();

    // 5. Crear el viaje
    console.log('🚗 Creando viaje...');
    const fechaSalida = new Date();
    fechaSalida.setDate(fechaSalida.getDate() + 1);
    fechaSalida.setHours(7, 0, 0, 0);

    const viajeData = {
      ruta_id: rutaId,
      vehiculo_id: vehiculoId,
      conductor_id: conductorId,
      fecha_hora_salida: fechaSalida.toISOString(),
    };

    const createViajeRes = await fetch(`${API_URL}/transporte/viajes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(viajeData),
    });

    if (!createViajeRes.ok) {
      console.error('❌ Error al crear viaje:', createViajeRes.status);
      const errText = await createViajeRes.text();
      console.error('Respuesta:', errText);
      console.log();
      console.log('📝 Por favor, crealo manualmente desde el panel:');
      console.log('1. Abre http://2.24.81.205:3080');
      console.log('2. Inicia sesión como admin@allride.com / password');
      console.log('3. Ve a Rutas → Agregar Ruta (si no existe)');
      console.log('4. Ve a Viajes → Agregar Viaje');
      console.log('5. Selecciona la ruta, vehículo y CONDU01');
    } else {
      const nuevoViaje = await createViajeRes.json();
      console.log('   ✅ Viaje creado exitosamente!');
      console.log('      ID del viaje:', nuevoViaje.id);
      console.log('      Fecha y hora de salida:', nuevoViaje.fecha_hora_salida);
      console.log();
      console.log('🎉 ¡Listo! CONDU01 verá el viaje en su app.');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
    console.log();
    console.log('📝 Por favor, crealo manualmente desde el panel:');
    console.log('1. Abre http://2.24.81.205:3080');
    console.log('2. Inicia sesión como admin@allride.com / password');
    console.log('3. Ve a Rutas → Agregar Ruta (si no existe)');
    console.log('4. Ve a Viajes → Agregar Viaje');
    console.log('5. Selecciona la ruta, vehículo y CONDU01');
  }
}

main();
