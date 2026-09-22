import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';
import { enqueueStepEvent } from '../../cce/outboxWorker.js';

export function handleExpectedArrivals(to: string, user: WhatsAppUser): OutboundMessage {
  const facilityLevel = user.facility_level || (user.role.startsWith('chc') ? 'CHC' : 'PHC');

  // Find open referrals directed to this facility level
  const referrals = db.prepare(`
    SELECT s.*, p.name as patient_name, p.village_name, p.phone as patient_phone, p.status as patient_risk
    FROM steps s
    JOIN patients p ON s.patient_id = p.id
    WHERE s.status = 'OPEN' AND s.cat = 'REFERRAL' AND s.level = ?
    ORDER BY s.due ASC
    LIMIT 10
  `).all(facilityLevel) as any[];

  if (referrals.length === 0) {
    return {
      kind: 'buttons',
      to,
      header: 'Expected Arrivals',
      body: `🏥 *No inbound referrals pending at ${user.facility_name || facilityLevel}.*\n\nAll referred patients have either completed care or no referrals are scheduled today.`,
      buttons: [
        { id: 'CMD_WORKLIST', title: `${facilityLevel} Worklist` },
        { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
        { id: 'CMD_MENU', title: 'Main Menu' },
      ],
    };
  }

  return {
    kind: 'list',
    to,
    header: 'Expected Inbound Arrivals',
    body: `Found ${referrals.length} referred patients expected at ${user.facility_name || facilityLevel}. Select a patient to record arrival or care completion:`,
    buttonText: 'Select Arriving Patient',
    sections: [
      {
        title: 'Expected Inbound Referrals',
        rows: referrals.map((r) => ({
          id: `ARRIVE_PICK_${r.id}`,
          title: `${r.patient_name} (${r.patient_risk === 'HRP' ? '🔴 HRP' : '🟢 Normal'})`.slice(0, 24),
          description: `From: ${r.village_name} · Due: ${r.due || 'ASAP'}`.slice(0, 72),
        })),
      },
    ],
  };
}

export function promptArrivalAction(to: string, user: WhatsAppUser, stepId: string): OutboundMessage {
  const step = db.prepare(`
    SELECT s.*, p.name as patient_name, p.village_name, p.status as patient_risk
    FROM steps s
    JOIN patients p ON s.patient_id = p.id
    WHERE s.id = ?
  `).get(stepId) as any;

  if (!step) {
    return {
      kind: 'text',
      to,
      body: '❌ Step not found or already closed.',
    };
  }

  return {
    kind: 'buttons',
    to,
    header: `Intake: ${step.patient_name}`,
    body:
      `🏥 *Inbound Referral Intake*\n\n` +
      `• *Patient:* ${step.patient_name} (${step.patient_risk === 'HRP' ? '🔴 High-Risk' : '🟢 Normal'})\n` +
      `• *From:* ${step.village_name}\n` +
      `• *Referral Target:* ${step.level}\n\n` +
      `Tap below to confirm arrival and complete the referral at ${user.facility_name || step.level}:`,
    buttons: [
      { id: `DO_CARE_DELIVERED_${step.id}`, title: '✅ Confirm Arrived' },
      { id: 'CMD_ARRIVALS', title: 'Back to Arrivals' },
    ],
  };
}

export function handleMarkArrived(to: string, user: WhatsAppUser, stepId: string): OutboundMessage {
  const now = new Date().toISOString();

  // Mark presence on-site, but keep status = 'OPEN' (Arrived != Completed)
  db.prepare(`
    UPDATE steps
    SET closed_source = 'AT_FACILITY',
        updated_at = ?
    WHERE id = ?
  `).run(now, stepId);

  const step = db.prepare(`
    SELECT s.*, p.name as patient_name FROM steps s JOIN patients p ON s.patient_id = p.id WHERE s.id = ?
  `).get(stepId) as any;

  return {
    kind: 'buttons',
    to,
    header: 'Arrival Recorded',
    body:
      `📍 *Arrival Confirmed for ${step?.patient_name || 'Patient'}!*\n\n` +
      `• Status: *Arrived at ${user.facility_name || user.facility_level}*\n` +
      `• Care Step: *Remains OPEN until doctor delivers care.*\n\n` +
      `When the patient finishes consultation/treatment, tap "Care Delivered" to close the referral.`,
    buttons: [
      { id: `DO_CARE_DELIVERED_${stepId}`, title: '✅ Care Delivered' },
      { id: 'CMD_ARRIVALS', title: 'Arrivals List' },
      { id: 'CMD_MENU', title: 'Main Menu' },
    ],
  };
}

export function handleCareDelivered(to: string, user: WhatsAppUser, stepId: string): OutboundMessage {
  const now = new Date().toISOString();

  // Mark step DONE with full provenance
  db.prepare(`
    UPDATE steps
    SET status = 'DONE',
        closed_at = ?,
        closed_by = ?,
        closed_source = 'AT_FACILITY',
        closed_level = ?,
        updated_at = ?
    WHERE id = ?
  `).run(now.slice(0, 10), user.name, user.facility_level || (user.role.startsWith('chc') ? 'CHC' : 'PHC'), now, stepId);

  const step = db.prepare(`
    SELECT s.*, p.name as patient_name, p.id as patient_id FROM steps s JOIN patients p ON s.patient_id = p.id WHERE s.id = ?
  `).get(stepId) as any;

  // Queue CCE completion event
  let outboxId = '';
  if (step) {
    outboxId = enqueueStepEvent(step, step.patient_id);
  }

  return {
    kind: 'buttons',
    to,
    header: 'Care Completed',
    body:
      `🎉 *Referral Closed Successfully!*\n\n` +
      `• *Patient:* ${step?.patient_name || 'Patient'}\n` +
      `• *Facility:* ${user.facility_name || user.facility_level}\n` +
      `• *Closed By:* ${user.name}\n\n` +
      `The referring ANM has been updated automatically.`,
    buttons: [
      { id: 'CMD_ARRIVALS', title: 'Arrivals Queue' },
      { id: 'CMD_WORKLIST', title: 'Facility Worklist' },
      { id: 'CMD_MENU', title: 'Main Menu' },
    ],
  };
}
