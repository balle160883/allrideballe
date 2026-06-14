const { Client } = require('pg');

const connectionString = 'postgresql://postgres:cobranza_pro_pass_2026@2.24.81.205:5432/cobranza_pro?schema=public';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('--- querying remote database ---');

    // 1. Get the trip info for trip ID 18
    const tripRes = await client.query(`
      SELECT v.id, v.estado, v.fecha_hora_salida, r.nombre as ruta_nombre, u.nombre as conductor_nombre, u.email as conductor_email
      FROM viajes v
      LEFT JOIN rutas r ON v.ruta_id = r.id
      LEFT JOIN usuarios u ON v.conductor_id = u.id
      WHERE v.id = 18
    `);
    console.log('\nTrip 18 info:');
    console.log(JSON.stringify(tripRes.rows, null, 2));

    // 2. Count coordinates in ubicaciones_flota for trip ID 18
    const locCountRes = await client.query('SELECT count(*)::int as count FROM ubicaciones_flota WHERE viaje_id = 18');
    console.log('\nNumber of GPS coordinates for Trip 18:', locCountRes.rows[0].count);

    // 3. Get all active trips (en_ruta)
    const activeTripsRes = await client.query(`
      SELECT v.id, v.estado, r.nombre as ruta_nombre, u.nombre as conductor_nombre
      FROM viajes v
      LEFT JOIN rutas r ON v.ruta_id = r.id
      LEFT JOIN usuarios u ON v.conductor_id = u.id
      WHERE v.estado = 'en_ruta'
    `);
    console.log('\nTrips currently EN_RUTA (In Transit):');
    console.log(JSON.stringify(activeTripsRes.rows, null, 2));

    // 4. Get last 5 coordinate updates overall
    const lastLocsRes = await client.query(`
      SELECT uf.viaje_id, uf.latitud, uf.longitud, uf.timestamp, r.nombre as ruta_nombre
      FROM ubicaciones_flota uf
      LEFT JOIN viajes v ON uf.viaje_id = v.id
      LEFT JOIN rutas r ON v.ruta_id = r.id
      ORDER BY uf.id DESC LIMIT 5
    `);
    console.log('\nLast 5 location updates overall:');
    console.log(JSON.stringify(lastLocsRes.rows, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

run();
