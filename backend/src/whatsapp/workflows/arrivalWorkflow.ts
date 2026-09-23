import { db } from '../../db/index.js';
import { OutboundMessage, WhatsAppUser } from '../types.js';
import { enqueueStepEvent } from '../../cce/outboxWorker.js';

export function handleExpectedArrivals(to: string, user: WhatsAppUser, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
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
      body:
        lang === 'en'
          ? `🏥 *No pending referrals at ${user.facility_name || facilityLevel}.*\n\nAll referred patients have completed care or none are scheduled today.`
          : `🏥 *${user.facility_name || facilityLevel} पर कोई पेंडिंग रेफरल नहीं है।*\n\nसभी रेफर किए गए मरीज़ों की सेवा पूरी हो चुकी है या आज के लिए कोई रेफरल निर्धारित नहीं है।`,
      buttons: [
        { id: 'CMD_WORKLIST', title: `${facilityLevel} Worklist`.slice(0, 20) },
        { id: 'CMD_FIND_PATIENT', title: lang === 'en' ? 'Find Patient' : 'मरीज़ खोजें' },
        { id: 'CMD_MENU', title: lang === 'en' ? 'Main Menu' : 'मुख्य मेनू' },
      ],
    };
  }

  const isEn = lang === 'en';
  return {
    kind: 'list',
    to,
    header: 'Expected Arrivals',
    body: isEn
      ? `Found ${referrals.length} referred patients arriving at ${user.facility_name || facilityLevel}. Select a patient to record arrival:`
      : `${user.facility_name || facilityLevel} पर ${referrals.length} रेफर किए गए मरीज़ों के आने की उम्मीद है। अराइवल दर्ज करने के लिए मरीज़ चुनें:`,
    buttonText: isEn ? 'Select Patient' : 'मरीज़ चुनें',
    sections: [
      {
        title: isEn ? 'Inbound Arrivals' : 'आने वाले रेफरल',
        rows: referrals.map((r) => {
          const riskTag =
            r.patient_risk === 'HRP'
              ? (isEn ? '🔴 High-Risk' : '🔴 हाई-रिस्क')
              : (isEn ? '🟢 Normal' : '🟢 सामान्य');
          return {
            id: `ARRIVE_PICK_${r.id}`,
            title: `${r.patient_name} (${riskTag})`.slice(0, 24),
            description: isEn
              ? `Village: ${r.village_name} · Due: ${r.due || 'ASAP'}`.slice(0, 72)
              : `गाँव: ${r.village_name} · देय: ${r.due || 'जल्द से जल्द'}`.slice(0, 72),
          };
        }),
      },
    ],
  };
}

export function promptArrivalAction(to: string, user: WhatsAppUser, stepId: string, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
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
      body: lang === 'en' ? '❌ Step not found or already closed.' : '❌ स्टेप नहीं मिला या पहले ही बंद हो चुका है।',
    };
  }

  const isEn = lang === 'en';
  const riskTag =
    step.patient_risk === 'HRP'
      ? (isEn ? '🔴 High-Risk (HRP)' : '🔴 हाई-रिस्क (HRP)')
      : (isEn ? '🟢 Normal' : '🟢 सामान्य');

  return {
    kind: 'buttons',
    to,
    header: (isEn ? `Arrival: ${step.patient_name}` : `अराइवल: ${step.patient_name}`).slice(0, 24),
    body: isEn
      ? `🏥 *Inbound Referral Arrival*\n\n` +
        `• *Patient:* ${step.patient_name} (${riskTag})\n` +
        `• *Village:* ${step.village_name}\n` +
        `• *Referral Target:* ${step.level}\n\n` +
        `Tap below to confirm patient arrival at ${user.facility_name || step.level}:`
      : `🏥 *रेफरल मरीज़ का आगमन*\n\n` +
        `• *मरीज़:* ${step.patient_name} (${riskTag})\n` +
        `• *गाँव:* ${step.village_name}\n` +
        `• *रेफरल स्तर:* ${step.level}\n\n` +
        `${user.facility_name || step.level} पर मरीज़ के पहुँचने की पुष्टि करने के लिए नीचे टैप करें:`,
    buttons: [
      { id: `DO_CARE_DELIVERED_${step.id}`, title: isEn ? 'Confirm Arrival' : 'उपस्थिति दर्ज' },
      { id: 'CMD_ARRIVALS', title: isEn ? 'Back to List' : 'वापस सूची' },
    ],
  };
}

export function handleMarkArrived(to: string, user: WhatsAppUser, stepId: string, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  const now = new Date().toISOString();
  const isEn = lang === 'en';

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
    body: isEn
      ? `📍 *Arrival recorded for ${step?.patient_name || 'Patient'}!*\n\n` +
        `• Status: *Present at ${user.facility_name || user.facility_level}*\n` +
        `• Care Step: *Remains OPEN until doctor delivers care.*\n\n` +
        `When consultation/treatment is completed, tap "Care Delivered" to close the referral.`
      : `📍 *${step?.patient_name || 'मरीज़'} का अराइवल दर्ज हो गया!*\n\n` +
        `• स्थिति: *${user.facility_name || user.facility_level} पर उपस्थित*\n` +
        `• केयर स्टेप: *डॉक्टर द्वारा सेवा देने तक OPEN रहेगा।*\n\n` +
        `परामर्श / उपचार पूरा होने के बाद, रेफरल बंद करने के लिए "सेवा पूरी हुई" पर टैप करें।`,
    buttons: [
      { id: `DO_CARE_DELIVERED_${stepId}`, title: isEn ? 'Care Delivered' : '✅ सेवा पूरी हुई' },
      { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
      { id: 'CMD_MENU', title: isEn ? 'Main Menu' : 'मुख्य मेनू' },
    ],
  };
}

export function handleCareDelivered(to: string, user: WhatsAppUser, stepId: string, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  const now = new Date().toISOString();
  const isEn = lang === 'en';

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
    body: isEn
      ? `🎉 *Referral Closed Successfully!*\n\n` +
        `• *Patient:* ${step?.patient_name || 'Patient'}\n` +
        `• *Hospital:* ${user.facility_name || user.facility_level}\n` +
        `• *Verified By:* ${user.name}\n\n` +
        `The referring Sub-centre ANM has been notified automatically.`
      : `🎉 *रेफरल सफलतापूर्वक पूर्ण हुआ!*\n\n` +
        `• *मरीज़:* ${step?.patient_name || 'मरीज़'}\n` +
        `• *अस्पताल:* ${user.facility_name || user.facility_level}\n` +
        `• *सत्यापित कर्ता:* ${user.name}\n\n` +
        `सब-सेंटर की ANM को सिस्टम द्वारा सूचित कर दिया गया है।`,
    buttons: [
      { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
      { id: 'CMD_WORKLIST', title: 'Worklist' },
      { id: 'CMD_MENU', title: isEn ? 'Main Menu' : 'मुख्य मेनू' },
    ],
  };
}
