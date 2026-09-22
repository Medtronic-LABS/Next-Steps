import { OutboundMessage, WhatsAppUser } from '../types.js';
import { db } from '../../db/index.js';

export function handleEventLog(to: string, user: WhatsAppUser): OutboundMessage {
  const events = db.prepare(`
    SELECT event_type, subject, facility_id, status, created_at, event_id
    FROM cce_event_outbox
    ORDER BY created_at DESC
    LIMIT 6
  `).all() as any[];

  const auditLogs = db.prepare(`
    SELECT action, details, timestamp
    FROM audit_logs
    ORDER BY timestamp DESC
    LIMIT 4
  `).all() as any[];

  let body = `📡 *CCE Event Outbox & Coordination Log*\n`;
  body += `Live sync trail between Sub-centres, PHCs, and CHCs:\n\n`;

  if (events.length === 0) {
    body += `_No outbox events queued yet._\n\n`;
  } else {
    body += `*Recent CloudEvents (${events.length}):*\n`;
    events.forEach((e, idx) => {
      const typeShort = e.event_type.replace('org.openphc.', '').replace('cce.', '').toUpperCase();
      const statusIcon = e.status === 'DELIVERED' ? '✅' : '⏳';
      const timeStr = (e.created_at || '').slice(11, 19);
      body += `${statusIcon} ${idx + 1}. *${typeShort}*\n`;
      body += `   • Subject: ${e.subject}\n`;
      body += `   • Facility: ${e.facility_id || 'N/A'} · ${timeStr} · [${e.status}]\n\n`;
    });
  }

  if (auditLogs.length > 0) {
    body += `*Frontline Actions:*\n`;
    auditLogs.slice(0, 3).forEach((a) => {
      body += `• ${a.action}: ${a.details.slice(0, 50)}...\n`;
    });
    body += `\n`;
  }

  return {
    kind: 'buttons',
    to,
    header: 'CCE Coordination Events',
    body: body.trim(),
    footer: 'Medtronic LABS CCE Engine',
    buttons: [
      { id: 'CMD_WORKLIST', title: 'Worklist' },
      { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
      { id: 'CMD_MENU', title: 'Main Menu' },
    ],
  };
}
