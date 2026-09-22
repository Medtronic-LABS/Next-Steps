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

  // Let's check ANC protocol patients
  const ancProtoId = '55b609d7-f5a1-47eb-a18c-3ae31521ac1f';
  const rmnchProtoId = '2e693819-23f9-408d-815f-7d89c3a7f615';

  for (const [name, id] of [['ANC', ancProtoId], ['RMNCH', rmnchProtoId]]) {
    const res = await fetch(`https://insights.cce.mdtlabs.org/v1/insights/protocols/${id}/patients?limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    console.log(`=== ${name} Patients (status: ${res.status}) ===`);
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));

    // Also check action-order
    const actionRes = await fetch(`https://insights.cce.mdtlabs.org/v1/insights/protocols/${id}/action-order`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    console.log(`=== ${name} Actions (status: ${actionRes.status}) ===`);
    const actionJson = await actionRes.json();
    console.log(JSON.stringify(actionJson, null, 2));
  }
}

main().catch(console.error);
