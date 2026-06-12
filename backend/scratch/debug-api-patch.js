const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    if (postData) {
      options.headers = options.headers || {};
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, rawBody: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function main() {
  try {
    console.log('Logging in as a@a.com...');
    const loginRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      email: 'a@a.com',
      password: '123123'
    });

    if (loginRes.status !== 200 && loginRes.status !== 201) {
      console.error('Login failed:', loginRes);
      return;
    }

    const token = loginRes.body.token || loginRes.body.accessToken;
    if (!token) {
      console.error('No token found in response:', loginRes.body);
      return;
    }
    console.log('Login successful. Token acquired.');

    console.log('Sending GET /products/my...');
    const getRes = await request({
      hostname: '127.0.0.1',
      port: 3000,
      path: '/products/my?page=1&limit=20',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('GET response code:', getRes.status);
    console.log('GET response body items count:', getRes.body?.items?.length);
    console.log('GET response body:', JSON.stringify(getRes.body, null, 2));

  } catch (err) {
    console.error('Error during execution:', err);
  }
}

main();
