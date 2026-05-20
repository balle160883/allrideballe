async function test() {
  try {
    const res = await fetch('http://2.24.81.205:4000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ing.ballesteros16@gmail.com',
        password: 'Seguridad2026@'
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data:', data);
  } catch (err: any) {
    console.log('Error:', err.message);
  }
}

test();
