const URL = 'http://2.24.81.205:4000';

async function run() {
  try {
    console.log('Logging in as Driver (conductor1@allride.com) to backend API at:', URL);
    
    // 1. Log in
    const loginRes = await fetch(`${URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'conductor1@allride.com',
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

    // 2. Fetch viajes
    const res = await fetch(`${URL}/transporte/viajes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GET /transporte/viajes failed: ${res.status} - ${errText}`);
    }
    
    const viajes = await res.json();
    console.log('\n--- VIAJES DEVUELTOS AL CONDUCTOR ---');
    console.log(JSON.stringify(viajes, null, 2));

  } catch (error) {
    console.error('❌ Error querying API:', error.message);
  }
}

run();
