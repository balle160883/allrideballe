import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
console.log('Using connection string:', connectionString);

const pool = new Pool({ connectionString });

async function check() {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'usuarios'
      );
    `);
    console.log('usuarios table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      const res = await pool.query('SELECT id, email, rol, nombre FROM usuarios');
      console.log('Users in PG:', res.rows);
    }
  } catch (err: any) {
    console.error('Error querying PG:', err.message);
  } finally {
    await pool.end();
  }
}

check();
