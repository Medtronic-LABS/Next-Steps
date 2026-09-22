import { OutboundMessage, WhatsAppUser } from '../types.js';
import { db } from '../../db/index.js';

export function handleOcrStart(to: string): OutboundMessage {
  return {
    kind: 'buttons',
    to,
    header: 'Paper Register OCR (Experimental)',
    body:
      `📄 *Register Processed (Experimental Preview)*\n\n` +
      `• *18 rows found* in sample RCH register image\n` +
      `• *15 matched* to existing patients automatically\n` +
      `• *2 possible matches* (require review)\n` +
      `• *1 possible new patient*\n\n` +
      `_Note: Extraction simulated for workflow review. Next Steps links paper records to digital tracking._`,
    footer: 'RCH Register Intake',
    buttons: [
      { id: 'OCR_REVIEW_3', title: '🔍 Review 3' },
      { id: 'OCR_ACCEPT_ALL', title: '✅ Accept Matches' },
      { id: 'CMD_MENU', title: 'Main Menu' },
    ],
  };
}

export function handleOcrReview(to: string): OutboundMessage {
  return {
    kind: 'list',
    to,
    header: 'Review Register Exceptions',
    body: `3 records need human confirmation before syncing into the patient roster:`,
    buttonText: 'Select Record to Resolve',
    sections: [
      {
        title: 'Exceptions to Review',
        rows: [
          {
            id: 'OCR_RESOLVE_POOJA',
            title: '1. Pooja Devi (26y)',
            description: '88% match with existing Pooja Bai (Rampur)',
          },
          {
            id: 'OCR_RESOLVE_REKHA',
            title: '2. Rekha Singh (29y)',
            description: 'Name match but phone number differs',
          },
          {
            id: 'OCR_RESOLVE_GEETA',
            title: '3. Geeta Verma (22y)',
            description: 'New ANC registration · Amiliya village',
          },
        ],
      },
    ],
  };
}

export function handleOcrResolution(to: string, user: WhatsAppUser, actionId: string): OutboundMessage {
  const now = new Date().toISOString();

  if (actionId === 'OCR_ACCEPT_ALL') {
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp)
      VALUES (?, ?, ?, 'OCR_BATCH_ACCEPTED', '15 automatic register matches synced to roster', ?)
    `).run(`aud-ocr-${Date.now()}`, user.id, user.name, now);

    return {
      kind: 'buttons',
      to,
      header: 'OCR Batch Confirmed',
      body:
        `✅ *15 Register Matches Synced!*\n\n` +
        `• 15 existing patient journeys updated with register visit dates.\n` +
        `• 3 exceptions remain for individual review.\n\n` +
        `What would you like to do next?`,
      buttons: [
        { id: 'OCR_REVIEW_3', title: '🔍 Review 3' },
        { id: 'CMD_WORKLIST', title: 'Worklist' },
        { id: 'CMD_MENU', title: 'Main Menu' },
      ],
    };
  }

  let recordName = 'Pooja Devi';
  let outcome = 'Confirmed match with Pooja Bai and linked ABHA.';

  if (actionId === 'OCR_RESOLVE_REKHA') {
    recordName = 'Rekha Singh';
    outcome = 'Updated mobile number to +919812345099 and linked existing journey.';
  } else if (actionId === 'OCR_RESOLVE_GEETA') {
    recordName = 'Geeta Verma';
    outcome = 'Enrolled as new ANC patient in Amiliya with ASHA Shanti.';
  }

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp)
    VALUES (?, ?, ?, 'OCR_EXCEPTION_RESOLVED', ?, ?)
  `).run(`aud-ocr-${Date.now()}`, user.id, user.name, `Resolved OCR exception for ${recordName}: ${outcome}`, now);

  return {
    kind: 'buttons',
    to,
    header: 'Record Resolved',
    body:
      `✅ *Resolved: ${recordName}*\n\n` +
      `• *Outcome:* ${outcome}\n` +
      `• *Verified by:* ${user.name} (${user.role.toUpperCase()})\n` +
      `• *Audit Trail:* Recorded\n\n` +
      `Select next action:`,
    buttons: [
      { id: 'OCR_REVIEW_3', title: 'Review Remaining' },
      { id: 'CMD_WORKLIST', title: 'Worklist' },
      { id: 'CMD_MENU', title: 'Main Menu' },
    ],
  };
}
