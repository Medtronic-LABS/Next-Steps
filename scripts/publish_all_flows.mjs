import fs from 'fs';

const token = 'EAAX1g7zPTiMBSobYVR3l8yA2ECHMXaBDUbEVZBV4TKWHdohJM8ZAKZAG8MMzDKfzWcb6gJrOKh98OSFxdvGrMfP36mssZA6Kfax5YjBWxdGnycHRTxia8dxOZCHma90UgxnpQyiQd2kkJHeMtAKHZBenuW0rGiTlOPhhqysiHeQJbLeHjfQ2djZCFJioOYNhwZDZD';
const wabaId = '2450605875348094';

// 1. Patient Registration Flow
const flowRegistration = {
  version: "6.0",
  screens: [
    {
      id: "DEMOGRAPHICS",
      title: "Patient Registration",
      terminal: false,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "demo_form",
            children: [
              {
                type: "TextInput",
                name: "full_name",
                label: "Mother's Full Name",
                required: true
              },
              {
                type: "TextInput",
                name: "phone_number",
                label: "10-Digit Mobile Number",
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
                  { id: "VIL-KOT", title: "Kothar" },
                  { id: "VIL-GHO", title: "Ghoghar" },
                  { id: "VIL-BAD", title: "Badwar" }
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
                type: "Footer",
                label: "Next: Clinical Info",
                "on-click-action": {
                  name: "navigate",
                  next: {
                    type: "screen",
                    name: "CLINICAL"
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      id: "CLINICAL",
      title: "Clinical & Consent",
      terminal: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "clinical_form",
            children: [
              {
                type: "DatePicker",
                name: "lmp_date",
                label: "Last Menstrual Period (LMP)",
                required: true
              },
              {
                type: "RadioButtonsGroup",
                name: "risk_tier",
                label: "Risk Assessment",
                required: true,
                "data-source": [
                  { id: "NORMAL", title: "Normal / Routine Care" },
                  { id: "MODERATE", title: "Moderate Risk" },
                  { id: "HIGH_RISK", title: "High Risk Pregnancy (HRP)" }
                ]
              },
              {
                type: "CheckboxGroup",
                name: "whatsapp_consent",
                label: "DPDP Digital Consent",
                required: true,
                "data-source": [
                  { id: "CONSENTED", title: "Patient consents to maternal tracking & WhatsApp updates" }
                ]
              },
              {
                type: "Footer",
                label: "Submit Registration",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    kind: "patient_registration",
                    full_name: "${demo_form.full_name}",
                    phone_number: "${demo_form.phone_number}",
                    village_id: "${demo_form.village_id}",
                    age: "${demo_form.age}",
                    lmp_date: "${clinical_form.lmp_date}",
                    risk_tier: "${clinical_form.risk_tier}",
                    whatsapp_consent: "${clinical_form.whatsapp_consent}"
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

// 2. Prescribe Next Step / Referral Flow
const flowReferral = {
  version: "6.0",
  screens: [
    {
      id: "REFERRAL",
      title: "Prescribe Next Step",
      terminal: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "ref_form",
            children: [
              {
                type: "RadioButtonsGroup",
                name: "category",
                label: "Care Action Category",
                required: true,
                "data-source": [
                  { id: "HIGH_RISK_ANC", title: "High Risk ANC Evaluation" },
                  { id: "ULTRASOUND_SCAN", title: "Obstetric Ultrasound" },
                  { id: "SEVERE_ANEMIA", title: "Severe Anemia (Hb < 7) Management" },
                  { id: "PRE_ECLAMPSIA", title: "Pre-eclampsia Workup" },
                  { id: "INSTITUTIONAL_DELIVERY", title: "Institutional Delivery Planning" }
                ]
              },
              {
                type: "RadioButtonsGroup",
                name: "target_facility",
                label: "Target Facility Level",
                required: true,
                "data-source": [
                  { id: "PHC", title: "Primary Health Centre (PHC)" },
                  { id: "CHC", title: "Community Health Centre (CHC)" },
                  { id: "DH", title: "District Hospital (DH)" }
                ]
              },
              {
                type: "RadioButtonsGroup",
                name: "timeframe_days",
                label: "Urgency Window",
                required: true,
                "data-source": [
                  { id: "1", title: "Immediate (Within 24 Hours)" },
                  { id: "3", title: "Urgent (Within 3 Days)" },
                  { id: "7", title: "Routine (Within 7 Days)" }
                ]
              },
              {
                type: "TextInput",
                name: "notes",
                label: "Clinical Notes / Reason",
                required: false
              },
              {
                type: "Footer",
                label: "Issue Referral",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    kind: "prescribe_step",
                    category: "${ref_form.category}",
                    target_facility: "${ref_form.target_facility}",
                    timeframe_days: "${ref_form.timeframe_days}",
                    notes: "${ref_form.notes}"
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

// 3. Referral Closure & Provenance Flow
const flowClosure = {
  version: "6.0",
  screens: [
    {
      id: "CLOSURE",
      title: "Close Referral Loop",
      terminal: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "close_form",
            children: [
              {
                type: "RadioButtonsGroup",
                name: "provenance",
                label: "Where was patient seen?",
                required: true,
                "data-source": [
                  { id: "AT_REFERRED_FACILITY", title: "Seen at referred facility" },
                  { id: "OTHER_PUBLIC_FACILITY", title: "Seen at another Govt hospital" },
                  { id: "PRIVATE_FACILITY", title: "Seen at private clinic/hospital" },
                  { id: "NOT_ATTENDED", title: "Did not attend / Refused care" }
                ]
              },
              {
                type: "RadioButtonsGroup",
                name: "outcome",
                label: "Clinical Outcome",
                required: true,
                "data-source": [
                  { id: "RESOLVED", title: "Evaluated & Treatment Prescribed" },
                  { id: "ADMITTED", title: "Admitted to Ward / Observation" },
                  { id: "HIGHER_REFERRAL", title: "Referred to Medical College" }
                ]
              },
              {
                type: "TextInput",
                name: "advice",
                label: "Doctor's Advice / Follow-up Notes",
                required: false
              },
              {
                type: "Footer",
                label: "Submit Loop Closure",
                "on-click-action": {
                  name: "complete",
                  payload: {
                    kind: "close_referral",
                    provenance: "${close_form.provenance}",
                    outcome: "${close_form.outcome}",
                    advice: "${close_form.advice}"
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

// 4. ANC Clinical Checklist & Vitals Flow
const flowAnc = {
  version: "6.0",
  screens: [
    {
      id: "ANC_CHECKLIST",
      title: "ANC Visit & Vitals",
      terminal: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          {
            type: "Form",
            name: "vitals_form",
            children: [
              {
                type: "RadioButtonsGroup",
                name: "visit_number",
                label: "ANC Visit Round",
                required: true,
                "data-source": [
                  { id: "ANC_1", title: "ANC 1 (First Trimester)" },
                  { id: "ANC_2", title: "ANC 2 (14-26 Weeks)" },
                  { id: "ANC_3", title: "ANC 3 (28-34 Weeks)" },
                  { id: "ANC_4", title: "ANC 4 (36+ Weeks)" }
                ]
              },
              {
                type: "TextInput",
                name: "systolic_bp",
                label: "Systolic BP (mmHg, e.g. 120)",
                "input-type": "number",
                required: true
              },
              {
                type: "TextInput",
                name: "diastolic_bp",
                label: "Diastolic BP (mmHg, e.g. 80)",
                "input-type": "number",
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
                label: "High-Risk Danger Signs (if any)",
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
                    visit_number: "${vitals_form.visit_number}",
                    systolic_bp: "${vitals_form.systolic_bp}",
                    diastolic_bp: "${vitals_form.diastolic_bp}",
                    weight_kg: "${vitals_form.weight_kg}",
                    hb_level: "${vitals_form.hb_level}",
                    danger_signs: "${vitals_form.danger_signs}"
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
  const regId = await publishFlow(`nextsteps_reg_${ts}`, flowRegistration);
  const refId = await publishFlow(`nextsteps_ref_${ts}`, flowReferral);
  const clsId = await publishFlow(`nextsteps_cls_${ts}`, flowClosure);
  const ancId = await publishFlow(`nextsteps_anc_${ts}`, flowAnc);

  console.log('\n========================================');
  console.log('🎉 ALL 4 FLOWS PUBLISHED SUCCESSFULLY!');
  console.log('========================================');
  console.log(`FLOW_ID_REGISTRATION=${regId}`);
  console.log(`FLOW_ID_REFERRAL=${refId}`);
  console.log(`FLOW_ID_CLOSURE=${clsId}`);
  console.log(`FLOW_ID_ANC=${ancId}`);
}

run();
