const URL = 'http://2.24.81.205:4000';

async function run() {
  try {
    console.log('Logging in as Passenger (pasajero1@allride.com) to backend API at:', URL);
    
    // 1. Log in
    const loginRes = await fetch(`${URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'pasajero1@allride.com',
        password: 'password'
      })
    });
    
    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed: ${loginRes.status} - ${errText}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log('✅ Login successful. Token retrieved.');
    console.log('Logged in user info:', loginData.user);

    // 2. Fetch viajes disponibles
    const dispRes = await fetch(`${URL}/transporte/viajes/disponibles`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!dispRes.ok) {
      const errText = await dispRes.text();
      throw new Error(`GET /transporte/viajes/disponibles failed: ${dispRes.status} - ${errText}`);
    }
    
    const disponibles = await dispRes.json();
    console.log('\n--- VIAJES DISPONIBLES PARA EL PASAJERO ---');
    console.log(JSON.stringify(disponibles, null, 2));

    // 3. Fetch reservas del pasajero
    const resRes = await fetch(`${URL}/transporte/reservas/pasajero`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!resRes.ok) {
      const errText = await resRes.text();
      throw new Error(`GET /transporte/reservas/pasajero failed: ${resRes.status} - ${errText}`);
    }
    
    const reservas = await resRes.json();
    console.log('\n--- RESERVAS (MIS VIAJES) DEL PASAJERO ---');
    console.log(JSON.stringify(reservas, null, 2));

  } catch (error) {
    console.error('❌ Error querying API:', error.message);
  }
}

run();
