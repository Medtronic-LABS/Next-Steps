import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';
import { enqueueStepEvent } from '../../cce/outboxWorker.js';

/**
 * When a patient has multiple open steps, prompts the user to select which specific step to close.
 */
export function promptChooseStepToClose(to: string, patientId: string): OutboundMessage {
  const patient = db.prepare('SELECT name FROM patients WHERE id = ?').get(patientId) as any;
  const name = patient ? patient.name : 'Patient';

  const openSteps = db.prepare(`
    SELECT * FROM steps
    WHERE patient_id = ? AND status = 'OPEN'
    ORDER BY CASE WHEN due IS NOT NULL THEN due ELSE sent_at END ASC
  `).all(patientId) as any[];

  if (openSteps.length === 0) {
    return {
      kind: 'buttons',
      to,
      header: 'No Open Steps',
      body: `*${name}* के लिए अभी कोई पेंडिंग केयर स्टेप्स नहीं हैं।`,
      buttons: [
        { id: `ACTION_ADD_STEP_${patientId}`, title: '➕ नया स्टेप' },
        { id: `SEL_PATIENT_${patientId}`, title: '👤 प्रोफाइल देखें' },
        { id: 'CMD_WORKLIST', title: 'Worklist' },
      ],
    };
  }

  return {
    kind: 'list',
    to,
    header: 'Select Step to Close',
    body: `*${name}* के लिए एक से अधिक केयर स्टेप्स खुले हैं।\n\nआप कौन सा स्टेप पूरा या बंद करना चाहते हैं? चुनें:`,
    buttonText: 'स्टेप चुनें',
    sections: [
      {
        title: `पेंडिंग स्टेप्स (${openSteps.length})`,
        rows: openSteps.map((s) => {
          const catLabel = s.cat.replace(/_/g, ' ');
          const levelLabel = s.level ? ` (${s.level})` : '';
          const dueLabel = s.due ? `तारीख: ${s.due}` : 'निर्धारित';
          return {
            id: `ACTION_CLOSE_STEP_${s.id}`,
            title: `${catLabel}${levelLabel}`.slice(0, 24),
            description: `${dueLabel} · अस्पताल: ${s.level || 'Subcentre'}`.slice(0, 72),
          };
        }),
      },
    ],
  };
}

export function promptClosureProvenance(to: string, stepId: string): OutboundMessage {
  const step = db.prepare(`
    SELECT s.*, p.name as patient_name FROM steps s JOIN patients p ON s.patient_id = p.id WHERE s.id = ?
  `).get(stepId) as any;

  const patientName = step ? step.patient_name : 'Patient';
  const stepCat = step ? step.cat.replace(/_/g, ' ') : 'Care Step';
  const stepLevel = step ? ` (${step.level})` : '';
  const dueInfo = step?.due ? ` · तारीख: ${step.due}` : '';

  return {
    kind: 'list',
    to,
    header: `बंद करें: ${stepCat}`.slice(0, 24),
    body:
      `*${patientName}* के लिए सेवा पूर्णता की पुष्टि करें:\n\n` +
      `• *केयर स्टेप:* ${stepCat}${stepLevel}\n` +
      `• *तारीख:* ${dueInfo || 'सक्रिय स्टेप'}\n\n` +
      `यह सेवा कहाँ पूरी हुई? नीचे से चुनें:`,
    buttonText: 'स्थान / कारण चुनें',
    sections: [
      {
        title: 'सेवा का स्थान (Provenance)',
        rows: [
          {
            id: `PROV_${stepId}_AT_FACILITY`,
            title: 'निर्धारित अस्पताल में',
            description: `${step?.level || 'अस्पताल'} पर सलाह के अनुसार सेवा पूरी हुई`,
          },
          {
            id: `PROV_${stepId}_OTHER_FACILITY`,
            title: 'अन्य सरकारी अस्पताल',
            description: 'किसी अन्य सरकारी स्वास्थ्य केंद्र पर सेवा ली',
          },
          {
            id: `PROV_${stepId}_PRIVATE_FACILITY`,
            title: 'निजी क्लिनिक / अस्पताल',
            description: 'मरीज़ ने प्राइवेट डॉक्टर / अस्पताल में दिखाया',
          },
          {
            id: `PROV_${stepId}_NOT_COMPLETED`,
            title: 'सेवा नहीं ली / अस्वीकार',
            description: 'मरीज़ नहीं गया या सेवा लेने से मना किया',
          },
        ],
      },
    ],
  };
}

export function handleCloseWithProvenance(
  to: string,
  user: WhatsAppUser,
  stepId: string,
  provenance: string
): OutboundMessage {
  const now = new Date().toISOString();
  const isDeclined = provenance === 'NOT_COMPLETED';
  const newStatus = isDeclined ? 'CANCELLED' : 'DONE';
  const isDowngraded = provenance === 'OTHER_FACILITY' || provenance === 'PRIVATE_FACILITY' ? 1 : 0;

  db.prepare(`
    UPDATE steps
    SET status = ?,
        closed_at = ?,
        closed_by = ?,
        closed_source = ?,
        closed_level = ?,
        downgraded = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    newStatus,
    now.slice(0, 10),
    user.name,
    provenance,
    user.facility_level || user.role,
    isDowngraded,
    now,
    stepId
  );

  const step = db.prepare(`
    SELECT s.*, p.name as patient_name, p.id as patient_id FROM steps s JOIN patients p ON s.patient_id = p.id WHERE s.id = ?
  `).get(stepId) as any;

  let outboxId = '';
  if (step) {
    outboxId = enqueueStepEvent(step, step.patient_id);
  }

  const provLabel =
    provenance === 'AT_FACILITY'
      ? 'निर्धारित अस्पताल में'
      : provenance === 'OTHER_FACILITY'
      ? 'अन्य सरकारी अस्पताल'
      : provenance === 'PRIVATE_FACILITY'
      ? 'निजी क्लिनिक / अस्पताल'
      : 'सेवा नहीं ली / अस्वीकार';

  const stepCat = step ? step.cat.replace(/_/g, ' ') : 'Care Step';
  const patientName = step ? step.patient_name : 'Patient';

  return {
    kind: 'buttons',
    to,
    header: 'Step Closed',
    body:
      `✅ *${stepCat} सफलतापूर्वक बंद हो गया!*\n\n` +
      `• *मरीज़:* ${patientName}\n` +
      `• *स्टेप:* ${stepCat} (${step?.level || 'Facility'})\n` +
      `• *सेवा स्थान:* ${provLabel}\n` +
      `• *सत्यापित कर्ता:* ${user.name}\n\n` +
      `मरीज़ की केयर जर्नी और वर्कलिस्ट अपडेट हो गई है:`,
    buttons: [
      step
        ? { id: `SEL_PATIENT_${step.patient_id}`, title: `👤 प्रोफाइल देखें`.slice(0, 20) }
        : { id: 'CMD_WORKLIST', title: 'Worklist' },
      step
        ? { id: `ACTION_ADD_STEP_${step.patient_id}`, title: '➕ नया स्टेप' }
        : { id: 'CMD_MENU', title: 'मुख्य मेनू' },
      { id: 'CMD_WORKLIST', title: 'Worklist' },
    ],
  };
}
