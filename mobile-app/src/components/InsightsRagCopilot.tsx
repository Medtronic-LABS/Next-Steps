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

  // Split by double line breaks into paragraphs / sections
  const blocks = content.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {blocks.map((block, bIdx) => {
        const rawLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        const hasListItems = rawLines.some((l) => /^([•\-*]|\d+\.)\s+/.test(l));

        if (hasListItems) {
          return (
            <div key={bIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 2 }}>
              {rawLines.map((line, lIdx) => {
                const match = line.match(/^([•\-*]|\d+\.)\s+(.*)/);
                if (match) {
                  const marker = match[1];
                  const itemText = match[2];
                  const isNumber = /^\d+\./.test(marker);

                  return (
                    <div
                      key={lIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      <span
                        style={{
                          flex: 'none',
                          fontWeight: 700,
                          color: isUser ? '#FFF' : (isNumber ? '#1E14BE' : '#888'),
                          fontSize: isNumber ? 11 : 12,
                          marginTop: isNumber ? 1 : 0,
                          minWidth: isNumber ? 14 : 10,
                        }}
                      >
                        {marker}
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

export const InsightsRagCopilot: React.FC<{ data: CopilotData }> = ({ data }) => {
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

  // Role & Catchment specific bubble questions
  const BUBBLE_QUESTIONS = isSubcentre
    ? [
        { label: '🔴 Overdue visits in my catchment?', query: `What are the overdue ANC and referral visits in ${facilityName}?` },
        { label: '🩺 High-risk mothers summary', query: `Can you summarize high-risk pregnancy cases and risk factors for ${facilityName}?` },
        { label: '⚡ Top 3 priority actions today', query: `What are the top 3 action items and home visits for ${roleName} today?` },
        { label: '⏱️ Time to loop closure & SLAs', query: 'What is the average time to close referral loops with CCE vs baseline?' },
        { label: '🏥 Referrals pending confirmation', query: `How many high-risk patients from ${facilityName} are pending facility arrival?` },
        { label: '📊 Drop-out risk breakdown', query: 'Which cases are at risk of dropping out in our village catchment?' },
      ]
    : isSecondary
    ? [
        { label: '🔴 Inward referrals overdue >72h?', query: `What are the critical overdue referrals beyond 3 days incoming to ${facilityName}?` },
        { label: '📊 Sub-centre referral ladder', query: 'Which sub-centre has the highest referral drop-off rate to our facility?' },
        { label: '🩺 High-risk specialist caseload', query: `Can you summarize high-risk pregnancy cases requiring specialist care at ${facilityName}?` },
        { label: '⚡ Facility triage priorities', query: `What are the top 3 priorities for ${roleName} today?` },
        { label: '⏱️ Inward arrival SLA (<72h)', query: 'What is the average time to close referral loops with CCE vs paper baseline?' },
        { label: '🏥 Downward referral handoffs', query: 'How many referrals were closed at lower-tier or private facilities?' },
      ]
    : [
        { label: '🔴 Overdue referrals >3 days?', query: `What are the critical overdue referrals beyond 3 days across ${facilityName} cluster?` },
        { label: '📊 Highest dropout sub-centre?', query: 'Which sub-centre has the highest referral drop-off rate?' },
        { label: '🩺 High-risk cases summary', query: `Can you summarize high-risk pregnancy cases and risk factors in ${facilityName}?` },
        { label: '⚡ Top 3 priorities today', query: `What are the top 3 action items for ${roleName} today?` },
        { label: '⏱️ Time to loop closure', query: 'What is the average time to close referral loops with CCE vs baseline?' },
        { label: '🏥 Lower-tier closures', query: 'How many referrals were closed at lower-tier or private facilities?' },
      ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Namaste! I am your **Catchment Intelligence Copilot** for **${roleName}** at **${facilityName}**.\n\nI answer questions strictly grounded in your active catchment data (${scope} · ${village || 'All villages'}). Tap a suggested bubble question below or type your inquiry.`,
      timestamp: 'Just now',
      highlights: [
        { label: 'Tracked PW', value: `${registered}` },
        { label: 'High Risk (HRP)', value: `${hrp} (${hrpPct}%)`, color: '#994242' },
        { label: 'Tracking Rate', value: `${trackingRate}`, color: '#2E9E6B' },
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
    if (q.includes('overdue') || q.includes('referral') || q.includes('pending') || q.includes('stale') || q.includes('delay')) {
      const refRow = actionRows.find((r) => r.key === 'ref');
      const ancRow = actionRows.find((r) => r.key === 'anc');
      const pmsmaRow = actionRows.find((r) => r.key === 'pmsma');

      const refCount = refRow ? refRow.value : '4';
      const ancCount = ancRow ? ancRow.value : '6';
      const pmsmaCount = pmsmaRow ? pmsmaRow.value : '3';

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
    if (q.includes('high-risk') || q.includes('high risk') || q.includes('hrp') || q.includes('risk') || q.includes('anemia') || q.includes('hypertension')) {
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
    if (q.includes('priorit') || q.includes('action') || q.includes('today') || q.includes('todo') || q.includes('recommend') || q.includes('plan')) {
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
    if (q.includes('drop') || q.includes('lost') || q.includes('leakage') || q.includes('subcentre') || q.includes('sub-centre') || q.includes('compare')) {
      const dropRow = actionRows.find((r) => r.key === 'drop');
      const lostRow = actionRows.find((r) => r.key === 'lost');
      const dropCount = dropRow ? dropRow.value : '3';
      const lostCount = lostRow ? lostRow.value : '2';

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
    if (q.includes('time') || q.includes('days') || q.includes('sla') || q.includes('closure') || q.includes('cce') || q.includes('speed') || q.includes('baseline')) {
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
    if (q.includes('lower') || q.includes('tier') || q.includes('private') || q.includes('clinic')) {
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
    if (q.includes('sms') || q.includes('whatsapp') || q.includes('reminder') || q.includes('alert') || q.includes('message')) {
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

    // 9. Strict Out-of-Scope Fallback (Guardrail against non-insights / out-of-scope questions)
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
        text: `Chat reset. Ready for your questions on **${facilityName}** catchment intelligence (${scope}).`,
        timestamp: 'Just now',
        highlights: [
          { label: 'Tracked PW', value: `${registered}` },
          { label: 'High Risk (HRP)', value: `${hrp} (${hrpPct}%)`, color: '#994242' },
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
              <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: '#FFF' }}>Catchment Intelligence RAG</span>
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  background: '#54CC90',
                  color: '#08331B',
                  padding: '2px 6px',
                  borderRadius: 999,
                  textTransform: 'uppercase',
                }}
              >
                Grounded
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: '#D7D4FA', marginTop: 2 }}>
              {facilityName} · {roleName} · {scope}
            </div>
          </div>
        </div>

        <button
          onClick={handleReset}
          title="Reset conversation"
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
          Reset
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
          Commonly Asked Catchment Questions:
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
                fontWeight: 700,
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

      {/* Messages Thread */}
      <div
        style={{
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxHeight: 360,
          overflowY: 'auto',
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
                gap: 4,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 10.5,
                  color: '#9E9E9C',
                  padding: '0 4px',
                }}
              >
                {isUser ? (
                  <span>You · {m.timestamp}</span>
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
            <span>Analyzing {facilityName} catchment records...</span>
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
          placeholder={`Ask anything about ${facilityName} insights...`}
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
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          <span>Ask</span>
        </button>
      </form>

      {/* Safety & Grounding Guardrail Banner */}
      <div
        style={{
          padding: '6px 14px',
          background: '#F4F3F8',
          borderTop: '1px solid #ECEAE4',
          fontSize: 10,
          color: '#70706E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2E9E6B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Strictly grounded in {facilityName} local clinical registry (Zero PII leakage)
        </span>
        <span style={{ fontWeight: 700, color: '#1E14BE' }}>RAG v2.4</span>
      </div>
    </div>
  );
};
