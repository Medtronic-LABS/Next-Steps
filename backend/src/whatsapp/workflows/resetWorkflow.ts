import { OutboundMessage, WhatsAppUser } from '../types.js';
import { resetDatabaseToSeed } from '../../db/index.js';

export function handleResetDemo(to: string, user: WhatsAppUser): OutboundMessage {
  try {
    resetDatabaseToSeed();
    console.log(`[Reset Demo] Reset triggered by ${user.name} (${user.phone})`);

    return {
      kind: 'buttons',
      to,
      header: 'डेमो डेटा रीसेट',
      body:
        `🔄 *डेमो डेटा सफलतापूर्वक रीसेट हो गया!*\n\n` +
        `केयर कोऑर्डिनेशन डेटाबेस को शुरुआती स्थिति में रीस्टोर कर दिया गया है:\n\n` +
        `• *Lakshmi Devi (28y, Rampur):* CHC रेफरल ओवरड्यू (ANM अलर्ट सक्रिय)\n` +
        `• *Lakshmi Devi (31y, Rampur):* दूसरा मैच (डुप्लीकेट सर्च डेमो हेतु)\n` +
        `• *Ramesh Patel (52y, Amiliya):* अनियंत्रित BP (NCD डेमो)\n` +
        `• *सेंटर व रोल्स:* Sub-centre Ghurehta (ANM), PHC Sirmour, CHC Teonthar सक्रिय।\n\n` +
        `शुरू करने के लिए *menu* या *worklist* टाइप करें:`,
      footer: 'Next Steps डेमो वातावरण',
      buttons: [
        { id: 'CMD_WORKLIST', title: 'Worklist' },
        { id: 'CMD_FIND_PATIENT', title: 'मरीज़ खोजें' },
        { id: 'CMD_MENU', title: 'मुख्य मेनू' },
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
