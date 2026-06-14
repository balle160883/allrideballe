const API_URL = 'http://2.24.81.205:4000';

async function main() {
  console.log('🚀 Conectando a la API remota...');
  console.log('API URL:', API_URL);

  try {
    // 1. Iniciar sesión como administrador
    console.log('\n1. Iniciando sesión como administrador...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@allride.com', password: 'password' }),
    });

    if (!loginRes.ok) {
      console.error('❌ Error al iniciar sesión:', loginRes.status);
      const errText = await loginRes.text();
      console.error('Respuesta del servidor:', errText);
      return;
    }

    const loginData = await loginRes.json();
    const authToken = loginData.access_token;
    console.log('   ✅ Sesión iniciada exitosamente!');

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    // 2. Obtener conductores
    console.log('\n2. Obteniendo conductores...');
    const conductoresRes = await fetch(`${API_URL}/transporte/conductores`, {
      headers: authHeaders,
    });
    const conductores = await conductoresRes.json();
    console.log('   Conductores encontrados:', conductores.length);
    
    let conductorId = null;
    for (const c of conductores) {
      console.log('   -', c.nombre || c.email, '(ID:', c.id, ')');
      if (c.nombre === 'CONDU01' || c.email === 'conductor1@allride.com') {
        conductorId = c.id;
      }
    }
    
    if (!conductorId && conductores.length > 0) {
      conductorId = conductores[0].id;
      console.log('   ⚠️  Usando el primer conductor disponible:', conductores[0].nombre || conductores[0].email);
    }

    // 3. Obtener vehículos
    console.log('\n3. Obteniendo vehículos...');
    const vehiculosRes = await fetch(`${API_URL}/transporte/vehiculos`, {
      headers: authHeaders,
    });
    const vehiculos = await vehiculosRes.json();
    console.log('   Vehículos encontrados:', vehiculos.length);
    
    let vehiculoId = null;
    for (const v of vehiculos) {
      console.log('   -', v.modelo, v.patente, '(ID:', v.id, ')');
    }
    
    if (vehiculos.length > 0) {
      vehiculoId = vehiculos[0].id;
    }

    // 4. Crear la ruta
    console.log('\n4. Creando ruta...');
    const rutaNombre = 'Ruta Centro → Flex Norte';
    const rutaData = {
      nombre: rutaNombre,
      origen: 'Centro Histórico, Guadalajara',
      destino: 'Flex Norte, Tlaquepaque, Jalisco',
      paradas: [
        { orden: 1, nombre: 'Parada 1 - Centro Histórico', latitud: 20.6736, longitud: -103.3496 },
        { orden: 2, nombre: 'Parada 2 - Av. Vallarta', latitud: 20.6745, longitud: -103.3701 },
        { orden: 3, nombre: 'Parada 3 - Plaza del Sol', latitud: 20.6789, longitud: -103.3850 },
        { orden: 4, nombre: 'Parada 4 - Periférico Norte', latitud: 20.7102, longitud: -103.3950 },
        { orden: 5, nombre: 'Parada 5 - Industrial Norte', latitud: 20.7250, longitud: -103.3800 },
        { orden: 6, nombre: 'Flex Norte, Tlaquepaque', latitud: 20.7350, longitud: -103.3650 },
      ],
      activo: true,
    };

    // Primero verificar si la ruta ya existe
    const rutasRes = await fetch(`${API_URL}/transporte/rutas`, { headers: authHeaders });
    const rutas = await rutasRes.json();
    let rutaId = null;
    
    for (const r of rutas) {
      if (r.nombre === rutaNombre) {
        rutaId = r.id;
        console.log('   ℹ️  Ruta ya existe con ID:', rutaId);
        break;
      }
    }

    if (!rutaId) {
      const createRutaRes = await fetch(`${API_URL}/transporte/rutas`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(rutaData),
      });
      
      if (!createRutaRes.ok) {
        console.error('❌ Error al crear ruta:', createRutaRes.status);
        const errText = await createRutaRes.text();
        console.error('Respuesta del servidor:', errText);
        return;
      }
      
      const nuevaRuta = await createRutaRes.json();
      rutaId = nuevaRuta.id;
      console.log('   ✅ Ruta creada con ID:', rutaId);
    }

    // 5. Crear el viaje
    console.log('\n5. Creando viaje...');
    const fechaSalida = new Date();
    fechaSalida.setDate(fechaSalida.getDate() + 1);
    fechaSalida.setHours(7, 0, 0, 0);

    const viajeData = {
      ruta_id: rutaId,
      vehiculo_id: vehiculoId,
      conductor_id: conductorId,
      fecha_hora_salida: fechaSalida.toISOString(),
      estado: 'programado',
    };

    const createViajeRes = await fetch(`${API_URL}/transporte/viajes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(viajeData),
    });

    if (!createViajeRes.ok) {
      console.error('❌ Error al crear viaje:', createViajeRes.status);
      const errText = await createViajeRes.text();
      console.error('Respuesta del servidor:', errText);
      return;
    }

    const nuevoViaje = await createViajeRes.json();
    console.log('   ✅ Viaje creado exitosamente!');
    console.log('      ID del viaje:', nuevoViaje.id);
    console.log('      Fecha y hora de salida:', nuevoViaje.fecha_hora_salida);

    console.log('\n🎉 PROCESO COMPLETADO!');
    console.log('\nResumen:');
    console.log('- Ruta:', rutaNombre);
    console.log('- ID Ruta:', rutaId);
    console.log('- ID Viaje:', nuevoViaje.id);
    console.log('- Conductor ID:', conductorId);
    console.log('- Vehículo ID:', vehiculoId);
    console.log('- Fecha de salida:', fechaSalida.toLocaleString());

  } catch (error) {
    console.error('\n❌ Error general:', error);
  }
}

main();
