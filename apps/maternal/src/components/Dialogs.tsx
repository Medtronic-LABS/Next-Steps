// Bottom-sheet dialogs (referral / ANC / PMSMA / step action menu / complete /
// reschedule / SMS / scan), branched off the active dialog type.
import { BottomSheet } from './BottomSheet';
import { Icon } from './Icon';
import { useApp } from '../data/store';
import { CAT, LVL, ROLES, TODAY_ISO } from '../domain/constants';
import { clampPmsmaDay, fmt, fmtLong, isoOf, nextPmsma, ord, stepVM } from '../domain/logic';
import type { CloseSource, Level, Step, Woman } from '../domain/types';

const primaryBtn: React.CSSProperties = {
  width: '100%', padding: 15, border: 'none', borderRadius: 14, background: 'var(--ml-blue)',
  color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
};
const radioRow = (on: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', border: '1.5px solid',
  borderColor: on ? '#1E14BE' : '#DEDDD8', borderRadius: 13, background: on ? '#EFEDFF' : '#fff',
  cursor: 'pointer', textAlign: 'left', width: '100%',
});

function Radio({ on }: { on: boolean }) {
  return (
    <span style={{ flex: 'none', width: 20, height: 20, borderRadius: '50%', border: `2px solid ${on ? '#1E14BE' : '#DEDDD8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: on ? '#1E14BE' : 'transparent' }} />
    </span>
  );
}

export function Dialogs() {
  const {
    dialog, role, config, women, cap, dismissDialog, setDialog,
    confirmReferral, confirmDated, confirmPmsma, confirmScan, showToast,
    openComplete, confirmComplete, openReschedule, confirmReschedule,
    logContactAttempt, cancelStep, declineStep, callPatient, openSms,
  } = useApp();
  if (!dialog || !role) return null;
  const r = ROLES[role];

  return (
    <BottomSheet onDismiss={dismissDialog}>
      {dialog.type === 'referral' && (() => {
        const opts = [
          ...r.refUp.map((k) => ({ k, dir: 'Refer up' })),
          ...r.refDown.map((k) => ({ k, dir: 'Refer back' })),
        ];
        return (
          <>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 3 }}>Raise a referral</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>Choose the level she is referred to. No date needed — the facility schedules her.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {opts.map(({ k, dir }) => {
                const on = dialog.level === k;
                const lm = LVL[k as Level];
                return (
                  <button key={k} onClick={() => setDialog({ ...dialog, level: k as Level })} style={radioRow(on)}>
                    <Radio on={on} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14.5, fontWeight: 700, color: 'var(--text-strong)' }}>{lm.label}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{lm.facility}</span>
                    </span>
                    <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: lm.c }}>{dir}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={confirmReferral} style={{ ...primaryBtn, opacity: dialog.level ? 1 : 0.5 }}>Send referral</button>
          </>
        );
      })()}

      {dialog.type === 'anc' && (() => {
        const wsel = women.find((w) => w.id === cap?.womanId);
        const summary = dialog.date
          ? `${CAT[dialog.cat!].label} at ${r.facility} on ${fmtLong(dialog.date)}` +
            (wsel?.lmp ? ` — she will be ${Math.floor((Date.parse(dialog.date + 'T00:00:00') - Date.parse(wsel.lmp + 'T00:00:00')) / 604800000)} weeks then.` : '')
          : 'Pick a date to continue.';
        const quick = [7, 14, 28].map((d) => {
          const val = isoAdd(d);
          return { label: d === 7 ? 'In 1 week' : d === 14 ? 'In 2 weeks' : 'In 4 weeks', val, on: dialog.date === val };
        });
        return (
          <>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 3 }}>Schedule ANC visit</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>Pick the date she should come for her next antenatal check.</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {quick.map((q) => (
                <button key={q.label} onClick={() => setDialog({ ...dialog, date: q.val })} style={{ padding: '8px 13px', borderRadius: 999, border: '1.5px solid', borderColor: q.on ? r.accent : '#DEDDD8', background: q.on ? r.accent : '#fff', color: q.on ? '#fff' : '#2A2826', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{q.label}</button>
              ))}
            </div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 7 }}>Visit date</label>
            <input type="date" value={dialog.date} min={TODAY_ISO} onChange={(e) => setDialog({ ...dialog, date: e.target.value })} style={{ width: '100%', padding: 14, border: '1.5px solid var(--border-default)', borderRadius: 14, background: 'var(--surface-page)', fontSize: 16, color: 'var(--text-strong)', marginBottom: 10 }} />
            <div style={{ fontSize: 12.5, color: 'var(--text-body)', background: 'var(--surface-brand-soft)', borderRadius: 12, padding: '12px 13px', lineHeight: 1.5, marginBottom: 14 }}>{summary}</div>
            <button onClick={confirmDated} style={{ ...primaryBtn, opacity: dialog.date ? 1 : 0.5 }}>Submit</button>
          </>
        );
      })()}

      {dialog.type === 'pmsma' && (() => {
        const date = nextPmsma(config.pmsmaDay);
        return (
          <>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 3 }}>Schedule PMSMA visit</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>She is added to the monthly PMSMA session — no date to choose.</div>
            <div style={{ border: '1px solid var(--border-subtle)', borderLeft: '4px solid var(--ml-blue)', borderRadius: 16, padding: 15, background: 'var(--surface-brand-soft)', marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ml-blue)', marginBottom: 6 }}>Next session</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-.01em' }}>{fmtLong(date)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-body)', marginTop: 4 }}>{LVL.PHC.facility}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                PMSMA runs on the {ord(clampPmsmaDay(config.pmsmaDay))} of every month. She gets an SMS three days before and on the morning of the session.
              </div>
            </div>
            <button onClick={confirmPmsma} style={primaryBtn}>Add to PMSMA session</button>
          </>
        );
      })()}

      {dialog.type === 'stepmenu' && (() => {
        const found = findStep(women, dialog.stepId);
        if (!found) return null;
        const { s, w } = found;
        const vm = stepVM(s, w);
        const id = s.id;
        return (
          <>
            <button onClick={dismissDialog} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, padding: 0, marginBottom: 10 }}>
              <Icon path="M15 6l-6 6 6 6" size={15} stroke="var(--text-muted)" strokeWidth={2.4} />All steps for {w.name}
            </button>
            <div style={{ display: 'flex', gap: 11, alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)', marginBottom: 8 }}>
              <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 10, background: vm.lsoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: vm.lc }}>
                <Icon path={CAT[s.cat].icon} size={20} stroke="currentColor" strokeWidth={1.9} />
              </span>
              <div><div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text-strong)' }}>{vm.title}</div><div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{vm.dueLabel}</div></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ActionRow bg="#E9FBF0" iconColor="#128C4A" icon="M20 6L9 17l-5-5" label="Mark complete" onClick={() => openComplete(id)} />
              <ActionRow bg="#E7FBEF" iconColor="#1EA952" icon="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.3A8.5 8.5 0 1 1 21 11.5z" label="Send WhatsApp nudge" onClick={() => (w.consent ? openSms(id) : showToast('No reminder consent — opening dialler…'))} />
              <ActionRow bg="#FBEDE4" iconColor="#C35721" icon="M4 5c0 8 7 15 15 15l2.5-2.5-4-4-2.5 1.5a11 11 0 0 1-5-5L11 6.5 7 2.5 4 5z" label="Call her" onClick={() => callPatient(id)} />
              <ActionRow bg="#F0EFEC" iconColor="#595959" icon="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 1.8" label="Log contact attempt" onClick={() => logContactAttempt(id)} />
              <ActionRow bg="#EFEDFF" iconColor="#1E14BE" icon={CAT.PMSMA_VISIT.icon} label="Reschedule due date" onClick={() => openReschedule(id)} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => cancelStep(id)} style={{ flex: 1, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', padding: 12, borderRadius: 12, fontSize: 13.5, fontWeight: 700, color: 'var(--text-muted)' }}>Cancel step</button>
                <button onClick={() => declineStep(id)} style={{ flex: 1, border: '1.5px solid var(--status-warning)', background: 'var(--status-warning-soft)', cursor: 'pointer', padding: 12, borderRadius: 12, fontSize: 13.5, fontWeight: 700, color: '#C35721' }}>She declined</button>
              </div>
            </div>
          </>
        );
      })()}

      {dialog.type === 'complete' && (() => {
        const found = findStep(women, dialog.stepId);
        if (!found) return null;
        const { s, w } = found;
        const vm = stepVM(s, w);
        const sources: { k: CloseSource; l: string; h: string }[] = [
          { k: 'AT_REFERRED_FACILITY', l: 'At the referred facility', h: 'Service delivered at the facility she was sent to' },
          { k: 'OTHER_PUBLIC_FACILITY', l: 'At another public facility', h: 'A different government facility' },
          { k: 'PRIVATE_PROVIDER', l: 'At a private provider', h: 'She used private care' },
        ];
        return (
          <>
            <div style={{ display: 'flex', gap: 11, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ flex: 'none', width: 44, height: 44, borderRadius: 12, background: 'var(--ml-peppermint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#128C4A' }}>
                <Icon path="M20 6L9 17l-5-5" size={22} stroke="currentColor" strokeWidth={2.4} />
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>Mark complete</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{vm.title} · {w.name}</div>
              </div>
            </div>
            <SectionLabel>Where did care actually happen?</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {sources.map((x) => {
                const on = dialog.src === x.k;
                return (
                  <button key={x.k} onClick={() => setDialog({ ...dialog, src: x.k })} style={radioRow(on)}>
                    <Radio on={on} />
                    <span><span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text-strong)' }}>{x.l}</span><span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)' }}>{x.h}</span></span>
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              Records <strong>who</strong> completed it, <strong>where</strong>, and the outcome — visible to every level in her chain (FR-F-7).
            </div>
            <button onClick={confirmComplete} style={{ ...primaryBtn, background: 'var(--status-success)', opacity: dialog.src ? 1 : 0.5 }}>Confirm complete</button>
          </>
        );
      })()}

      {dialog.type === 'reschedule' && (() => {
        const found = findStep(women, dialog.stepId);
        if (!found) return null;
        const { s, w } = found;
        const vm = stepVM(s, w);
        const quick = [7, 14, 28].map((d) => {
          const val = isoOf(new Date(Date.parse(TODAY_ISO + 'T00:00:00') + d * 86_400_000));
          return { label: d === 7 ? 'In 1 week' : d === 14 ? 'In 2 weeks' : 'In 4 weeks', val, on: dialog.date === val };
        });
        return (
          <>
            <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 3 }}>Reschedule due date</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>{vm.title} · {w.name}. Reminders regenerate from the new date.</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {quick.map((q) => (
                <button key={q.label} onClick={() => setDialog({ ...dialog, date: q.val })} style={{ padding: '8px 13px', borderRadius: 999, border: '1.5px solid', borderColor: q.on ? r.accent : '#DEDDD8', background: q.on ? r.accent : '#fff', color: q.on ? '#fff' : '#2A2826', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{q.label}</button>
              ))}
            </div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 7 }}>New due date</label>
            <input type="date" value={dialog.date} min={TODAY_ISO} onChange={(e) => setDialog({ ...dialog, date: e.target.value })} style={{ width: '100%', padding: 14, border: '1.5px solid var(--border-default)', borderRadius: 14, background: 'var(--surface-page)', fontSize: 16, color: 'var(--text-strong)', marginBottom: 14 }} />
            <button onClick={confirmReschedule} style={{ ...primaryBtn, opacity: dialog.date ? 1 : 0.5 }}>Reschedule</button>
          </>
        );
      })()}

      {dialog.type === 'sms' && (() => {
        const found = findStep(women, dialog.stepId);
        if (!found) return null;
        const { s, w } = found;
        const lm = LVL[s.level];
        const smsHi = `नमस्ते ${w.name} जी। आपकी अगली ${s.cat === 'PMSMA_VISIT' ? 'पीएमएसएमए जाँच' : 'जाँच'} ${lm.label} पर ${fmt(s.due)} को निर्धारित है। कृपया समय पर पहुँचें। — स्वास्थ्य विभाग`;
        const smsEn = `"Hello ${w.name}. Your next visit at ${lm.label} is due on ${fmt(s.due)}. Please attend on time. — Health Dept."`;
        return (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 3 }}>Reminder preview</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>DLT-registered SMS · Hindi · to {w.name}</div>
            <div style={{ background: 'var(--surface-brand-soft)', borderRadius: '16px 16px 16px 5px', padding: '14px 15px', marginBottom: 8 }}>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ml-ink-900)' }}>{smsHi}</div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 16 }}>{smsEn}</div>
            <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 16 }}>
              <span style={{ background: 'var(--ml-peppermint)', color: '#1B6B47', fontWeight: 600, borderRadius: 6, padding: '2px 8px' }}>Quiet hours 9am–7pm</span>
              <span style={{ background: 'var(--ml-grey)', color: 'var(--ml-ink-800)', fontWeight: 600, borderRadius: 6, padding: '2px 8px' }}>1 / step / day</span>
            </div>
            <button onClick={() => { dismissDialog(); showToast('SMS nudge queued'); }} style={primaryBtn}>Send nudge now</button>
          </>
        );
      })()}

      {dialog.type === 'scan' && (
        <>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)', marginBottom: 3 }}>Scan ABHA QR</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>Point at the QR on her MCP card or printed ABHA sheet</div>
          <div style={{ aspectRatio: '1', background: '#0B0B12', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 34, border: '2px solid rgba(255,255,255,.35)', borderRadius: 14 }} />
            <div style={{ position: 'absolute', left: 34, right: 34, height: 2, background: 'var(--ml-seafoam)', boxShadow: '0 0 12px var(--ml-seafoam)', top: '50%' }} />
            <Icon path="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" size={90} stroke="rgba(255,255,255,.5)" strokeWidth={1.2} />
          </div>
          <button onClick={confirmScan} style={primaryBtn}>Simulate scan → find her record</button>
        </>
      )}
    </BottomSheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 9 }}>{children}</div>;
}

/** A tappable action in the step menu — soft icon tile + label + chevron. */
function ActionRow({ bg, iconColor, icon, label, onClick }: {
  bg: string; iconColor: string; icon: string; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', padding: '10px 2px' }}
    >
      <span style={{ flex: 'none', width: 40, height: 40, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon path={icon} size={19} stroke={iconColor} strokeWidth={2} />
      </span>
      <span style={{ flex: 1, fontSize: 15.5, fontWeight: 600, color: 'var(--text-strong)' }}>{label}</span>
      <Icon path="M9 6l6 6-6 6" size={18} stroke="var(--border-default)" strokeWidth={2.4} />
    </button>
  );
}

function findStep(women: Woman[], stepId?: string): { s: Step; w: Woman } | null {
  if (!stepId) return null;
  for (const w of women) {
    const s = w.steps.find((x) => x.id === stepId);
    if (s) return { s, w };
  }
  return null;
}

function isoAdd(days: number): string {
  const d = new Date(Date.parse(TODAY_ISO + 'T00:00:00') + days * 86_400_000);
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
