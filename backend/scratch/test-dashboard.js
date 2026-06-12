async function main() {
  let loginRes = await fetch('http://localhost:3030/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@a.com', password: '123' })
  });

  if (!loginRes.ok) {
    loginRes = await fetch('http://localhost:3030/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@a.com', password: '123123' })
    });
  }

  const loginData = await loginRes.json();
  const { accessToken } = loginData;
  console.log("Logged in successfully. Token length:", accessToken ? accessToken.length : 0);
  if (!accessToken) {
    console.log("Login failed data:", loginData);
    return;
  }

  const dashboardRes = await fetch('http://localhost:3030/users/seller-dashboard', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const dashboardData = await dashboardRes.json();
  console.log("Dashboard response:", JSON.stringify(dashboardData, null, 2));
}

main().catch(console.error);
