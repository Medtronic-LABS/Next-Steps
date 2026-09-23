import { OutboundMessage, WhatsAppUser } from '../types.js';

export function promptLanguageSelection(to: string, currentLang: 'hi' | 'en' = 'hi'): OutboundMessage {
  return {
    kind: 'buttons',
    to,
    header: 'Language / भाषा',
    body:
      currentLang === 'en'
        ? `🌐 *Language Preferences*\n\nPlease select your preferred language for Next Steps WhatsApp messages:`
        : `🌐 *भाषा विकल्प (Language)*\n\nNext Steps के संदेशों के लिए अपनी पसंदीदा भाषा चुनें:`,
    buttons: [
      { id: 'SET_LANG_HI', title: '🇮🇳 हिंदी (Hindi)' },
      { id: 'SET_LANG_EN', title: '🇬🇧 English' },
      { id: 'CMD_MENU', title: currentLang === 'en' ? 'Main Menu' : 'मुख्य मेनू' },
    ],
  };
}

export function handleMenu(to: string, user: WhatsAppUser, lang: 'hi' | 'en' = 'hi'): OutboundMessage {
  const facilityLabel = user.facility_name || user.facility_id || 'Health Centre';

  // --- English Mode ---
  if (lang === 'en') {
    if (user.role === 'anm') {
      return {
        kind: 'buttons',
        to,
        header: `Sub-centre ${facilityLabel}`.slice(0, 24),
        body:
          `Welcome ${user.name}!\n\n` +
          `Next Steps Care Coordination active. Choose an option below, or reply with a patient name / mobile number:\n\n` +
          `💡 _Tips: Type "alerts" for overdue visits, "register" for patient intake, or "language" to switch language._`,
        footer: 'Next Steps Care Coordination',
        buttons: [
          { id: 'CMD_WORKLIST', title: 'Worklist' },
          { id: 'CMD_FIND_PATIENT', title: 'Find Patient' },
          { id: 'CMD_LANG', title: '🌐 Language / भाषा' },
        ],
      };
    }

    if (user.role === 'chc_sn' || user.role === 'chc_mo') {
      return {
        kind: 'buttons',
        to,
        header: `CHC ${facilityLabel}`.slice(0, 24),
        body:
          `Welcome ${user.name}!\n\n` +
          `Next Steps Care Coordination active. Monitor specialist referrals and ultrasound arrivals for your block:\n\n` +
          `💡 _Tips: Tap "Expected Arrivals" to view incoming patients, or type "worklist"._`,
        footer: 'Next Steps Care Coordination',
        buttons: [
          { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
          { id: 'CMD_WORKLIST', title: 'CHC Worklist' },
          { id: 'CMD_LANG', title: '🌐 Language / भाषा' },
        ],
      };
    }

    // PHC Staff Nurse or Medical Officer
    return {
      kind: 'buttons',
      to,
      header: `PHC ${facilityLabel}`.slice(0, 24),
      body:
        `Welcome ${user.name}!\n\n` +
        `Next Steps Care Coordination active. Monitor incoming referrals from Sub-centres, PMSMA, and doctor consults:\n\n` +
        `💡 _Tips: Tap "Expected Arrivals" to record patient visits, or type "alerts" for overdue items._`,
      footer: 'Next Steps Care Coordination',
      buttons: [
        { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
        { id: 'CMD_WORKLIST', title: 'PHC Worklist' },
        { id: 'CMD_LANG', title: '🌐 Language / भाषा' },
      ],
    };
  }

  // --- Hindi Mode (Default) ---
  if (user.role === 'anm') {
    return {
      kind: 'buttons',
      to,
      header: `Sub-centre ${facilityLabel}`.slice(0, 24),
      body:
        `नमस्ते ${user.name}!\n\n` +
        `Next Steps में आपका स्वागत है। नीचे दिए गए विकल्पों में से चुनें, या मरीज़ का नाम या मोबाइल नंबर टाइप करें:\n\n` +
        `💡 _सुझाव: ओवरड्यू विज़िट्स के लिए "alerts", नए मरीज़ के लिए "register", या भाषा बदलने के लिए "language" लिखें।_`,
      footer: 'Next Steps केयर कोऑर्डिनेशन',
      buttons: [
        { id: 'CMD_WORKLIST', title: 'Worklist' },
        { id: 'CMD_FIND_PATIENT', title: 'मरीज़ खोजें' },
        { id: 'CMD_LANG', title: '🌐 भाषा / English' },
      ],
    };
  }

  if (user.role === 'chc_sn' || user.role === 'chc_mo') {
    return {
      kind: 'buttons',
      to,
      header: `CHC ${facilityLabel}`.slice(0, 24),
      body:
        `नमस्ते ${user.name}!\n\n` +
        `Next Steps में आपका स्वागत है। अपने ब्लॉक के लिए विशेषज्ञ रेफरल और अल्ट्रासाउंड अराइवल्स की निगरानी करें:\n\n` +
        `💡 _सुझाव: आने वाले मरीज़ों के लिए "arrivals", या अपनी "worklist" देखें।_`,
      footer: 'Next Steps केयर कोऑर्डिनेशन',
      buttons: [
        { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
        { id: 'CMD_WORKLIST', title: 'CHC Worklist' },
        { id: 'CMD_LANG', title: '🌐 भाषा / English' },
      ],
    };
  }

  // PHC Staff Nurse or Medical Officer
  return {
    kind: 'buttons',
    to,
    header: `PHC ${facilityLabel}`.slice(0, 24),
    body:
      `नमस्ते ${user.name}!\n\n` +
      `Next Steps में आपका स्वागत है। सब-सेंटर से आने वाले रेफरल, PMSMA और डॉक्टर चेकअप की निगरानी करें:\n\n` +
      `💡 _सुझाव: आने वाले मरीज़ों के लिए "arrivals", या ओवरड्यू रेफरल के लिए "alerts" टाइप करें।_`,
    footer: 'Next Steps केयर कोऑर्डिनेशन',
    buttons: [
      { id: 'CMD_ARRIVALS', title: 'Expected Arrivals' },
      { id: 'CMD_WORKLIST', title: 'PHC Worklist' },
      { id: 'CMD_LANG', title: '🌐 भाषा / English' },
    ],
  };
}
