// Node 22 built-in fetch

async function main() {
  // 1. Get token for nextstep-emitter to emit event
  const tokenRes = await fetch('https://keycloak.cce.mdtlabs.org/realms/cce/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: 'nextstep-emitter',
      client_secret: 'ZsFq3nfpMefiN82WteylKeLECwS3Z4sw',
    }),
  });
  const { access_token: emitterToken } = await tokenRes.json();
  console.log('Emitter token obtained');

  // Protocol IDs:
  // ANC: 55b609d7-f5a1-47eb-a18c-3ae31521ac1f (canonical: http://openphc.org/PlanDefinition/anc-service-protocol|1.0.0)
  // RMNCH: 2e693819-23f9-408d-815f-7d89c3a7f615 (canonical: http://mdtlabs.com/PlanDefinition/rmnch-protocol|1.0.0)
  // ANC Visit 1 Referral: e465bb1f-1b37-4f08-adf9-1c4409d42b27 (canonical: http://mdtlabs.com/PlanDefinition/anc-visit-1-referral-protocol|1.0.0)

  const testEvent = {
    specversion: '1.0',
    id: `evt-w1-${Date.now().toString(36)}`,
    source: 'nextsteps/rewa-district',
    type: 'cce.encounter.created', // or org.openphc.cce.task
    subject: 'w1',
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    facilityid: 'facility/PHC-SIRMOUR',
    facilityname: 'PHC Sirmour',
    correlationid: `corr-${Date.now().toString(36)}`,
    protocoldefinitionid: '55b609d7-f5a1-47eb-a18c-3ae31521ac1f',
    protocolinstanceid: 'proto_w1',
    actionid: 'anc-contact-1',
    data: {
      resourceType: 'Encounter',
      id: `enc-w1-${Date.now().toString(36)}`,
      status: 'finished',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: 'AMB',
        display: 'ambulatory',
      },
      subject: {
        reference: 'Patient/w1',
        display: 'Sunita Devi',
      },
      actualPeriod: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
      },
    },
  };

  console.log('Sending event:', JSON.stringify(testEvent, null, 2));

  const postRes = await fetch('https://api.cce.mdtlabs.org/v1/events', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${emitterToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(testEvent),
  });

  console.log('Post status:', postRes.status);
  const postBody = await postRes.text();
  console.log('Post response:', postBody);

  // Wait 3 seconds for matcher
  console.log('Waiting 3 seconds for CCE Matcher...');
  await new Promise(r => setTimeout(r, 3000));

  // 2. Query CCE Insights as admin to check if w1 is in ANC protocol!
  const adminTokenRes = await fetch('https://keycloak.cce.mdtlabs.org/realms/cce/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'cce-insights-ui',
      username: 'admin',
      password: 'cceadmin@123',
    }),
  });
  const { access_token: adminToken } = await adminTokenRes.json();

  const searchRes = await fetch('https://insights.cce.mdtlabs.org/v1/insights/protocols/55b609d7-f5a1-47eb-a18c-3ae31521ac1f/patients?patientId=w1', {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Accept': 'application/json',
    },
  });

  console.log('Search status:', searchRes.status);
  const searchJson = await searchRes.json();
  console.log('Search result for w1:', JSON.stringify(searchJson, null, 2));
}

main().catch(console.error);
