async function poll() {
  const url = 'http://2.24.81.205:4000/temp-check-db';
  console.log('Polling', url, 'every 5 seconds...');
  
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        const data = await res.json();
        console.log('\n--- SUCCESS! ---');
        console.log('Tables:', data.tables);
        console.log('Users:', data.users);
        return;
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] Status:`, res.status);
      }
    } catch (err: any) {
      console.log(`[${new Date().toLocaleTimeString()}] Error:`, err.message);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  console.log('Timeout polling.');
}

poll();
