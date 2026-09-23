import { OutboundMessage, WhatsAppUser } from '../types.js';
import { db } from '../../db/index.js';

export function handleOcrStart(to: string): OutboundMessage {
  return {
    kind: 'buttons',
    to,
    header: 'रजिस्टर OCR (प्रायोगिक)',
    body:
      `📄 *रजिस्टर प्रोसेस हुआ (प्रायोगिक पूर्वावलोकन)*\n\n` +
      `• *18 पंक्तियाँ मिलीं* (RCH रजिस्टर पेज से)\n` +
      `• *15 स्वतः मैच हुईं* (पुराने मरीज़ों के रिकॉर्ड से)\n` +
      `• *2 संभावित मैच* (समीक्षा की आवश्यकता)\n` +
      `• *1 नया मरीज़*\n\n` +
      `_Next Steps कागज़ी रजिस्टर को सीधे डिजिटल वर्कलिस्ट से जोड़ता है।_`,
    footer: 'RCH रजिस्टर इम्पोर्ट',
    buttons: [
      { id: 'OCR_REVIEW_3', title: '🔍 समीक्षा करें (3)' },
      { id: 'OCR_ACCEPT_ALL', title: '✅ सभी स्वीकारें' },
      { id: 'CMD_MENU', title: 'मुख्य मेनू' },
    ],
  };
}

export function handleOcrReview(to: string): OutboundMessage {
  return {
    kind: 'list',
    to,
    header: 'समीक्षा आवश्यक',
    body: `3 रिकॉर्ड्स को वर्कलिस्ट में जोड़ने से पहले आपकी पुष्टि की आवश्यकता है:`,
    buttonText: 'रिकॉर्ड चुनें',
    sections: [
      {
        title: 'जाँच हेतु रिकॉर्ड',
        rows: [
          {
            id: 'OCR_RESOLVE_POOJA',
            title: '1. Pooja Devi (26y)',
            description: 'Pooja Bai (Rampur) से 88% मैच',
          },
          {
            id: 'OCR_RESOLVE_REKHA',
            title: '2. Rekha Singh (29y)',
            description: 'नाम मिला लेकिन मोबाइल नंबर अलग है',
          },
          {
            id: 'OCR_RESOLVE_GEETA',
            title: '3. Geeta Verma (22y)',
            description: 'नया ANC पंजीकरण · Amiliya गाँव',
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
      header: 'OCR मैच कन्फर्म',
      body:
        `✅ *15 रजिस्टर मैच सिंक हो गए!*\n\n` +
        `• 15 पुराने मरीज़ों की विज़िट तारीखें रजिस्टर से अपडेट हो गईं।\n` +
        `• 3 रिकॉर्ड्स व्यक्तिगत समीक्षा के लिए बाकी हैं।\n\n` +
        `आप आगे क्या करना चाहते हैं?`,
      buttons: [
        { id: 'OCR_REVIEW_3', title: '🔍 बाकी 3 देखें' },
        { id: 'CMD_WORKLIST', title: 'Worklist' },
        { id: 'CMD_MENU', title: 'मुख्य मेनू' },
      ],
    };
  }

  let recordName = 'Pooja Devi';
  let outcome = 'Pooja Bai के साथ मैच कन्फर्म हुआ और ABHA लिंक हुआ।';

  if (actionId === 'OCR_RESOLVE_REKHA') {
    recordName = 'Rekha Singh';
    outcome = 'मोबाइल नंबर +919812345099 अपडेट हुआ और पुरानी जर्नी लिंक हुई।';
  } else if (actionId === 'OCR_RESOLVE_GEETA') {
    recordName = 'Geeta Verma';
    outcome = 'Amiliya गाँव में ASHA Shanti के तहत नए ANC मरीज़ के रूप में दर्ज।';
  }

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, details, timestamp)
    VALUES (?, ?, ?, 'OCR_EXCEPTION_RESOLVED', ?, ?)
  `).run(`aud-ocr-${Date.now()}`, user.id, user.name, `Resolved OCR exception for ${recordName}: ${outcome}`, now);

  return {
    kind: 'buttons',
    to,
    header: 'रिकॉर्ड सत्यापित',
    body:
      `✅ *सत्यापित: ${recordName}*\n\n` +
      `• *परिणाम:* ${outcome}\n` +
      `• *सत्यापित कर्ता:* ${user.name} (${user.role.toUpperCase()})\n` +
      `• *ऑडिट लॉग:* सुरक्षित\n\n` +
      `आगे का विकल्प चुनें:`,
    buttons: [
      { id: 'OCR_REVIEW_3', title: 'बाकी समीक्षा करें' },
      { id: 'CMD_WORKLIST', title: 'Worklist' },
      { id: 'CMD_MENU', title: 'मुख्य मेनू' },
    ],
  };
}
