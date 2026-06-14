const API_URL = 'http://2.24.81.205:4000';
const EMAIL = 'admin@transportesasvi.com';
const ORIGINAL_PASS = 'Proveedor2026@';
const NEW_PASS = 'Proveedor2026New@';

async function verifyFlow() {
  console.log('🧪 Starting E2E Password Reset Flow Verification...\n');

  try {
    // 1. Request password reset token
    console.log(`1. Requesting password reset for ${EMAIL}...`);
    const forgotRes = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL }),
    });
    const forgotData = await forgotRes.json();
    console.log('   Response:', JSON.stringify(forgotData));

    // 2. Fetch the token from temp-check-db
    console.log('\n2. Retrieving token from remote temp-check-db...');
    const dbRes = await fetch(`${API_URL}/temp-check-db`);
    const dbData = await dbRes.json();
    
    const userRow = dbData.users?.find(u => u.email === EMAIL);
    if (!userRow) {
      throw new Error(`User ${EMAIL} not found in DB!`);
    }

    const token = userRow.reset_password_token;
    console.log('   Found token:', token);
    console.log('   Expires at:', userRow.reset_password_expires);

    if (!token) {
      throw new Error('Reset token is null or was not generated!');
    }

    // 3. Reset the password using the token
    console.log(`\n3. Submitting new password: "${NEW_PASS}" using token...`);
    const resetRes = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: NEW_PASS }),
    });
    const resetData = await resetRes.json();
    console.log('   Response:', JSON.stringify(resetData));

    // 4. Test login with the new password
    console.log('\n4. Attempting login with new password...');
    const loginNewRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: NEW_PASS }),
    });
    
    if (loginNewRes.ok) {
      console.log('   ✅ Login successful with new password!');
    } else {
      const err = await loginNewRes.text();
      throw new Error(`Login failed with new password: ${err}`);
    }

    // 5. Restore original password so user does not get locked out
    console.log('\n5. Restoring original password to prevent lockout...');
    // Request a new forgot token
    await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL }),
    });

    const dbRes2 = await fetch(`${API_URL}/temp-check-db`);
    const dbData2 = await dbRes2.json();
    const userRow2 = dbData2.users?.find(u => u.email === EMAIL);
    const newToken = userRow2?.reset_password_token;

    if (!newToken) {
      throw new Error('Failed to retrieve second token for restoration!');
    }

    const restoreRes = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: newToken, password: ORIGINAL_PASS }),
    });
    console.log('   Restoration Response:', await restoreRes.json());

    // 6. Confirm login with original password is restored
    console.log('\n6. Checking original login works again...');
    const loginOrigRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: ORIGINAL_PASS }),
    });
    
    if (loginOrigRes.ok) {
      console.log('   ✅ Login successful with original password!');
      console.log('\n🌟 ALL TESTS PASSED SUCCESSFULLY! password reset flow is 100% operational.');
    } else {
      const err = await loginOrigRes.text();
      throw new Error(`Restoring password failed: ${err}`);
    }

  } catch (error) {
    console.error('\n❌ Verification Failed:', error.message);
  }
}

verifyFlow();
