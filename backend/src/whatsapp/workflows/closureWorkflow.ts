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
      body: `There are currently no open care steps for *${name}*.`,
      buttons: [
        { id: `ACTION_ADD_STEP_${patientId}`, title: '➕ Add Next Step' },
        { id: `SEL_PATIENT_${patientId}`, title: '👤 View Patient' },
        { id: 'CMD_WORKLIST', title: 'Worklist' },
      ],
    };
  }

  return {
    kind: 'list',
    to,
    header: 'Select Step to Close',
    body: `Multiple care steps are currently open for *${name}*.\n\nSelect the exact step you wish to close:`,
    buttonText: 'Choose Step',
    sections: [
      {
        title: `Open Steps (${openSteps.length})`,
        rows: openSteps.map((s) => {
          const catLabel = s.cat.replace(/_/g, ' ');
          const levelLabel = s.level ? ` (${s.level})` : '';
          const dueLabel = s.due ? `Due: ${s.due}` : 'Scheduled';
          return {
            id: `ACTION_CLOSE_STEP_${s.id}`,
            title: `${catLabel}${levelLabel}`.slice(0, 24),
            description: `${dueLabel} · Facility: ${s.level || 'Subcentre'}`.slice(0, 72),
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
  const dueInfo = step?.due ? ` · Due: ${step.due}` : '';

  return {
    kind: 'list',
    to,
    header: `Close: ${stepCat}`.slice(0, 24),
    body:
      `Confirm care completion for *${patientName}*:\n\n` +
      `• *Closing Step:* ${stepCat}${stepLevel}\n` +
      `• *Schedule:* ${dueInfo || 'Active step'}\n\n` +
      `Where was this care delivered? Select provenance below:`,
    buttonText: 'Select Reason',
    sections: [
      {
        title: 'Completion Location',
        rows: [
          {
            id: `PROV_${stepId}_AT_FACILITY`,
            title: 'At Recommended Facility',
            description: `Care completed as recommended at ${step?.level || 'facility'}`,
          },
          {
            id: `PROV_${stepId}_OTHER_FACILITY`,
            title: 'Other Public Facility',
            description: 'Care delivered at another public facility',
          },
          {
            id: `PROV_${stepId}_PRIVATE_FACILITY`,
            title: 'Private Clinic / Hospital',
            description: 'Patient consulted a private facility',
          },
          {
            id: `PROV_${stepId}_NOT_COMPLETED`,
            title: 'Declined / Not Done',
            description: 'Patient missed or declined the care step',
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
      ? 'At Recommended Facility'
      : provenance === 'OTHER_FACILITY'
      ? 'Other Public Facility'
      : provenance === 'PRIVATE_FACILITY'
      ? 'Private Clinic / Hospital'
      : 'Declined / Not Done';

  const stepCat = step ? step.cat.replace(/_/g, ' ') : 'Care Step';
  const patientName = step ? step.patient_name : 'Patient';

  return {
    kind: 'buttons',
    to,
    header: 'Step Closed',
    body:
      `✅ *${stepCat} Closed Successfully!*\n\n` +
      `• *Patient:* ${patientName}\n` +
      `• *Closed Step:* ${stepCat} (${step?.level || 'Facility'})\n` +
      `• *Completion:* ${provLabel}\n` +
      `• *Closed By:* ${user.name} (${user.role.toUpperCase()})\n\n` +
      `The patient's care journey and worklist have been updated:`,
    buttons: [
      step
        ? { id: `SEL_PATIENT_${step.patient_id}`, title: `👤 View ${patientName.slice(0, 10)}`.slice(0, 20) }
        : { id: 'CMD_WORKLIST', title: 'Worklist' },
      step
        ? { id: `ACTION_ADD_STEP_${step.patient_id}`, title: '➕ Add Next Step' }
        : { id: 'CMD_MENU', title: 'Main Menu' },
      { id: 'CMD_WORKLIST', title: 'Worklist' },
    ],
  };
}
