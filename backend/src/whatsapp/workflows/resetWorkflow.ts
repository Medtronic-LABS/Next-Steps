import { OutboundMessage, WhatsAppUser } from '../types.js';
import { resetDatabaseToSeed } from '../../db/index.js';

export function handleResetDemo(to: string, user: WhatsAppUser): OutboundMessage {
  try {
    resetDatabaseToSeed();
    console.log(`[Reset Demo] Reset triggered by ${user.name} (${user.phone})`);

    return {
      kind: 'buttons',
      to,
      header: 'Demo Scenario Reset',
      body:
        `🔄 *Demo Reset Successfully Complete!*\n\n` +
        `The Care Coordination database has been restored to the initial scenario:\n\n` +
        `• *Lakshmi Devi (28y, Rampur):* Overdue CHC referral active (triggers ANM alert)\n` +
        `• *Lakshmi Devi (31y, Rampur):* Second match (ready for duplicate search demo)\n` +
        `• *Ramesh Patel (52y, Amiliya):* Uncontrolled BP (ready for NCD demo)\n` +
        `• *Facilities & Roles:* SC Ghurehta (ANM), PHC Sirmour, CHC Teonthar active.\n\n` +
        `Type *menu* or *worklist* to start:`,
      footer: 'Next Steps Demo Environment',
      buttons: [
        { id: 'CMD_WORKLIST', title: 'Worklist' },
        { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
        { id: 'CMD_MENU', title: 'Main Menu' },
      ],
    };
  } catch (err: any) {
    console.error('[Reset Demo] Error resetting database:', err);
    return {
      kind: 'text',
      to,
      body: `⚠️ Failed to reset demo: ${err?.message || 'Database error'}`,
    };
  }
}
