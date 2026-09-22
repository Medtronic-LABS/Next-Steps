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

  const tiberbuId = '6e3425fd-0021-4ae5-8ed7-755f5007f944';
  const res = await fetch(`https://insights.cce.mdtlabs.org/v1/insights/protocols/${tiberbuId}/patients`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Accept': 'application/json',
    },
  });

  console.log('Tiberbu patients status:', res.status);
  const json = await res.json();
  console.log('Tiberbu patients:', JSON.stringify(json, null, 2));
}

main().catch(console.error);
