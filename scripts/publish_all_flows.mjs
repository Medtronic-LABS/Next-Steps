import fs from 'fs';

const token = process.env.WHATSAPP_ACCESS_TOKEN || 'EAAX1g7zPTiMBSsweHO2gmI65WaI4oID0zZAwwxm3HwMjZAKLxDJFbI3UidIrXhWvrXSZCjWfnM0qZA1LX1HxYfN3aVnZBQ2pIpkBx9CgMw3FaVdShk1EeMAKgY5m0no6qCZBzaiuZBjZAyKFXeG5KUDOepgX1YexZBjds0wddydRqFuOIqXQZBPPgtnq7rtSlZBmAZDZD';
const wabaId = '2450605875348094';

// 1. Patient Registration Flow - Single Screen, Minimalist, No DatePicker Glitches
const flowRegistration = {
  version: "6.0",
  screens: [
    {
      id: "DEMOGRAPHICS",
      title: "Register Mother",
      terminal: true,
      success: true,
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
                label: "Mother's Name",
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
                name: "village_id",
                label: "Village",
                required: true,
                "data-source": [
                  { id: "VIL-RAM", title: "Rampur" },
                  { id: "VIL-GHU", title: "Ghurehta" },
                  { id: "VIL-AMI", title: "Amiliya" },
                  { id: "VIL-SIR", title: "Sirmour" }
                ]
              },
              {
                type: "TextInput",
                name: "age",
                label: "Age (Years)",
                "input-type": "number",
                required: true
              },
              {
                type: "TextInput",
                name: "gestational_weeks",
                label: "Weeks Pregnant (e.g. 16)",
                "input-type": "number",
                required: false
              },
              {
                type: "RadioButtonsGroup",
                name: "risk_tier",
                label: "Risk Assessment",
                required: true,
                "data-source": [
                  { id: "NORMAL", title: "🟢 Normal" },
                  { id: "HIGH_RISK", title: "🔴 High Risk (HRP)" }
                ]
              },
              {
                type: "Footer",
                label: "Submit Registration",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    kind: "patient_registration",
                    full_name: "${form.full_name}",
                    phone_number: "${form.phone_number}",
                    village_id: "${form.village_id}",
                    age: "${form.age}",
                    gestational_weeks: "${form.gestational_weeks}",
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

// 2. Prescribe Next Step / Referral Flow - Single Screen, Minimalist
const flowReferral = {
  version: "6.0",
  screens: [
    {
      id: "REFERRAL",
      title: "Prescribe Referral",
      terminal: true,
      success: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "form",
            children: [
              {
                type: "RadioButtonsGroup",
                name: "category",
                label: "Care Action Needed",
                required: true,
                "data-source": [
                  { id: "ULTRASOUND_SCAN", title: "Obstetric Ultrasound" },
                  { id: "HIGH_RISK_ANC", title: "High Risk Specialist Care" },
                  { id: "SEVERE_ANEMIA", title: "Severe Anemia Management" },
                  { id: "INSTITUTIONAL_DELIVERY", title: "Delivery Planning" }
                ]
              },
              {
                type: "RadioButtonsGroup",
                name: "target_facility",
                label: "Refer To Facility",
                required: true,
                "data-source": [
                  { id: "CHC", title: "CHC Teonthar" },
                  { id: "PHC", title: "PHC Sirmour" },
                  { id: "DH", title: "District Hospital Rewa" }
                ]
              },
              {
                type: "RadioButtonsGroup",
                name: "timeframe_days",
                label: "Urgency",
                required: true,
                "data-source": [
                  { id: "1", title: "Immediate (24h)" },
                  { id: "3", title: "Urgent (3 Days)" },
                  { id: "7", title: "Routine (7 Days)" }
                ]
              },
              {
                type: "TextInput",
                name: "notes",
                label: "Doctor Notes (Optional)",
                required: false
              },
              {
                type: "Footer",
                label: "Submit Referral",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    kind: "prescribe_step",
                    category: "${form.category}",
                    target_facility: "${form.target_facility}",
                    timeframe_days: "${form.timeframe_days}",
                    notes: "${form.notes}"
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

// 3. Referral Closure & Provenance Flow - Outcome Optional! Never blocks submission!
const flowClosure = {
  version: "6.0",
  screens: [
    {
      id: "CLOSURE",
      title: "Close Referral",
      terminal: true,
      success: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "form",
            children: [
              {
                type: "RadioButtonsGroup",
                name: "provenance",
                label: "Where was patient seen?",
                required: true,
                "data-source": [
                  { id: "AT_REFERRED_FACILITY", title: "Seen at referred facility" },
                  { id: "OTHER_PUBLIC_FACILITY", title: "Seen at other Govt hospital" },
                  { id: "PRIVATE_FACILITY", title: "Seen at private clinic/hospital" },
                  { id: "NOT_ATTENDED", title: "Did not attend / Refused care" }
                ]
              },
              {
                type: "RadioButtonsGroup",
                name: "outcome",
                label: "Clinical Outcome (Optional)",
                required: false,
                "data-source": [
                  { id: "RESOLVED", title: "Evaluated & Treatment Prescribed" },
                  { id: "ADMITTED", title: "Admitted to Ward / Observation" },
                  { id: "HIGHER_REFERRAL", title: "Referred to Medical College" }
                ]
              },
              {
                type: "TextInput",
                name: "advice",
                label: "Doctor's Advice / Notes (Optional)",
                required: false
              },
              {
                type: "Footer",
                label: "Submit Loop Closure",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    kind: "close_referral",
                    provenance: "${form.provenance}",
                    outcome: "${form.outcome}",
                    advice: "${form.advice}"
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

// 4. ANC Clinical Checklist & Vitals Flow - Single BP input box, minimalist labels
const flowAnc = {
  version: "6.0",
  screens: [
    {
      id: "ANC_CHECKLIST",
      title: "ANC Vitals",
      terminal: true,
      success: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "form",
            children: [
              {
                type: "RadioButtonsGroup",
                name: "visit_number",
                label: "ANC Visit",
                required: true,
                "data-source": [
                  { id: "ANC_1", title: "ANC 1" },
                  { id: "ANC_2", title: "ANC 2" },
                  { id: "ANC_3", title: "ANC 3" },
                  { id: "ANC_4", title: "ANC 4" }
                ]
              },
              {
                type: "TextInput",
                name: "blood_pressure",
                label: "Blood Pressure (e.g. 120/80)",
                required: true
              },
              {
                type: "TextInput",
                name: "weight_kg",
                label: "Weight (kg, e.g. 52)",
                "input-type": "number",
                required: true
              },
              {
                type: "TextInput",
                name: "hb_level",
                label: "Hemoglobin (g/dL, e.g. 10.5)",
                "input-type": "number",
                required: true
              },
              {
                type: "CheckboxGroup",
                name: "danger_signs",
                label: "Danger Signs (Optional)",
                required: false,
                "data-source": [
                  { id: "HEADACHE", title: "Severe Headache / Blurred Vision" },
                  { id: "SWELLING", title: "Hand or Facial Edema" },
                  { id: "BLEEDING", title: "Vaginal Bleeding / Spotting" }
                ]
              },
              {
                type: "Footer",
                label: "Save ANC Record",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    kind: "anc_checklist",
                    visit_number: "${form.visit_number}",
                    blood_pressure: "${form.blood_pressure}",
                    weight_kg: "${form.weight_kg}",
                    hb_level: "${form.hb_level}",
                    danger_signs: "${form.danger_signs}"
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

async function publishFlow(name, jsonContent) {
  console.log(`\n========================================`);
  console.log(`Creating Flow: ${name}`);
  const createRes = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/flows`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      categories: ['CUSTOMER_SUPPORT']
    })
  });
  const createData = await createRes.json();
  if (!createData.id) {
    console.error(`Failed to create flow ${name}:`, createData);
    return null;
  }
  const flowId = createData.id;
  console.log(`Created flow ID: ${flowId}`);

  // Upload Asset
  const formData = new FormData();
  formData.append('name', 'flow.json');
  formData.append('asset_type', 'FLOW_JSON');
  formData.append('file', new Blob([JSON.stringify(jsonContent)], { type: 'application/json' }), 'flow.json');

  console.log(`Uploading flow.json asset to ${flowId}...`);
  const assetRes = await fetch(`https://graph.facebook.com/v21.0/${flowId}/assets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  const assetData = await assetRes.json();
  console.log('Asset upload response:', assetData);
  if (!assetData.success) {
    console.error(`Asset validation failed for ${name}:`, assetData);
    return null;
  }

  // Publish Flow
  console.log(`Publishing flow ${flowId}...`);
  const pubRes = await fetch(`https://graph.facebook.com/v21.0/${flowId}/publish`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const pubData = await pubRes.json();
  console.log('Publish response:', pubData);

  return flowId;
}

async function run() {
  const ts = Date.now().toString().slice(-4);
  const regId = await publishFlow(`nextsteps_reg_v2_${ts}`, flowRegistration);
  const refId = await publishFlow(`nextsteps_ref_v2_${ts}`, flowReferral);
  const clsId = await publishFlow(`nextsteps_cls_v2_${ts}`, flowClosure);
  const ancId = await publishFlow(`nextsteps_anc_v2_${ts}`, flowAnc);

  console.log('\n========================================');
  console.log('🎉 ALL 4 REDESIGNED FLOWS PUBLISHED SUCCESSFULLY!');
  console.log('========================================');
  console.log(`FLOW_ID_REGISTRATION=${regId}`);
  console.log(`FLOW_ID_REFERRAL=${refId}`);
  console.log(`FLOW_ID_CLOSURE=${clsId}`);
  console.log(`FLOW_ID_ANC=${ancId}`);

  // Save to config / .env
  const outputEnv = `
FLOW_ID_REGISTRATION=${regId}
FLOW_ID_REFERRAL=${refId}
FLOW_ID_CLOSURE=${clsId}
FLOW_ID_ANC=${ancId}
`;
  fs.writeFileSync('flows_published_ids.json', JSON.stringify({
    FLOW_ID_REGISTRATION: regId,
    FLOW_ID_REFERRAL: refId,
    FLOW_ID_CLOSURE: clsId,
    FLOW_ID_ANC: ancId
  }, null, 2));
  console.log('Saved to flows_published_ids.json');
}

run();
