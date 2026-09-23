import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';
import { generatePatientDeepLink } from '../deepLink.js';

export function handleFindPrompt(to: string, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  return {
    kind: 'text',
    to,
    body:
      lang === 'en'
        ? `🔍 *Find Patient*\n\nPlease reply with the patient's name, mobile number, or ID.\n\n_Example: "Sunita" or "9812345011"_`
        : `🔍 *मरीज़ खोजें*\n\nकृपया मरीज़ का नाम, मोबाइल नंबर या ID लिखकर भेजें।\n\n_उदाहरण: "Sunita" या "9812345011"_`,
  };
}

export function searchPatients(query: string): any[] {
  const trimmed = query.trim();
  const stmt = db.prepare(`
    SELECT * FROM patients
    WHERE name LIKE ? OR name_hi LIKE ? OR phone LIKE ? OR id = ? OR abha_id LIKE ?
    LIMIT 5
  `);
  return stmt.all(`%${trimmed}%`, `%${trimmed}%`, `%${trimmed}%`, trimmed, `%${trimmed}%`) as any[];
}

export function handlePatientSearchResults(to: string, user: WhatsAppUser, query: string, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  const results = searchPatients(query);
  const isEn = lang === 'en';

  if (results.length === 0) {
    return {
      kind: 'buttons',
      to,
      header: isEn ? 'Patient Not Found' : 'मरीज़ नहीं मिला',
      body: isEn
        ? `❌ No patient found matching "${query}".\n\nWould you like to register a new patient or search again?`
        : `❌ "${query}" से मेल खाता कोई मरीज़ नहीं मिला।\n\nक्या आप नया मरीज़ पंजीकृत करना चाहते हैं या दोबारा खोजना चाहते हैं?`,
      buttons: [
        { id: 'CMD_REGISTER_START', title: isEn ? '➕ New Patient' : '➕ नया मरीज़' },
        { id: 'CMD_FIND_PATIENT', title: isEn ? 'Search Again' : 'दोबारा खोजें' },
        { id: 'CMD_WORKLIST', title: 'Worklist' },
      ],
    };
  }

  if (results.length === 1) {
    return renderPatientDetail(to, user, results[0], lang);
  }

  // Multiple matches: show interactive list with "None of these — create new patient" option
  return {
    kind: 'list',
    to,
    header: isEn ? 'Patient Results' : 'मरीज़ के परिणाम',
    body: isEn
      ? `Found ${results.length} patients matching "${query}". Select to view details, or register a new patient:`
      : `"${query}" से मेल खाते ${results.length} मरीज़ मिले। देखने के लिए चुनें, या नया मरीज़ जोड़ें:`,
    buttonText: isEn ? 'Select Patient' : 'मरीज़ चुनें',
    sections: [
      {
        title: isEn ? 'Matching Patients' : 'मिले हुए परिणाम',
        rows: [
          ...results.map((p) => {
            const riskBadge =
              p.status === 'HRP'
                ? (isEn ? '🔴 High-Risk' : '🔴 हाई-रिस्क')
                : p.status === 'UNCONTROLLED'
                ? (isEn ? '🔴 Uncontrolled' : '🔴 अनियंत्रित')
                : p.status === 'SCREEN_POSITIVE'
                ? (isEn ? '🔴 Screen +' : '🔴 पॉज़िटिव')
                : (isEn ? '🟢 Normal' : '🟢 सामान्य');
            const phoneMask = p.phone ? ' · ****' + p.phone.slice(-4) : '';
            return {
              id: `SEL_PATIENT_${p.id}`,
              title: `${p.name} · ${p.age || '—'}y · ${p.village_name}`.slice(0, 24),
              description: `${riskBadge}${phoneMask} · ${p.service}`.slice(0, 72),
            };
          }),
          {
            id: 'CMD_REGISTER_START',
            title: isEn ? '➕ Register New' : '➕ नया मरीज़ जोड़ें',
            description: isEn ? 'None of these — register a new patient' : 'इनमें से कोई नहीं — नया पंजीकरण करें',
          },
        ],
      },
    ],
  };
}

export function renderPatientDetail(to: string, user: WhatsAppUser, patient: any, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  const todayIso = new Date().toISOString().slice(0, 10);
  const isEn = lang === 'en';
  const allSteps = db.prepare(`
    SELECT * FROM steps
    WHERE patient_id = ?
    ORDER BY CASE WHEN due IS NOT NULL THEN due ELSE sent_at END ASC, created_at ASC
  `).all(patient.id) as any[];

  const openSteps = allSteps.filter((s) => s.status === 'OPEN');
  const openChcReferral = openSteps.find((s) => s.cat === 'REFERRAL' && s.level === 'CHC');

  // Condition-neutral risk badge (PRD Section 4 & 17)
  let riskBadge = isEn ? '🟢 Normal' : '🟢 सामान्य';
  if (patient.service === 'NCD') {
    riskBadge = patient.status === 'UNCONTROLLED' ? (isEn ? '🔴 Uncontrolled BP/Sugar' : '🔴 अनियंत्रित BP/शुगर') : (isEn ? '🟢 Controlled' : '🟢 नियंत्रित');
  } else if (patient.service === 'CANCER') {
    riskBadge = patient.status === 'SCREEN_POSITIVE' ? (isEn ? '🔴 Screening Positive' : '🔴 स्क्रीनिंग पॉज़िटिव') : (isEn ? '🟢 Normal' : '🟢 सामान्य');
  } else if (patient.service === 'PNC') {
    riskBadge = patient.status === 'COMPLICATION' ? (isEn ? '🔴 Complication' : '🔴 जटिलता') : (isEn ? '🟢 Mother & Baby Well' : '🟢 माँ व बच्चा स्वस्थ');
  } else {
    riskBadge = patient.status === 'HRP' ? (isEn ? '🔴 High-Risk (HRP)' : '🔴 हाई-रिस्क (HRP)') : (isEn ? '🟢 Normal' : '🟢 सामान्य');
  }

  const deepLink = generatePatientDeepLink(patient.id, user.id, user.role);

  // Compact patient journey matching PRD Section 4
  let body = `👤 *${patient.name}* · ${patient.age || '—'}y\n`;
  body += `${riskBadge} · ${patient.village_name}\n\n`;

  body += isEn ? `🪜 *Care Journey (${allSteps.length} steps):*\n` : `🪜 *केयर जर्नी (${allSteps.length} स्टेप्स):*\n`;
  if (allSteps.length === 0) {
    body += isEn ? `_No care steps recorded yet._\n` : `_अभी कोई केयर स्टेप दर्ज नहीं है।_\n`;
  } else {
    allSteps.forEach((s) => {
      const stepName = s.cat.replace(/_/g, ' ');
      const targetLevel = s.level ? ` → ${s.level}` : '';

      if (s.status === 'DONE') {
        const atFacility = s.closed_level ? ` (${s.closed_level})` : '';
        body += isEn
          ? `✅ *${stepName}${targetLevel}*\nCompleted ${s.closed_at || ''}${atFacility}\n\n`
          : `✅ *${stepName}${targetLevel}*\nपूर्ण हुआ ${s.closed_at || ''}${atFacility}\n\n`;
      } else if (s.status === 'CANCELLED') {
        body += isEn ? `⚪ *${stepName}${targetLevel}*\nNot done / Declined\n\n` : `⚪ *${stepName}${targetLevel}*\nनहीं हुआ / अस्वीकार\n\n`;
      } else if (s.due && s.due < todayIso) {
        body += isEn ? `🔴 *${stepName}${targetLevel}*\nDue: ${s.due} (Overdue)\n\n` : `🔴 *${stepName}${targetLevel}*\nतारीख: ${s.due} (समय बीता)\n\n`;
      } else if (s.due && s.due === todayIso) {
        body += isEn ? `🟡 *${stepName}${targetLevel}*\nDue Today (${s.due})\n\n` : `🟡 *${stepName}${targetLevel}*\nआज देय (${s.due})\n\n`;
      } else if (s.closed_source === 'AT_FACILITY') {
        body += isEn ? `📍 *${stepName}${targetLevel}*\nArrived at facility (${s.level})\n\n` : `📍 *${stepName}${targetLevel}*\nअस्पताल पहुँच गए (${s.level})\n\n`;
      } else {
        body += isEn ? `⚪ *${stepName}${targetLevel}*\nScheduled: ${s.due || s.sent_at || 'Planned'}\n\n` : `⚪ *${stepName}${targetLevel}*\nतारीख: ${s.due || s.sent_at || 'निर्धारित'}\n\n`;
      }
    });
  }

  body += isEn ? `🔒 *Medical Record (15m link):*\n${deepLink}` : `🔒 *मेडिकल रिकॉर्ड (15 मिनट लिंक):*\n${deepLink}`;

  const buttons: any[] = [];

  // If user is CHC Staff Nurse/MO and there is an open CHC referral, prioritize 1-tap arrival/closure
  if ((user.role === 'chc_sn' || user.role === 'chc_mo') && openChcReferral) {
    buttons.push({ id: `DO_CARE_DELIVERED_${openChcReferral.id}`, title: isEn ? 'Confirm Arrival' : 'उपस्थिति दर्ज' });
    buttons.push({ id: `ACTION_ADD_STEP_${patient.id}`, title: isEn ? '➕ Add Step' : '➕ नया स्टेप' });
    buttons.push({ id: 'CMD_ARRIVALS', title: 'Expected Arrivals' });
  } else {
    buttons.push({ id: `ACTION_ADD_STEP_${patient.id}`, title: isEn ? '➕ Add Step' : '➕ नया स्टेप' });
    if (openSteps.length === 1) {
      buttons.push({ id: `ACTION_CLOSE_STEP_${openSteps[0].id}`, title: isEn ? 'Close Step' : 'स्टेप पूरा करें' });
    } else if (openSteps.length > 1) {
      buttons.push({ id: `ACTION_CHOOSE_CLOSE_${patient.id}`, title: isEn ? 'Close Steps' : 'स्टेप बंद करें' });
    } else {
      buttons.push({ id: 'CMD_WORKLIST', title: 'Worklist' });
    }
    buttons.push({ id: 'CMD_MENU', title: isEn ? 'Main Menu' : 'मुख्य मेनू' });
  }

  return {
    kind: 'buttons',
    to,
    header: (isEn ? `Patient: ${patient.name}` : `मरीज़: ${patient.name}`).slice(0, 24),
    body: body.trim(),
    buttons: buttons.slice(0, 3), // WhatsApp allows max 3 buttons
  };
}
