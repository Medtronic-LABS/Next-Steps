async function main() {
  // Test password grant for admin
  const tokenRes = await fetch('https://keycloak.cce.mdtlabs.org/realms/cce/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'cce-insights-ui',
      username: 'admin',
      password: 'cceadmin@123',
    }),
  });

  const tokenData = await tokenRes.json();
  console.log('Token response:', tokenData);
  if (!tokenData.access_token) return;

  const protoRes = await fetch('https://insights.cce.mdtlabs.org/v1/insights/lookups/protocols', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/json',
    },
  });

  console.log('Protocols status:', protoRes.status);
  const json = await protoRes.json();
  console.log('Protocols:', JSON.stringify(json, null, 2));
}

main().catch(console.error);
