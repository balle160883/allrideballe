const API_URL = 'http://2.24.81.205:4000';

async function main() {
  console.log('🔧 Creando usuario admin_proveedor...\n');

  try {
    // 1. Iniciar sesión como admin
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@allride.com', password: 'password' }),
    });
    const loginData = await loginRes.json();
    const authToken = loginData.access_token;
    const authHeaders = { 'Authorization': `Bearer ${authToken}` };
    console.log('✅ Sesión iniciada\n');

    // 2. Primero revisamos si el usuario ya existe
    console.log('📋 Verificando usuarios existentes...');
    const usersRes = await fetch(`${API_URL}/transporte/conductores`, { headers: authHeaders });
    // Nota: No hay endpoint para listar todos los usuarios, pero podemos intentar crear directamente con el servicio de conductores

    console.log();
    console.log('ℹ️  No hay endpoint para listar todos los usuarios.');
    console.log('📝 Para crear el admin_proveedor, puedes usar la pantalla de Conductores:');
    console.log('   1. Abre el panel de administración');
    console.log('   2. Ve a "Conductores" (solo para ver, pero crearemos un script SQL)');
    console.log();
    console.log('📋 Credenciales de usuarios existentes:');
    console.log('   - admin@allride.com (admin_cliente) - password: password');
    console.log('   - ing.ballesteros16@gmail.com (admin_cliente) - password: Seguridad2026@');
    console.log('   - conductor1@allride.com (conductor) - password: password');
    console.log('   - pasajero1@allride.com (pasajero) - password: password');
    console.log();
    console.log('💡 Si quieres un usuario con rol admin_proveedor, puedes modificar uno existente o crear uno nuevo con un script SQL.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
