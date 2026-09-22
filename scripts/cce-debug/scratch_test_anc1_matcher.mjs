async function main() {
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

  const protoId = 'e465bb1f-1b37-4f08-adf9-1c4409d42b27'; // ANC Visit 1 Referral Protocol

  const testEvent = {
    specversion: '1.0',
    id: `evt-anc1-w1-${Date.now().toString(36)}`,
    source: 'nextsteps/rewa-district',
    type: 'cce.task.created',
    subject: 'w1',
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    facilityid: 'facility/PHC-SIRMOUR',
    facilityname: 'PHC Sirmour',
    correlationid: `corr-${Date.now().toString(36)}`,
    protocoldefinitionid: protoId,
    protocolinstanceid: `proto-anc1-w1-${Date.now().toString(36)}`,
    actionid: 'anc1-referral-initiated',
    data: {
      resourceType: 'Task',
      id: `task-anc1-${Date.now().toString(36)}`,
      status: 'requested',
      intent: 'order',
      code: {
        coding: [
          {
            system: 'http://openphc.org/codes/step-category',
            code: 'REFERRAL',
            display: 'Referral to Higher Facility',
          },
        ],
        text: 'Referral to Higher Facility',
      },
      for: {
        reference: 'Patient/w1',
        display: 'Sunita Devi',
      },
      authoredOn: new Date().toISOString(),
    },
  };

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

  console.log('Waiting 3 seconds for CCE Matcher...');
  await new Promise(r => setTimeout(r, 3000));

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

  const searchRes = await fetch(`https://insights.cce.mdtlabs.org/v1/insights/protocols/${protoId}/patients?patientId=w1`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Accept': 'application/json',
    },
  });

  console.log('Search status:', searchRes.status);
  const searchJson = await searchRes.json();
  console.log('Search result:', JSON.stringify(searchJson, null, 2));
}

main().catch(console.error);
