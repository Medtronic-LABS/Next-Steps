import { OutboundMessage, WhatsAppUser } from '../types.js';

export function handleMenu(to: string, user: WhatsAppUser): OutboundMessage {
  const facilityLabel = user.facility_name || user.facility_id || 'Health Centre';

  if (user.role === 'anm') {
    return {
      kind: 'buttons',
      to,
      header: `Sub-centre ${facilityLabel}`,
      body:
        `Namaste ${user.name}!\n\n` +
        `Welcome to Next Steps. Select an action below, or type a patient's name or phone number:\n\n` +
        `💡 _Quick tip: Type "alerts" for overdue visits, "register" for new intake, or "ocr" to import register._`,
      footer: 'Next Steps Care Coordination',
      buttons: [
        { id: 'CMD_WORKLIST', title: 'Worklist' },
        { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
        { id: 'CMD_REGISTER_START', title: '➕ Register Patient' },
      ],
    };
  }

  if (user.role === 'chc_sn' || user.role === 'chc_mo') {
    return {
      kind: 'buttons',
      to,
      header: `CHC ${facilityLabel} — Secondary Care`,
      body:
        `Namaste ${user.name}!\n\n` +
        `Welcome to Next Steps. Coordinate specialist referrals and ultrasound arrivals for your block:\n\n` +
        `💡 _Quick tip: Type "arrivals" for expected patients, or "worklist" anytime._`,
      footer: 'Next Steps Care Coordination',
      buttons: [
        { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
        { id: 'CMD_WORKLIST', title: 'CHC Worklist' },
        { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
      ],
    };
  }

  // PHC Staff Nurse or Medical Officer
  return {
    kind: 'buttons',
    to,
    header: `PHC ${facilityLabel} — Primary Care`,
    body:
      `Namaste ${user.name}!\n\n` +
      `Welcome to Next Steps. Manage inbound referrals, PMSMA sessions, and sub-centre follow-through:\n\n` +
      `💡 _Quick tip: Type "arrivals" for inbound visits, or "alerts" for stale referrals._`,
    footer: 'Next Steps Care Coordination',
    buttons: [
      { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
      { id: 'CMD_WORKLIST', title: 'PHC Worklist' },
      { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
    ],
  };
}
