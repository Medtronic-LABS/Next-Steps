import fs from 'fs';
import path from 'path';

const token = 'EAAX1g7zPTiMBSobYVR3l8yA2ECHMXaBDUbEVZBV4TKWHdohJM8ZAKZAG8MMzDKfzWcb6gJrOKh98OSFxdvGrMfP36mssZA6Kfax5YjBWxdGnycHRTxia8dxOZCHma90UgxnpQyiQd2kkJHeMtAKHZBenuW0rGiTlOPhhqysiHeQJbLeHjfQ2djZCFJioOYNhwZDZD';
const flowId = '1414234158437753';

const flowJson = {
  version: "6.0",
  screens: [
    {
      id: "REGISTER_SCREEN",
      title: "Patient Registration",
      terminal: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "form",
            children: [
              {
                type: "TextInput",
                name: "full_name",
                label: "Mother Full Name",
                required: true
              },
              {
                type: "TextInput",
                name: "phone_number",
                label: "Mobile Number",
                "input-type": "phone",
                required: true
              },
              {
                type: "RadioButtonsGroup",
                name: "risk_tier",
                label: "Risk Assessment",
                required: true,
                "data-source": [
                  { id: "NORMAL", title: "Normal / Low Risk" },
                  { id: "HIGH_RISK", title: "High Risk Pregnancy (HRP)" }
                ]
              },
              {
                type: "Footer",
                label: "Submit Registration",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    full_name: "${form.full_name}",
                    phone_number: "${form.phone_number}",
                    risk_tier: "${form.risk_tier}"
                  }
                }
              }
            ]
          }
        ]
      }
    }
  ]
};

async function upload() {
  const formData = new FormData();
  formData.append('name', 'flow.json');
  formData.append('asset_type', 'FLOW_JSON');
  formData.append('file', new Blob([JSON.stringify(flowJson)], { type: 'application/json' }), 'flow.json');

  console.log('Uploading asset to flow', flowId, '...');
  const res = await fetch(`https://graph.facebook.com/v21.0/${flowId}/assets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  console.log('Upload status:', res.status);
  const jsonUpload = await res.json();
  console.log('Upload response:', jsonUpload);

  console.log('Publishing flow...');
  const resPub = await fetch(`https://graph.facebook.com/v21.0/${flowId}/publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Publish status:', resPub.status);
  console.log('Publish response:', await resPub.json());
}

upload();
