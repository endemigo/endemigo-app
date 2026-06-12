const axios = require('axios');

async function main() {
  try {
    console.log('Logging in as admin...');
    const loginRes = await axios.post('http://localhost:3030/admin/auth/login', {
      email: 'admin@endemigo.test',
      password: 'Secret123!'
    });
    
    const token = loginRes.data.accessToken;
    console.log('Login successful. Token acquired.');
    
    console.log('Fetching variants...');
    const variantsRes = await axios.get('http://localhost:3030/admin/variants/numbers', {
      params: { page: 1, limit: 200 },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('API RESPONSE CODE:', variantsRes.data.code);
    console.log('API RESPONSE ITEMS COUNT:', variantsRes.data.items?.length);
    console.log('API RESPONSE SAMPLE:', JSON.stringify(variantsRes.data.items?.slice(0, 2), null, 2));
  } catch (err) {
    console.error('API Test failed:', err.response ? {
      status: err.response.status,
      data: err.response.data
    } : err.message);
  }
}

main();
