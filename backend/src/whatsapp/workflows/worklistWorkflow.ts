import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';

export function handleWorklist(to: string, user: WhatsAppUser): OutboundMessage {
  const todayIso = new Date().toISOString().slice(0, 10);

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
      body: `🎉 *All clear!* No pending care steps for ${user.facility_name || 'your centre'}.\n\nWhat would you like to do next?`,
      buttons: [
        { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
        { id: 'CMD_ADD_STEP', title: 'Add Next Step' },
        { id: 'CMD_MENU', title: 'Main Menu' },
      ],
    };
  }

  const overdue = steps.filter((s) => s.due && s.due < todayIso);
  const dueToday = steps.filter((s) => s.due && s.due === todayIso);
  const upcoming = steps.filter((s) => !s.due || s.due > todayIso);

  let body = `📋 *${user.facility_name || 'Worklist'} (${steps.length} open)*\n\n`;

  if (overdue.length > 0) {
    body += `🔴 *OVERDUE (${overdue.length}):*\n`;
    overdue.forEach((s) => {
      body += `• *${s.patient_name}* — ${s.cat} (${s.due})\n`;
    });
    body += `\n`;
  }

  if (dueToday.length > 0) {
    body += `🟡 *DUE TODAY (${dueToday.length}):*\n`;
    dueToday.forEach((s) => {
      body += `• *${s.patient_name}* — ${s.cat}\n`;
    });
    body += `\n`;
  }

  if (upcoming.length > 0) {
    body += `🟢 *UPCOMING (${upcoming.length}):*\n`;
    upcoming.slice(0, 3).forEach((s) => {
      body += `• *${s.patient_name}* — ${s.cat} (${s.due || 'Scheduled'})\n`;
    });
  }

  // Offer interactive list to pick any patient from the worklist
  return {
    kind: 'list',
    to,
    header: 'Worklist',
    body: body.trim(),
    buttonText: 'Select Patient to Act',
    sections: [
      {
        title: 'Worklist Patients',
        rows: steps.slice(0, 10).map((s) => ({
          id: `SEL_PATIENT_${s.patient_id}_${s.id}`,
          title: `${s.patient_name} — ${s.cat}`.slice(0, 24),
          description: `Due: ${s.due || 'Scheduled'} · ${s.village_name}`.slice(0, 72),
        })),
      },
    ],
  };
}
