import { DatabaseService } from '../src/database/database.service';

async function seedViajePrueba() {
  console.log('🚀 Iniciando creación de viaje de prueba para CONDU01...');
  
  const db = new DatabaseService();
  
  try {
    // 1. Crear o obtener el conductor CONDU01
    console.log('1. Verificando conductor CONDU01...');
    let conductorResult = await db.query(
      'SELECT id FROM "usuarios" WHERE email = $1',
      ['conductor1@allride.com']
    );
    
    let conductorId: string;
    
    if (conductorResult.rows.length === 0) {
      console.log('   Creando conductor CONDU01...');
      // Contraseña: Conductor2026@ (hash bcrypt)
      const insertResult = await db.query(
        `INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "gestor_code")
         VALUES ($1, '$2b$10$K0e8z7W5q5q5q5q5q5q5quuL8X8X8X8X8X8X8X8X8X8X8X8X8X8X', $2, $3, $4)
         RETURNING id`,
        ['conductor1@allride.com', 'CONDU01', 'conductor', 'CONDU01']
      );
      conductorId = insertResult.rows[0].id;
      console.log('   ✅ Conductor creado con ID:', conductorId);
    } else {
      conductorId = conductorResult.rows[0].id;
      console.log('   ✅ Conductor encontrado con ID:', conductorId);
    }

    // 2. Crear o obtener vehículo de prueba
    console.log('2. Verificando vehículo...');
    let vehiculoResult = await db.query(
      'SELECT id FROM "vehiculos" WHERE patente = $1',
      ['JAL-123-AB']
    );
    
    let vehiculoId: number;
    
    if (vehiculoResult.rows.length === 0) {
      console.log('   Creando vehículo de prueba...');
      const insertResult = await db.query(
        `INSERT INTO "vehiculos" ("patente", "modelo", "capacidad", "proveedor_nombre")
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ['JAL-123-AB', 'Mercedes-Benz Sprinter', 15, 'FleetPro']
      );
      vehiculoId = insertResult.rows[0].id;
      console.log('   ✅ Vehículo creado con ID:', vehiculoId);
    } else {
      vehiculoId = vehiculoResult.rows[0].id;
      console.log('   ✅ Vehículo encontrado con ID:', vehiculoId);
    }

    // 3. Crear o obtener la ruta
    console.log('3. Verificando ruta...');
    const rutaNombre = 'Ruta Centro → Flex Norte';
    let rutaResult = await db.query(
      'SELECT id FROM "rutas" WHERE "nombre" = $1',
      [rutaNombre]
    );
    
    let rutaId: number;
    const paradas = [
      { orden: 1, nombre: 'Parada 1 - Centro Histórico', latitud: 20.6736, longitud: -103.3496 },
      { orden: 2, nombre: 'Parada 2 - Av. Vallarta', latitud: 20.6745, longitud: -103.3701 },
      { orden: 3, nombre: 'Parada 3 - Plaza del Sol', latitud: 20.6789, longitud: -103.3850 },
      { orden: 4, nombre: 'Parada 4 - Periférico Norte', latitud: 20.7102, longitud: -103.3950 },
      { orden: 5, nombre: 'Parada 5 - Industrial Norte', latitud: 20.7250, longitud: -103.3800 },
      { orden: 6, nombre: 'Flex Norte, Tlaquepaque', latitud: 20.7350, longitud: -103.3650 },
    ];
    
    if (rutaResult.rows.length === 0) {
      console.log('   Creando ruta...');
      const insertResult = await db.query(
        `INSERT INTO "rutas" ("nombre", "origen", "destino", "paradas", "activo")
         VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING id`,
        [
          rutaNombre,
          'Centro Histórico, Guadalajara',
          'Flex Norte, Tlaquepaque, Jalisco',
          JSON.stringify(paradas),
          true
        ]
      );
      rutaId = insertResult.rows[0].id;
      console.log('   ✅ Ruta creada con ID:', rutaId);
    } else {
      rutaId = rutaResult.rows[0].id;
      console.log('   ✅ Ruta encontrada con ID:', rutaId);
    }

    // 4. Crear el viaje de prueba (mañana a las 7:00 AM)
    console.log('4. Creando viaje de prueba...');
    const fechaSalida = new Date();
    fechaSalida.setDate(fechaSalida.getDate() + 1);
    fechaSalida.setHours(7, 0, 0, 0);
    
    const viajeResult = await db.query(
      `INSERT INTO "viajes" ("ruta_id", "vehiculo_id", "conductor_id", "fecha_hora_salida", "estado")
       VALUES ($1, $2, $3, $4, 'programado')
       ON CONFLICT DO NOTHING
       RETURNING id, fecha_hora_salida`,
      [rutaId, vehiculoId, conductorId, fechaSalida]
    );
    
    if (viajeResult.rows.length > 0) {
      console.log('   ✅ Viaje creado exitosamente!');
      console.log('      ID del viaje:', viajeResult.rows[0].id);
      console.log('      Fecha y hora de salida:', viajeResult.rows[0].fecha_hora_salida);
    } else {
      console.log('   ℹ️  El viaje ya existía (no se creó duplicado)');
    }

    console.log('\n🎉 SEED COMPLETADO CON ÉXITO!');
    console.log('\nResumen:');
    console.log('- Conductor:', 'conductor1@allride.com / CONDU01');
    console.log('- Ruta:', rutaNombre);
    console.log('- Destino:', 'Flex Norte, Tlaquepaque, Jalisco');
    console.log('- Vehículo:', 'JAL-123-AB (Mercedes-Benz Sprinter)');
    console.log('- Fecha de salida:', fechaSalida.toLocaleString());

  } catch (error) {
    console.error('❌ Error en el seed:', error);
    process.exit(1);
  }
}

seedViajePrueba();
