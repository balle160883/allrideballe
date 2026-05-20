import { Pool } from 'pg';

const connectionString = 'postgresql://postgres:cobranza_pro_pass_2026@2.24.81.205:5432/cobranza_pro?schema=public';
console.log('Connecting to:', connectionString);

const pool = new Pool({ connectionString });

async function run() {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'usuarios'
      );
    `);
    console.log('usuarios table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      const res = await pool.query('SELECT id, email, rol, nombre, password_hash FROM usuarios');
      console.log('Users in remote PG:', res.rows);
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
