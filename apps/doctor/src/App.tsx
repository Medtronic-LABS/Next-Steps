import { useState } from 'react';
import {
  answerQuestion,
  CLINIC_TIMEZONE,
  initials,
  trendPath,
  type AiResponseGrounding,
  type AnswerResult,
  type DecoratedStep,
  type DrillKey,
  type DrillView,
  type Id,
  type Insights as InsightsData,
  type TimelineVisit,
} from '@next-steps/core';
import { engine, useEngineData, useEngineSync } from './lib/engine';
import { createStubModelClient } from './lib/stubModelClient';
import { Icon, PATHS } from './components/icons';

type Screen = 'dash' | 'drill' | 'timeline' | 'insights';

const S = {
  strong: 'var(--text-strong)',
  body: 'var(--text-body)',
  muted: 'var(--text-muted)',
  subtle: 'var(--text-subtle)',
  peri: 'var(--ml-periwinkle)',
} as const;

const TAB_ICONS = {
  grid: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  chart: 'M3 3v18h18M7 14l4-4 3 3 5-6',
};

// ITEM-7-AI-INSIGHTS.md AI-8: stubbed for now — a real provider adapter is a later batch.
const aiModelClient = createStubModelClient();

const AI_EXAMPLE_QUESTIONS = [
  "What's our completion rate this month?",
  'How many patients need attention?',
  "What's our overdue backlog?",
  'How are referrals doing?',
  'How many patients are unreachable?',
];

export default function App() {
  useEngineSync();
  const [screen, setScreen] = useState<Screen>('dash');
  const [drillKey, setDrillKey] = useState<DrillKey>('overdue');
  const [period, setPeriod] = useState(1); // 0=7d, 1=30d, 2=90d
  const [timelinePatientId, setTimelinePatientId] = useState<Id | null>(null);

  const openDrill = (k: DrillKey) => { setDrillKey(k); setScreen('drill'); };
  const openPatient = (pid: Id) => { setTimelinePatientId(pid); setScreen('timeline'); };

  return (
    <div className="screen">
      <header className="appbar" style={{ paddingBottom: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: S.strong, letterSpacing: '-.01em' }}>Good morning, doctor</div>
          <div style={{ fontSize: 12.5, color: S.muted }}>{engine.clinic().name} · synced 9:38 AM</div>
        </div>
        <div className="avatar" style={{ width: 40, height: 40, background: 'var(--ml-periwinkle)', color: '#fff', fontSize: 14 }}>MA</div>
      </header>

      <div className="body nsScroll">
        {screen === 'dash' && <Dashboard onOpenDrill={openDrill} />}
        {screen === 'drill' && <DrillDown drillKey={drillKey} onBack={() => setScreen('dash')} onOpenPatient={openPatient} />}
        {screen === 'timeline' && <Timeline patientId={timelinePatientId} onBack={() => setScreen('drill')} />}
        {screen === 'insights' && <Insights period={period} setPeriod={setPeriod} />}
      </div>

      <nav className="tabbar">
        <button className="tab" style={{ color: screen === 'insights' ? S.subtle : S.peri }} onClick={() => setScreen('dash')}>
          <Icon path={TAB_ICONS.grid} size={23} width={2} /><span>Follow-through</span>
        </button>
        <button className="tab" style={{ color: screen === 'insights' ? S.peri : S.subtle }} onClick={() => setScreen('insights')}>
          <Icon path={TAB_ICONS.chart} size={23} width={2} /><span>Insights</span>
        </button>
      </nav>
    </div>
  );
}

// ============================================================================
// Dashboard
// ============================================================================
function Dashboard({ onOpenDrill }: { onOpenDrill: (k: DrillKey) => void }) {
  const { data: cardsData } = useEngineData(() => engine.summaryCards(), []);
  const { data: attnData } = useEngineData(() => engine.heroAttn(), []);
  const cards = cardsData ?? [];
  const attn = attnData ?? 0;
  return (
    <div style={{ padding: '2px 18px 22px', animation: 'nsFade .2s ease' }}>
      <div style={{ background: 'linear-gradient(135deg,#6165DE,#1E14BE)', borderRadius: 18, padding: '16px 18px', color: '#fff', marginBottom: 16 }}>
        <div style={{ fontSize: 13, opacity: 0.85, fontWeight: 500 }}>Patients needing attention</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 2 }}>
          <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-.02em' }}>{attn}</span>
          <span style={{ fontSize: 13, opacity: 0.85, paddingBottom: 8 }}>of 218 active</span>
        </div>
        <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 6, lineHeight: 1.4 }}>Any patient with an overdue or unreachable next step.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        {cards.map((c) => (
          <button key={c.key} className="card" style={{ textAlign: 'left', padding: 14, cursor: 'pointer' }} onClick={() => onOpenDrill(c.key)}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: c.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Icon path={c.iconPath} size={18} stroke={c.color} width={1.9} /></div>
            <div style={{ fontSize: 28, fontWeight: 800, color: S.strong, letterSpacing: '-.02em', lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 12.5, color: S.muted, marginTop: 3, lineHeight: 1.25 }}>{c.label}</div>
          </button>
        ))}
      </div>

      <div className="section-label" style={{ margin: '20px 0 6px' }}>Note</div>
      <div style={{ fontSize: 12.5, color: S.muted, lineHeight: 1.5, background: 'var(--surface-brand-soft)', borderRadius: 12, padding: '12px 14px' }}>
        Every number here comes only from next-step follow-through — never clinical data. This view supports patients through care; it never scores staff or specialists.
      </div>
    </div>
  );
}

// ============================================================================
// Drill-down
// ============================================================================
const EMPTY_DRILL: DrillView = { title: '', sub: '', rows: [] };

function DrillDown({ drillKey, onBack, onOpenPatient }: { drillKey: DrillKey; onBack: () => void; onOpenPatient: (pid: Id) => void }) {
  const { data } = useEngineData(() => engine.drill(drillKey), [drillKey]);
  const d = data ?? EMPTY_DRILL;
  return (
    <div style={{ padding: '2px 18px 22px', animation: 'nsFade .2s ease' }}>
      <button className="back-link" onClick={onBack}><Icon path={PATHS.chevLeft} size={17} width={2.2} />Dashboard</button>
      <div className="h-screen" style={{ fontSize: 21 }}>{d.title}</div>
      <div className="p-sub" style={{ marginBottom: 14 }}>{d.sub}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {d.rows.map((r) => (
          <button key={r.id} className="ns-row" style={{ borderLeft: `3px solid ${r.color}`, borderRadius: 13, padding: '12px 13px' }} onClick={() => onOpenPatient(r.pid)}>
            <div style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', background: r.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon path={r.iconPath} size={18} stroke={r.color} width={1.9} /></div>
            <div className="grow"><div style={{ fontSize: 14.5, fontWeight: 600, color: S.strong }}>{r.patientName}</div><div style={{ fontSize: 12.5, color: S.muted }}>{r.detail} · {r.dueDate}</div></div>
            <div style={{ textAlign: 'right', flex: 'none' }}><div style={{ fontSize: 11.5, fontWeight: 700, color: r.badgeColor, whiteSpace: 'nowrap' }}>{r.badge}</div><div style={{ fontSize: 11, color: S.subtle, marginTop: 3, whiteSpace: 'nowrap' }}>{r.delivery}</div></div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Care timeline (coordination only) — FR-D-2.3, §11.4
// ============================================================================
function formatClinicDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIMEZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

/** A visit's dot colour reflects its steps' coordination state — never a clinical judgement. */
function visitDotColor(steps: DecoratedStep[]): string {
  if (steps.some((s) => s.isOverdue)) return 'var(--status-danger)';
  if (steps.length > 0 && steps.every((s) => s.status === 'COMPLETED')) return 'var(--status-success)';
  return 'var(--ml-blue)';
}

function TimelineStep({ step }: { step: DecoratedStep }) {
  const isTerminal = step.status === 'CANCELLED' || step.status === 'DECLINED';
  const badge =
    step.status === 'COMPLETED' ? 'Completed'
    : step.status === 'CANCELLED' ? 'Cancelled'
    : step.status === 'DECLINED' ? 'Declined'
    : step.isOverdue ? `Overdue ${step.daysOverdue}d`
    : 'Scheduled';
  const badgeColor =
    step.status === 'COMPLETED' ? 'var(--status-success)'
    : isTerminal ? S.muted
    : step.isOverdue ? 'var(--status-danger)'
    : 'var(--ml-blue)';
  const badgeBg =
    step.status === 'COMPLETED' ? 'var(--status-success-soft)'
    : isTerminal ? 'var(--surface-page)'
    : step.isOverdue ? 'var(--status-danger-soft)'
    : 'var(--surface-brand-soft)';
  const meta =
    step.status === 'COMPLETED' && step.completedDate ? `Completed ${formatClinicDate(step.completedDate)}`
    : step.status === 'CANCELLED' ? `Cancelled${step.reason ? ' · ' + step.reason : ''}`
    : step.status === 'DECLINED' ? `Declined${step.declineReason ? ' · ' + step.declineReason : ''}`
    : step.statusText;
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 11, padding: '10px 12px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: S.strong }}>{step.categoryLabel}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor, background: badgeBg, padding: '2px 8px', borderRadius: 999 }}>{badge}</span>
      </div>
      <div style={{ fontSize: 11.5, color: S.muted, marginTop: 5 }}>{meta}</div>
    </div>
  );
}

const EMPTY_TIMELINE: TimelineVisit[] = [];

function Timeline({ patientId, onBack }: { patientId: Id | null; onBack: () => void }) {
  const { data: visitsData } = useEngineData(
    () => (patientId ? engine.patientTimeline(patientId) : Promise.resolve(EMPTY_TIMELINE)),
    [patientId],
  );
  const { data: patient } = useEngineData(
    () => (patientId ? engine.getPatient(patientId) : Promise.resolve(undefined)),
    [patientId],
  );
  const visits = visitsData ?? EMPTY_TIMELINE;

  return (
    <div style={{ animation: 'nsFade .2s ease' }}>
      <div style={{ background: 'linear-gradient(135deg,#6165DE,#1E14BE)', padding: '14px 18px 18px', color: '#fff' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'rgba(255,255,255,.16)', cursor: 'pointer', color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '6px 11px', borderRadius: 999, marginBottom: 13 }}><Icon path={PATHS.chevLeft} size={15} width={2.4} />Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="avatar" style={{ width: 48, height: 48, background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: 17 }}>{patient ? initials(patient.name) : ''}</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{patient?.name ?? ''}</div>
            <div style={{ fontSize: 12.5, opacity: 0.85 }}>{patient ? `${patient.gender} · ${patient.age} · last visit ${patient.last}` : ''}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px 18px 24px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: S.subtle, letterSpacing: '.03em', marginBottom: 12 }}>CARE TIMELINE · coordination only</div>

        {visits.map((v, i) => (
          <div key={v.visitId} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: visitDotColor(v.steps), border: '3px solid var(--surface-page)' }} />
              {i < visits.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--border-subtle)' }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: i < visits.length - 1 ? 20 : 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: S.strong }}>Visit · {formatClinicDate(v.visitDateTime)}</div>
              <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {v.steps.map((s) => <TimelineStep key={s.id} step={s} />)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Insights
// ============================================================================
const EMPTY_INSIGHTS: InsightsData = {
  completionRate: 0,
  completionOf: '',
  prevRate: null,
  deltaPts: null,
  trend: [],
  trendHasEnoughData: false,
  catBars: [],
  backlogBars: [],
  referral: { rate: 0, ofLabel: '', medianDays: 0 },
  followThrough: [],
  followThroughNote: '',
};

function Insights({ period, setPeriod }: { period: number; setPeriod: (i: number) => void }) {
  const periodDays = [7, 30, 90][period];
  const { data } = useEngineData(() => engine.insights(periodDays), [periodDays]);
  const ins = data ?? EMPTY_INSIGHTS;
  const t = trendPath(ins.trend);
  const backlogTotal = ins.backlogBars.reduce((a, b) => a + b.value, 0);
  const periods = ['7 days', '30 days', '90 days'];
  // NS-1: the maternal deployment's roles are the only signal available here for
  // which programme profile is active — same discriminator apps/admin uses.
  const maternal = engine.rolesEnabled();
  const askCard = <AiInsightsCard />;
  return (
    <div style={{ padding: '2px 18px 24px', animation: 'nsFade .2s ease' }}>
      {!maternal && askCard}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {periods.map((p, i) => {
          const on = i === period;
          return <button key={p} onClick={() => setPeriod(i)} style={{ flex: 1, border: `1.5px solid ${on ? 'var(--ml-blue)' : 'var(--border-default)'}`, background: on ? 'var(--surface-brand-soft)' : '#fff', color: on ? 'var(--ml-blue)' : S.muted, fontSize: 12.5, fontWeight: 600, padding: 8, borderRadius: 11, cursor: 'pointer' }}>{p}</button>;
        })}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: S.muted }}>Completion rate</span>
          {ins.deltaPts !== null && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--status-success)', background: 'var(--status-success-soft)', padding: '2px 8px', borderRadius: 999 }}>▲ {ins.deltaPts} pts</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, marginTop: 4 }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: S.strong, letterSpacing: '-.02em', lineHeight: 0.9 }}>{ins.completionRate}%</span>
          <span style={{ fontSize: 13, color: S.muted, paddingBottom: 6 }}>{ins.completionOf}{ins.prevRate !== null ? ` · prev ${ins.prevRate}%` : ''}</span>
        </div>
        {ins.trendHasEnoughData ? (
          <>
            <svg viewBox="0 0 288 96" style={{ width: '100%', height: 84, marginTop: 10, overflow: 'hidden' }}>
              <defs>
                <clipPath id="trend-clip">
                  <rect x="0" y="0" width="288" height="96" />
                </clipPath>
              </defs>
              <g clipPath="url(#trend-clip)">
                {t.segments.map((seg, i) => (
                  <g key={i}>
                    <polygon points={seg.area} fill="var(--ml-blue)" opacity={0.07} />
                    <polyline points={seg.line} fill="none" stroke="var(--ml-blue)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                ))}
                {t.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={3.5} fill="var(--surface-card)" stroke="var(--ml-blue)" strokeWidth={2.2} />)}
              </g>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: S.subtle, marginTop: 2 }}><span>5 wks ago</span><span>this week</span></div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: S.muted, marginTop: 16, marginBottom: 8, textAlign: 'center' }}>Not enough data yet to show a trend</div>
        )}
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 13 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.strong, marginBottom: 12 }}>By category</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {ins.catBars.map((b) => (
            <div key={b.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}><span style={{ color: S.body, fontWeight: 600 }}>{b.label}</span><span style={{ color: S.muted, fontWeight: 600 }}>{b.pctLabel}</span></div>
              <div style={{ height: 8, borderRadius: 5, background: '#EEEDF0', overflow: 'hidden' }}><div style={{ height: '100%', width: b.width, background: b.color, borderRadius: 5 }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 13 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.strong, marginBottom: 3 }}>Overdue backlog</div>
        <div style={{ fontSize: 11.5, color: S.muted, marginBottom: 13 }}>{backlogTotal} open step{backlogTotal === 1 ? '' : 's'}, aged</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 96 }}>
          {ins.backlogBars.map((b) => (
            <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: S.strong }}>{b.value}</span>
              <div style={{ width: '100%', background: b.color, borderRadius: '7px 7px 3px 3px', height: b.height }} />
              <span style={{ fontSize: 10, color: S.subtle, textAlign: 'center', lineHeight: 1.1 }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 13 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.strong, marginBottom: 3 }}>Referral completion</div>
        <div style={{ fontSize: 11.5, color: S.muted, marginBottom: 12 }}>Median {ins.referral.medianDays} days to complete</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9 }}><span style={{ fontSize: 34, fontWeight: 800, color: S.strong, letterSpacing: '-.02em', lineHeight: 0.9 }}>{ins.referral.rate}%</span><span style={{ fontSize: 12.5, color: S.muted, paddingBottom: 4 }}>{ins.referral.ofLabel}</span></div>
        <div style={{ height: 8, borderRadius: 5, background: '#EEEDF0', overflow: 'hidden', marginTop: 12 }}><div style={{ height: '100%', width: `${ins.referral.rate}%`, background: '#6165DE', borderRadius: 5 }} /></div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: maternal ? 13 : 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: S.strong, marginBottom: 13 }}>{maternal ? 'FLW follow-through' : 'Clinic follow-through'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          {ins.followThrough.map((t) => (
            <FollowTile key={t.label} value={t.value} label={t.label} color={t.color} bg={t.bg} />
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: S.muted, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>{ins.followThroughNote}</div>
      </div>

      {maternal && askCard}
    </div>
  );
}
function FollowTile({ value, label, color, bg }: { value: string; label: string; color: string; bg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.25 }}>{label}</div>
    </div>
  );
}

// ============================================================================
// AI Insights — ITEM-7-AI-INSIGHTS.md
// ============================================================================

/** ITEM-7-AI-INSIGHTS.md AI-6: the grounding badges rendered under a successful answer. */
function GroundingBadges({ grounding }: { grounding: AiResponseGrounding }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {grounding.periodDays !== undefined && <span className="badge" style={{ color: 'var(--ml-blue)', background: 'var(--surface-brand-soft)' }}>{grounding.periodDays} days</span>}
      {grounding.numerator !== undefined && grounding.denominator !== undefined && (
        <span className="badge" style={{ color: 'var(--ml-blue)', background: 'var(--surface-brand-soft)' }}>{grounding.numerator} of {grounding.denominator}</span>
      )}
      <span className="badge" style={{ color: S.muted, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)' }}>{grounding.clause}</span>
    </div>
  );
}

function AiInsightsCard() {
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [answer, setAnswer] = useState<AnswerResult | null>(null);

  async function ask(raw: string) {
    const asked = raw.trim();
    if (!asked || pending) return;
    setQuestion(asked);
    setPending(true);
    setAnswer(null);
    try {
      const steps = await engine.insightsSteps();
      setAnswer(await answerQuestion(aiModelClient, asked, steps));
    } catch {
      setAnswer({ failed: true, message: "Something went wrong answering that. The rest of Insights is unaffected — please try again." });
    } finally {
      setPending(false);
    }
  }

  const declined = !!answer && !answer.failed && answer.grounding.metric === 'UNSUPPORTED';

  return (
    <div className="card" style={{ padding: 16, marginBottom: 13 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: S.strong, marginBottom: 3 }}>Ask about follow-through</div>
      <div style={{ fontSize: 11.5, color: S.muted, marginBottom: 12, lineHeight: 1.4 }}>
        Answers are computed only from next-step coordination data — never clinical records, and never a named person's performance.
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(question); }} style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          style={{ flex: 1, height: 44 }}
          placeholder="Ask about completion, backlog, referrals…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className="btn btn--primary" style={{ height: 44, padding: '0 18px', fontSize: 13.5 }} type="submit" disabled={pending || !question.trim()}>
          Ask
        </button>
      </form>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {AI_EXAMPLE_QUESTIONS.map((q) => (
          <button key={q} type="button" className="chip chip--soft" onClick={() => ask(q)} disabled={pending}>
            {q}
          </button>
        ))}
      </div>

      {pending && <div style={{ fontSize: 12.5, color: S.muted, marginTop: 14 }}>Working it out…</div>}

      {!pending && answer && !answer.failed && !declined && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 11, background: 'var(--surface-brand-soft)' }}>
          <div style={{ fontSize: 13, color: S.strong, lineHeight: 1.45 }}>{answer.narration}</div>
          <GroundingBadges grounding={answer.grounding} />
        </div>
      )}

      {!pending && answer && !answer.failed && declined && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 11, background: 'var(--surface-page)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: S.muted, marginBottom: 4 }}>Can't answer that from coordination data</div>
          <div style={{ fontSize: 12.5, color: S.body, lineHeight: 1.45 }}>{answer.narration}</div>
        </div>
      )}

      {!pending && answer?.failed && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 11, background: 'var(--status-warning-soft)', border: '1px solid var(--status-warning)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--status-warning)', marginBottom: 4 }}>Couldn't get an answer</div>
          <div style={{ fontSize: 12.5, color: S.body, lineHeight: 1.45 }}>{answer.message}</div>
        </div>
      )}
    </div>
  );
}
