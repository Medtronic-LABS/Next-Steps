import { OutboundMessage, WhatsAppUser } from '../types.js';

export function handleMenu(to: string, user: WhatsAppUser): OutboundMessage {
  const facilityLabel = user.facility_name || user.facility_id || 'Health Centre';

  if (user.role === 'anm') {
    return {
      kind: 'buttons',
      to,
      header: `Sub-centre ${facilityLabel}`,
      body:
        `नमस्ते ${user.name}!\n\n` +
        `Next Steps में आपका स्वागत है। नीचे दिए गए विकल्पों में से चुनें, या मरीज़ का नाम या मोबाइल नंबर टाइप करें:\n\n` +
        `💡 _सुझाव: ओवरड्यू विज़िट्स के लिए "alerts", नए मरीज़ के लिए "register", या रजिस्टर की फ़ोटो के लिए "ocr" लिखें।_`,
      footer: 'Next Steps केयर कोऑर्डिनेशन',
      buttons: [
        { id: 'CMD_WORKLIST', title: 'Worklist' },
        { id: 'CMD_FIND_PATIENT', title: 'मरीज़ खोजें' },
        { id: 'CMD_REGISTER_START', title: '➕ नया मरीज़' },
      ],
    };
  }

  if (user.role === 'chc_sn' || user.role === 'chc_mo') {
    return {
      kind: 'buttons',
      to,
      header: `CHC ${facilityLabel}`,
      body:
        `नमस्ते ${user.name}!\n\n` +
        `Next Steps में आपका स्वागत है। अपने ब्लॉक के लिए विशेषज्ञ रेफरल और अल्ट्रासाउंड अराइवल्स की निगरानी करें:\n\n` +
        `💡 _सुझाव: आने वाले मरीज़ों के लिए "arrivals", या अपनी "worklist" देखें।_`,
      footer: 'Next Steps केयर कोऑर्डिनेशन',
      buttons: [
        { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
        { id: 'CMD_WORKLIST', title: 'CHC Worklist' },
        { id: 'CMD_FIND_PATIENT', title: 'मरीज़ खोजें' },
      ],
    };
  }

  // PHC Staff Nurse or Medical Officer
  return {
    kind: 'buttons',
    to,
    header: `PHC ${facilityLabel}`,
    body:
      `नमस्ते ${user.name}!\n\n` +
      `Next Steps में आपका स्वागत है। सब-सेंटर से आने वाले रेफरल, PMSMA और डॉक्टर चेकअप की निगरानी करें:\n\n` +
      `💡 _सुझाव: आने वाले मरीज़ों के लिए "arrivals", या ओवरड्यू रेफरल के लिए "alerts" टाइप करें।_`,
    footer: 'Next Steps केयर कोऑर्डिनेशन',
    buttons: [
      { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
      { id: 'CMD_WORKLIST', title: 'PHC Worklist' },
      { id: 'CMD_FIND_PATIENT', title: 'मरीज़ खोजें' },
    ],
  };
}
