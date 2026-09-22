import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';
import { generatePatientDeepLink } from '../deepLink.js';

export function handleFindPrompt(to: string): OutboundMessage {
  return {
    kind: 'text',
    to,
    body: `🔍 *Find a Patient*\n\nPlease reply with the patient's name, phone number, or ID.\n\n_Example: "Sunita" or "9812345011"_`,
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

export function handlePatientSearchResults(to: string, user: WhatsAppUser, query: string): OutboundMessage {
  const results = searchPatients(query);

  if (results.length === 0) {
    return {
      kind: 'buttons',
      to,
      header: 'No Patients Found',
      body:
        `❌ No patients found matching "${query}".\n\n` +
        `Would you like to register this person as a new patient, or try searching again?`,
      buttons: [
        { id: 'CMD_REGISTER_START', title: '➕ Register Patient' },
        { id: 'CMD_FIND_PATIENT', title: 'Search Again' },
        { id: 'CMD_WORKLIST', title: 'View Worklist' },
      ],
    };
  }

  if (results.length === 1) {
    return renderPatientDetail(to, user, results[0]);
  }

  // Multiple matches: show interactive list with "None of these — create new patient" option
  return {
    kind: 'list',
    to,
    header: 'Possible Matches Found',
    body: `Found ${results.length} patients matching "${query}". Select one to view, or choose "Create New Patient" if none match:`,
    buttonText: 'Select Patient',
    sections: [
      {
        title: 'Possible Matches',
        rows: [
          ...results.map((p) => {
            const riskBadge =
              p.status === 'HRP'
                ? '🔴 High-Risk'
                : p.status === 'UNCONTROLLED'
                ? '🔴 Uncontrolled'
                : p.status === 'SCREEN_POSITIVE'
                ? '🔴 Screen Positive'
                : '🟢 Normal';
            const phoneMask = p.phone ? ' · ****' + p.phone.slice(-4) : '';
            return {
              id: `SEL_PATIENT_${p.id}`,
              title: `${p.name} · ${p.age || '—'}y · ${p.village_name}`.slice(0, 24),
              description: `${riskBadge}${phoneMask} · ${p.service}`.slice(0, 72),
            };
          }),
          {
            id: 'CMD_REGISTER_START',
            title: '➕ Create New Patient',
            description: 'None of these — register as new patient',
          },
        ],
      },
    ],
  };
}

export function renderPatientDetail(to: string, user: WhatsAppUser, patient: any): OutboundMessage {
  const todayIso = new Date().toISOString().slice(0, 10);
  const allSteps = db.prepare(`
    SELECT * FROM steps
    WHERE patient_id = ?
    ORDER BY CASE WHEN due IS NOT NULL THEN due ELSE sent_at END ASC, created_at ASC
  `).all(patient.id) as any[];

  const openSteps = allSteps.filter((s) => s.status === 'OPEN');
  const openChcReferral = openSteps.find((s) => s.cat === 'REFERRAL' && s.level === 'CHC');

  // Condition-neutral risk badge (PRD Section 4 & 17)
  let riskBadge = '🟢 Normal';
  if (patient.service === 'NCD') {
    riskBadge = patient.status === 'UNCONTROLLED' ? '🔴 Uncontrolled BP/Sugar' : '🟢 Controlled';
  } else if (patient.service === 'CANCER') {
    riskBadge = patient.status === 'SCREEN_POSITIVE' ? '🔴 Screen Positive' : '🟢 Screen Negative';
  } else if (patient.service === 'PNC') {
    riskBadge = patient.status === 'COMPLICATION' ? '🔴 Complication' : '🟢 Mother & Baby Well';
  } else {
    riskBadge = patient.status === 'HRP' ? '🔴 High Risk' : '🟢 Normal';
  }

  const deepLink = generatePatientDeepLink(patient.id, user.id, user.role);

  // Compact patient journey matching PRD Section 4
  let body = `👤 *${patient.name}* · ${patient.age || '—'}y\n`;
  body += `${riskBadge} · ${patient.village_name}\n\n`;

  body += `🪜 *Care Journey (${allSteps.length} steps):*\n`;
  if (allSteps.length === 0) {
    body += `_No care steps recorded yet._\n`;
  } else {
    allSteps.forEach((s) => {
      const stepName = s.cat.replace(/_/g, ' ');
      const targetLevel = s.level ? ` → ${s.level}` : '';

      if (s.status === 'DONE') {
        const atFacility = s.closed_level ? ` at ${s.closed_level}` : '';
        body += `✅ *${stepName}${targetLevel}*\nCompleted ${s.closed_at || ''}${atFacility}\n\n`;
      } else if (s.status === 'CANCELLED') {
        body += `⚪ *${stepName}${targetLevel}*\nMissed / Declined\n\n`;
      } else if (s.due && s.due < todayIso) {
        body += `🔴 *${stepName}${targetLevel}*\n${s.due} (Overdue)\n\n`;
      } else if (s.due && s.due === todayIso) {
        body += `🟡 *${stepName}${targetLevel}*\nDue Today (${s.due})\n\n`;
      } else if (s.closed_source === 'AT_FACILITY') {
        body += `📍 *${stepName}${targetLevel}*\nArrived on-site at ${s.level}\n\n`;
      } else {
        body += `⚪ *${stepName}${targetLevel}*\nDue ${s.due || s.sent_at || 'Scheduled'}\n\n`;
      }
    });
  }

  body += `🔒 *Full Medical Chart (15-min access):*\n${deepLink}`;

  const buttons: any[] = [];

  // If user is CHC Staff Nurse/MO and there is an open CHC referral, prioritize 1-tap arrival/closure
  if ((user.role === 'chc_sn' || user.role === 'chc_mo') && openChcReferral) {
    buttons.push({ id: `DO_CARE_DELIVERED_${openChcReferral.id}`, title: '✅ Confirm Arrived' });
    buttons.push({ id: `ACTION_ADD_STEP_${patient.id}`, title: '➕ Add Next Step' });
    buttons.push({ id: 'CMD_ARRIVALS', title: 'Expected Arrivals' });
  } else {
    buttons.push({ id: `ACTION_ADD_STEP_${patient.id}`, title: '➕ Add Next Step' });
    if (openSteps.length === 1) {
      const stepName = openSteps[0].cat.replace(/_/g, ' ');
      buttons.push({ id: `ACTION_CLOSE_STEP_${openSteps[0].id}`, title: `✅ Close: ${stepName}`.slice(0, 20) });
    } else if (openSteps.length > 1) {
      buttons.push({ id: `ACTION_CHOOSE_CLOSE_${patient.id}`, title: `✅ Close Step (${openSteps.length})`.slice(0, 20) });
    } else {
      buttons.push({ id: 'CMD_WORKLIST', title: 'Worklist' });
    }
    buttons.push({ id: 'CMD_MENU', title: 'Main Menu' });
  }

  return {
    kind: 'buttons',
    to,
    header: `Patient: ${patient.name}`.slice(0, 24),
    body: body.trim(),
    footer: 'Select an action below:',
    buttons: buttons.slice(0, 3), // WhatsApp allows max 3 buttons
  };
}
