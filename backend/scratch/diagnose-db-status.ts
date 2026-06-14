import { Pool } from 'pg';

const connectionString = 'postgresql://postgres:cobranza_pro_pass_2026@2.24.81.205:5432/cobranza_pro?schema=public';
console.log('Connecting to:', connectionString);

const pool = new Pool({ connectionString });

async function run() {
  try {
    // 1. Check users
    const usersRes = await pool.query('SELECT id, email, rol, nombre, gestor_code FROM usuarios');
    console.log('\n--- USUARIOS ---');
    console.table(usersRes.rows);

    // 2. Check viajes
    const viajesRes = await pool.query(`
      SELECT v.id, v.estado, v.fecha_hora_salida, r.nombre as ruta_nombre, u.email as conductor_email
      FROM viajes v
      LEFT JOIN rutas r ON v.ruta_id = r.id
      LEFT JOIN usuarios u ON v.conductor_id = u.id
      ORDER BY v.fecha_hora_salida DESC
    `);
    console.log('\n--- VIAJES ---');
    console.table(viajesRes.rows);

    // 3. Check latest ubicaciones
    const ubicacionesRes = await pool.query(`
      SELECT uf.id, uf.viaje_id, uf.latitud, uf.longitud, uf.velocidad, uf.timestamp, r.nombre as ruta_nombre
      FROM ubicaciones_flota uf
      LEFT JOIN viajes v ON uf.viaje_id = v.id
      LEFT JOIN rutas r ON v.ruta_id = r.id
      ORDER BY uf.timestamp DESC
      LIMIT 20
    `);
    console.log('\n--- ÚLTIMAS UBICACIONES EN FLOTA ---');
    console.table(ubicacionesRes.rows);

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
