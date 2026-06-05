async function main() {
  try {
    console.log('Logging in as admin...');
    const loginRes = await fetch('http://127.0.0.1:3000/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@endemigo.test',
        password: 'Secret123!'
      })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('Login successful. Token acquired.');
    
    console.log('Fetching variants...');
    const variantsRes = await fetch('http://127.0.0.1:3000/admin/variants/numbers?page=1&limit=200', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    const variantsData = await variantsRes.json();
    console.log('API RESPONSE CODE:', variantsData.code);
    console.log('API RESPONSE ITEMS COUNT:', variantsData.items?.length);
    console.log('API RESPONSE SAMPLE:', JSON.stringify(variantsData.items?.slice(0, 2), null, 2));
  } catch (err) {
    console.error('API Test failed:', err.message);
  }
}

main();
