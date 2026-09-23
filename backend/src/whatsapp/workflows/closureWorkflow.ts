import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';
import { enqueueStepEvent } from '../../cce/outboxWorker.js';

/**
 * When a patient has multiple open steps, prompts the user to select which specific step to close.
 */
export function promptChooseStepToClose(to: string, patientId: string, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  const patient = db.prepare('SELECT name FROM patients WHERE id = ?').get(patientId) as any;
  const name = patient ? patient.name : 'Patient';
  const isEn = lang === 'en';

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
      body: isEn
        ? `No pending care steps found for *${name}*.`
        : `*${name}* के लिए अभी कोई पेंडिंग केयर स्टेप्स नहीं हैं।`,
      buttons: [
        { id: `ACTION_ADD_STEP_${patientId}`, title: isEn ? '➕ Add Step' : '➕ नया स्टेप' },
        { id: `SEL_PATIENT_${patientId}`, title: isEn ? '👤 View Patient' : '👤 प्रोफाइल देखें' },
        { id: 'CMD_WORKLIST', title: 'Worklist' },
      ],
    };
  }

  return {
    kind: 'list',
    to,
    header: (isEn ? 'Select Step to Close' : 'स्टेप चुनें').slice(0, 24),
    body: isEn
      ? `Multiple care steps are open for *${name}*.\n\nSelect the step that was delivered or needs closure:`
      : `*${name}* के लिए एक से अधिक केयर स्टेप्स खुले हैं।\n\nआप कौन सा स्टेप पूरा या बंद करना चाहते हैं? चुनें:`,
    buttonText: isEn ? 'Select Step' : 'स्टेप चुनें',
    sections: [
      {
        title: isEn ? `Pending Steps (${openSteps.length})` : `पेंडिंग स्टेप्स (${openSteps.length})`,
        rows: openSteps.map((s) => {
          const catLabel = s.cat.replace(/_/g, ' ');
          const levelLabel = s.level ? ` (${s.level})` : '';
          const dueLabel = s.due ? (isEn ? `Due: ${s.due}` : `तारीख: ${s.due}`) : (isEn ? 'Scheduled' : 'निर्धारित');
          return {
            id: `ACTION_CLOSE_STEP_${s.id}`,
            title: `${catLabel}${levelLabel}`.slice(0, 24),
            description: isEn
              ? `${dueLabel} · Facility: ${s.level || 'Subcentre'}`.slice(0, 72)
              : `${dueLabel} · अस्पताल: ${s.level || 'Subcentre'}`.slice(0, 72),
          };
        }),
      },
    ],
  };
}

export function promptClosureProvenance(to: string, stepId: string, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  const step = db.prepare(`
    SELECT s.*, p.name as patient_name FROM steps s JOIN patients p ON s.patient_id = p.id WHERE s.id = ?
  `).get(stepId) as any;

  const patientName = step ? step.patient_name : 'Patient';
  const stepCat = step ? step.cat.replace(/_/g, ' ') : 'Care Step';
  const stepLevel = step ? ` (${step.level})` : '';
  const isEn = lang === 'en';
  const dueInfo = step?.due ? (isEn ? ` · Due: ${step.due}` : ` · तारीख: ${step.due}`) : '';

  return {
    kind: 'list',
    to,
    header: (isEn ? `Close: ${stepCat}` : `बंद करें: ${stepCat}`).slice(0, 24),
    body: isEn
      ? `Confirm care delivery for *${patientName}*:\n\n` +
        `• *Care Step:* ${stepCat}${stepLevel}\n` +
        `• *Schedule:* ${dueInfo || 'Active step'}\n\n` +
        `Where was this care delivered? Select below:`
      : `*${patientName}* के लिए सेवा पूर्णता की पुष्टि करें:\n\n` +
        `• *केयर स्टेप:* ${stepCat}${stepLevel}\n` +
        `• *तारीख:* ${dueInfo || 'सक्रिय स्टेप'}\n\n` +
        `यह सेवा कहाँ पूरी हुई? नीचे से चुनें:`,
    buttonText: isEn ? 'Select Provenance' : 'स्थान चुनें',
    sections: [
      {
        title: isEn ? 'Care Delivery Provenance' : 'सेवा का स्थान (Provenance)',
        rows: [
          {
            id: `PROV_${stepId}_AT_FACILITY`,
            title: isEn ? 'At Target Facility' : 'निर्धारित अस्पताल में',
            description: isEn ? `Delivered at ${step?.level || 'hospital'} as prescribed` : `${step?.level || 'अस्पताल'} पर सलाह के अनुसार सेवा पूरी हुई`,
          },
          {
            id: `PROV_${stepId}_OTHER_FACILITY`,
            title: isEn ? 'Other Public Facility' : 'अन्य सरकारी अस्पताल',
            description: isEn ? 'Delivered at another government health centre' : 'किसी अन्य सरकारी स्वास्थ्य केंद्र पर सेवा ली',
          },
          {
            id: `PROV_${stepId}_PRIVATE_FACILITY`,
            title: isEn ? 'Private Clinic / Hospital' : 'निजी क्लिनिक / अस्पताल',
            description: isEn ? 'Patient consulted a private clinic/hospital' : 'मरीज़ ने प्राइवेट डॉक्टर / अस्पताल में दिखाया',
          },
          {
            id: `PROV_${stepId}_NOT_COMPLETED`,
            title: isEn ? 'Declined / Not Taken' : 'सेवा नहीं ली / अस्वीकार',
            description: isEn ? 'Patient declined or unable to attend' : 'मरीज़ नहीं गया या सेवा लेने से मना किया',
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
  provenance: string,
  lang: 'hi' | 'en' = 'hi'
): OutboundMessage {
  const now = new Date().toISOString();
  const isDeclined = provenance === 'NOT_COMPLETED';
  const newStatus = isDeclined ? 'CANCELLED' : 'DONE';
  const isDowngraded = provenance === 'OTHER_FACILITY' || provenance === 'PRIVATE_FACILITY' ? 1 : 0;
  const isEn = lang === 'en';

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

  const provLabel = isEn
    ? (provenance === 'AT_FACILITY'
        ? 'Target Facility'
        : provenance === 'OTHER_FACILITY'
        ? 'Other Govt Facility'
        : provenance === 'PRIVATE_FACILITY'
        ? 'Private Clinic / Hospital'
        : 'Not Completed / Declined')
    : (provenance === 'AT_FACILITY'
        ? 'निर्धारित अस्पताल में'
        : provenance === 'OTHER_FACILITY'
        ? 'अन्य सरकारी अस्पताल'
        : provenance === 'PRIVATE_FACILITY'
        ? 'निजी क्लिनिक / अस्पताल'
        : 'सेवा नहीं ली / अस्वीकार');

  const stepCat = step ? step.cat.replace(/_/g, ' ') : 'Care Step';
  const patientName = step ? step.patient_name : 'Patient';

  return {
    kind: 'buttons',
    to,
    header: isEn ? 'Step Closed' : 'केयर स्टेप पूर्ण',
    body: isEn
      ? `✅ *${stepCat} successfully closed!*\n\n` +
        `• *Patient:* ${patientName}\n` +
        `• *Step:* ${stepCat} (${step?.level || 'Facility'})\n` +
        `• *Delivery Location:* ${provLabel}\n` +
        `• *Verified By:* ${user.name}\n\n` +
        `The patient's journey and worklist have been updated.`
      : `✅ *${stepCat} सफलतापूर्वक बंद हो गया!*\n\n` +
        `• *मरीज़:* ${patientName}\n` +
        `• *स्टेप:* ${stepCat} (${step?.level || 'Facility'})\n` +
        `• *सेवा स्थान:* ${provLabel}\n` +
        `• *सत्यापित कर्ता:* ${user.name}\n\n` +
        `मरीज़ की केयर जर्नी और वर्कलिस्ट अपडेट हो गई है:`,
    buttons: [
      step
        ? { id: `SEL_PATIENT_${step.patient_id}`, title: isEn ? '👤 View Patient' : '👤 प्रोफाइल देखें' }
        : { id: 'CMD_WORKLIST', title: 'Worklist' },
      step
        ? { id: `ACTION_ADD_STEP_${step.patient_id}`, title: isEn ? '➕ Add Step' : '➕ नया स्टेप' }
        : { id: 'CMD_MENU', title: isEn ? 'Main Menu' : 'मुख्य मेनू' },
      { id: 'CMD_WORKLIST', title: 'Worklist' },
    ],
  };
}
