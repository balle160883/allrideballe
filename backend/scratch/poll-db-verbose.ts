async function poll() {
  const url = 'http://2.24.81.205:4000/temp-check-db';
  console.log('Polling', url, 'every 5 seconds...');
  
  let lastResponse = '';
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      const strData = JSON.stringify(data);
      if (strData !== lastResponse) {
        console.log(`\n[${new Date().toLocaleTimeString()}] Status: ${res.status}`);
        console.log(data);
        lastResponse = strData;
        if (data.tables && data.tables.includes('usuarios') && data.users && data.users.length > 0 && typeof data.users[0] !== 'string') {
          console.log('Success! Table exists and is populated!');
          return;
        }
      } else {
        process.stdout.write('.');
      }
    } catch (err: any) {
      const errStr = `Error: ${err.message}`;
      if (errStr !== lastResponse) {
        console.log(`\n[${new Date().toLocaleTimeString()}] ${errStr}`);
        lastResponse = errStr;
      } else {
        process.stdout.write('.');
      }
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}

poll();
