import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';

export function handleWorklist(to: string, user: WhatsAppUser, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  const todayIso = new Date().toISOString().slice(0, 10);
  const isEn = lang === 'en';

  let query = `
    SELECT s.*, p.name as patient_name, p.village_name, p.status as patient_risk
    FROM steps s
    JOIN patients p ON s.patient_id = p.id
    WHERE s.status = 'OPEN'
  `;
  const params: any[] = [];

  if (user.role === 'anm') {
    query += ` AND (s.owner_role = 'anm' OR p.subcentre_id = ?)`;
    params.push(user.facility_id || 'FAC-SC-GHU');
  } else if (user.role === 'phc_sn' || user.role === 'phc_mo') {
    query += ` AND (s.level = 'PHC' OR p.subcentre_id IN (SELECT id FROM facilities WHERE block = 'Sirmour'))`;
  } else if (user.role === 'chc_sn' || user.role === 'chc_mo') {
    query += ` AND (s.level = 'CHC' OR s.owner_role LIKE 'chc%')`;
  }

  query += ` ORDER BY CASE WHEN s.due < ? THEN 0 WHEN s.due = ? THEN 1 ELSE 2 END, s.due ASC LIMIT 10`;
  params.push(todayIso, todayIso);

  const steps = db.prepare(query).all(...params) as any[];

  if (steps.length === 0) {
    return {
      kind: 'buttons',
      to,
      header: 'Worklist',
      body: isEn
        ? `🎉 *All caught up!* No pending care steps for ${user.facility_name || 'your health center'}.\n\nWhat would you like to do?`
        : `🎉 *सब काम पूरा है!* ${user.facility_name || 'आपके सेंटर'} के लिए कोई पेंडिंग स्टेप्स नहीं हैं।\n\nआप आगे क्या करना चाहते हैं?`,
      buttons: [
        { id: 'CMD_FIND_PATIENT', title: isEn ? 'Find Patient' : 'मरीज़ खोजें' },
        { id: 'CMD_ADD_STEP', title: isEn ? '➕ Add Step' : '➕ नया स्टेप' },
        { id: 'CMD_MENU', title: isEn ? 'Main Menu' : 'मुख्य मेनू' },
      ],
    };
  }

  const overdue = steps.filter((s) => s.due && s.due < todayIso);
  const dueToday = steps.filter((s) => s.due && s.due === todayIso);
  const upcoming = steps.filter((s) => !s.due || s.due > todayIso);

  let body = isEn
    ? `📋 *${user.facility_name || 'Worklist'} (${steps.length} pending)*\n\n`
    : `📋 *${user.facility_name || 'Worklist'} (${steps.length} पेंडिंग)*\n\n`;

  if (overdue.length > 0) {
    body += isEn ? `🔴 *OVERDUE (${overdue.length}):*\n` : `🔴 *समय बीता (OVERDUE - ${overdue.length}):*\n`;
    overdue.forEach((s) => {
      body += `• *${s.patient_name}* — ${s.cat} (${s.due})\n`;
    });
    body += `\n`;
  }

  if (dueToday.length > 0) {
    body += isEn ? `🟡 *DUE TODAY (${dueToday.length}):*\n` : `🟡 *आज देय (DUE TODAY - ${dueToday.length}):*\n`;
    dueToday.forEach((s) => {
      body += `• *${s.patient_name}* — ${s.cat}\n`;
    });
    body += `\n`;
  }

  if (upcoming.length > 0) {
    body += isEn ? `🟢 *UPCOMING (${upcoming.length}):*\n` : `🟢 *आने वाले (UPCOMING - ${upcoming.length}):*\n`;
    upcoming.slice(0, 3).forEach((s) => {
      body += `• *${s.patient_name}* — ${s.cat} (${s.due || (isEn ? 'Scheduled' : 'निर्धारित')})\n`;
    });
  }

  // Offer interactive list to pick any patient from the worklist
  return {
    kind: 'list',
    to,
    header: 'Worklist',
    body: body.trim(),
    buttonText: isEn ? 'Select Patient' : 'मरीज़ चुनें',
    sections: [
      {
        title: isEn ? 'Worklist Patients' : 'वर्कलिस्ट के मरीज़',
        rows: steps.slice(0, 10).map((s) => ({
          id: `SEL_PATIENT_${s.patient_id}_${s.id}`,
          title: `${s.patient_name} — ${s.cat}`.slice(0, 24),
          description: isEn
            ? `Due: ${s.due || 'Scheduled'} · ${s.village_name}`.slice(0, 72)
            : `तारीख: ${s.due || 'निर्धारित'} · ${s.village_name}`.slice(0, 72),
        })),
      },
    ],
  };
}
