const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:cobranza_pro_pass_2026@localhost:5432/cobranza_pro';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    console.log('--- Inspecting database for trips ---');
    
    // 1. Get the last 5 trips
    const tripsRes = await client.query(`
      SELECT v.id, v.ruta_id, v.vehiculo_id, v.conductor_id, v.fecha_hora_salida, v.estado, v.proveedor_id, v.sede_id,
             r.nombre as ruta_nombre, u.nombre as conductor_nombre, u.email as conductor_email
      FROM viajes v
      LEFT JOIN rutas r ON v.ruta_id = r.id
      LEFT JOIN usuarios u ON v.conductor_id = u.id
      ORDER BY v.id DESC LIMIT 5
    `);
    console.log('\nLast 5 trips created:');
    console.log(JSON.stringify(tripsRes.rows, null, 2));

    // 2. Get the users who are drivers
    const driversRes = await client.query(`
      SELECT id, email, nombre, rol, proveedor_id, "gestor_code"
      FROM usuarios
      WHERE rol = 'conductor'
    `);
    console.log('\nDrivers in DB:');
    console.log(JSON.stringify(driversRes.rows, null, 2));

    // 3. Get the passengers in DB
    const passengersRes = await client.query(`
      SELECT id, email, nombre, rol, sede_id
      FROM usuarios
      WHERE rol = 'pasajero' LIMIT 5
    `);
    console.log('\nPassengers in DB (first 5):');
    console.log(JSON.stringify(passengersRes.rows, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

run();
