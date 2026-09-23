import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';
import { enqueueStepEvent } from '../../cce/outboxWorker.js';

export function promptNextStepCategories(to: string, patientId: string, stagedCount = 0): OutboundMessage {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as any;
  const name = patient ? patient.name : 'the patient';
  const service = patient ? patient.service : 'ANC';

  let sections: any[] = [];

  if (service === 'NCD') {
    sections = [
      {
        title: 'NCD Care Bundles',
        rows: [
          { id: `STAGE_CAT_${patientId}_COMBO_NCD_CARE`, title: 'BP Check + Medication', description: 'Screening check-up & 30d refill' },
        ],
      },
      {
        title: 'NCD Management',
        rows: [
          { id: `STAGE_CAT_${patientId}_MED_REFILL`, title: 'Medication Refill', description: '30-day anti-hypertensive supply' },
          { id: `STAGE_CAT_${patientId}_BP_SUGAR_CHECK`, title: 'BP / Sugar Check', description: 'Bi-weekly screening at Sub-centre' },
        ],
      },
      {
        title: 'Clinical Review & Referral',
        rows: [
          { id: `STAGE_CAT_${patientId}_MO_CONSULT`, title: 'PHC Doctor Review', description: 'Medical Officer consultation (+7d)' },
          { id: `STAGE_CAT_${patientId}_REFERRAL_DH`, title: 'Referral to DH Rewa', description: 'District Hospital for complications' },
        ],
      },
    ];
  } else if (service === 'PNC') {
    sections = [
      {
        title: 'PNC Care Bundles',
        rows: [
          { id: `STAGE_CAT_${patientId}_COMBO_PNC_CARE`, title: 'PNC Check + Vaccine', description: 'Postnatal checkup & infant immunization' },
        ],
      },
      {
        title: 'Postnatal Care',
        rows: [
          { id: `STAGE_CAT_${patientId}_PNC_VISIT`, title: 'PNC Follow-up', description: 'Maternal & newborn checkup (+14d)' },
          { id: `STAGE_CAT_${patientId}_IMMUNIZATION`, title: 'Infant Immunization', description: 'OPV, Penta, Rota vaccination (+6w)' },
        ],
      },
      {
        title: 'Referrals',
        rows: [
          { id: `STAGE_CAT_${patientId}_REFERRAL_CHC`, title: 'Referral to CHC', description: 'Refer mother or baby to CHC Teonthar' },
          { id: `STAGE_CAT_${patientId}_REFERRAL_DH`, title: 'Referral to DH', description: 'District Hospital Rewa' },
        ],
      },
    ];
  } else if (service === 'CANCER') {
    sections = [
      {
        title: 'Diagnostic Workup',
        rows: [
          { id: `STAGE_CAT_${patientId}_IMAGING`, title: 'Mammography / USG', description: 'Diagnostic imaging at DH Rewa (+7d)' },
          { id: `STAGE_CAT_${patientId}_BIOPSY`, title: 'Tissue Biopsy', description: 'Histopathology at DH / Tertiary (+10d)' },
        ],
      },
      {
        title: 'Oncology Follow-up',
        rows: [
          { id: `STAGE_CAT_${patientId}_ONCOLOGY_FOLLOW_UP`, title: 'Oncology Review', description: 'Specialist review (+30d)' },
          { id: `STAGE_CAT_${patientId}_REFERRAL_TERTIARY`, title: 'Tertiary Referral', description: 'Medical College Jabalpur' },
        ],
      },
    ];
  } else {
    // Default ANC: Routine ANC, Diagnostics, and Facility Referrals (PHC, CHC, DH)
    sections = [
      {
        title: 'सामान्य ANC देखभाल',
        rows: [
          { id: `STAGE_CAT_${patientId}_ANC_VISIT`, title: 'ANC रूटीन विज़िट', description: 'सब-सेंटर पर नियमित विज़िट (+4w)' },
          { id: `STAGE_CAT_${patientId}_FOLLOW_UP`, title: 'फ़ॉलो-अप जाँच', description: 'सब-सेंटर पर रूटीन चेकअप (+2w)' },
        ],
      },
      {
        title: 'जाँच एवं टेस्ट (Diagnostics)',
        rows: [
          { id: `STAGE_CAT_${patientId}_LAB`, title: 'लैब टेस्ट (Hb, पेशाब)', description: 'हीमोग्लोबिन, यूरिन एल्बुमिन (+7d)' },
          { id: `STAGE_CAT_${patientId}_IMAGING`, title: 'अल्ट्रासाउंड (USG)', description: 'CHC / DH पर सोनोग्राफी (+7d)' },
        ],
      },
      {
        title: 'अस्पताल रेफरल',
        rows: [
          { id: `STAGE_CAT_${patientId}_REFERRAL_PHC`, title: 'PHC रेफरल', description: 'प्राथमिक स्वास्थ्य केंद्र (PHC Sirmour)' },
          { id: `STAGE_CAT_${patientId}_REFERRAL_CHC`, title: 'CHC रेफरल', description: 'सामुदायिक स्वास्थ्य केंद्र (CHC Teonthar)' },
          { id: `STAGE_CAT_${patientId}_REFERRAL_DH`, title: 'DH रेफरल', description: 'ज़िला अस्पताल (DH Rewa)' },
        ],
      },
    ];
  }

  const stagedNote = stagedCount > 0 ? `\n_(${stagedCount} स्टेप्स चुने गए हैं)_` : '';

  return {
    kind: 'list',
    to,
    header: `केयर स्टेप: ${name}`.slice(0, 24),
    body: `*${name}* (${service}) के लिए केयर स्टेप चुनें:${stagedNote}`,
    buttonText: 'केयर स्टेप चुनें',
    sections,
  };
}

export function promptFacilitySelection(to: string, patientId: string): OutboundMessage {
  const patient = db.prepare('SELECT name FROM patients WHERE id = ?').get(patientId) as any;
  const name = patient ? patient.name : 'Patient';

  return {
    kind: 'list',
    to,
    header: 'अस्पताल चुनें',
    body: `*${name}* को किस अस्पताल में रेफर करना चाहते हैं?`,
    buttonText: 'अस्पताल चुनें',
    sections: [
      {
        title: 'रेफरल अस्पताल',
        rows: [
          { id: `REF_FAC_${patientId}_PHC`, title: 'PHC Sirmour', description: 'प्राथमिक स्वास्थ्य केंद्र · डॉक्टर परामर्श' },
          { id: `REF_FAC_${patientId}_CHC`, title: 'CHC Teonthar', description: 'सामुदायिक स्वास्थ्य केंद्र / FRU · विशेषज्ञ' },
          { id: `REF_FAC_${patientId}_DH`, title: 'District Hospital Rewa', description: 'ज़िला अस्पताल · संपूर्ण जाँच व आपातकालीन' },
        ],
      },
    ],
  };
}

export function handleCategorySelected(
  to: string,
  user: WhatsAppUser,
  patientId: string,
  category: string,
  existingSteps: any[] = []
): { message: OutboundMessage; stagedAction: any; stagedSteps: any[] } {
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as any;
  const name = patient ? patient.name : 'Patient';

  const newSteps: any[] = [];
  const now = new Date();

  const addDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // --- Care Bundles (Multiple Steps in 1-Tap) ---
  if (category === 'COMBO_ANC_LAB') {
    newSteps.push({
      patientId,
      category: 'ANC_VISIT',
      level: 'SUBCENTRE',
      facilityId: user.facility_id || 'FAC-SC-GHU',
      targetFacilityName: user.facility_name || 'Sub-centre Ghurehta',
      dueDate: addDays(28),
    });
    newSteps.push({
      patientId,
      category: 'LAB',
      level: 'SUBCENTRE',
      facilityId: user.facility_id || 'FAC-SC-GHU',
      targetFacilityName: user.facility_name || 'Sub-centre Ghurehta',
      dueDate: addDays(7),
    });
  } else if (category === 'COMBO_REF_USG') {
    newSteps.push({
      patientId,
      category: 'REFERRAL',
      level: 'CHC',
      facilityId: 'FAC-CHC-TEO',
      targetFacilityName: 'CHC Teonthar',
      dueDate: addDays(3),
    });
    newSteps.push({
      patientId,
      category: 'IMAGING',
      level: 'CHC',
      facilityId: 'FAC-CHC-TEO',
      targetFacilityName: 'CHC Teonthar',
      dueDate: addDays(7),
    });
  } else if (category === 'COMBO_NCD_CARE') {
    newSteps.push({
      patientId,
      category: 'BP_SUGAR_CHECK',
      level: 'SUBCENTRE',
      facilityId: user.facility_id || 'FAC-SC-GHU',
      targetFacilityName: user.facility_name || 'Sub-centre Ghurehta',
      dueDate: addDays(14),
    });
    newSteps.push({
      patientId,
      category: 'MED_REFILL',
      level: 'SUBCENTRE',
      facilityId: user.facility_id || 'FAC-SC-GHU',
      targetFacilityName: user.facility_name || 'Sub-centre Ghurehta',
      dueDate: addDays(30),
    });
  } else if (category === 'COMBO_PNC_CARE') {
    newSteps.push({
      patientId,
      category: 'PNC_VISIT',
      level: 'SUBCENTRE',
      facilityId: user.facility_id || 'FAC-SC-GHU',
      targetFacilityName: user.facility_name || 'Sub-centre Ghurehta',
      dueDate: addDays(14),
    });
    newSteps.push({
      patientId,
      category: 'IMMUNIZATION',
      level: 'SUBCENTRE',
      facilityId: user.facility_id || 'FAC-SC-GHU',
      targetFacilityName: user.facility_name || 'Sub-centre Ghurehta',
      dueDate: addDays(42),
    });
  } else {
    // Single Step
    let level = 'CHC';
    let targetFacility = 'CHC Teonthar';
    let targetFacilityId = 'FAC-CHC-TEO';
    let dueDays = 3;

    if (category === 'ANC_VISIT') {
      level = 'SUBCENTRE';
      targetFacility = user.facility_name || 'Sub-centre Ghurehta';
      targetFacilityId = user.facility_id || 'FAC-SC-GHU';
      dueDays = 28;
    } else if (category === 'FOLLOW_UP') {
      level = 'SUBCENTRE';
      targetFacility = user.facility_name || 'Sub-centre Ghurehta';
      targetFacilityId = user.facility_id || 'FAC-SC-GHU';
      dueDays = 14;
    } else if (category === 'LAB') {
      level = 'SUBCENTRE';
      targetFacility = user.facility_name || 'Sub-centre Ghurehta';
      targetFacilityId = user.facility_id || 'FAC-SC-GHU';
      dueDays = 7;
    } else if (category === 'IMAGING') {
      level = user.role === 'anm' || user.role === 'phc_sn' ? 'CHC' : 'DH';
      targetFacility = level === 'CHC' ? 'CHC Teonthar' : 'District Hospital, Rewa';
      targetFacilityId = level === 'CHC' ? 'FAC-CHC-TEO' : 'FAC-DH-REW';
      dueDays = 7;
    } else if (category === 'REFERRAL_PHC') {
      category = 'REFERRAL';
      level = 'PHC';
      targetFacility = 'PHC Sirmour';
      targetFacilityId = 'FAC-PHC-SIR';
      dueDays = 3;
    } else if (category === 'REFERRAL_CHC') {
      category = 'REFERRAL';
      level = 'CHC';
      targetFacility = 'CHC Teonthar';
      targetFacilityId = 'FAC-CHC-TEO';
      dueDays = 3;
    } else if (category === 'REFERRAL_DH') {
      category = 'REFERRAL';
      level = 'DH';
      targetFacility = 'District Hospital, Rewa';
      targetFacilityId = 'FAC-DH-REW';
      dueDays = 3;
    } else if (category === 'REFERRAL_TERTIARY') {
      category = 'REFERRAL';
      level = 'TERTIARY';
      targetFacility = 'Medical College, Jabalpur';
      targetFacilityId = 'FAC-TER-JAB';
      dueDays = 3;
    } else if (category === 'REFERRAL') {
      if (user.role === 'chc_sn' || user.role === 'chc_mo') {
        level = 'DH';
        targetFacility = 'District Hospital, Rewa';
        targetFacilityId = 'FAC-DH-REW';
      } else if (user.role === 'dh_sn') {
        level = 'TERTIARY';
        targetFacility = 'Medical College, Jabalpur';
        targetFacilityId = 'FAC-TER-JAB';
      } else {
        level = 'CHC';
        targetFacility = 'CHC Teonthar';
        targetFacilityId = 'FAC-CHC-TEO';
      }
      dueDays = 3;
    } else if (category === 'MED_REFILL') {
      level = 'SUBCENTRE';
      targetFacility = user.facility_name || 'Sub-centre Ghurehta';
      targetFacilityId = user.facility_id || 'FAC-SC-GHU';
      dueDays = 30;
    } else if (category === 'BP_SUGAR_CHECK') {
      level = 'SUBCENTRE';
      targetFacility = user.facility_name || 'Sub-centre Ghurehta';
      targetFacilityId = user.facility_id || 'FAC-SC-GHU';
      dueDays = 14;
    } else if (category === 'MO_CONSULT') {
      level = 'PHC';
      targetFacility = 'PHC Sirmour';
      targetFacilityId = 'FAC-PHC-SIR';
      dueDays = 7;
    } else if (category === 'PNC_VISIT') {
      level = 'SUBCENTRE';
      targetFacility = user.facility_name || 'Sub-centre Ghurehta';
      targetFacilityId = user.facility_id || 'FAC-SC-GHU';
      dueDays = 14;
    } else if (category === 'IMMUNIZATION') {
      level = 'SUBCENTRE';
      targetFacility = user.facility_name || 'Sub-centre Ghurehta';
      targetFacilityId = user.facility_id || 'FAC-SC-GHU';
      dueDays = 42;
    } else if (category === 'BIOPSY' || category === 'ONCOLOGY_FOLLOW_UP') {
      level = 'DH';
      targetFacility = 'District Hospital, Rewa';
      targetFacilityId = 'FAC-DH-REW';
      dueDays = category === 'BIOPSY' ? 10 : 30;
    }

    newSteps.push({
      patientId,
      category,
      level,
      facilityId: targetFacilityId,
      targetFacilityName: targetFacility,
      dueDate: addDays(dueDays),
    });
  }

  // Combine with already staged steps (avoiding duplicate category)
  const combinedSteps = [...existingSteps];
  for (const ns of newSteps) {
    if (!combinedSteps.some((s) => s.category === ns.category && s.level === ns.level)) {
      combinedSteps.push(ns);
    }
  }

  const count = combinedSteps.length;
  let body = `📋 *${name} के लिए केयर स्टेप्स (${count} स्टेप्स):*\n\n`;

  combinedSteps.forEach((s, idx) => {
    const catLabel = s.category.replace(/_/g, ' ');
    body += `${idx + 1}. *${catLabel}* (${s.level})\n   📍 ${s.targetFacilityName || s.level} · तारीख: ${s.dueDate}\n\n`;
  });

  body += `और स्टेप्स जोड़ने के लिए नीचे टैप करें, या कन्फर्म करके सेव करें:`;

  const message: OutboundMessage = {
    kind: 'buttons',
    to,
    header: `केयर स्टेप: ${name}`.slice(0, 24),
    body: body.trim(),
    buttons: [
      { id: `ACTION_ADD_MORE_STEP_${patientId}`, title: '➕ एक और जोड़ें' },
      { id: `CONFIRM_STEP_${patientId}`, title: `✅ सेव करें ${count > 1 ? `(${count})` : ''}`.trim().slice(0, 20) },
      { id: 'CMD_MENU', title: 'रद्द करें' },
    ],
  };

  return {
    message,
    stagedAction: combinedSteps[0],
    stagedSteps: combinedSteps,
  };
}

export function handleConfirmStep(to: string, user: WhatsAppUser, staged: any, stagedStepsList?: any[]): OutboundMessage {
  const stepsToSave = stagedStepsList && stagedStepsList.length > 0 ? stagedStepsList : [staged];
  const now = new Date().toISOString();
  const createdStepNames: string[] = [];
  const outboxIds: string[] = [];

  const patientId = stepsToSave[0]?.patientId || staged.patientId;
  const patient = db.prepare('SELECT name FROM patients WHERE id = ?').get(patientId) as any;
  const name = patient ? patient.name : 'Patient';

  for (const s of stepsToSave) {
    const stepId = `step-${uuidv4().slice(0, 8)}`;
    const stepRecord = {
      id: stepId,
      patient_id: s.patientId,
      cat: s.category,
      level: s.level,
      due: s.dueDate,
      sent_at: now.slice(0, 10),
      status: 'OPEN',
      owner_role: user.role,
      created_by: user.name,
    };

    // 1. Insert into Next Steps database
    db.prepare(`
      INSERT INTO steps (id, patient_id, cat, level, due, sent_at, status, owner_role, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?)
    `).run(
      stepRecord.id,
      stepRecord.patient_id,
      stepRecord.cat,
      stepRecord.level,
      stepRecord.due,
      stepRecord.sent_at,
      stepRecord.owner_role,
      stepRecord.created_by,
      now,
      now
    );

    // 2. Queue CCE CloudEvent
    const outboxId = enqueueStepEvent(stepRecord, s.patientId);
    outboxIds.push(outboxId.slice(0, 8));
    createdStepNames.push(`${s.category.replace(/_/g, ' ')} (${s.level}) · तारीख: ${s.dueDate}`);
  }

  const count = stepsToSave.length;
  let body = `✅ *सफलतापूर्वक दर्ज! ${name} के लिए ${count} केयर स्टेप्स सेव हो गए:*\n\n`;
  createdStepNames.forEach((s) => {
    body += `• ${s}\n`;
  });
  body += `\nसभी केयर स्टेप्स सिस्टम में सुरक्षित हैं। ${name} की केयर जर्नी देखने के लिए नीचे टैप करें:`;

  return {
    kind: 'buttons',
    to,
    header: 'Steps Prescribed',
    body: body.trim(),
    buttons: [
      { id: `SEL_PATIENT_${patientId}`, title: `👤 प्रोफाइल देखें`.slice(0, 20) },
      { id: `ACTION_ADD_STEP_${patientId}`, title: '➕ नया स्टेप' },
      { id: 'CMD_WORKLIST', title: 'Worklist' },
    ],
  };
}

