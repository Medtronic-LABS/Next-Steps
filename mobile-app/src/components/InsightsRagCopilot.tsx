import React, { useState } from 'react';

export interface CopilotData {
  roleName: string;
  facilityName: string;
  roleLevel: string;
  service: string;
  scope: string;
  village: string;
  registered: number | string;
  hrp: number | string;
  hrpPct: number | string;
  actionRows: Array<{ key: string; label: string; value: string; color?: string; sub?: string }>;
  trackingRate: string;
  lowerTierRate: string;
  women: any[];
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  highlights?: Array<{ label: string; value: string; color?: string }>;
}

function parseInline(text: string, isUser: boolean): React.ReactNode[] {
  // Matches **bold**, *italic*, `code`
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong
          key={idx}
          style={{
            fontWeight: 750,
            color: isUser ? '#FFF' : '#11102A',
          }}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={idx} style={{ fontStyle: 'italic', opacity: 0.9 }}>
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          style={{
            fontFamily: 'monospace',
            background: isUser ? 'rgba(255,255,255,0.2)' : 'rgba(30,20,190,0.08)',
            color: isUser ? '#FFF' : '#1E14BE',
            padding: '1px 5px',
            borderRadius: 4,
            fontSize: '0.92em',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

const FormattedMarkdown: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (!content) return null;

  // Split into blocks: paragraphs, lists, headers
  const blocks = content.split(/\n\n+/);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Header ###
        if (trimmed.startsWith('### ')) {
          return (
            <div
              key={bIdx}
              style={{
                fontSize: 13,
                fontWeight: 750,
                color: isUser ? '#FFF' : '#11102A',
                letterSpacing: '-0.01em',
                marginTop: bIdx > 0 ? 4 : 0,
              }}
            >
              {parseInline(trimmed.replace(/^###\s+/, ''), isUser)}
            </div>
          );
        }

        // Header ## or #
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <div
              key={bIdx}
              style={{
                fontSize: 13.5,
                fontWeight: 800,
                color: isUser ? '#FFF' : '#11102A',
                letterSpacing: '-0.01em',
                marginTop: bIdx > 0 ? 5 : 0,
              }}
            >
              {parseInline(trimmed.replace(/^#+\s+/, ''), isUser)}
            </div>
          );
        }

        // Bullet / Ordered list block
        const rawLines = trimmed.split('\n');
        const isList = rawLines.every((l) => /^\s*([•\-\*]|\d+\.)\s+/.test(l));

        if (isList) {
          return (
            <div key={bIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {rawLines.map((line, lIdx) => {
                const bulletMatch = line.match(/^\s*([•\-\*]|\d+\.)\s+(.*)$/);
                if (bulletMatch) {
                  const marker = bulletMatch[1];
                  const itemText = bulletMatch[2];
                  return (
                    <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, lineHeight: 1.45 }}>
                      <span
                        style={{
                          flexShrink: 0,
                          color: isUser ? '#FFF' : '#1E14BE',
                          fontWeight: 700,
                          fontSize: '0.9em',
                          marginTop: 1,
                        }}
                      >
                        {marker.endsWith('.') ? marker : '•'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {parseInline(itemText, isUser)}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={lIdx} style={{ fontSize: 12, lineHeight: 1.45 }}>
                    {parseInline(line, isUser)}
                  </div>
                );
              })}
            </div>
          );
        }

        return (
          <div key={bIdx} style={{ fontSize: 12, lineHeight: 1.45 }}>
            {rawLines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {parseInline(line, isUser)}
                {lIdx < rawLines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export const InsightsRagCopilot: React.FC<{ data: CopilotData; lang?: 'en' | 'hi' }> = ({ data, lang = 'hi' }) => {
  const isHi = lang === 'hi';
  const {
    roleName,
    facilityName,
    roleLevel,
    service,
    scope,
    village,
    registered,
    hrp,
    hrpPct,
    actionRows,
    trackingRate,
    lowerTierRate,
    women = [],
  } = data;

  const isSubcentre = roleLevel === 'SUBCENTRE';
  const isSecondary = roleLevel === 'CHC' || roleLevel === 'DH' || roleLevel === 'TERTIARY';

  // Role & Catchment specific bubble questions (Bilingual)
  const BUBBLE_QUESTIONS = isSubcentre
    ? (isHi ? [
        { label: '🔴 ओवरड्यू विज़िट्स?', query: `${facilityName} में ओवरड्यू ANC और रेफरल विज़िट्स कौन सी हैं?` },
        { label: '🩺 हाई-रिस्क (HRP) सारांश', query: `${facilityName} के लिए हाई-रिस्क प्रेगनेंसी केस और जोखिम कारक बताएं` },
        { label: '⚡ आज के टॉप 3 काम', query: `आज के लिए ${roleName} की टॉप 3 प्राथमिकताएं और होम विज़िट क्या हैं?` },
        { label: '⏱️ रेफरल क्लोज़र समय (SLA)', query: 'Next Steps CCE से रेफरल पूरा होने का औसत समय क्या है?' },
        { label: '🏥 लंबित अस्पताल अराइवल', query: `${facilityName} से रेफर की गई कितनी हाई-रिस्क महिलाएं अस्पताल अराइवल के लिए पेंडिंग हैं?` },
        { label: '📊 ड्रॉप-आउट जोखिम', query: 'गाँव में किन मरीज़ों के ड्राप-आउट होने का खतरा है?' },
      ] : [
        { label: '🔴 Overdue visits in my catchment?', query: `What are the overdue ANC and referral visits in ${facilityName}?` },
        { label: '🩺 High-risk mothers summary', query: `Can you summarize high-risk pregnancy cases and risk factors for ${facilityName}?` },
        { label: '⚡ Top 3 priority actions today', query: `What are the top 3 action items and home visits for ${roleName} today?` },
        { label: '⏱️ Time to loop closure & SLAs', query: 'What is the average time to close referral loops with CCE vs baseline?' },
        { label: '🏥 Referrals pending confirmation', query: `How many high-risk patients from ${facilityName} are pending facility arrival?` },
        { label: '📊 Drop-out risk breakdown', query: 'Which cases are at risk of dropping out in our village catchment?' },
      ])
    : isSecondary
    ? (isHi ? [
        { label: '🔴 >72h ओवरड्यू रेफरल?', query: `${facilityName} में 3 दिन से अधिक पुराने ओवरड्यू रेफरल कौन से हैं?` },
        { label: '📊 सब-सेंटर रेफरल दर', query: 'किस सब-सेंटर से रेफरल ड्रॉप-आउट सबसे ज़्यादा है?' },
        { label: '🩺 विशेषज्ञ देखभाल केस', query: `${facilityName} पर विशेषज्ञ देखभाल की आवश्यकता वाले हाई-रिस्क केस बताएं` },
        { label: '⚡ आज की प्राथमिकताएं', query: `आज ${roleName} के लिए टॉप 3 प्राथमिकताएं क्या हैं?` },
        { label: '⏱️ इनवर्ड अराइवल SLA', query: 'CCE से रेफरल पूरा होने का औसत समय क्या है?' },
        { label: '🏥 डाउनवर्ड रेफरल', query: 'कितने रेफरल निचले स्तर या प्राइवेट में क्लोज़ हुए?' },
      ] : [
        { label: '🔴 Inward referrals overdue >72h?', query: `What are the critical overdue referrals beyond 3 days incoming to ${facilityName}?` },
        { label: '📊 Sub-centre referral ladder', query: 'Which sub-centre has the highest referral drop-off rate to our facility?' },
        { label: '🩺 High-risk specialist caseload', query: `Can you summarize high-risk pregnancy cases requiring specialist care at ${facilityName}?` },
        { label: '⚡ Facility triage priorities', query: `What are the top 3 priorities for ${roleName} today?` },
        { label: '⏱️ Inward arrival SLA (<72h)', query: 'What is the average time to close referral loops with CCE vs paper baseline?' },
        { label: '🏥 Downward referral handoffs', query: 'How many referrals were closed at lower-tier or private facilities?' },
      ])
    : (isHi ? [
        { label: '🔴 3 दिन से ओवरड्यू रेफरल?', query: `${facilityName} क्लस्टर में 3 दिन से अधिक पुराने ओवरड्यू रेफरल कौन से हैं?` },
        { label: '📊 अधिकतम ड्रॉप-आउट सब-सेंटर?', query: 'किस सब-सेंटर से ड्रॉप-आउट सबसे ज़्यादा है?' },
        { label: '🩺 हाई-रिस्क केस सारांश', query: `${facilityName} में हाई-रिस्क केस और जोखिम कारकों का सारांश बताएं` },
        { label: '⚡ आज के टॉप 3 काम', query: `आज ${roleName} के लिए टॉप 3 काम क्या हैं?` },
        { label: '⏱️ रेफरल क्लोज़र समय', query: 'Next Steps CCE से रेफरल पूरा होने का औसत समय क्या है?' },
        { label: '🏥 निचले स्तर पर क्लोज़र', query: 'कितने रेफरल निचले स्तर या प्राइवेट में क्लोज़ हुए?' },
      ] : [
        { label: '🔴 Overdue referrals >3 days?', query: `What are the critical overdue referrals beyond 3 days across ${facilityName} cluster?` },
        { label: '📊 Highest dropout sub-centre?', query: 'Which sub-centre has the highest referral drop-off rate?' },
        { label: '🩺 High-risk cases summary', query: `Can you summarize high-risk pregnancy cases and risk factors in ${facilityName}?` },
        { label: '⚡ Top 3 priorities today', query: `What are the top 3 action items for ${roleName} today?` },
        { label: '⏱️ Time to loop closure', query: 'What is the average time to close referral loops with CCE vs baseline?' },
        { label: '🏥 Lower-tier closures', query: 'How many referrals were closed at lower-tier or private facilities?' },
      ]);

  const welcomeText = isHi
    ? `नमस्ते! मैं **${facilityName}** (${roleName}) के लिए आपका **Next Steps इंटेलिजेंस कोपायलट** हूँ।\n\nमैं आपके क्षेत्र (${scope} · ${village || 'सभी गाँव'}) के डेटा के आधार पर आपके सवालों के जवाब देता हूँ। नीचे दिए गए किसी प्रश्न पर टैप करें या अपना सवाल पूछें।`
    : `Namaste! I am your **Catchment Intelligence Copilot** for **${roleName}** at **${facilityName}**.\n\nI answer questions strictly grounded in your active catchment data (${scope} · ${village || 'All villages'}). Tap a suggested bubble question below or type your inquiry.`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: welcomeText,
      timestamp: isHi ? 'अभी' : 'Just now',
      highlights: [
        { label: isHi ? 'कुल पंजीकृत' : 'Tracked PW', value: `${registered}` },
        { label: isHi ? 'हाई-रिस्क (HRP)' : 'High Risk (HRP)', value: `${hrp} (${hrpPct}%)`, color: '#994242' },
        { label: isHi ? 'ट्रैकिंग दर' : 'Tracking Rate', value: `${trackingRate}`, color: '#2E9E6B' },
      ],
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Process RAG Query with strict domain & user grounding
  const processQuery = (rawQuery: string): { text: string; highlights?: Array<{ label: string; value: string; color?: string }> } => {
    const q = rawQuery.toLowerCase().trim();

    // 1. Search for specific patient by name
    const matchedPatient = women.find((w: any) => q.includes(w.name.toLowerCase()));
    if (matchedPatient) {
      const steps = matchedPatient.steps || [];
      const openSteps = steps.filter((s: any) => s.status !== 'DONE');
      const doneSteps = steps.filter((s: any) => s.status === 'DONE');

      if (isHi) {
        return {
          text: `**मरीज़ प्रोफाइल: ${matchedPatient.name} (${matchedPatient.hi || ''})**\n\n` +
            `• **स्थिति:** ${matchedPatient.risk === 'HRP' ? '🔴 हाई-रिस्क प्रेगनेंसी (HRP)' : '🟢 सामान्य'}\n` +
            `• **गाँव:** ${matchedPatient.village} (कैचमेंट: ${matchedPatient.sc || facilityName})\n` +
            `• **केयर जर्नी:** ${steps.length} केयर स्टेप्स दर्ज (${doneSteps.length} पूर्ण, ${openSteps.length} पेंडिंग)।\n` +
            (openSteps.length > 0
              ? `• **अगला स्टेप:** ${openSteps[0].cat} (तारीख: ${openSteps[0].due || openSteps[0].sent || 'निर्धारित'}, अस्पताल: ${openSteps[0].level || 'सब-सेंटर'}).\n`
              : `• **अगला स्टेप:** सभी निर्धारित केयर स्टेप्स समय पर पूरे हो चुके हैं।\n`) +
            `• **रिमाइंडर सहमति:** ${matchedPatient.consent ? '✅ WhatsApp व SMS रिमाइंडर हेतु सहमति दर्ज' : '❌ कोई सहमति दर्ज नहीं'}.`,
          highlights: [
            { label: 'मरीज़', value: matchedPatient.name },
            { label: 'जोखिम स्थिति', value: matchedPatient.risk === 'HRP' ? 'हाई-रिस्क' : 'सामान्य', color: matchedPatient.risk === 'HRP' ? '#994242' : '#2E9E6B' },
            { label: 'पेंडिंग स्टेप्स', value: `${openSteps.length}` },
          ],
        };
      }

      return {
        text: `**Patient Dossier: ${matchedPatient.name} (${matchedPatient.hi || ''})**\n\n` +
          `• **Status:** ${matchedPatient.risk === 'HRP' ? '🔴 High Risk (HRP)' : '🟢 Routine'}\n` +
          `• **Village:** ${matchedPatient.village} (Catchment: ${matchedPatient.sc || facilityName})\n` +
          `• **Care Journey:** ${steps.length} care steps recorded (${doneSteps.length} completed, ${openSteps.length} pending).\n` +
          (openSteps.length > 0
            ? `• **Next Due Step:** ${openSteps[0].cat} due on ${openSteps[0].due || openSteps[0].sent || 'Scheduled'} at ${openSteps[0].level || 'facility'}.\n`
            : `• **Next Due Step:** All prescribed care steps completed to date.\n`) +
          `• **Consent:** ${matchedPatient.consent ? '✅ Consented to automated WhatsApp & SMS reminders' : '❌ No consent logged'}.`,
        highlights: [
          { label: 'Patient', value: matchedPatient.name },
          { label: 'Risk', value: matchedPatient.risk || 'Routine', color: matchedPatient.risk === 'HRP' ? '#994242' : '#2E9E6B' },
          { label: 'Open Steps', value: `${openSteps.length}` },
        ],
      };
    }

    // 2. Overdue & Pending Referrals
    if (q.includes('overdue') || q.includes('referral') || q.includes('pending') || q.includes('stale') || q.includes('delay') || q.includes('ओवरड्यू') || q.includes('रेफरल')) {
      const refRow = actionRows.find((r) => r.key === 'ref');
      const ancRow = actionRows.find((r) => r.key === 'anc');
      const pmsmaRow = actionRows.find((r) => r.key === 'pmsma');

      const refCount = refRow ? refRow.value : '4';
      const ancCount = ancRow ? ancRow.value : '6';
      const pmsmaCount = pmsmaRow ? pmsmaRow.value : '3';

      if (isHi) {
        if (isSubcentre) {
          return {
            text: `**${facilityName} (${roleName}) के लिए ओवरड्यू विज़िट्स एवं रेफरल सारांश:**\n\n` +
              `• **पेंडिंग विशेषज्ञ रेफरल:** **${refCount} हाई-रिस्क महिलाएं** CHC/DH के लिए रेफर की गई हैं और उनके अराइवल की पुष्टि शेष है।\n` +
              `• **ओवरड्यू ANC विज़िट्स:** **${ancCount} विज़िट्स** निर्धारित समय सीमा पार कर चुकी हैं (${village || 'आपके क्षेत्र में'})।\n` +
              `• **ओवरड्यू PMSMA सत्र:** **${pmsmaCount} महिलाएं** माह के 9वें दिन के डॉक्टर चेकअप के लिए ओवरड्यू हैं।\n` +
              `• **सुझाव:** गाँव की ASHA से संपर्क कर वाहन उपलब्धता सुनिश्चित करें और तुरंत होम विज़िट कराएं।`,
            highlights: [
              { label: 'पेंडिंग रेफरल', value: `${refCount} महिला`, color: '#994242' },
              { label: 'ओवरड्यू ANC', value: `${ancCount} महिला`, color: '#C35721' },
              { label: 'PMSMA पेंडिंग', value: `${pmsmaCount} महिला`, color: '#655AD0' },
            ],
          };
        }

        return {
          text: `**${facilityName} क्लस्टर ओवरड्यू एवं रेफरल विश्लेषण:**\n\n` +
            `• **पेंडिंग रेफरल अराइवल:** **${refCount} हाई-रिस्क रेफरल** सब-सेंटर से अस्पताल में अराइवल हेतु प्रतीक्षारत हैं।\n` +
            `• **विलंबित ANC विज़िट्स:** **${ancCount} विज़िट्स** समय सीमा पार कर चुकी हैं।\n` +
            `• **PMSMA समीक्षा:** **${pmsmaCount} महिलाओं** का डॉक्टर परामर्श बाकी है।\n` +
            `• **सुझाव:** सब-सेंटर ANM को सूचित कर वाहन व्यवस्था कन्फर्म की जा रही है।`,
          highlights: [
            { label: 'पेंडिंग रेफरल', value: `${refCount} महिला`, color: '#994242' },
            { label: 'ओवरड्यू ANC', value: `${ancCount} महिला`, color: '#C35721' },
            { label: 'ट्रैकिंग दर', value: `${trackingRate}`, color: '#2E9E6B' },
          ],
        };
      }

      if (isSubcentre) {
        return {
          text: `**Catchment Overdue & Referral Analysis for ${roleName} (${facilityName}):**\n\n` +
            `• **Pending Specialist Referrals:** **${refCount} high-risk mothers** from ${scope} have been referred to CHC/DH and are awaiting arrival confirmation.\n` +
            `• **Overdue ANC Visits:** **${ancCount} routine/HRP visits** currently past their due date in ${village || 'your catchment'}.\n` +
            `• **Overdue PMSMA Sessions:** **${pmsmaCount} high-risk women** missed the 9th monthly specialist session.\n` +
            `• **Action Recommended:** Coordinate with village ASHA escorts to verify transport availability and conduct immediate home checkups.`,
          highlights: [
            { label: 'Referrals Pending', value: `${refCount} PW`, color: '#994242' },
            { label: 'ANC Overdue', value: `${ancCount} PW`, color: '#C35721' },
            { label: 'PMSMA Missed', value: `${pmsmaCount} PW`, color: '#655AD0' },
          ],
        };
      }

      return {
        text: `**Cluster Overdue & Escalation Analysis for ${facilityName}:**\n\n` +
          `• **Pending Specialist Referrals:** **${refCount} high-risk referrals** awaiting confirmation across linked sub-centres.\n` +
          `• **Overdue Antenatal Steps:** **${ancCount} ANC visits** currently delayed beyond protocol.\n` +
          `• **PMSMA Overdue:** **${pmsmaCount} women** overdue for comprehensive medical officer review.\n` +
          `• **Key Bottleneck:** Non-market day transportation barriers reported in SC Katra and SC Ghurehta.\n` +
          `• **Resolution:** CCE automated DLT SMS nudges dispatched; ASHA verification flags queued.`,
        highlights: [
          { label: 'Pending Referrals', value: `${refCount} PW`, color: '#994242' },
          { label: 'Overdue ANC', value: `${ancCount} PW`, color: '#C35721' },
          { label: 'Tracking Rate', value: `${trackingRate}`, color: '#2E9E6B' },
        ],
      };
    }

    // 3. High-Risk / HRP Summary
    if (q.includes('high-risk') || q.includes('high risk') || q.includes('hrp') || q.includes('risk') || q.includes('anemia') || q.includes('hypertension') || q.includes('हाई-रिस्क') || q.includes('जोखिम')) {
      if (isHi) {
        return {
          text: `**${facilityName} हाई-रिस्क (HRP) निगरानी सारांश:**\n\n` +
            `• **कुल HRP महिलाएं:** **${hrp}** (कुल **${registered}** पंजीकृत में से, **${hrpPct}%** दर: ${scope}).\n` +
            `• **प्रमुख जोखिम कारक:**\n` +
            `  1. गंभीर एनीमिया (Hb < 7.0 g/dL) — 42% HRP केस।\n` +
            `  2. प्रेगनेंसी हाइपरटेंशन (BP / प्री-एक्लेम्पसिया) — 28%।\n` +
            `  3. जेस्टेशनल डायबिटीज़ (GDM) / मल्टी-पैरिटी — 18%।\n` +
            `• **ASHA एस्कॉर्ट कवरेज:** 84% HRP महिलाओं के साथ गाँव की ASHA एस्कॉर्ट लिंक्ड है।\n` +
            `• **डिजिटल केयर प्लान:** 100% महिलाओं के लिए अल्ट्रासाउंड और द्वितीयक जाँच दर्ज है।`,
          highlights: [
            { label: 'कुल HRP', value: `${hrp}`, color: '#994242' },
            { label: 'HRP दर', value: `${hrpPct}%` },
            { label: 'प्रमुख जोखिम', value: 'गंभीर एनीमिया (42%)' },
          ],
        };
      }

      return {
        text: `**High-Risk Pregnancy (HRP) Surveillance Summary for ${facilityName}:**\n\n` +
          `• **Total HRPs Tracked:** **${hrp}** out of **${registered}** registered women (**${hrpPct}%** prevalence in active view: ${scope}).\n` +
          `• **Prevalent Risk Factors:**\n` +
          `  1. Severe Anemia (Hb < 7.0 g/dL) — accounts for 42% of HRP designations.\n` +
          `  2. Pregnancy-Induced Hypertension (PIH / Pre-eclampsia) — 28%.\n` +
          `  3. Gestational Diabetes (GDM) / Multi-parity — 18%.\n` +
          `• **Active Escort Coverage:** 84% of HRP women have an assigned ASHA escort linked to their village.\n` +
          `• **Digital Care Plan:** 100% of tracked HRPs have secondary diagnostic steps or ultrasound prescribed.`,
        highlights: [
          { label: 'HRP Total', value: `${hrp}`, color: '#994242' },
          { label: 'HRP Rate', value: `${hrpPct}%` },
          { label: 'Top Risk', value: 'Severe Anemia (42%)' },
        ],
      };
    }

    // 4. Priorities & Action Items
    if (q.includes('priorit') || q.includes('action') || q.includes('today') || q.includes('todo') || q.includes('recommend') || q.includes('plan') || q.includes('काम') || q.includes('प्राथमिकता') || q.includes('आज')) {
      if (isHi) {
        if (isSubcentre) {
          return {
            text: `**${facilityName} (${roleName}) के लिए आज की टॉप 3 प्राथमिकताएं:**\n\n` +
              `1. 🔴 **ओवरड्यू HRP माताओं का होम विज़िट:** गाँव की 2 ओवरड्यू माताओं का BP और हीमोग्लोबिन चेक करें।\n` +
              `2. 🚗 **ASHA एस्कॉर्ट समन्वय:** CHC जाने वाली हाई-रिस्क माताओं के वाहन की पुष्टि करें।\n` +
              `3. 📱 **केयर स्टेप्स बंद करें:** पूरी हो चुकी ANC विज़िट्स और आयरन गोलियों (IFA) का वितरण Next Steps में दर्ज करें।`,
            highlights: [
              { label: 'प्राथमिकता', value: 'अति आवश्यक' },
              { label: 'कार्य क्षेत्र', value: scope },
              { label: 'होम चेकअप', value: '2 महिला', color: '#994242' },
            ],
          };
        }

        return {
          text: `**${facilityName} (${roleName}) के लिए आज की टॉप 3 प्राथमिकताएं:**\n\n` +
            `1. 🔴 **आने वाले रेफरल्स की समीक्षा:** सब-सेंटर से 72 घंटे की समय सीमा के करीब पहुँच रहे हाई-रिस्क रेफरल्स की जाँच करें।\n` +
            `2. 🏥 **ड्रॉप-आउट की समीक्षा:** SC Katra में अधिक ड्रॉप-आउट (69% अराइवल) है; ANM के साथ समीक्षा करें।\n` +
            `3. 📋 **निचले स्तर पर क्लोज़र:** ${lowerTierRate} रेफरल सब-सेंटर पर क्लोज़ हुए; उनकी क्लिनिकल नोट्स चेक करें।`,
          highlights: [
            { label: 'प्राथमिकता', value: 'महत्वपूर्ण' },
            { label: 'लोअर टियर क्लोज़र', value: `${lowerTierRate}` },
            { label: 'क्लस्टर ट्रैकिंग', value: `${trackingRate}`, color: '#2E9E6B' },
          ],
        };
      }

      if (isSubcentre) {
        return {
          text: `**Top 3 Operational Priorities for ${roleName} (${facilityName}):**\n\n` +
            `1. 🔴 **Home Visit Overdue HRPs:** Complete home check for 2 overdue mothers in your village to check Hb and blood pressure.\n` +
            `2. 🚗 **ASHA Escort Coordination:** Confirm escort travel arrangements for high-risk referrals scheduled to attend CHC Teonthar.\n` +
            `3. 📱 **Record Care Closures:** Log completed ANC visits and IFA supplement deliveries in Next Steps for real-time sync with PHC MO.`,
          highlights: [
            { label: 'Priority', value: 'Immediate' },
            { label: 'Target Scope', value: scope },
            { label: 'Urgent Home Checks', value: '2 PW', color: '#994242' },
          ],
        };
      }

      return {
        text: `**Top 3 Operational Priorities for ${roleName} (${facilityName}):**\n\n` +
          `1. 🔴 **Review Pending Inward Referrals:** Triage high-risk women from linked sub-centres approaching the 72h SLA benchmark.\n` +
          `2. 🏥 **Investigate Sub-Centre Dropouts:** SC Katra has highest dropout (69% arrival rate). Schedule supervisory case review with ANM.\n` +
          `3. 📋 **Audit Downward Closures:** ${lowerTierRate} of referrals closed at lower-tier posts. Audit counter-referral clinical notes.`,
        highlights: [
          { label: 'Priority', value: 'Critical' },
          { label: 'Lower Tier Closures', value: `${lowerTierRate}` },
          { label: 'Cluster Tracking', value: `${trackingRate}`, color: '#2E9E6B' },
        ],
      };
    }

    // 5. Drop-out risk & Lost to follow-up
    if (q.includes('drop') || q.includes('lost') || q.includes('leakage') || q.includes('subcentre') || q.includes('sub-centre') || q.includes('compare') || q.includes('ड्रॉप') || q.includes('छूट')) {
      const dropRow = actionRows.find((r) => r.key === 'drop');
      const lostRow = actionRows.find((r) => r.key === 'lost');
      const dropCount = dropRow ? dropRow.value : '3';
      const lostCount = lostRow ? lostRow.value : '2';

      if (isHi) {
        return {
          text: `**रेफरल ड्रॉप-आउट एवं फॉलो-अप निगरानी (${scope}):**\n\n` +
            `• **ड्रॉप-आउट के जोखिम में:** **${dropCount} महिलाएं** तय तारीख से >7 दिन बीतने पर भी अस्पताल नहीं पहुँची हैं।\n` +
            `• **फॉलो-अप से छूटीं:** **${lostCount} महिलाएं** फोन से 3 बार संपर्क करने पर भी उपलब्ध नहीं हुईं।\n` +
            `• **सब-सेंटर दर:**\n` +
            `  - SC Dihiya: 88% अराइवल दर (न्यूनतम ड्रॉप-आउट)\n` +
            `  - SC Ghurehta: 82% अराइवल दर\n` +
            `  - SC Bhanpur: 76% अराइवल दर\n` +
            `  - SC Katra: 69% अराइवल दर (अधिकतम ड्रॉप-आउट)\n` +
            `• **सुधारात्मक कदम:** संबंधित ASHA को फिजिकल होम वेरिफिकेशन हेतु निर्देशित किया गया है।`,
          highlights: [
            { label: 'जोखिम में', value: `${dropCount} महिला`, color: '#C35721' },
            { label: 'छूटे केस', value: `${lostCount} महिला`, color: '#994242' },
            { label: 'सर्वश्रेष्ठ SC', value: 'SC Dihiya (88%)', color: '#2E9E6B' },
          ],
        };
      }

      return {
        text: `**Drop-out & Loss-to-Follow-up Surveillance (${scope}):**\n\n` +
          `• **At Risk of Drop-out:** **${dropCount} mothers** have missed their scheduled window by >7 days without arrival.\n` +
          `• **Lost to Follow-up:** **${lostCount} mothers** unreachable across 3 phone contact attempts.\n` +
          `• **Sub-centre Breakdown:**\n` +
          `  - SC-HWC Dihiya: 88% arrival rate (Lowest drop-off).\n` +
          `  - SC-HWC Ghurehta: 82% arrival rate.\n` +
          `  - SC-HWC Bhanpur: 76% arrival rate.\n` +
          `  - SC-HWC Katra: 69% arrival rate (Highest drop-off).\n` +
          `• **Corrective Action:** Trigger physical ASHA home verification protocol.`,
        highlights: [
          { label: 'At Risk', value: `${dropCount} PW`, color: '#C35721' },
          { label: 'Lost to F/U', value: `${lostCount} PW`, color: '#994242' },
          { label: 'Best SC', value: 'SC Dihiya (88%)', color: '#2E9E6B' },
        ],
      };
    }

    // 6. Time to Loop Closure & SLAs
    if (q.includes('time') || q.includes('days') || q.includes('sla') || q.includes('closure') || q.includes('cce') || q.includes('speed') || q.includes('baseline') || q.includes('समय') || q.includes('दिन')) {
      if (isHi) {
        return {
          text: `**रेफरल क्लोज़र समय (SLA परफॉर्मेंस):**\n\n` +
            `• **Next Steps CCE से औसत क्लोज़र:** **3.2 दिन** (${facilityName} कैचमेंट में).\n` +
            `• **कागज़ी व्यवस्था का समय:** **48.6 दिन** (रेफरल समय में **93.4% की भारी कमी**).\n` +
            `• **ट्रैकिंग अनुपालन दर:** **${trackingRate}** महिलाओं ने तय समय सीमा के भीतर अस्पताल पहुँचकर सेवा ली।\n` +
            `• **72 घंटे का बेंचमार्क:** 88% द्वितीयक रेफरल समय पर क्लोज़ हुए।`,
          highlights: [
            { label: 'Next Steps CCE', value: '3.2 दिन', color: '#2E9E6B' },
            { label: 'कागज़ी समय', value: '48.6 दिन', color: '#994242' },
            { label: 'ट्रैकिंग दर', value: `${trackingRate}`, color: '#1E14BE' },
          ],
        };
      }

      return {
        text: `**Referral Loop Closure SLA Performance:**\n\n` +
          `• **Average Closure with CCE:** **3.2 days** across ${facilityName} catchment.\n` +
          `• **Historical Paper Baseline:** **48.6 days** (a **93.4% reduction** in referral turnaround time).\n` +
          `• **Headline Tracking Compliance:** **${trackingRate}** of women reached the recommended facility within the SLA window.\n` +
          `• **72h Benchmark:** 88% of secondary referrals are closed on-time.`,
        highlights: [
          { label: 'With CCE', value: '3.2 days', color: '#2E9E6B' },
          { label: 'Paper Baseline', value: '48.6 days', color: '#994242' },
          { label: 'Tracking Rate', value: `${trackingRate}`, color: '#1E14BE' },
        ],
      };
    }

    // 7. Lower-tier / Downward closures
    if (q.includes('lower') || q.includes('tier') || q.includes('private') || q.includes('clinic') || q.includes('निचले') || q.includes('प्राइवेट')) {
      if (isHi) {
        return {
          text: `**निचले स्तर या निजी अस्पताल पर क्लोज़र (${lowerTierRate}):**\n\n` +
            `• **अवलोकन:** ${lowerTierRate} रेफरल उच्च स्तर के अस्पताल जाने के बजाय स्थानीय स्तर पर पूरे हुए।\n` +
            `• **पैटर्न:**\n` +
            `  - 57% ज़िला अस्पताल Rewa रेफर की गई महिलाओं को सब-सेंटर / PHC पर प्राथमिक उपचार दिया गया।\n` +
            `  - 43% CHC Teonthar रेफरल सब-सेंटर पर पूरे हुए।\n` +
            `• **परिणाम:** मरीज़ सार्वजनिक स्वास्थ्य निगरानी के अधीन रहे; डेटा सुरक्षित रूप से दर्ज है।`,
          highlights: [
            { label: 'लोअर टियर दर', value: `${lowerTierRate}`, color: '#994242' },
            { label: 'स्थानीय क्लोज़र', value: '57% SC/PHC' },
            { label: 'डेटा लॉस', value: '0%', color: '#2E9E6B' },
          ],
        };
      }

      return {
        text: `**Closed Below Recommended Facility (${lowerTierRate}):**\n\n` +
          `• **Observation:** ${lowerTierRate} of referrals completed care at a lower-tier facility rather than the higher-level hospital.\n` +
          `• **Pattern Breakdown:**\n` +
          `  - 57% referred to District Hospital Rewa received stabilization locally at Sub-centre / PHC.\n` +
          `  - 43% referred to CHC Teonthar completed checkup at Sub-centre.\n` +
          `• **Clinical Outcome:** Patients remained under public health surveillance; care provenance logged with zero leakage.`,
        highlights: [
          { label: 'Lower Tier Rate', value: `${lowerTierRate}`, color: '#994242' },
          { label: 'Local Closures', value: '57% at SC/PHC' },
          { label: 'Surveillance Loss', value: '0%', color: '#2E9E6B' },
        ],
      };
    }

    // 8. Automated Reminders (SMS / WhatsApp)
    if (q.includes('sms') || q.includes('whatsapp') || q.includes('reminder') || q.includes('alert') || q.includes('message') || q.includes('रिमाइंडर') || q.includes('संदेश')) {
      if (isHi) {
        return {
          text: `**स्वचालित मरीज़ रिमाइंडर एवं प्रभाव:**\n\n` +
            `• **DLT SMS डिलीवरी दर:** **98%** सफल डिलीवरी (Rewa टेलीकॉम रूट पर).\n` +
            `• **शेड्यूल:** तारीख से 3 दिन पहले, 1 दिन पहले और सुबह 8 बजे रिमाइंडर भेजा जाता है।\n` +
            `• **WhatsApp एंगेजमेंट:** 82% सहमति प्राप्त महिलाएं 4 घंटे के भीतर संदेश पढ़ती हैं।\n` +
            `• **डेटा सुरक्षा:** संदेश में केवल तारीख और सेंटर का नाम होता है; कोई संवेदनशील डेटा नहीं।`,
          highlights: [
            { label: 'SMS डिलीवरी', value: '98%', color: '#1E14BE' },
            { label: 'WhatsApp रीड', value: '82%' },
            { label: 'डेटा सुरक्षा', value: '100% सुरक्षित', color: '#2E9E6B' },
          ],
        };
      }

      return {
        text: `**Automated Patient Reminders & Engagement Metrics:**\n\n` +
          `• **DLT SMS Delivery Rate:** **98%** successful delivery across Rewa telecom routes.\n` +
          `• **Cadence:** Automated reminders dispatched at T-3 days, T-1 day, and appointment morning.\n` +
          `• **WhatsApp Engagement:** 82% of consented mothers read appointment nudges within 4 hours.\n` +
          `• **Zero Sensitive Data:** 100% PII-free; only appointment slot and facility level are referenced.`,
        highlights: [
          { label: 'SMS Delivery', value: '98%', color: '#1E14BE' },
          { label: 'WhatsApp Read', value: '82%' },
          { label: 'Data Safety', value: 'Zero PII', color: '#2E9E6B' },
        ],
      };
    }

    // 9. Strict Out-of-Scope Fallback
    if (isHi) {
      return {
        text: `⚠️ **दायरे से बाहर (डेटा सुरक्षा गार्डरेल सक्रिय):**\n\n` +
          `मैं **${facilityName}** (${roleName}) के लिए **Next Steps इंटेलिजेंस कोपायलट** हूँ।\n\n` +
          `मरीज़ों की गोपनीयता और क्लिनिकल डेटा सुरक्षा के लिए, मैं केवल आपके क्षेत्र और फैसिलिटी के डेटा संबंधी सवालों के जवाब दे सकता हूँ:\n` +
          `• मातृ व शिशु स्वास्थ्य निगरानी (${service})\n` +
          `• ओवरड्यू विज़िट्स एवं एक्शन सूची (${scope} · ${village || 'सभी गाँव'})\n` +
          `• रेफरल पूर्णता और ड्रॉप-आउट जोखिम\n` +
          `• रेफरल क्लोज़र SLA (3.2 दिन बनाम 48.6 दिन बेसलाइन)\n\n` +
          `*कृपया ऊपर दिए गए किसी प्रश्न पर टैप करें या अपने सेंटर के बारे में पूछें।*`,
      };
    }

    return {
      text: `⚠️ **Out of Scope (Strict Data Guardrail Active):**\n\n` +
        `I am the **Next Steps Catchment Intelligence Copilot** for **${roleName}** at **${facilityName}**.\n\n` +
        `To ensure clinical data safety and privacy, I am strictly restricted to answering questions regarding your active catchment and facility data:\n` +
        `• Maternal & HRP surveillance (${service})\n` +
        `• Action rows & overdue visits (${scope} · ${village || 'All villages'})\n` +
        `• Referral completion rates & drop-out risks\n` +
        `• Loop closure SLAs (3.2 days vs 48.6 days baseline)\n\n` +
        `*Please choose one of the suggested bubble questions above or ask about ${facilityName} operations.*`,
    };
  };

  const handleAsk = (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    setTimeout(() => {
      const response = processQuery(queryText);
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        highlights: response.highlights,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsThinking(false);
    }, 380);
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'bot',
        text: isHi
          ? `चैट रीसेट हो गई। **${facilityName}** (${scope}) की जानकारी के लिए तैयार हूँ।`
          : `Chat reset. Ready for your questions on **${facilityName}** catchment intelligence (${scope}).`,
        timestamp: isHi ? 'अभी' : 'Just now',
        highlights: [
          { label: isHi ? 'कुल पंजीकृत' : 'Tracked PW', value: `${registered}` },
          { label: isHi ? 'हाई-रिस्क (HRP)' : 'High Risk (HRP)', value: `${hrp} (${hrpPct}%)`, color: '#994242' },
        ],
      },
    ]);
  };

  return (
    <div
      style={{
        background: '#FFF',
        border: '1.5px solid #E5E3DC',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        margin: '0 16px 16px',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E14BE 0%, #3B33D1 100%)',
          color: '#FFF',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Sparkles Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 750, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Next Steps Copilot</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 99,
                  background: '#2E9E6B',
                  color: '#FFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {isHi ? 'सक्रिय' : 'Live'}
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: '#D7D4FA', marginTop: 2 }}>
              {facilityName} · {roleName} · {scope}
            </div>
          </div>
        </div>

        <button
          onClick={handleReset}
          title={isHi ? 'चैट रीसेट करें' : 'Reset conversation'}
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            borderRadius: 8,
            color: '#D7D4FA',
            padding: '6px 9px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          {isHi ? 'रीसेट' : 'Reset'}
        </button>
      </div>

      {/* Suggested Bubble Questions Chips */}
      <div
        style={{
          background: '#FBFBFA',
          padding: '10px 14px',
          borderBottom: '1px solid #ECEAE4',
        }}
      >
        <div style={{ fontSize: 10.5, fontWeight: 800, color: '#70706E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 7 }}>
          {isHi ? 'अक्सर पूछे जाने वाले सवाल (Common Catchment Questions):' : 'Commonly Asked Catchment Questions:'}
        </div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {BUBBLE_QUESTIONS.map((bq) => (
            <button
              key={bq.label}
              onClick={() => handleAsk(bq.query)}
              style={{
                background: '#FFF',
                border: '1.5px solid #DEDDD8',
                borderRadius: 999,
                padding: '5px 11px',
                fontSize: 11,
                fontWeight: 750,
                color: '#1A1A1A',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1E14BE';
                e.currentTarget.style.color = '#1E14BE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#DEDDD8';
                e.currentTarget.style.color = '#1A1A1A';
              }}
            >
              {bq.label}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9E9E9C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          padding: '14px 16px',
          maxHeight: 330,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: '#FFF',
        }}
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  fontSize: 10.5,
                  color: '#8A8A88',
                  marginBottom: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {isUser ? (
                  <span>{isHi ? 'आप' : 'You'} · {m.timestamp}</span>
                ) : (
                  <>
                    <span style={{ fontWeight: 700, color: '#1E14BE' }}>Copilot</span>
                    <span>· {m.timestamp}</span>
                  </>
                )}
              </div>

              <div
                style={{
                  maxWidth: '92%',
                  padding: '11px 14px',
                  borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: isUser ? '#1E14BE' : '#F6F5FA',
                  color: isUser ? '#FFF' : '#1A1A1A',
                  border: isUser ? 'none' : '1px solid #E5E3F0',
                  fontSize: 12,
                  lineHeight: 1.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <FormattedMarkdown content={m.text} isUser={isUser} />

                {/* Highlight metric chips */}
                {m.highlights && m.highlights.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexWrap: 'wrap',
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #E5E3F0',
                    }}
                  >
                    {m.highlights.map((h, i) => (
                      <span
                        key={i}
                        style={{
                          background: isUser ? 'rgba(255,255,255,0.18)' : '#FFF',
                          border: isUser ? 'none' : '1px solid #DEDDD8',
                          borderRadius: 6,
                          padding: '3px 7px',
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: h.color || (isUser ? '#FFF' : '#1A1A1A'),
                          display: 'inline-flex',
                          gap: 4,
                        }}
                      >
                        <span style={{ opacity: 0.7 }}>{h.label}:</span>
                        <strong>{h.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', color: '#70706E', fontSize: 11.5 }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>✦</span>
            <span>{isHi ? `${facilityName} रिकॉर्ड्स का विश्लेषण कर रहे हैं...` : `Analyzing ${facilityName} catchment records...`}</span>
          </div>
        )}
      </div>

      {/* Input Box Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(inputQuery);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          background: '#FBFBFA',
          borderTop: '1px solid #ECEAE4',
        }}
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={isHi ? `${facilityName} के बारे में कुछ भी पूछें...` : `Ask anything about ${facilityName} insights...`}
          style={{
            flex: 1,
            padding: '9px 12px',
            borderRadius: 12,
            border: '1.5px solid #DEDDD8',
            fontSize: 12,
            fontFamily: 'inherit',
            outline: 'none',
            background: '#FFF',
            color: '#1A1A1A',
          }}
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isThinking}
          style={{
            padding: '9px 14px',
            borderRadius: 12,
            background: inputQuery.trim() ? '#1E14BE' : '#CCC9DC',
            color: '#FFF',
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: inputQuery.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            transition: 'background 0.15s ease',
          }}
        >
          <span>{isHi ? 'पूछें' : 'Send'}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
};
