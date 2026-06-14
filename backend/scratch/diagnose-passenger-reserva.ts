import { Pool } from 'pg';

const connectionString = 'postgresql://postgres:cobranza_pro_pass_2026@localhost:5432/cobranza_pro?schema=public';
const pool = new Pool({ connectionString });

async function run() {
  try {
    console.log('--- 1. BUSCANDO PASAJERO CON TARJETA QR-9988776655 ---');
    const userSearch = await pool.query(
      'SELECT id, nombre, email, rol, "identificador_tarjeta" FROM "usuarios" WHERE "identificador_tarjeta" = $1',
      ['QR-9988776655']
    );
    console.log('Coincidencias encontradas:', userSearch.rows.length);
    console.table(userSearch.rows);

    console.log('\n--- 2. LISTADO DE TODOS LOS PASAJEROS REGISTRADOS ---');
    const allPassengers = await pool.query(
      'SELECT id, nombre, email, rol, "identificador_tarjeta" FROM "usuarios" WHERE "rol" = \'pasajero\''
    );
    console.table(allPassengers.rows);

    console.log('\n--- 3. RESERVACIONES ACTIVAS PARA VIAJE ID 3 ---');
    const tripReservations = await pool.query(
      `SELECT r.id, r.viaje_id, r.pasajero_id, u.nombre as pasajero_nombre, u.identificador_tarjeta, r.estado, r.asiento_numero
       FROM "reservas" r
       LEFT JOIN "usuarios" u ON r.pasajero_id = u.id
       WHERE r.viaje_id = 3`
    );
    console.table(tripReservations.rows);

  } catch (err: any) {
    console.error('Error durante el diagnóstico:', err.message);
  } finally {
    await pool.end();
  }
}

run();
