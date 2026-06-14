const URL = 'http://2.24.81.205:4000';

async function run() {
  try {
    console.log('Logging in as Admin (admin@allride.com) to backend API at:', URL);
    
    // 1. Log in
    const loginRes = await fetch(`${URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@allride.com',
        password: 'password'
      })
    });
    
    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed: ${loginRes.status} - ${errText}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log('✅ Login successful.\n');

    const authHeaders = { 'Authorization': `Bearer ${token}` };

    // 2. Fetch conductores
    const condRes = await fetch(`${URL}/transporte/conductores`, { headers: authHeaders });
    const conductores = await condRes.json();
    console.log('=== CONDUCTORES ===');
    console.log(JSON.stringify(conductores, null, 2));

    // 3. Fetch viajes
    const viajesRes = await fetch(`${URL}/transporte/viajes`, { headers: authHeaders });
    const viajes = await viajesRes.json();
    console.log('\n=== VIAJES ===');
    console.log(JSON.stringify(viajes, null, 2));

    // 4. Fetch latest locations (Live Map source)
    const locRes = await fetch(`${URL}/transporte/locations/latest`, { headers: authHeaders });
    const locations = await locRes.json();
    console.log('\n=== LATEST LOCATIONS (MAPA EN VIVO) ===');
    console.log(JSON.stringify(locations, null, 2));

  } catch (error) {
    console.error('❌ Error querying API:', error.message);
  }
}

run();
