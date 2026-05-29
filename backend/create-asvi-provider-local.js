const { Client } = require('pg');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno desde .env
dotenv.config({ path: path.join(__dirname, '.env') });

// Priorizar la variable de entorno DATABASE_URL
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:cobranza_pro_pass_2026@localhost:5432/cobranza_pro';

async function run() {
  console.log('Intentando conectar a la base de datos local...');
  console.log('URL de conexión (mascarada):', connectionString.replace(/:[^:@]+@/, ':****@'));

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Conexión con PostgreSQL establecida correctamente.');

    // 1. Registrar el Proveedor "Transportes ASVI"
    const provCheck = await client.query('SELECT id FROM "proveedores" WHERE "nombre" = $1', ['Transportes ASVI']);
    let proveedorId;

    if (provCheck.rows.length > 0) {
      proveedorId = provCheck.rows[0].id;
      console.log(`ℹ️ El proveedor "Transportes ASVI" ya existe con ID: ${proveedorId}`);
    } else {
      const provRes = await client.query('INSERT INTO "proveedores" ("nombre") VALUES ($1) RETURNING id', ['Transportes ASVI']);
      proveedorId = provRes.rows[0].id;
      console.log(`✅ Proveedor "Transportes ASVI" creado con ID: ${proveedorId}`);
    }

    // 2. Registrar la Sede "Cliente Planta ASVI" (Para los 350 empleados)
    const sedeCheck = await client.query('SELECT id FROM "sedes" WHERE "nombre" = $1', ['Cliente Planta ASVI']);
    let sedeId;

    if (sedeCheck.rows.length > 0) {
      sedeId = sedeCheck.rows[0].id;
      console.log(`ℹ️ La sede "Cliente Planta ASVI" ya existe con ID: ${sedeId}`);
    } else {
      const sedeRes = await client.query('INSERT INTO "sedes" ("nombre") VALUES ($1) RETURNING id', ['Cliente Planta ASVI']);
      sedeId = sedeRes.rows[0].id;
      console.log(`✅ Sede "Cliente Planta ASVI" creada con ID: ${sedeId}`);
    }

    // 3. Registrar el Administrador de ASVI
    const email = 'admin@transportesasvi.com';
    const userCheck = await client.query('SELECT id FROM "usuarios" WHERE "email" = $1', [email]);

    if (userCheck.rows.length > 0) {
      console.log(`ℹ️ El usuario administrador "${email}" ya existe en el sistema.`);
    } else {
      const plainPassword = 'Proveedor2026@';
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      
      await client.query(
        `INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id")
         VALUES ($1, $2, $3, 'admin_proveedor', $4)`,
        [email, passwordHash, 'Administrador ASVI', proveedorId]
      );
      
      console.log('\n🎉 ¡PROCESO FINALIZADO CON ÉXITO! 🎉');
      console.log('----------------------------------------------------');
      console.log('Credenciales de acceso creadas en tu base de datos local:');
      console.log(`- Usuario (Email): ${email}`);
      console.log(`- Contraseña:      ${plainPassword}`);
      console.log(`- Rol asignado:    admin_proveedor (Enlazado a Transportes ASVI)`);
      console.log('----------------------------------------------------');
    }
  } catch (error) {
    console.error('❌ Error durante el proceso:', error.message);
  } finally {
    await client.end();
    console.log('Conexión a base de datos cerrada.');
  }
}

run();
