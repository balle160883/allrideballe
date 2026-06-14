import { Pool } from 'pg';

const connectionString = 'postgresql://postgres:postgres@2.24.81.205:5432/postgres';
const pool = new Pool({ connectionString });

async function main() {
  try {
    console.log('Connecting to PostgreSQL database at 2.24.81.205 with postgres/postgres...');
    
    console.log('\n--- USERS (usuarios) ---');
    const users = await pool.query('SELECT id, email, nombre, rol, gestor_code FROM usuarios');
    console.log(users.rows);

    console.log('\n--- VEHICLES (vehiculos) ---');
    const vehs = await pool.query('SELECT id, patente, modelo, capacidad, proveedor_nombre FROM vehiculos');
    console.log(vehs.rows);

    console.log('\n--- ROUTES (rutas) ---');
    const routes = await pool.query('SELECT id, nombre, origen, destino FROM rutas');
    console.log(routes.rows);

    console.log('\n--- TRIPS (viajes) ---');
    const trips = await pool.query('SELECT id, ruta_id, vehiculo_id, conductor_id, fecha_hora_salida, estado FROM viajes');
    console.log(trips.rows);

  } catch (err) {
    console.error('Error running inspection query:', err);
  } finally {
    await pool.end();
  }
}

main();
