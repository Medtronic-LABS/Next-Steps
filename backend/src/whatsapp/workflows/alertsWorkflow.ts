import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';

export function handleAlerts(to: string, user: WhatsAppUser, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  const todayIso = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const isEn = lang === 'en';

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

  let body = isEn
    ? `⚠️ *Care Alerts & Required Follow-ups*\nFacility: ${user.facility_name || user.facility_id || 'Health Centre'}\n\n`
    : `⚠️ *केयर अलर्ट्स एवं आवश्यक फ़ॉलो-अप*\nसेंटर: ${user.facility_name || user.facility_id || 'Health Centre'}\n\n`;

  if (overdueSteps.length === 0 && staleReferrals.length === 0) {
    return {
      kind: 'buttons',
      to,
      header: isEn ? 'Care Alerts' : 'केयर अलर्ट्स',
      body: isEn
        ? `🎉 *No critical alerts!*\n\nAll referrals are within expected timeframes, and no care obligations are overdue.`
        : `🎉 *कोई गंभीर अलर्ट नहीं है!*\n\nसभी रेफरल समय सीमा के भीतर हैं, और कोई भी गंभीर केयर स्टेप 3 दिन से अधिक ओवरड्यू नहीं है।`,
      buttons: [
        { id: 'CMD_WORKLIST', title: 'Worklist' },
        { id: 'CMD_FIND_PATIENT', title: isEn ? 'Find Patient' : 'मरीज़ खोजें' },
        { id: 'CMD_MENU', title: isEn ? 'Main Menu' : 'मुख्य मेनू' },
      ],
    };
  }

  if (overdueSteps.length > 0) {
    body += isEn ? `🔴 *CRITICALLY OVERDUE (${overdueSteps.length}):*\n` : `🔴 *समय बीता (CRITICALLY OVERDUE):*\n`;
    overdueSteps.forEach((s) => {
      const risk = s.patient_risk === 'HRP' ? ' [HRP]' : '';
      body += isEn
        ? `• *${s.patient_name}*${risk} — ${s.cat.replace(/_/g, ' ')} (Due: ${s.due})\n`
        : `• *${s.patient_name}*${risk} — ${s.cat.replace(/_/g, ' ')} (तारीख: ${s.due})\n`;
    });
    body += `\n`;
  }

  if (staleReferrals.length > 0) {
    body += isEn
      ? `⏱️ *Unconfirmed Referrals (>7 days without arrival):*\n`
      : `⏱️ *अपुष्ट रेफरल (>7 दिन से अराइवल नहीं):*\n`;
    staleReferrals.forEach((s) => {
      body += isEn
        ? `• *${s.patient_name}* → ${s.level} (Sent: ${s.sent_at})\n`
        : `• *${s.patient_name}* → ${s.level} (भेजा गया: ${s.sent_at})\n`;
    });
    body += isEn
      ? `\n_Tip: Please follow up with ASHA or patient to check if they arrived at facility._\n`
      : `\n_सुझाव: कृपया ASHA या मरीज़ से संपर्क करके पुष्टि करें कि क्या वे अस्पताल पहुँचे थे।_\n`;
  }

  return {
    kind: 'buttons',
    to,
    header: isEn ? 'Active Care Alerts' : 'सक्रिय केयर अलर्ट्स',
    body: body.trim(),
    buttons: [
      { id: 'CMD_WORKLIST', title: 'Worklist' },
      overdueSteps.length > 0
        ? { id: `SEL_PATIENT_${overdueSteps[0].patient_id}`, title: `👤 ${overdueSteps[0].patient_name.slice(0, 15)}` }
        : { id: 'CMD_FIND_PATIENT', title: isEn ? 'Find Patient' : 'मरीज़ खोजें' },
      { id: 'CMD_MENU', title: isEn ? 'Main Menu' : 'मुख्य मेनू' },
    ],
  };
}
