import { InboundMessage, OutboundMessage, WhatsAppUser } from './types.js';
import { resolveSender } from './senderResolution.js';
import { getSession, updateSession, resetSession } from './sessionManager.js';
import { handleMenu, promptLanguageSelection } from './workflows/menuWorkflow.js';
import {
  handleFindPrompt,
  handlePatientSearchResults,
  renderPatientDetail,
  searchPatients,
} from './workflows/findPatientWorkflow.js';
import { handleWorklist } from './workflows/worklistWorkflow.js';
import {
  handleCategorySelected,
  handleConfirmStep,
  promptNextStepCategories,
  promptFacilitySelection,
} from './workflows/referralWorkflow.js';
import {
  handleCareDelivered,
  handleExpectedArrivals,
  handleMarkArrived,
  promptArrivalAction,
} from './workflows/arrivalWorkflow.js';
import {
  handleCloseWithProvenance,
  promptClosureProvenance,
  promptChooseStepToClose,
} from './workflows/closureWorkflow.js';
import { handleAlerts } from './workflows/alertsWorkflow.js';
import { handleRegistrationStep, startRegistration } from './workflows/registrationWorkflow.js';
import { handleOcrStart, handleOcrReview, handleOcrResolution } from './workflows/ocrWorkflow.js';
import { handleEventLog } from './workflows/eventsWorkflow.js';
import { handleResetDemo } from './workflows/resetWorkflow.js';
import { db } from '../db/index.js';
import { config } from '../config.js';
import { v4 as uuidv4 } from 'uuid';
import { enqueuePatientEvent, enqueueStepEvent } from '../cce/outboxWorker.js';

const GREETINGS = new Set(['hi', 'hello', 'menu', 'namaste', 'start', 'help', 'home']);
const WORKLIST_KEYWORDS = new Set(['worklist', 'today', 'list', 'tasks', 'due']);
const ARRIVAL_KEYWORDS = new Set(['arrivals', 'arrival', 'incoming', 'inbound', 'referrals']);
const ALERT_KEYWORDS = new Set(['alerts', 'alert', 'overdue', 'stale', 'urgent']);
const ADD_KEYWORDS = new Set(['add', 'new', 'prescribe', 'refer']);
const OCR_KEYWORDS = new Set(['ocr', 'import register', 'register import', 'paper register']);
const EVENTS_KEYWORDS = new Set(['events', 'event log', 'cce log', 'log', 'audit']);
const RESET_KEYWORDS = new Set(['reset demo', 'reset', 'restart demo']);
const LANG_KEYWORDS = new Set(['language', 'lang', 'भाषा', 'bhasha', 'change language', 'select language']);

// Demo safety: allow test phones and admin phones to switch roles or reset data.
function isAdminPhone(phone: string): boolean {
  if (!process.env.ADMIN_PHONES) return true;
  const last10 = (p: string) => p.replace(/\D/g, '').slice(-10);
  return (process.env.ADMIN_PHONES || '').split(',').some((p) => p.trim() && last10(p) === last10(phone));
}

export async function routeInboundMessage(message: InboundMessage): Promise<OutboundMessage[]> {
  const to = message.from;
  let user = resolveSender(to);

  // 1. Unregistered sender: polite denial without leaking patient data
  if (!user) {
    return [
      {
        kind: 'text',
        to,
        body:
          `Namaste! Your number (${to}) is not registered in the Next Steps Care Coordination System.\n\n` +
          `Please contact your district administrator or medical officer to link your phone number.`,
      },
    ];
  }

  const userLang = (user.preferred_lang as 'hi' | 'en') || 'en';
  const session = getSession(to, user.id, userLang);
  let lang = session.lang || userLang;
  const replyId = message.replyId || '';
  const rawText = (message.text || '').trim();
  const lower = rawText.toLowerCase();

  // Smart English greeting detection: if user types an English greeting, default to English
  if (['hi', 'hello', 'start', 'hey'].includes(lower)) {
    lang = 'en';
    session.lang = 'en';
  } else if (['namaste', 'नमस्ते'].includes(lower)) {
    lang = 'hi';
    session.lang = 'hi';
  }

  // --- Language Selection (English / Hindi Toggle) ---
  if (LANG_KEYWORDS.has(lower) || replyId === 'CMD_LANG') {
    return [promptLanguageSelection(to, lang)];
  }

  if (replyId === 'SET_LANG_EN' || lower === 'english' || lower === 'en') {
    session.lang = 'en';
    resetSession(session);
    try {
      db.prepare(`UPDATE users SET preferred_lang = 'en' WHERE id = ? OR phone = ?`).run(user.id, user.phone);
    } catch {}
    user.preferred_lang = 'en';
    return [
      {
        kind: 'buttons',
        to,
        header: 'Language: English',
        body: `✅ *Language updated to English!*\n\nWelcome ${user.name}. What would you like to do?`,
        buttons: [
          { id: 'CMD_WORKLIST', title: 'Worklist' },
          { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
          { id: 'CMD_MENU', title: 'Main Menu' },
        ],
      },
    ];
  }

  if (replyId === 'SET_LANG_HI' || lower === 'hindi' || lower === 'हिंदी') {
    session.lang = 'hi';
    resetSession(session);
    try {
      db.prepare(`UPDATE users SET preferred_lang = 'hi' WHERE id = ? OR phone = ?`).run(user.id, user.phone);
    } catch {}
    user.preferred_lang = 'hi';
    return [
      {
        kind: 'buttons',
        to,
        header: 'भाषा: हिंदी',
        body: `✅ *भाषा बदलकर हिंदी कर दी गई है!*\n\nनमस्ते ${user.name}। आप क्या करना चाहते हैं?`,
        buttons: [
          { id: 'CMD_WORKLIST', title: 'Worklist' },
          { id: 'CMD_FIND_PATIENT', title: 'मरीज़ खोजें' },
          { id: 'CMD_MENU', title: 'मुख्य मेनू' },
        ],
      },
    ];
  }

  const wantsRoleOrReset = RESET_KEYWORDS.has(lower) || replyId === 'CMD_RESET_DEMO' || replyId.startsWith('ROLE_')
    || /^(role|switch)\b/.test(lower);
  if (wantsRoleOrReset && !isAdminPhone(user.phone)) {
    return [{
      kind: 'text',
      to,
      body: lang === 'en'
        ? 'Only the demo admin can change roles or reset demo data.'
        : 'केवल डेमो एडमिन रोल बदल सकते हैं या डेमो डेटा रीसेट कर सकते हैं।',
    }];
  }

  // --- Role Switching for Seamless Demo Walkthrough (PRD Section 1 & 18) ---
  if (lower === 'role chc' || lower === 'switch chc' || lower === 'switch to chc' || replyId === 'ROLE_CHC') {
    db.prepare(`UPDATE users SET role = 'chc_sn', facility_id = 'FAC-CHC-TEO' WHERE id = ? OR phone = ?`).run(user.id, user.phone);
    user.role = 'chc_sn';
    user.facility_id = 'FAC-CHC-TEO';
    user.facility_name = 'CHC Teonthar';
    user.facility_level = 'CHC';
    session.currentState = 'IDLE';
    updateSession(session);
    return [
      {
        kind: 'buttons',
        to,
        header: 'रोल बदला: CHC Staff Nurse',
        body: `🏥 अब आप *CHC Teonthar* पर *CHC Staff Nurse Priya* के रोल में हैं।\n\nअब आप Expected Arrivals और द्वितीयक देखभाल की पुष्टि कर सकते हैं:`,
        buttons: [
          { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
          { id: 'CMD_WORKLIST', title: 'CHC Worklist' },
          { id: 'CMD_MENU', title: 'मुख्य मेनू' },
        ],
      },
    ];
  }

  if (lower === 'role anm' || lower === 'switch anm' || lower === 'switch to anm' || replyId === 'ROLE_ANM') {
    db.prepare(`UPDATE users SET role = 'anm', facility_id = 'FAC-SC-GHU' WHERE id = ? OR phone = ?`).run(user.id, user.phone);
    user.role = 'anm';
    user.facility_id = 'FAC-SC-GHU';
    user.facility_name = 'Sub-centre Ghurehta';
    user.facility_level = 'SUBCENTRE';
    session.currentState = 'IDLE';
    updateSession(session);
    return [
      {
        kind: 'buttons',
        to,
        header: 'रोल बदला: ANM (सब-सेंटर)',
        body: `👩‍⚕️ अब आप *Sub-centre Ghurehta* पर *ANM Rekha* के रोल में हैं।\n\nअब आप गाँव के मरीज़ों का पंजीकरण, वर्कलिस्ट और रेफरल प्रबंधित कर सकते हैं:`,
        buttons: [
          { id: 'CMD_WORKLIST', title: 'Worklist' },
          { id: 'CMD_FIND_PATIENT', title: 'मरीज़ खोजें' },
          { id: 'CMD_REGISTER_START', title: '➕ नया मरीज़' },
        ],
      },
    ];
  }

  if (lower === 'role phc' || lower === 'switch phc' || lower === 'switch to phc' || replyId === 'ROLE_PHC') {
    db.prepare(`UPDATE users SET role = 'phc_sn', facility_id = 'FAC-PHC-SIR' WHERE id = ? OR phone = ?`).run(user.id, user.phone);
    user.role = 'phc_sn';
    user.facility_id = 'FAC-PHC-SIR';
    user.facility_name = 'PHC Sirmour';
    user.facility_level = 'PHC';
    session.currentState = 'IDLE';
    updateSession(session);
    return [
      {
        kind: 'buttons',
        to,
        header: 'रोल बदला: PHC Staff Nurse',
        body: `🩺 अब आप *PHC Sirmour* पर *PHC Staff Nurse Suman* के रोल में हैं।\n\nआप प्राथमिक स्वास्थ्य केंद्र के अराइवल्स और डॉक्टर परामर्श प्रबंधित कर सकते हैं:`,
        buttons: [
          { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
          { id: 'CMD_WORKLIST', title: 'PHC Worklist' },
          { id: 'CMD_MENU', title: 'मुख्य मेनू' },
        ],
      },
    ];
  }

  if (lower === 'role' || lower === 'switch role' || lower === 'roles') {
    return [
      {
        kind: 'buttons',
        to,
        header: `वर्तमान रोल: ${user.role.toUpperCase()}`,
        body:
          `आप वर्तमान में *${user.facility_name || user.facility_id}* पर *${user.name}* के रूप में सक्रिय हैं।\n\n` +
          `डेमो के लिए नीचे दिए गए फ्रंटलाइन रोल में से चुनें:`,
        buttons: [
          { id: 'ROLE_ANM', title: '👩‍⚕️ ANM (सब-सेंटर)' },
          { id: 'ROLE_CHC', title: '🏥 CHC Staff Nurse' },
          { id: 'ROLE_PHC', title: '🩺 PHC Staff Nurse' },
        ],
      },
    ];
  }

  // --- Reset Demo Command (PRD Section 14) ---
  if (RESET_KEYWORDS.has(lower) || replyId === 'CMD_RESET_DEMO') {
    resetSession(session);
    return [handleResetDemo(to, user)];
  }

  // --- CCE Event Log Command (PRD Section 12) ---
  if (EVENTS_KEYWORDS.has(lower) || replyId === 'CMD_EVENTS') {
    session.currentState = 'IDLE';
    updateSession(session);
    return [handleEventLog(to, user)];
  }

  // --- Simulated Paper Register OCR (PRD Section 11) ---
  if (OCR_KEYWORDS.has(lower) || replyId === 'CMD_OCR') {
    session.currentState = 'IDLE';
    updateSession(session);
    return [handleOcrStart(to)];
  }

  if (replyId === 'OCR_REVIEW_3') {
    return [handleOcrReview(to)];
  }

  if (replyId.startsWith('OCR_')) {
    return [handleOcrResolution(to, user, replyId)];
  }

  // --- Handle Meta WhatsApp Flow Submissions (nfm_reply) ---
  if (message.kind === 'flow_reply') {
    const res = message.flowResponse || {};

    // 1. Referral Closure & Provenance Flow
    if (res.kind === 'close_referral' || res.provenance) {
      const provenance = res.provenance || 'AT_REFERRED_FACILITY';
      const outcome = res.outcome || 'RESOLVED';
      const advice = res.advice || '';
      const patientId = session.patientId || 'w2';

      // Find the most relevant open step for this patient
      let step = session.stepId
        ? db.prepare('SELECT * FROM steps WHERE id = ?').get(session.stepId)
        : db.prepare(`SELECT * FROM steps WHERE patient_id = ? AND status = 'OPEN' ORDER BY created_at DESC LIMIT 1`).get(patientId);

      const now = new Date().toISOString();
      const stepId = step?.id || `step-${uuidv4().slice(0, 8)}`;

      if (step) {
        db.prepare(`
          UPDATE steps
          SET status = 'CLOSED', closed_at = ?, closed_by = ?, closed_source = ?, updated_at = ?
          WHERE id = ?
        `).run(now, user.name, provenance, now, step.id);
        try {
          enqueueStepEvent({ ...step, status: 'CLOSED', closed_at: now, closed_source: provenance }, patientId);
        } catch (e) {}
      }

      db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp)
        VALUES (?, ?, ?, 'STEP_CLOSED_FLOW', ?, ?)
      `).run(
        `aud-${uuidv4().slice(0, 8)}`,
        user.id,
        user.name,
        `Closed step ${stepId} via WhatsApp Flow (Provenance: ${provenance}, Outcome: ${outcome})`,
        now
      );

      const patient = db.prepare('SELECT name FROM patients WHERE id = ?').get(patientId) as any;
      const provLabels: Record<string, string> = {
        AT_REFERRED_FACILITY: 'Referred Public Facility',
        OTHER_PUBLIC_FACILITY: 'Other Govt Hospital',
        PRIVATE_FACILITY: 'Private Hospital / Clinic',
        NOT_ATTENDED: 'Not Attended / Refused'
      };

      return [
        {
          kind: 'buttons',
          to,
          header: 'Referral Closed',
          body:
            `✅ *${patient?.name || 'Patient'}*\n` +
            `• Seen: ${provLabels[provenance] || provenance}` +
            (outcome ? `\n• Outcome: ${outcome.replace(/_/g, ' ')}` : '') +
            (advice ? `\n• Notes: ${advice}` : ''),
          buttons: [
            { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
            { id: 'CMD_WORKLIST', title: 'Worklist' },
            { id: 'CMD_MENU', title: 'Main Menu' },
          ],
        },
      ];
    }

    // 2. ANC Clinical Checklist & Vitals Flow
    if (res.kind === 'anc_checklist' || res.visit_number) {
      const visit = (res.visit_number || 'ANC_1').replace(/_/g, ' ');
      // Parse BP from single blood_pressure string "120/80" or separate sbp/dbp
      let sbp = 120;
      let dbp = 80;
      if (res.blood_pressure) {
        const parts = String(res.blood_pressure).split(/[\/\s\-]+/);
        sbp = parseInt(parts[0] || '120', 10);
        dbp = parseInt(parts[1] || '80', 10);
      } else {
        sbp = parseInt(res.systolic_bp || '120', 10);
        dbp = parseInt(res.diastolic_bp || '80', 10);
      }
      const wt = parseFloat(res.weight_kg || '50');
      const hb = parseFloat(res.hb_level || '11');
      const dangerSigns = Array.isArray(res.danger_signs) ? res.danger_signs.join(', ') : (res.danger_signs || 'None');
      const patientId = session.patientId || 'w2';

      const isHighRisk = sbp >= 140 || dbp >= 90 || hb < 8.0 || (dangerSigns !== 'None' && dangerSigns.length > 0);
      const now = new Date().toISOString();

      if (isHighRisk) {
        db.prepare(`UPDATE patients SET status = 'HRP' WHERE id = ?`).run(patientId);
      }

      db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp)
        VALUES (?, ?, ?, 'ANC_VISIT_RECORDED_FLOW', ?, ?)
      `).run(
        `aud-${uuidv4().slice(0, 8)}`,
        user.id,
        user.name,
        `Recorded ${visit} for patient ${patientId} (BP: ${sbp}/${dbp}, Hb: ${hb}, Weight: ${wt}kg, Danger: ${dangerSigns})`,
        now
      );

      const patient = db.prepare('SELECT name FROM patients WHERE id = ?').get(patientId) as any;

      return [
        {
          kind: 'buttons',
          to,
          header: `${visit} Saved`,
          body:
            `✅ *${patient?.name || 'Patient'}*\n` +
            `• BP: ${sbp}/${dbp} mmHg · Hb: ${hb} g/dL\n` +
            `• Status: ${isHighRisk ? '🔴 High Risk' : '🟢 Normal'}`,
          buttons: [
            { id: `ACTION_ADD_STEP_${patientId}`, title: '➕ Prescribe Step' },
            { id: 'CMD_WORKLIST', title: 'Worklist' },
            { id: 'CMD_MENU', title: 'Main Menu' },
          ],
        },
      ];
    }

    // 3. Prescribe Next Step Flow (Operational - Zero PII)
    if (res.kind === 'prescribe_step' || res.category) {
      const category = res.category;
      const level = res.target_facility || res.target_level || 'CHC';
      const days = parseInt(res.timeframe_days || '3', 10);
      const dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const patientId = session.patientId || 'w2';

      const stepRecord = {
        id: `step-${uuidv4().slice(0, 8)}`,
        patient_id: patientId,
        cat: category,
        level,
        due: dueDate,
        sent_at: new Date().toISOString().slice(0, 10),
        status: 'OPEN',
        owner_role: user.role,
        created_by: user.name,
      };

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
        new Date().toISOString(),
        new Date().toISOString()
      );

      enqueueStepEvent(stepRecord, patientId);
      const patient = db.prepare('SELECT name FROM patients WHERE id = ?').get(patientId) as any;

      return [
        {
          kind: 'buttons',
          to,
          header: 'Prescribed',
          body:
            `✅ *${patient?.name || 'Patient'}*\n` +
            `• Referral: ${category.replace(/_/g, ' ')}\n` +
            `• Facility: ${level} · Due: ${dueDate}`,
          buttons: [
            { id: 'CMD_WORKLIST', title: 'Worklist' },
            { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
            { id: 'CMD_MENU', title: 'Main Menu' },
          ],
        },
      ];
    }

    // 4. Patient Registration Flow
    const name = res.full_name || res.name || 'Patient';
    const rawPhone = (res.phone_number || res.phone || '0000000000').replace(/\D/g, '');
    const phone = rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`;
    const villageId = res.village_id || res.village || 'VIL-RAM';
    const service = 'ANC';
    const status = res.risk_tier === 'HIGH_RISK' || res.risk_status === 'HRP' ? 'HRP' : 'NORMAL';
    const age = parseInt(res.age || '25', 10);
    const weeks = parseInt(res.gestational_weeks || '16', 10);
    const consentWhatsapp = 1;

    const village = db.prepare('SELECT * FROM villages WHERE id = ?').get(villageId) as any;
    const patientId = `p-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const patientRecord = {
      id: patientId,
      name,
      name_hi: null,
      phone,
      service,
      village_id: villageId,
      village_name: village?.name || 'Rampur',
      subcentre_id: village?.subcentre_id || user.facility_id || 'FAC-SC-GHU',
      asha_name: village?.asha_name || 'ASHA Samta',
      status,
      age,
      consent_whatsapp: consentWhatsapp,
      created_at: now,
    };

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

    try {
      enqueuePatientEvent(patientRecord);
    } catch (err: any) {}

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp)
      VALUES (?, ?, ?, 'PATIENT_REGISTERED_FLOW', ?, ?)
    `).run(
      `aud-${uuidv4().slice(0, 8)}`,
      user.id,
      user.name,
      `Registered ${patientRecord.name} via WhatsApp Flow (${patientRecord.service}, ${patientRecord.status})`,
      now
    );

    session.patientId = patientId;
    session.currentState = 'VIEWING_PATIENT';
    updateSession(session);

    return [
      {
        kind: 'buttons',
        to,
        header: 'Registered',
        body:
          `✅ *${patientRecord.name}* (${patientRecord.age}y, ${patientRecord.village_name})\n` +
          `• Status: ${patientRecord.status === 'HRP' ? '🔴 High Risk' : '🟢 Normal'}\n` +
          `• Gestation: ${weeks} Weeks`,
        buttons: [
          { id: `ACTION_ADD_STEP_${patientId}`, title: '➕ Prescribe Step' },
          { id: `SEL_PATIENT_${patientId}`, title: '👤 View Patient' },
          { id: 'CMD_WORKLIST', title: 'Worklist' },
        ],
      },
    ];
  }

  // --- Handle Global Command Buttons & Greetings (Always take priority over conversational state) ---
  if (replyId === 'CMD_MENU' || GREETINGS.has(lower)) {
    resetSession(session);
    return [handleMenu(to, user, lang)];
  }

  if (replyId === 'CMD_WORKLIST') {
    session.currentState = 'VIEWING_WORKLIST';
    session.stagedRegistration = undefined;
    updateSession(session);
    return [handleWorklist(to, user, lang)];
  }

  if (replyId === 'CMD_FIND_PATIENT') {
    session.currentState = 'AWAITING_SEARCH';
    session.stagedRegistration = undefined;
    updateSession(session);
    return [handleFindPrompt(to, lang)];
  }

  if (replyId === 'CMD_ARRIVALS') {
    session.currentState = 'VIEWING_ARRIVALS';
    session.stagedRegistration = undefined;
    updateSession(session);
    return [handleExpectedArrivals(to, user, lang)];
  }

  if (replyId === 'CMD_ALERTS') {
    session.currentState = 'IDLE';
    session.stagedRegistration = undefined;
    updateSession(session);
    return [handleAlerts(to, user, lang)];
  }

  if (replyId === 'CMD_ADD_STEP') {
    if (session.patientId) {
      return [promptNextStepCategories(to, session.patientId)];
    }
    session.currentState = 'AWAITING_SEARCH';
    updateSession(session);
    return [
      {
        kind: 'text',
        to,
        body: `🔍 *Add Next Step*\n\nPlease reply with the patient's name to add a next step.`,
      },
    ];
  }

  // --- Dedicated WhatsApp Flow Showcase Menu & Triggers ---
  if (lower === 'flows' || lower === 'flow' || lower === 'forms' || replyId === 'CMD_SHOW_FLOWS') {
    return [
      {
        kind: 'list',
        to,
        header: 'Next Steps Forms',
        body: 'Select a form to open directly:',
        buttonText: 'Select Form',
        sections: [
          {
            title: 'WhatsApp Forms',
            rows: [
              {
                id: 'LAUNCH_FLOW_REG',
                title: '1. Register Mother',
                description: 'Maternal intake & risk assessment',
              },
              {
                id: 'LAUNCH_FLOW_ANC',
                title: '2. ANC Vitals',
                description: 'Record BP, weight, Hb & signs',
              },
              {
                id: 'LAUNCH_FLOW_REF',
                title: '3. Prescribe Referral',
                description: 'Ultrasound & specialist care',
              },
              {
                id: 'LAUNCH_FLOW_CLOSE',
                title: '4. Close Referral',
                description: 'Record outcome & provenance',
              },
            ],
          },
        ],
      },
    ];
  }

  // Launch ANC Checklist Flow
  if (lower === 'anc' || lower === 'vitals' || replyId === 'LAUNCH_FLOW_ANC') {
    if (config.whatsapp.flowIdAnc) {
      return [
        {
          kind: 'flow',
          to,
          header: 'ANC Vitals',
          body: 'Tap below to record maternal vitals:',
          footer: 'Next Steps Care Coordination',
          flowId: config.whatsapp.flowIdAnc,
          flowCta: 'Open Form',
          screen: 'ANC_CHECKLIST',
          flowMode: 'published',
        },
      ];
    }
  }

  // Launch Prescribe Referral Flow
  if (lower === 'refer' || lower === 'prescribe' || replyId === 'LAUNCH_FLOW_REF') {
    if (config.whatsapp.flowIdReferral) {
      return [
        {
          kind: 'flow',
          to,
          header: 'Prescribe Referral',
          body: 'Tap below to prescribe care step:',
          footer: 'Next Steps Care Coordination',
          flowId: config.whatsapp.flowIdReferral,
          flowCta: 'Open Form',
          screen: 'REFERRAL',
          flowMode: 'published',
        },
      ];
    }
  }

  // Launch Close Referral Loop Flow
  if (lower === 'close' || lower === 'closure' || replyId === 'LAUNCH_FLOW_CLOSE') {
    if (config.whatsapp.flowIdClosure) {
      return [
        {
          kind: 'flow',
          to,
          header: 'Close Referral',
          body: 'Tap below to record visit outcome:',
          footer: 'Next Steps Care Coordination',
          flowId: config.whatsapp.flowIdClosure,
          flowCta: 'Open Form',
          screen: 'CLOSURE',
          flowMode: 'published',
        },
      ];
    }
  }

  // --- Registration Flow (PRD Section 2 & 3) ---
  if (
    lower === 'register' ||
    lower === 'reg' ||
    lower === 'new patient' ||
    lower === 'add patient' ||
    replyId === 'CMD_REGISTER_START' ||
    replyId === 'LAUNCH_FLOW_REG'
  ) {
    if (config.whatsapp.flowIdRegistration) {
      return [
        {
          kind: 'flow',
          to,
          header: 'Register Mother',
          body: 'Tap below to register a pregnant mother:',
          footer: 'Next Steps Care Coordination',
          flowId: config.whatsapp.flowIdRegistration,
          flowCta: 'Open Form',
          screen: 'DEMOGRAPHICS',
          flowMode: 'published',
        },
      ];
    }

    session.currentState = 'AWAITING_REG_NAME';
    session.stagedRegistration = {};
    updateSession(session);
    return [startRegistration(to, user)];
  }

  if (replyId.startsWith('REG_CONFIRM_NAME_') || replyId.startsWith('REG_CONTINUE_NAME_')) {
    const rawName = replyId.replace('REG_CONFIRM_NAME_', '').replace('REG_CONTINUE_NAME_', '');
    const decodedName = decodeURIComponent(rawName);
    session.stagedRegistration = { name: decodedName };
    session.currentState = 'AWAITING_REG_PHONE';
    updateSession(session);
    return [
      {
        kind: 'text',
        to,
        body:
          `👤 Patient Name: *${decodedName}*\n\n` +
          `Please reply with the patient's *10-digit mobile number*:\n\n` +
          `_Example: "9812345678" (or reply "0" if patient has no phone)_`,
      },
    ];
  }

  if (session.currentState.startsWith('AWAITING_REG_')) {
    // If user clicked any non-registration button or typed menu/cancel, escape the state
    if ((replyId && !replyId.startsWith('REG_')) || lower === 'cancel' || lower === 'menu') {
      session.currentState = 'IDLE';
      session.stagedRegistration = undefined;
      updateSession(session);
      return [handleMenu(to, user)];
    }
    const response = handleRegistrationStep(to, user, session, { text: rawText, replyId });
    updateSession(session);
    return [response];
  }

  // --- Handle Plain Text Messages ---
  if (message.kind === 'text') {
    if (GREETINGS.has(lower)) {
      resetSession(session);
      return [handleMenu(to, user, lang)];
    }

    if (WORKLIST_KEYWORDS.has(lower)) {
      session.currentState = 'VIEWING_WORKLIST';
      updateSession(session);
      return [handleWorklist(to, user, lang)];
    }

    if (ARRIVAL_KEYWORDS.has(lower)) {
      session.currentState = 'VIEWING_ARRIVALS';
      updateSession(session);
      return [handleExpectedArrivals(to, user, lang)];
    }

    if (ALERT_KEYWORDS.has(lower)) {
      session.currentState = 'IDLE';
      updateSession(session);
      return [handleAlerts(to, user, lang)];
    }

    if (ADD_KEYWORDS.has(lower)) {
      if (session.patientId) {
        return [promptNextStepCategories(to, session.patientId)];
      }
      session.currentState = 'AWAITING_SEARCH';
      updateSession(session);
      return [handleFindPrompt(to, lang)];
    }

    if (lower.startsWith('find ')) {
      const query = rawText.slice(5).trim();
      session.currentState = 'VIEWING_SEARCH';
      updateSession(session);
      return [handlePatientSearchResults(to, user, query, lang)];
    }

    // Direct Patient Search: if user types a patient name, phone, or ID
    const matchingPatients = searchPatients(rawText);
    if (matchingPatients.length > 0) {
      session.currentState = 'VIEWING_SEARCH';
      updateSession(session);
      return [handlePatientSearchResults(to, user, rawText, lang)];
    }

    // Default fallback: show helpful smart menu
    return [
      {
        kind: 'buttons',
        to,
        header: 'Next Steps Assistant',
        body: `I didn't find any patients or commands matching "${rawText}".\n\nWhat would you like to do?`,
        buttons: [
          { id: 'CMD_WORKLIST', title: 'Worklist' },
          { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
          { id: 'CMD_MENU', title: 'Main Menu' },
        ],
      },
    ];
  }

  // --- Handle Interactive Button / List Selections ---
  // Patient Selection: SEL_PATIENT_<id> or SEL_PATIENT_<patientId>_<stepId>
  if (replyId.startsWith('SEL_PATIENT_')) {
    const raw = replyId.replace('SEL_PATIENT_', '');
    const patientId = raw.split('_')[0];
    session.patientId = patientId;
    session.currentState = 'VIEWING_PATIENT';
    updateSession(session);

    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) {
      return [{ kind: 'text', to, body: '❌ Patient record not found.' }];
    }
    return [renderPatientDetail(to, user, patient, lang)];
  }

  // Action: Add Step: ACTION_ADD_STEP_<patientId>
  if (replyId.startsWith('ACTION_ADD_STEP_')) {
    const patientId = replyId.replace('ACTION_ADD_STEP_', '');
    session.patientId = patientId;
    session.stagedSteps = [];
    session.stagedAction = undefined;
    session.currentState = 'STAGING_STEP';
    updateSession(session);
    return [promptNextStepCategories(to, patientId, 0, lang)];
  }

  // Action: Add More Steps (keep existing cart): ACTION_ADD_MORE_STEP_<patientId>
  if (replyId.startsWith('ACTION_ADD_MORE_STEP_')) {
    const patientId = replyId.replace('ACTION_ADD_MORE_STEP_', '');
    session.patientId = patientId;
    session.currentState = 'STAGING_STEP';
    updateSession(session);
    return [promptNextStepCategories(to, patientId, session.stagedSteps?.length || 0, lang)];
  }

  // Action: Change Facility for Referral: CHANGE_TARGET_<patientId>
  if (replyId.startsWith('CHANGE_TARGET_')) {
    const patientId = replyId.replace('CHANGE_TARGET_', '');
    return [promptFacilitySelection(to, patientId, lang)];
  }

  // Facility Selected for Referral: REF_FAC_<patientId>_<level>
  if (replyId.startsWith('REF_FAC_')) {
    const parts = replyId.replace('REF_FAC_', '').split('_');
    const patientId = parts[0];
    const level = parts[1] || 'CHC';
    const cat = `REFERRAL_${level}`;

    const { message: confirmMsg, stagedAction, stagedSteps } = handleCategorySelected(
      to,
      user,
      patientId,
      cat,
      session.stagedSteps || [],
      lang
    );
    session.stagedAction = stagedAction;
    session.stagedSteps = stagedSteps;
    session.currentState = 'CONFIRMING_STEP';
    updateSession(session);
    return [confirmMsg];
  }

  // Stage Category: STAGE_CAT_<patientId>_<category>
  if (replyId.startsWith('STAGE_CAT_')) {
    const parts = replyId.replace('STAGE_CAT_', '').split('_');
    const patientId = parts[0];
    const category = parts.slice(1).join('_');

    const { message: confirmMsg, stagedAction, stagedSteps } = handleCategorySelected(
      to,
      user,
      patientId,
      category,
      session.stagedSteps || [],
      lang
    );
    session.stagedAction = stagedAction;
    session.stagedSteps = stagedSteps;
    session.currentState = 'CONFIRMING_STEP';
    updateSession(session);
    return [confirmMsg];
  }

  // Confirm Step: CONFIRM_STEP_<patientId>
  if (replyId.startsWith('CONFIRM_STEP_')) {
    if (!session.stagedAction && (!session.stagedSteps || session.stagedSteps.length === 0)) {
      return [
        {
          kind: 'text',
          to,
          body: lang === 'en' ? '⚠️ Session expired or no step staged. Please find the patient again.' : '⚠️ सत्र समाप्त या कोई स्टेप नहीं चुना गया। कृपया मरीज़ को फिर से खोजें।',
        },
      ];
    }
    const resultMsg = handleConfirmStep(to, user, session.stagedAction, session.stagedSteps, lang);
    session.stagedAction = undefined;
    session.stagedSteps = undefined;
    session.currentState = 'IDLE';
    updateSession(session);
    return [resultMsg];
  }

  // Action: Choose which step to close (when multiple open): ACTION_CHOOSE_CLOSE_<patientId>
  if (replyId.startsWith('ACTION_CHOOSE_CLOSE_')) {
    const patientId = replyId.replace('ACTION_CHOOSE_CLOSE_', '');
    session.patientId = patientId;
    return [promptChooseStepToClose(to, patientId, lang)];
  }

  // Action: Close Step: ACTION_CLOSE_STEP_<stepId>
  if (replyId.startsWith('ACTION_CLOSE_STEP_')) {
    const stepId = replyId.replace('ACTION_CLOSE_STEP_', '');
    session.stepId = stepId;
    session.currentState = 'CLOSING_STEP';
    updateSession(session);
    return [promptClosureProvenance(to, stepId, lang)];
  }

  // Provenance selected: PROV_<stepId>_<provenance>
  if (replyId.startsWith('PROV_')) {
    const match = replyId.match(/^PROV_(step-[a-zA-Z0-9]+)_([A-Z_]+)$/);
    if (match) {
      const stepId = match[1];
      const provenance = match[2];
      return [handleCloseWithProvenance(to, user, stepId, provenance, lang)];
    }
  }

  // Inbound Arrival Pick: ARRIVE_PICK_<stepId>
  if (replyId.startsWith('ARRIVE_PICK_')) {
    const stepId = replyId.replace('ARRIVE_PICK_', '');
    return [promptArrivalAction(to, user, stepId, lang)];
  }

  // Mark Arrived on-site: DO_ARRIVE_ONSITE_<stepId>
  if (replyId.startsWith('DO_ARRIVE_ONSITE_')) {
    const stepId = replyId.replace('DO_ARRIVE_ONSITE_', '');
    return [handleMarkArrived(to, user, stepId, lang)];
  }

  // Care Delivered: DO_CARE_DELIVERED_<stepId>
  if (replyId.startsWith('DO_CARE_DELIVERED_')) {
    const stepId = replyId.replace('DO_CARE_DELIVERED_', '');
    return [handleCareDelivered(to, user, stepId, lang)];
  }

  return [handleMenu(to, user, lang)];
}
