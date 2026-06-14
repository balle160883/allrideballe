const { Client } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = 'postgresql://postgres:cobranza_pro_pass_2026@2.24.81.205:5432/cobranza_pro?schema=public';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('--- 🚀 Seeding Transportes ASVI on REMOTE Postgres ---');

    // 1. Asegurar la columna proveedor_id en la tabla sedes
    console.log('1. Verificando/Creando columna "proveedor_id" en la tabla "sedes"...');
    await client.query(`
      ALTER TABLE "sedes" ADD COLUMN IF NOT EXISTS "proveedor_id" INTEGER REFERENCES "proveedores"("id") ON DELETE SET NULL;
    `);
    console.log('✅ Columna "proveedor_id" en la tabla "sedes" verificada/creada.');

    // 2. Crear el Proveedor "Transportes ASVI"
    console.log('\n2. Creando proveedor "Transportes ASVI"...');
    const provCheck = await client.query('SELECT id FROM "proveedores" WHERE "nombre" = $1', ['Transportes ASVI']);
    let proveedorId;
    if (provCheck.rows.length > 0) {
      proveedorId = provCheck.rows[0].id;
      console.log(`ℹ️  El proveedor "Transportes ASVI" ya existe con ID: ${proveedorId}`);
    } else {
      const provRes = await client.query('INSERT INTO "proveedores" ("nombre") VALUES ($1) RETURNING id', ['Transportes ASVI']);
      proveedorId = provRes.rows[0].id;
      console.log(`✅ Proveedor "Transportes ASVI" creado con ID: ${proveedorId}`);
    }

    // 3. Crear la Sede "Cliente Planta ASVI" vinculada al proveedor
    console.log('\n3. Creando sede "Cliente Planta ASVI"...');
    const sedeCheck = await client.query('SELECT id FROM "sedes" WHERE "nombre" = $1', ['Cliente Planta ASVI']);
    let sedeId;
    if (sedeCheck.rows.length > 0) {
      sedeId = sedeCheck.rows[0].id;
      console.log(`ℹ️  La sede "Cliente Planta ASVI" ya existe con ID: ${sedeId}`);
      // Asegurar que proveedor_id esté asignado
      await client.query('UPDATE "sedes" SET "proveedor_id" = $1 WHERE id = $2', [proveedorId, sedeId]);
    } else {
      const SedeRes = await client.query(
        'INSERT INTO "sedes" ("nombre", "proveedor_id") VALUES ($1, $2) RETURNING id',
        ['Cliente Planta ASVI', proveedorId]
      );
      sedeId = SedeRes.rows[0].id;
      console.log(`✅ Sede "Cliente Planta ASVI" creada con ID: ${sedeId}`);
    }

    // Generar hashes de contraseñas
    const hashAdmin = await bcrypt.hash('Proveedor2026@', 10);
    const hashConductor = await bcrypt.hash('Conductor2026@', 10);
    const hashPasajero = await bcrypt.hash('Pasajero2026@', 10);

    // 4. Crear Administrador del Proveedor (admin_proveedor)
    console.log('\n4. Creando administrador "admin@transportesasvi.com"...');
    const adminCheck = await client.query('SELECT id FROM "usuarios" WHERE "email" = $1', ['admin@transportesasvi.com']);
    if (adminCheck.rows.length > 0) {
      console.log('ℹ️  El usuario administrador ya existe. Actualizando datos...');
      await client.query(`
        UPDATE "usuarios" 
        SET "nombre" = $1, "password_hash" = $2, "rol" = $3, "proveedor_id" = $4
        WHERE "email" = $5
      `, ['Admin Transportes ASVI', hashAdmin, 'admin_proveedor', proveedorId, 'admin@transportesasvi.com']);
      console.log('✅ Administrador actualizado.');
    } else {
      await client.query(`
        INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id")
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@transportesasvi.com', hashAdmin, 'Admin Transportes ASVI', 'admin_proveedor', proveedorId]);
      console.log('✅ Administrador creado.');
    }

    // 5. Crear Conductor de ASVI (conductor)
    console.log('\n5. Creando conductor "conductor.asvi@transportesasvi.com"...');
    const driverCheck = await client.query('SELECT id FROM "usuarios" WHERE "email" = $1', ['conductor.asvi@transportesasvi.com']);
    if (driverCheck.rows.length > 0) {
      console.log('ℹ️  El conductor ya existe. Actualizando datos...');
      await client.query(`
        UPDATE "usuarios" 
        SET "nombre" = $1, "password_hash" = $2, "rol" = $3, "proveedor_id" = $4, "gestor_code" = $5
        WHERE "email" = $6
      `, ['Juan Conductor ASVI', hashConductor, 'conductor', proveedorId, 'ASVI_COND_01', 'conductor.asvi@transportesasvi.com']);
      console.log('✅ Conductor actualizado.');
    } else {
      await client.query(`
        INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id", "gestor_code")
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['conductor.asvi@transportesasvi.com', hashConductor, 'Juan Conductor ASVI', 'conductor', proveedorId, 'ASVI_COND_01']);
      console.log('✅ Conductor creado.');
    }

    // 6. Crear Pasajeros de ASVI (pasajero)
    // Pasajero 1
    console.log('\n6. Creando pasajero 1 "pasajero1.asvi@transportesasvi.com"...');
    const p1Check = await client.query('SELECT id FROM "usuarios" WHERE "email" = $1', ['pasajero1.asvi@transportesasvi.com']);
    if (p1Check.rows.length > 0) {
      console.log('ℹ️  El pasajero 1 ya existe. Actualizando datos...');
      await client.query(`
        UPDATE "usuarios" 
        SET "nombre" = $1, "password_hash" = $2, "rol" = $3, "proveedor_id" = $4, "sede_id" = $5, "identificador_tarjeta" = $6
        WHERE "email" = $7
      `, ['Pedro Pasajero ASVI', hashPasajero, 'pasajero', proveedorId, sedeId, 'TARJETA-ASVI-01', 'pasajero1.asvi@transportesasvi.com']);
      console.log('✅ Pasajero 1 actualizado.');
    } else {
      await client.query(`
        INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id", "sede_id", "identificador_tarjeta")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['pasajero1.asvi@transportesasvi.com', hashPasajero, 'Pedro Pasajero ASVI', 'pasajero', proveedorId, sedeId, 'TARJETA-ASVI-01']);
      console.log('✅ Pasajero 1 creado.');
    }

    // Pasajero 2
    console.log('\n7. Creando pasajero 2 "pasajero2.asvi@transportesasvi.com"...');
    const p2Check = await client.query('SELECT id FROM "usuarios" WHERE "email" = $1', ['pasajero2.asvi@transportesasvi.com']);
    if (p2Check.rows.length > 0) {
      console.log('ℹ️  El pasajero 2 ya existe. Actualizando datos...');
      await client.query(`
        UPDATE "usuarios" 
        SET "nombre" = $1, "password_hash" = $2, "rol" = $3, "proveedor_id" = $4, "sede_id" = $5, "identificador_tarjeta" = $6
        WHERE "email" = $7
      `, ['Ana Pasajero ASVI', hashPasajero, 'pasajero', proveedorId, sedeId, 'TARJETA-ASVI-02', 'pasajero2.asvi@transportesasvi.com']);
      console.log('✅ Pasajero 2 actualizado.');
    } else {
      await client.query(`
        INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id", "sede_id", "identificador_tarjeta")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['pasajero2.asvi@transportesasvi.com', hashPasajero, 'Ana Pasajero ASVI', 'pasajero', proveedorId, sedeId, 'TARJETA-ASVI-02']);
      console.log('✅ Pasajero 2 creado.');
    }

    console.log('\n🎉 --- Seeding completed successfully! ---');

  } catch (e) {
    console.error('\n❌ Error during seeding:', e.message);
  } finally {
    await client.end();
  }
}

run();
