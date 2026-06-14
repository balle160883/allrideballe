const URL = 'http://2.24.81.205:4000';

async function run() {
  try {
    console.log('Logging in to backend API at:', URL);
    
    // 1. Log in
    const loginRes = await fetch(`${URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ing.ballesteros16@gmail.com',
        password: 'Seguridad2026@'
      })
    });
    
    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed: ${loginRes.status} - ${errText}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log('✅ Login successful. Token retrieved.');

    // Helper for authorized requests
    const apiGet = async (path) => {
      const res = await fetch(`${URL}${path}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`GET ${path} failed: ${res.status}`);
      }
      return res.json();
    };

    // 2. Fetch viajes
    const viajes = await apiGet('/transporte/viajes');
    console.log('\n--- VIAJES EN PRODUCCIÓN (Últimos 10) ---');
    console.log(JSON.stringify(viajes.slice(0, 10), null, 2));

    // 3. Fetch pasajeros
    const pasajeros = await apiGet('/transporte/pasajeros');
    console.log('\n--- PASAJEROS EN PRODUCCIÓN ---');
    console.log(JSON.stringify(pasajeros, null, 2));

    // 4. Fetch conductores
    const conductores = await apiGet('/transporte/conductores');
    console.log('\n--- CONDUCTORES EN PRODUCCIÓN ---');
    console.log(JSON.stringify(conductores, null, 2));

  } catch (error) {
    console.error('❌ Error querying API:', error.message);
  }
}

run();
