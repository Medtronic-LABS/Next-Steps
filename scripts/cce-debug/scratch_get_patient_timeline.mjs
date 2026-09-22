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

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  // Fetch events for patient 855213
  const res = await fetch(`https://insights.cce.mdtlabs.org/v1/insights/patients/855213/compliance-timeline`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  console.log('Timeline status:', res.status);
  const json = await res.json();
  console.log('Timeline data:', JSON.stringify(json, null, 2));
}

main().catch(console.error);
