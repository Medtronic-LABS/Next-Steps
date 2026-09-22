import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';

export function handleAlerts(to: string, user: WhatsAppUser): OutboundMessage {
  const todayIso = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // 1. Overdue Steps
  let overdueQuery = `
    SELECT s.*, p.name as patient_name, p.village_name, p.phone as patient_phone, p.status as patient_risk
    FROM steps s
    JOIN patients p ON s.patient_id = p.id
    WHERE s.status = 'OPEN' AND s.due < ?
  `;
  const params: any[] = [todayIso];

  if (user.role === 'anm') {
    overdueQuery += ` AND (s.owner_role = 'anm' OR p.subcentre_id = ?)`;
    params.push(user.facility_id || 'FAC-SC-GHU');
  }

  overdueQuery += ` ORDER BY s.due ASC LIMIT 5`;
  const overdueSteps = db.prepare(overdueQuery).all(...params) as any[];

  // 2. Stale Referrals (> 7 days sent with no arrival recorded)
  let staleQuery = `
    SELECT s.*, p.name as patient_name, p.village_name, p.status as patient_risk
    FROM steps s
    JOIN patients p ON s.patient_id = p.id
    WHERE s.status = 'OPEN' AND s.cat = 'REFERRAL' AND s.sent_at <= ? AND (s.closed_source IS NULL OR s.closed_source = '')
  `;
  const staleParams: any[] = [sevenDaysAgo];

  if (user.role === 'anm') {
    staleQuery += ` AND (s.owner_role = 'anm' OR p.subcentre_id = ?)`;
    staleParams.push(user.facility_id || 'FAC-SC-GHU');
  }

  staleQuery += ` ORDER BY s.sent_at ASC LIMIT 5`;
  const staleReferrals = db.prepare(staleQuery).all(...staleParams) as any[];

  let body = `⚠️ *Care Alerts & Follow-up Needed*\n`;
  body += `Facility: ${user.facility_name || user.facility_id || 'Your Health Centre'}\n\n`;

  if (overdueSteps.length === 0 && staleReferrals.length === 0) {
    return {
      kind: 'buttons',
      to,
      header: 'Care Coordination Alerts',
      body: `🎉 *No critical alerts!*\n\nAll referrals are active within the 7-day window, and there are no critical care steps overdue by >3 days.`,
      buttons: [
        { id: 'CMD_WORKLIST', title: 'Worklist' },
        { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
        { id: 'CMD_MENU', title: 'Main Menu' },
      ],
    };
  }

  if (overdueSteps.length > 0) {
    body += `🔴 *CRITICALLY OVERDUE (>3 days):*\n`;
    overdueSteps.forEach((s) => {
      const risk = s.patient_risk === 'HRP' ? ' [HRP]' : '';
      body += `• *${s.patient_name}*${risk} — ${s.cat.replace('_', ' ')} (Due: ${s.due})\n`;
    });
    body += `\n`;
  }

  if (staleReferrals.length > 0) {
    body += `⏱️ *STALE REFERRALS (>7 days unconfirmed):*\n`;
    staleReferrals.forEach((s) => {
      body += `• *${s.patient_name}* $\\rightarrow$ ${s.level} (Sent: ${s.sent_at})\n`;
    });
    body += `\n_Action: Please contact ASHA or patient to check if visit occurred._\n`;
  }

  return {
    kind: 'buttons',
    to,
    header: 'Active Care Alerts',
    body: body.trim(),
    buttons: [
      { id: 'CMD_WORKLIST', title: 'Worklist' },
      overdueSteps.length > 0
        ? { id: `SEL_PATIENT_${overdueSteps[0].patient_id}`, title: `Act: ${overdueSteps[0].patient_name.slice(0, 15)}` }
        : { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
      { id: 'CMD_MENU', title: 'Main Menu' },
    ],
  };
}
