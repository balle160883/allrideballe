import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { Logger } from '@nestjs/common';

async function executeSeed() {
  const logger = new Logger('ExecuteSeed');
  logger.log('🚀 Iniciando ejecución del seed...');

  try {
    // 1. Crear la aplicación NestJS para acceder al DatabaseService
    const app = await NestFactory.createApplicationContext(AppModule);
    const db = app.get(DatabaseService);

    // 2. Actualizar el nombre del conductor a CONDU01
    logger.log('1. Actualizando conductor...');
    await db.query(
      'UPDATE "usuarios" SET "nombre" = $1 WHERE "email" = $2',
      ['CONDU01', 'conductor1@allride.com']
    );
    logger.log('   ✅ Conductor actualizado a CONDU01');

    // 3. Verificar o crear la ruta
    logger.log('\n2. Verificando ruta...');
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
      logger.log('   Creando ruta...');
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
      logger.log('   ✅ Ruta creada con ID:', rutaId);
    } else {
      rutaId = rutaResult.rows[0].id;
      logger.log('   ✅ Ruta encontrada con ID:', rutaId);
    }

    // 4. Obtener IDs de conductor y vehículo
    logger.log('\n3. Obteniendo datos...');
    const conductorResult = await db.query(
      'SELECT id FROM "usuarios" WHERE "email" = $1',
      ['conductor1@allride.com']
    );
    const conductorId = conductorResult.rows[0].id;
    logger.log('   ✅ Conductor ID:', conductorId);

    const vehiculoResult = await db.query('SELECT id FROM "vehiculos" LIMIT 1');
    const vehiculoId = vehiculoResult.rows[0].id;
    logger.log('   ✅ Vehículo ID:', vehiculoId);

    // 5. Crear el viaje
    logger.log('\n4. Creando viaje de prueba...');
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
      logger.log('   ✅ Viaje creado exitosamente!');
      logger.log('      ID del viaje:', viajeResult.rows[0].id);
      logger.log('      Fecha y hora de salida:', viajeResult.rows[0].fecha_hora_salida);
    } else {
      logger.log('   ℹ️  El viaje ya existía (no se creó duplicado)');
    }

    logger.log('\n🎉 SEED COMPLETADO CON ÉXITO!');
    logger.log('\nResumen:');
    logger.log('- Conductor:', 'conductor1@allride.com / CONDU01');
    logger.log('- Ruta:', rutaNombre);
    logger.log('- Destino:', 'Flex Norte, Tlaquepaque, Jalisco');
    logger.log('- Fecha de salida:', fechaSalida.toLocaleString());

    // Cerrar la aplicación
    await app.close();
    process.exit(0);

  } catch (error) {
    logger.error('❌ Error en el seed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

executeSeed();
