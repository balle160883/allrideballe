const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- Limpiando catálogos y estructurando base de datos ---');

    // 1. Eliminar datos antiguos respetando relaciones
    await client.query('DELETE FROM "alertas_viaje"');
    await client.query('DELETE FROM "tiempos_paradas"');
    await client.query('DELETE FROM "evaluaciones"');
    await client.query('DELETE FROM "ubicaciones_flota"');
    await client.query('DELETE FROM "reservas"');
    await client.query('DELETE FROM "viajes"');
    await client.query('DELETE FROM "rutas"');
    await client.query('DELETE FROM "vehiculos"');
    await client.query('DELETE FROM "rentas_mensuales"');
    await client.query('DELETE FROM "usuarios" WHERE email != \'ing.ballesteros16@gmail.com\'');
    await client.query('DELETE FROM "sedes"');
    await client.query('DELETE FROM "proveedores"');

    // 2. Asegurar Superadministrador (ing.ballesteros16@gmail.com)
    const passHash = await bcrypt.hash('Seguridad2026@', 10);
    await client.query(`
      INSERT INTO "usuarios" ("id", "email", "password_hash", "nombre", "rol")
      VALUES ('4d4d4d4d-4d4d-4d4d-4d4d-4d4d4d4d4d4d', 'ing.ballesteros16@gmail.com', $1, 'Superadministrador Pro Mobile', 'admin_cliente')
      ON CONFLICT (email) DO UPDATE SET rol = 'admin_cliente', password_hash = $1
    `, [passHash]);
    console.log('✅ Superadministrador verificado: ing.ballesteros16@gmail.com');

    // 3. Crear Proveedor de Transporte ASVI
    const provRes = await client.query(`
      INSERT INTO "proveedores" ("nombre") VALUES ('ASVI') RETURNING id, nombre
    `);
    const provId = provRes.rows[0].id;
    console.log(`✅ Proveedor creado: ASVI (ID: ${provId})`);

    // 4. Crear Cliente / Sede: Flex Norte
    const sedeRes = await client.query(`
      INSERT INTO "sedes" ("nombre", "proveedor_id") VALUES ('Flex Norte', $1) RETURNING id, nombre
    `, [provId]);
    const sedeId = sedeRes.rows[0].id;
    console.log(`✅ Empresa Cliente creada: Flex Norte (ID: ${sedeId})`);

    // 5. Crear Conductor asignado a ASVI
    const conductorPass = await bcrypt.hash('Conductor2026@', 10);
    const conductorRes = await client.query(`
      INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "proveedor_id")
      VALUES ('conductor.asvi@allride.com', $1, 'Carlos Conductor ASVI', 'conductor', $2)
      RETURNING id, email, nombre
    `, [conductorPass, provId]);
    console.log(`✅ Conductor ASVI creado: conductor.asvi@allride.com`);

    // 6. Crear 2 Empleados/Pasajeros asignados a Flex Norte
    const empPass = await bcrypt.hash('Pasajero2026@', 10);
    
    await client.query(`
      INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "sede_id", "proveedor_id")
      VALUES ('empleado1.flex@allride.com', $1, 'Ana Torres (Flex Norte)', 'pasajero', $2, $3)
    `, [empPass, sedeId, provId]);

    await client.query(`
      INSERT INTO "usuarios" ("email", "password_hash", "nombre", "rol", "sede_id", "proveedor_id")
      VALUES ('empleado2.flex@allride.com', $1, 'Luis Gómez (Flex Norte)', 'pasajero', $2, $3)
    `, [empPass, sedeId, provId]);

    console.log('✅ 2 Empleados ligados a Flex Norte creados: empleado1.flex@allride.com y empleado2.flex@allride.com');

    // 7. Crear Renta Mensual SaaS para el Proveedor ASVI (400 Usuarios -> $17,500 MXN)
    const proximoVenc = new Date();
    proximoVenc.setMonth(proximoVenc.getMonth() + 1);
    
    await client.query(`
      INSERT INTO "rentas_mensuales" ("cliente_email", "status", "monto", "fecha_ultimo_pago", "proximo_vencimiento", "proveedor_id")
      VALUES ('admin@asvi.com', 'activo', 17500, CURRENT_DATE, $1, $2)
      ON CONFLICT (cliente_email) DO UPDATE SET monto = 17500, status = 'activo', proveedor_id = $2
    `, [proximoVenc, provId]);

    console.log('✅ Licencia Renta Mensual registrada para ASVI (400 usuarios -> $17,500.00 MXN + IVA)');

    // 8. Crear Unidad de Autobús para ASVI y Ruta para Flex Norte
    const vehRes = await client.query(`
      INSERT INTO "vehiculos" ("patente", "modelo", "capacidad", "proveedor_id")
      VALUES ('ASVI-001', 'Mercedes-Benz Sprinter 2026', 40, $1)
      RETURNING id
    `, [provId]);

    const rutaRes = await client.query(`
      INSERT INTO "rutas" ("nombre", "origen", "destino", "paradas", "sede_id")
      VALUES (
        'Ruta Flex Norte Directo', 
        'Estación Central ASVI', 
        'Planta Flex Norte', 
        '[{"nombre": "Parada 1 - Av. Industrial", "lat": 20.6597, "lng": -103.3496}, {"nombre": "Planta Flex Norte", "lat": 20.6736, "lng": -103.3551}]'::jsonb,
        $1
      )
      RETURNING id
    `, [sedeId]);

    console.log('✅ Autobús ASVI-001 y Ruta Flex Norte Directo creados.');

    await client.query('COMMIT');
    console.log('\n✨ ¡Configuración ASVI completada con éxito!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en script:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
