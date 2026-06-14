const { Client } = require('pg');

const connectionString = 'postgresql://postgres:postgres@2.24.81.205:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    console.log('--- Inspecting REMOTE users table ---');
    
    // 1. Get the details of passenger1
    const passengerRes = await client.query(`
      SELECT id, email, nombre, rol, proveedor_id, sede_id
      FROM usuarios
      WHERE email = 'pasajero1@allride.com'
    `);
    console.log('\nPassenger details:');
    console.log(JSON.stringify(passengerRes.rows, null, 2));

    // 2. Get the details of conductor1
    const driverRes = await client.query(`
      SELECT id, email, nombre, rol, proveedor_id, sede_id
      FROM usuarios
      WHERE email = 'conductor1@allride.com'
    `);
    console.log('\nDriver details:');
    console.log(JSON.stringify(driverRes.rows, null, 2));

    // 3. Get the details of trip 17
    const tripRes = await client.query(`
      SELECT id, ruta_id, vehiculo_id, conductor_id, fecha_hora_salida, estado, proveedor_id, sede_id
      FROM viajes
      WHERE id = 17
    `);
    console.log('\nTrip 17 details:');
    console.log(JSON.stringify(tripRes.rows, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

run();
