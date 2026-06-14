async function main() {
  const API_URL = 'http://2.24.81.205:4000';
  
  try {
    console.log('1. Trying to login as Conductor (conductor1@allride.com)...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'conductor1@allride.com',
        password: 'password' // In init_transport_schema.sql, password is 'password'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
    }
    
    const loginData: any = await loginRes.json();
    console.log('✅ Login successful!');
    console.log('User info:', loginData.user);
    const token = loginData.access_token;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('\n2. Fetching trips (viajes) assigned to conductor...');
    const viajesRes = await fetch(`${API_URL}/transporte/viajes`, { headers });
    const viajes = await viajesRes.json();
    console.log('Trips found:', JSON.stringify(viajes, null, 2));

  } catch (err: any) {
    console.error('Error querying remote API:', err.message);
  }
}

main();
