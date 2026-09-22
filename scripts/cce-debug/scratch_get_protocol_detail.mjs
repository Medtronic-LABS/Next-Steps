async function main() {
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

  const { access_token: adminToken } = await tokenRes.json();

  const res = await fetch(`https://insights.cce.mdtlabs.org/v1/insights/protocols/55b609d7-f5a1-47eb-a18c-3ae31521ac1f`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Accept': 'application/json',
    },
  });

  console.log('Protocol detail status:', res.status);
  const json = await res.json();
  console.log('Protocol detail:', JSON.stringify(json, null, 2));
}

main().catch(console.error);
