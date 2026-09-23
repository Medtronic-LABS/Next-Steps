import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser, ConversationSession } from '../types.js';
import { searchPatients } from './findPatientWorkflow.js';
import { enqueuePatientEvent } from '../../cce/outboxWorker.js';

import { generateRegisterDeepLink } from '../deepLink.js';

/**
 * Initiates the patient registration flow with "Search First" check and
 * secure web app deep link for sensitive data protection.
 */
export function startRegistration(to: string, user?: WhatsAppUser, initialQuery?: string): OutboundMessage {
  const registerDeepLink = user ? generateRegisterDeepLink(user.id, user.role) : 'https://nextsteps-admin.mdtlabs.org/app/';

  if (initialQuery && initialQuery.trim().length > 1) {
    const matches = searchPatients(initialQuery.trim());
    if (matches.length > 0) {
      return {
        kind: 'list',
        to,
        header: 'Search First — Existing Records',
        body:
          `⚠️ *Before registering, check existing records:*\n\n` +
          `Found ${matches.length} possible matching patient(s) for "${initialQuery}".\n\n` +
          `If the patient is already listed, select them below. Otherwise, choose "Create New Patient".`,
        buttonText: 'Check Matches',
        sections: [
          {
            title: 'Possible Existing Matches',
            rows: [
              ...matches.map((p) => ({
                id: `SEL_PATIENT_${p.id}`,
                title: `${p.name} (${p.age || '—'}y)`.slice(0, 24),
                description: `${p.village_name} · ${p.phone ? '****' + p.phone.slice(-4) : 'No phone'}`.slice(0, 72),
              })),
              {
                id: `REG_CONTINUE_NAME_${encodeURIComponent(initialQuery.trim())}`,
                title: '➕ Create New Patient',
                description: `None of these match "${initialQuery.trim()}"`,
              },
            ],
          },
        ],
      };
    }
  }

  return {
    kind: 'buttons',
    to,
    header: 'सुरक्षित मरीज़ पंजीकरण',
    body:
      `🔒 *Next Steps सुरक्षित मरीज़ पंजीकरण*\n\n` +
      `मरीज़ की व्यक्तिगत और नैदानिक जानकारी की सुरक्षा के लिए, रजिस्ट्रेशन सीधे Next Steps सुरक्षित ऐप में दर्ज किया जाता है:\n\n` +
      `🌐 *पंजीकरण फॉर्म खोलें:*\n${registerDeepLink}\n\n` +
      `_लॉगिन की आवश्यकता नहीं है। फॉर्म सबमिट करते ही मरीज़ आपकी WhatsApp वर्कलिस्ट में तुरंत दिखाई देगा।_`,
    footer: 'Next Steps डेटा सुरक्षा',
    buttons: [
      { id: 'CMD_FIND_PATIENT', title: 'मरीज़ खोजें' },
      { id: 'CMD_WORKLIST', title: 'Worklist' },
      { id: 'CMD_MENU', title: 'मुख्य मेनू' },
    ],
  };
}

/**
 * Handles the multi-step registration conversation.
 */
export function handleRegistrationStep(
  to: string,
  user: WhatsAppUser,
  session: ConversationSession,
  input: { text?: string; replyId?: string }
): OutboundMessage {
  if (!session.stagedRegistration) {
    session.stagedRegistration = {};
  }
  const reg = session.stagedRegistration;

  // Step 1: Receiving Patient Name
  if (session.currentState === 'AWAITING_REG_NAME') {
    const name = (input.text || '').trim();
    if (!name || name.length < 2) {
      return {
        kind: 'text',
        to,
        body: '⚠️ Please enter a valid patient name (at least 2 letters):',
      };
    }

    // Search first check for duplicates
    const matches = searchPatients(name);
    if (matches.length > 0) {
      return {
        kind: 'list',
        to,
        header: 'Possible Duplicates Found',
        body:
          `Found ${matches.length} existing record(s) matching "${name}".\n\n` +
          `To avoid duplicate entries, check if this is the same person:`,
        buttonText: 'Select Patient',
        sections: [
          {
            title: 'Existing Matches',
            rows: [
              ...matches.map((p) => ({
                id: `SEL_PATIENT_${p.id}`,
                title: `${p.name} (${p.age || '—'}y)`.slice(0, 24),
                description: `${p.village_name} · ${p.phone ? '****' + p.phone.slice(-4) : ''}`.slice(0, 72),
              })),
              {
                id: `REG_CONFIRM_NAME_${encodeURIComponent(name)}`,
                title: '➕ None of these — New',
                description: `Register "${name}" as a brand new patient`,
              },
            ],
          },
        ],
      };
    }

    reg.name = name;
    session.currentState = 'AWAITING_REG_PHONE';
    return {
      kind: 'text',
      to,
      body:
        `👤 Patient Name: *${name}*\n\n` +
        `Please reply with the patient's *10-digit mobile number*:\n\n` +
        `_Example: "9812345678" (or "0" if patient has no phone)_`,
    };
  }

  // Step 2: Receiving Phone Number
  if (session.currentState === 'AWAITING_REG_PHONE') {
    const rawPhone = (input.text || '').replace(/\D/g, '');
    let finalPhone = '+910000000000';
    if (rawPhone.length === 10) {
      finalPhone = `+91${rawPhone}`;
    } else if (rawPhone.length === 12 && rawPhone.startsWith('91')) {
      finalPhone = `+${rawPhone}`;
    } else if (rawPhone === '0') {
      finalPhone = `+910000000000`;
    } else {
      return {
        kind: 'text',
        to,
        body: '⚠️ Please enter a valid 10-digit Indian mobile number (or reply "0" if unavailable):',
      };
    }

    reg.phone = finalPhone;
    session.currentState = 'AWAITING_REG_VILLAGE';

    // Fetch villages from DB for auto-resolution
    const villages = db.prepare('SELECT * FROM villages ORDER BY name ASC LIMIT 10').all() as any[];

    return {
      kind: 'list',
      to,
      header: `Select Village for ${reg.name}`,
      body:
        `📱 Mobile: *${finalPhone}*\n\n` +
        `Select the patient's village below. The linked ASHA and Sub-centre will be auto-resolved:`,
      buttonText: 'Choose Village',
      sections: [
        {
          title: 'Villages in Block',
          rows: villages.map((v) => ({
            id: `REG_VIL_${v.id}`,
            title: v.name.slice(0, 24),
            description: `ASHA: ${v.asha_name} (${v.subcentre_id})`.slice(0, 72),
          })),
        },
      ],
    };
  }

  // Step 3: Receiving Village Selection
  if (session.currentState === 'AWAITING_REG_VILLAGE') {
    const replyId = input.replyId || '';
    if (!replyId.startsWith('REG_VIL_')) {
      return {
        kind: 'text',
        to,
        body: '⚠️ Please select a village from the list.',
      };
    }

    const villageId = replyId.replace('REG_VIL_', '');
    const village = db.prepare('SELECT * FROM villages WHERE id = ?').get(villageId) as any;
    if (!village) {
      return { kind: 'text', to, body: '❌ Village not found. Please try again.' };
    }

    reg.villageId = village.id;
    reg.villageName = village.name;
    session.currentState = 'AWAITING_REG_SERVICE';

    return {
      kind: 'list',
      to,
      header: 'Select Care Program',
      body:
        `📍 Village: *${village.name}* (ASHA: ${village.asha_name})\n\n` +
        `Select the health programme or condition for *${reg.name}*:`,
      buttonText: 'Select Program',
      sections: [
        {
          title: 'Care Programs',
          rows: [
            { id: 'REG_PROG_ANC', title: 'ANC (Maternal Care)', description: 'Antenatal pregnancy tracking' },
            { id: 'REG_PROG_NCD', title: 'NCD (Hypertension / DM)', description: 'Chronic disease management' },
            { id: 'REG_PROG_PNC', title: 'PNC (Postnatal Care)', description: 'Post-delivery mother & infant' },
            { id: 'REG_PROG_CANCER', title: 'Cancer Screening', description: 'Cervical / Breast screening' },
          ],
        },
      ],
    };
  }

  // Step 4: Receiving Program Selection
  if (session.currentState === 'AWAITING_REG_SERVICE') {
    const replyId = input.replyId || '';
    if (!replyId.startsWith('REG_PROG_')) {
      return {
        kind: 'text',
        to,
        body: '⚠️ Please select a care program from the options.',
      };
    }

    const service = replyId.replace('REG_PROG_', '');
    reg.service = service;
    session.currentState = 'AWAITING_REG_RISK';

    if (service === 'NCD') {
      return {
        kind: 'buttons',
        to,
        header: 'Hypertension / Diabetes Status',
        body: `Select current clinical status for *${reg.name}*:`,
        buttons: [
          { id: 'REG_RISK_CONTROLLED', title: '🟢 BP/Sugar Normal' },
          { id: 'REG_RISK_UNCONTROLLED', title: '🔴 Uncontrolled BP' },
        ],
      };
    } else if (service === 'CANCER') {
      return {
        kind: 'buttons',
        to,
        header: 'Cancer Screening Status',
        body: `Select screening result for *${reg.name}*:`,
        buttons: [
          { id: 'REG_RISK_SCREEN_NEGATIVE', title: '🟢 Screen Negative' },
          { id: 'REG_RISK_SCREEN_POSITIVE', title: '🔴 Screen Positive' },
        ],
      };
    } else if (service === 'PNC') {
      return {
        kind: 'buttons',
        to,
        header: 'Postnatal Status',
        body: `Select condition for mother and newborn:`,
        buttons: [
          { id: 'REG_RISK_BOTH_WELL', title: '🟢 Mother & Baby Well' },
          { id: 'REG_RISK_COMPLICATION', title: '🔴 Complication' },
        ],
      };
    } else {
      // Default ANC
      return {
        kind: 'buttons',
        to,
        header: 'Pregnancy Risk Assessment',
        body: `Is this a high-risk pregnancy for *${reg.name}*?`,
        buttons: [
          { id: 'REG_RISK_NORMAL', title: '🟢 Normal Risk' },
          { id: 'REG_RISK_HRP', title: '🔴 High-Risk (HRP)' },
        ],
      };
    }
  }

  // Step 5: Receiving Risk Status
  if (session.currentState === 'AWAITING_REG_RISK') {
    const replyId = input.replyId || '';
    if (!replyId.startsWith('REG_RISK_')) {
      return {
        kind: 'text',
        to,
        body: '⚠️ Please select the risk status using the buttons.',
      };
    }

    const risk = replyId.replace('REG_RISK_', '');
    reg.riskStatus = risk;
    session.currentState = 'AWAITING_REG_CONSENT';

    // WhatsApp reminder consent interaction (PRD Section 3)
    return {
      kind: 'buttons',
      to,
      header: 'WhatsApp Reminders',
      body:
        `📱 *May we send ${reg.name} reminders on WhatsApp about upcoming care steps and visits?*\n\n` +
        `• Direct automated reminders\n` +
        `• Appointment confirmations\n` +
        `• Free public service`,
      buttons: [
        { id: 'REG_CONSENT_YES', title: '✅ Yes, Consented' },
        { id: 'REG_CONSENT_NO', title: '❌ No' },
      ],
    };
  }

  // Step 6: Receiving Consent & Finalizing Registration
  if (session.currentState === 'AWAITING_REG_CONSENT') {
    const replyId = input.replyId || '';
    const consented = replyId === 'REG_CONSENT_YES' ? 1 : 0;
    reg.consentWhatsapp = consented;

    const patientId = `p-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const village = db.prepare('SELECT * FROM villages WHERE id = ?').get(reg.villageId) as any;

    const patientRecord = {
      id: patientId,
      name: reg.name,
      name_hi: null,
      phone: reg.phone,
      service: reg.service || 'ANC',
      village_id: reg.villageId,
      village_name: reg.villageName || village?.name || 'Unknown',
      subcentre_id: village?.subcentre_id || user.facility_id || 'FAC-SC-GHU',
      asha_name: village?.asha_name || 'ASHA Samta',
      status: reg.riskStatus || 'NORMAL',
      age: 26,
      consent_whatsapp: consented,
      created_at: now,
    };

    // 1. Insert into Next Steps database
    db.prepare(`
      INSERT INTO patients (id, name, name_hi, phone, service, village_id, village_name, subcentre_id, asha_name, status, age, consent_whatsapp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      patientRecord.id,
      patientRecord.name,
      patientRecord.name_hi,
      patientRecord.phone,
      patientRecord.service,
      patientRecord.village_id,
      patientRecord.village_name,
      patientRecord.subcentre_id,
      patientRecord.asha_name,
      patientRecord.status,
      patientRecord.age,
      patientRecord.consent_whatsapp,
      patientRecord.created_at
    );

    // 2. Queue CCE PATIENT_CREATED CloudEvent
    try {
      enqueuePatientEvent(patientRecord);
    } catch (err: any) {
      console.warn('[Registration] CCE outbox enqueue notice:', err?.message || err);
    }

    // 3. Record Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp)
      VALUES (?, ?, ?, 'PATIENT_REGISTERED', ?, ?)
    `).run(
      `aud-${uuidv4().slice(0, 8)}`,
      user.id,
      user.name,
      `Registered ${patientRecord.name} (${patientRecord.service}, ${patientRecord.status}) with WhatsApp consent=${consented}`,
      now
    );

    session.patientId = patientId;
    session.currentState = 'VIEWING_PATIENT';
    session.stagedRegistration = undefined;

    const riskLabel =
      patientRecord.status === 'HRP'
        ? '🔴 High-Risk Pregnancy'
        : patientRecord.status === 'UNCONTROLLED'
        ? '🔴 Uncontrolled BP'
        : patientRecord.status === 'SCREEN_POSITIVE'
        ? '🔴 Screen Positive'
        : '🟢 Normal';

    return {
      kind: 'buttons',
      to,
      header: 'पंजीकरण पूर्ण',
      body:
        `🎉 *मरीज़ का पंजीकरण सफलतापूर्वक हो गया!*\n\n` +
        `• *नाम:* ${patientRecord.name} (26y)\n` +
        `• *मोबाइल:* ${patientRecord.phone}\n` +
        `• *गाँव:* ${patientRecord.village_name} (ASHA: ${patientRecord.asha_name})\n` +
        `• *प्रोग्राम:* ${patientRecord.service} · ${riskLabel}\n` +
        `• *WhatsApp रिमाइंडर:* ${consented ? '✅ सहमति दी गई' : '❌ अस्वीकार'}\n\n` +
        `पहला केयर स्टेप दर्ज करें या मरीज़ की जानकारी देखें:`,
      buttons: [
        { id: `ACTION_ADD_STEP_${patientId}`, title: '➕ नया स्टेप' },
        { id: `SEL_PATIENT_${patientId}`, title: '👤 प्रोफाइल देखें' },
        { id: 'CMD_WORKLIST', title: 'Worklist' },
      ],
    };
  }

  return {
    kind: 'text',
    to,
    body: '⚠️ Unexpected registration state. Type *menu* to restart.',
  };
}
