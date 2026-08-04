import { useEffect, useRef, useState } from 'react';
import {
  CATEGORY_ORDER,
  CLINIC,
  DUE,
  FILTERS,
  META,
  avatarFor,
  formatDueLabel,
  formatTodayLabel,
  guessGender,
  initials,
  maskMobile,
  type Category,
  type CaptureStep,
  type DecoratedStep,
  type DueKey,
  type Gender,
  type Patient,
  type StepView,
  type WorklistSections,
  type WorkStep,
} from '@next-steps/core';
import { engine, useEngineData, useEngineSync } from './lib/engine';
import { Icon, Logo, Whatsapp, PATHS } from './components/icons';

type Screen = 'search' | 'create' | 'patient' | 'capture' | 'saved' | 'worklist';

const DAY_MS = 24 * 60 * 60 * 1000;

const S = {
  strong: 'var(--text-strong)',
  body: 'var(--text-body)',
  muted: 'var(--text-muted)',
  subtle: 'var(--text-subtle)',
  blue: 'var(--ml-blue)',
} as const;

let stepSeq = 0;

export default function App() {
  useEngineSync();
  const [screen, setScreen] = useState<Screen>('search');
  const [query, setQuery] = useState('');
  const [selId, setSelId] = useState('');
  const [consent, setConsent] = useState(true);
  const [showOptional, setShowOptional] = useState(false);
  const [form, setForm] = useState<NewForm>({ name: '', mobile: '', abha: '', gender: 'Male', yob: '', cid: '' });
  const [genderTouched, setGenderTouched] = useState(false);
  const [steps, setSteps] = useState<CaptureStep[]>([]);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [sheetPid, setSheetPid] = useState<string | null>(null);
  const [sheetStep, setSheetStep] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  }

  const { data: allPData } = useEngineData(() => engine.allPatients(), []);
  const allP = allPData ?? [];
  const { data: openTotalAll } = useEngineData(() => engine.openTotal('all'), []);
  const avatarOf = (p: Patient): [string, string] =>
    avatarFor(Math.max(0, allP.findIndex((x) => x.id === p.id)));
  const pidOf = async (stepId: string) => (await engine.getStep(stepId))?.pid ?? null;

  const { data: selPatient } = useEngineData(() => engine.getPatient(selId), [selId]);
  const sel = selPatient ?? allP[0];
  const selFirst = sel?.name.split(' ')[0] ?? '';

  // ---- navigation ----
  const go = (s: Screen) => { setScreen(s); setSheetPid(null); setSheetStep(null); setCompleting(null); };
  const openPatient = (id: string) => { setSelId(id); go('patient'); };
  const startVisit = () => { setSteps([]); setScreen('capture'); };

  // ---- new patient ----
  const toCreate = () => {
    const q = query.trim();
    const isNum = /\d/.test(q);
    const name = isNum ? '' : q;
    setForm({ name, mobile: isNum ? q.replace(/\D/g, '').slice(0, 10) : '', abha: '', gender: guessGender(name) ?? 'Male', yob: '', cid: '' });
    setGenderTouched(false);
    setConsent(true);
    setShowOptional(false);
    go('create');
  };
  // Update the form; auto-guess gender from the name until the user sets it themselves.
  const updateForm = (patch: Partial<NewForm>) =>
    setForm((f) => {
      const next = { ...f, ...patch };
      if ('name' in patch && !genderTouched) {
        const g = guessGender(next.name);
        if (g) next.gender = g;
      }
      return next;
    });
  const pickGender = (g: Gender) => { setGenderTouched(true); setForm((f) => ({ ...f, gender: g })); };
  const canSaveNew = form.name.trim().length > 0 && form.mobile.replace(/\D/g, '').length === 10;
  const saveNewPatient = async () => {
    if (!canSaveNew) return;
    const digits = form.mobile.replace(/\D/g, '');
    const mobile = digits.slice(0, 5) + ' ' + digits.slice(5);
    const age = /^\d{4}$/.test(form.yob) ? 2026 - Number(form.yob) : 0;
    try {
      const p = await engine.createPatient({ name: form.name.trim(), mobile, gender: form.gender, age, cid: form.cid.trim(), consent });
      openPatient(p.id);
    } catch (err) {
      console.error(err);
    }
  };

  // ---- capture ----
  const addStep = (cat: Category) =>
    setSteps((prev) => [{ id: `s${stepSeq++}`, cat, due: META[cat].due, priority: 'NORMAL', detail: META[cat].detail }, ...prev]);
  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id));
  const setDue = (id: string, due: DueKey) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, due } : s)));
  const toggleHigh = (id: string) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, priority: s.priority === 'HIGH' ? 'NORMAL' : 'HIGH' } : s)));
  const saveVisit = async () => {
    if (!steps.length) return;
    try {
      await engine.recordVisit(selId, steps.map((s) => ({ cat: s.cat, dueKey: s.due, priority: s.priority })));
      setScreen('saved');
    } catch (err) {
      console.error(err);
    }
  };

  // ---- worklist mutations ----
  const closeAfter = async (pid: string | null) => {
    setCompleting(null);
    setSheetStep(null);
    if (pid) {
      const remaining = await engine.openStepsForPatient(pid);
      if (remaining.length === 0) setSheetPid(null);
    }
  };
  const confirmComplete = async () => {
    const id = completing!;
    try {
      const pid = await pidOf(id);
      await engine.completeStep(id);
      await closeAfter(pid);
      showToast('Step completed · reminders stopped');
    } catch (err) {
      console.error(err);
    }
  };
  const terminate = async (id: string, decline: boolean) => {
    try {
      const pid = await pidOf(id);
      if (decline) {
        await engine.declineStep(id);
      } else {
        const reason = window.prompt('Reason for cancelling this step (required):')?.trim();
        if (!reason) return;
        await engine.cancelStep(id, reason);
      }
      await closeAfter(pid);
      showToast(decline ? 'Marked patient declined' : 'Step cancelled');
    } catch (err) {
      console.error(err);
    }
  };

  const { data: sheetPatientData } = useEngineData(
    () => (sheetPid ? engine.getPatient(sheetPid) : Promise.resolve(undefined)),
    [sheetPid],
  );
  const sheetPatient = sheetPatientData ?? null;
  const sheetOpen = !!sheetPid && !sheetStep && !completing;
  const stepSheetOpen = !!sheetStep && !completing;
  const activeStepId = completing || sheetStep;
  const { data: activeStepData } = useEngineData(
    () => (activeStepId ? engine.getStep(activeStepId) : Promise.resolve(undefined)),
    [activeStepId],
  );
  const activeStep = activeStepData ?? null;

  return (
    <div className="screen">
      <header className="appbar">
        <div className="appbar__brand">
          <div className="logo"><Logo /></div>
          <div>
            <div className="appbar__title">Next Steps</div>
            <div className="appbar__sub">{CLINIC.name} · {CLINIC.admin}</div>
          </div>
        </div>
        <SyncChip />
      </header>

      <div className="body nsScroll">
        {screen === 'search' && <Search query={query} setQuery={setQuery} onOpen={openPatient} toCreate={toCreate} avatarOf={avatarOf} />}
        {screen === 'create' && (
          <Create
            form={form} onField={updateForm} onPickGender={pickGender} canSave={canSaveNew}
            consent={consent} setConsent={setConsent}
            showOptional={showOptional} toggleOptional={() => setShowOptional((v) => !v)}
            onBack={() => go('search')}
            onSave={saveNewPatient}
          />
        )}
        {screen === 'patient' && sel && <Summary patient={sel} avatar={avatarOf(sel)} onBack={() => go('search')} onStartVisit={startVisit} onOpenStep={(pid, sid) => { setSheetPid(pid); setSheetStep(sid); }} />}
        {screen === 'capture' && sel && <Capture sel={sel} steps={steps} onBack={() => go('patient')} addStep={addStep} removeStep={removeStep} setDue={setDue} toggleHigh={toggleHigh} />}
        {screen === 'saved' && <Saved firstName={selFirst} count={steps.length} onWorklist={() => go('worklist')} onNext={() => { setQuery(''); go('search'); }} />}
        {screen === 'worklist' && <Worklist filter={filter} setFilter={setFilter} onOpenPatient={(pid) => { setSheetPid(pid); setSheetStep(null); }} />}
      </div>

      {screen === 'capture' && (
        <div style={{ flex: 'none', padding: '10px 18px 12px', borderTop: '1px solid var(--border-subtle)', background: '#fff', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 'none', fontSize: 12, color: S.subtle, lineHeight: 1.2 }}>≈ 45s<br />this visit</div>
          <button className="btn btn--primary btn--full btn--h50" onClick={saveVisit}>
            <Icon path={PATHS.check} size={19} stroke="#fff" width={2.4} />Save · schedule reminders
          </button>
        </div>
      )}

      {screen !== 'saved' && (
        <nav className="tabbar">
          <button className="tab" style={{ color: screen === 'worklist' ? S.subtle : S.blue }} onClick={() => go('search')}>
            <Icon path={PATHS.capture} size={23} width={2} /><span>Capture</span>
          </button>
          <button className="tab" style={{ color: screen === 'worklist' ? S.blue : S.subtle }} onClick={() => go('worklist')}>
            <Logo size={23} color="currentColor" /><span>Worklist</span>
            <span className="tab__badge">{openTotalAll ?? 0}</span>
          </button>
        </nav>
      )}

      {sheetOpen && sheetPatient && (
        <PatientSheet
          patient={sheetPatient} avatar={avatarOf(sheetPatient)}
          onClose={() => setSheetPid(null)}
          onDone={(id) => setCompleting(id)}
          onMore={(id) => setSheetStep(id)}
          onNudge={async () => {
            try {
              await engine.recordVisit(sheetPatient.id, []);
              showToast(sheetPatient.consent ? 'WhatsApp nudge sent · Delivered' : 'Opening dialler…');
            } catch (err) {
              console.error(err);
            }
          }}
          onCall={() => showToast('Opening dialler…')}
        />
      )}

      {stepSheetOpen && activeStep && (
        <StepSheet
          step={activeStep}
          onBack={() => setSheetStep(null)}
          onComplete={() => setCompleting(activeStep.id)}
          onNudge={() => { setSheetStep(null); showToast('WhatsApp nudge sent · Delivered'); }}
          onCall={() => showToast('Opening dialler…')}
          onLog={() => { setSheetStep(null); showToast('Contact attempt logged'); }}
          onReschedule={() => { setSheetStep(null); showToast('Due date rescheduled · reminders regenerated'); }}
          onCancel={() => terminate(activeStep.id, false)}
          onDecline={() => terminate(activeStep.id, true)}
        />
      )}

      {completing && activeStep && (
        <CompleteDialog step={activeStep} onBack={() => setCompleting(null)} onConfirm={confirmComplete} />
      )}

      {toast && (
        <div className="toast">
          <Icon path={PATHS.check} size={16} stroke="var(--ml-peppermint)" width={2.6} />{toast}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sync chip
// ============================================================================
function SyncChip() {
  const offline = engine.isOffline();
  const pending = engine.pending();
  const bg = offline ? '#FBEDE4' : '#E9FBF0';
  const color = offline ? '#C35721' : '#128C4A';
  const dot = offline ? '#C35721' : '#25D366';
  const label = offline ? (pending > 0 ? `${pending} pending` : 'Offline') : 'Synced';
  return (
    <button onClick={() => engine.toggleOffline()} style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, background: bg, color }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />{label}
    </button>
  );
}

// ============================================================================
// Search
// ============================================================================
function Search({ query, setQuery, onOpen, toCreate, avatarOf }: {
  query: string; setQuery: (v: string) => void; onOpen: (id: string) => void; toCreate: () => void; avatarOf: (p: Patient) => [string, string];
}) {
  const { data } = useEngineData(() => engine.searchPatients(query), [query]);
  const results = data ?? [];
  const q = query.trim();
  const showCreate = q.length > 0 && results.length === 0;
  return (
    <div style={{ padding: '6px 18px 20px', animation: 'nsFade .2s ease' }}>
      <div className="h-screen" style={{ margin: '2px 0 3px' }}>Find the patient</div>
      <div className="p-sub" style={{ marginBottom: 14 }}>Search by mobile, name or clinic ID — always search before creating.</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 52, borderRadius: 15, border: '1.5px solid var(--border-default)', background: '#fff', padding: '0 14px', boxShadow: 'var(--shadow-sm)' }}>
        <Icon path={PATHS.search} size={20} stroke="var(--text-muted)" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Mobile, name or clinic ID" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15.5, color: S.strong }} />
        {q.length > 0 && <button onClick={() => setQuery('')} style={{ border: 'none', background: '#F0EFEC', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', color: S.muted }}>✕</button>}
      </div>

      <div className="section-label" style={{ margin: '20px 0 8px' }}>{q ? `${results.length} match${results.length === 1 ? '' : 'es'}` : 'Recent patients'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {results.map((p) => {
          const [bg, color] = avatarOf(p);
          const over = p.overdue > 0;
          return (
            <button key={p.id} className="ns-row" onClick={() => onOpen(p.id)}>
              <div className="avatar" style={{ background: bg, color }}>{initials(p.name)}</div>
              <div className="grow">
                <div style={{ fontSize: 15, fontWeight: 600, color: S.strong }}>{p.name}</div>
                <div style={{ fontSize: 12.5, color: S.muted }}>{maskMobile(p.mobile)} · {p.gender} {p.age} · File #{p.cid}</div>
              </div>
              {p.open > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div className="badge" style={{ color: over ? '#994242' : S.blue, background: over ? '#FDECEC' : 'var(--surface-brand-soft)' }}>{over ? `${p.overdue} overdue` : `${p.open} open`}</div>
                  <div style={{ fontSize: 11, color: S.subtle, marginTop: 4 }}>Last {p.last}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {showCreate && (
        <button onClick={toCreate} style={{ marginTop: 14, width: '100%', border: '1.5px dashed var(--ml-blue)', background: 'var(--surface-brand-soft)', borderRadius: 16, padding: 15, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--ml-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon path={PATHS.plus} size={20} stroke="#fff" width={2.4} /></div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: S.blue }}>Create new patient</div>
            <div style={{ fontSize: 12, color: S.muted }}>Pre-fill “{query}”</div>
          </div>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Create
// ============================================================================
interface NewForm { name: string; mobile: string; abha: string; gender: Gender; yob: string; cid: string }
function LabeledInput({ label, value, onChange, placeholder, optional, prefix, numeric, maxLen }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; optional?: boolean; prefix?: string; numeric?: boolean; maxLen?: number;
}) {
  return (
    <div>
      <div className="field-label">{label} {optional ? <span style={{ fontWeight: 500, color: S.subtle }}>optional</span> : <span style={{ color: 'var(--status-danger)' }}>*</span>}</div>
      <div style={{ height: 48, borderRadius: 13, border: '1.5px solid var(--border-default)', background: '#fff', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
        {prefix ? <span style={{ fontSize: 15, color: S.muted, marginRight: 6 }}>{prefix}</span> : null}
        <input
          value={value}
          onChange={(e) => onChange(numeric ? e.target.value.replace(/\D/g, '').slice(0, maxLen ?? 40) : e.target.value)}
          placeholder={placeholder}
          inputMode={numeric ? 'numeric' : undefined}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, color: S.strong }}
        />
      </div>
    </div>
  );
}
function Create({ form, onField, onPickGender, canSave, consent, setConsent, showOptional, toggleOptional, onBack, onSave }: {
  form: NewForm; onField: (patch: Partial<NewForm>) => void; onPickGender: (g: Gender) => void; canSave: boolean; consent: boolean; setConsent: (v: boolean) => void; showOptional: boolean; toggleOptional: () => void; onBack: () => void; onSave: () => void;
}) {
  const set = onField;
  return (
    <div style={{ padding: '4px 18px 20px', animation: 'nsFade .2s ease' }}>
      <button className="back-link" onClick={onBack}><Icon path={PATHS.chevLeft} size={17} width={2.2} />Back to search</button>
      <div className="h-screen" style={{ marginBottom: 3 }}>New patient</div>
      <div className="p-sub" style={{ marginBottom: 16 }}>Only name and mobile are required. No clinical details.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <LabeledInput label="Full name" value={form.name} onChange={(v) => set({ name: v })} placeholder="Patient’s full name" />
        <LabeledInput label="Mobile number" value={form.mobile} onChange={(v) => set({ mobile: v })} placeholder="10-digit mobile" prefix="+91" numeric maxLen={10} />
        {showOptional && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            <LabeledInput label="ABHA ID" value={form.abha} onChange={(v) => set({ abha: v })} placeholder="—" optional />
            <div style={{ display: 'flex', gap: 11 }}>
              <div style={{ flex: 1 }}>
                <div className="field-label">Gender <span style={{ fontWeight: 500, color: S.subtle }}>optional</span></div>
                <select value={form.gender} onChange={(e) => onPickGender(e.target.value as Gender)} className="input" style={{ fontWeight: 600, cursor: 'pointer' }}>
                  <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                </select>
              </div>
              <div style={{ flex: 1 }}><LabeledInput label="Year of birth" value={form.yob} onChange={(v) => set({ yob: v })} placeholder="e.g. 1968" optional numeric maxLen={4} /></div>
            </div>
            <LabeledInput label="Clinic file no." value={form.cid} onChange={(v) => set({ cid: v })} placeholder="Paper file number" optional />
          </div>
        )}
        <button className="back-link" style={{ color: S.blue, fontWeight: 700 }} onClick={toggleOptional}>
          <Icon path={showOptional ? 'M5 12h14' : PATHS.plus} size={17} stroke="currentColor" width={2.4} />{showOptional ? 'Hide optional details' : 'Add optional details'}
        </button>

        <div style={{ border: '1.5px solid var(--border-subtle)', borderRadius: 15, padding: 14, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 11 }}>
            <Whatsapp filled={false} size={20} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: S.strong }}>WhatsApp reminders</div>
              <div style={{ fontSize: 12, color: S.muted, lineHeight: 1.4 }}>“May we send you reminders on WhatsApp about your next steps?”</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConsent(true)} style={{ flex: 1, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: consent ? 700 : 600, border: consent ? '1.5px solid #25D366' : '1.5px solid var(--border-default)', background: consent ? '#E9FBF0' : '#fff', color: consent ? '#128C4A' : S.muted }}>{consent ? '✓ Yes, consented' : 'Yes'}</button>
            <button onClick={() => setConsent(false)} style={{ flex: 1, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: !consent ? 700 : 600, border: !consent ? '1.5px solid var(--status-warning)' : '1.5px solid var(--border-default)', background: !consent ? 'var(--status-warning-soft)' : '#fff', color: !consent ? '#C35721' : S.muted }}>{!consent ? 'No — call only' : 'No'}</button>
          </div>
        </div>
      </div>

      <button className="btn btn--primary btn--full btn--h52" style={{ marginTop: 16 }} disabled={!canSave} onClick={onSave}>Save &amp; open patient</button>
      <div style={{ fontSize: 11.5, color: S.subtle, textAlign: 'center', marginTop: 10 }}>{canSave ? 'No address, diagnosis, HbA1c or prescriptions — ever.' : 'Enter a name and a 10-digit mobile to save.'}</div>
    </div>
  );
}

// ============================================================================
// Patient summary
// ============================================================================
function Summary({ patient, avatar, onBack, onStartVisit, onOpenStep }: {
  patient: Patient; avatar: [string, string]; onBack: () => void; onStartVisit: () => void; onOpenStep: (pid: string, sid: string) => void;
}) {
  const { data } = useEngineData(() => engine.openStepsForPatient(patient.id), [patient.id]);
  const open = data ?? [];
  return (
    <div style={{ animation: 'nsFade .2s ease' }}>
      <div style={{ background: 'linear-gradient(135deg,#1E14BE,#3A2FD6)', padding: '16px 18px 20px', color: '#fff' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'rgba(255,255,255,.16)', cursor: 'pointer', color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '6px 11px', borderRadius: 999, marginBottom: 14 }}><Icon path={PATHS.chevLeft} size={15} width={2.4} />Search</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div className="avatar" style={{ width: 52, height: 52, background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: 19 }}>{initials(patient.name)}</div>
          <div><div style={{ fontSize: 20, fontWeight: 700 }}>{patient.name}</div><div style={{ fontSize: 13, opacity: 0.85 }}>{patient.gender} · {patient.age} · File #{patient.cid}</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.16)', padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600 }}><Icon path={PATHS.phone} size={14} width={2} />{maskMobile(patient.mobile)}</span>
          {patient.consent
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E9FBF0', color: '#128C4A', padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700 }}><Icon path={PATHS.check} size={13} width={2.4} />WhatsApp on</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.16)', padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700 }}>Call only · no WhatsApp</span>}
        </div>
      </div>

      <div style={{ padding: '16px 18px 20px' }}>
        <button className="btn btn--primary btn--full" style={{ height: 54 }} onClick={onStartVisit}>Enter Next Steps</button>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: S.muted, margin: '22px 0 3px' }}>OPEN NEXT STEPS · {open.length}</div>
        {open.length > 0 ? (
          <>
            <div style={{ fontSize: 12.5, color: S.subtle, marginBottom: 10 }}>Tap a step to mark it done or send a reminder.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {open.map((s) => (
                <button key={s.id} className="ns-row" style={{ borderLeft: `4px solid ${s.color}` }} onClick={() => onOpenStep(patient.id, s.id)}>
                  <div className="icon-tile" style={{ background: s.soft }}><Icon path={s.iconPath} size={22} stroke={s.color} width={1.9} /></div>
                  <div className="grow"><div style={{ fontSize: 15.5, fontWeight: 700, color: S.strong }}>{s.categoryLabel}</div><div style={{ fontSize: 12.5, fontWeight: 600, color: s.statusColor, marginTop: 2 }}>{s.statusText}</div></div>
                  <div style={{ color: S.blue, display: 'flex', flexDirection: 'column', alignItems: 'center' }}><Icon path={PATHS.chevRight} size={22} width={2.4} /><span style={{ fontSize: 10, fontWeight: 700 }}>Update</span></div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div style={{ border: '1.5px dashed var(--border-default)', borderRadius: 14, padding: '22px 16px', textAlign: 'center', color: S.muted, fontSize: 13.5 }}>No open next steps. Start a visit to add some.</div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Capture
// ============================================================================
function Capture({ sel, steps, onBack, addStep, removeStep, setDue, toggleHigh }: {
  sel: Patient; steps: CaptureStep[]; onBack: () => void; addStep: (c: Category) => void; removeStep: (id: string) => void; setDue: (id: string, d: DueKey) => void; toggleHigh: (id: string) => void;
}) {
  return (
    <div style={{ animation: 'nsFade .2s ease' }}>
      <div style={{ padding: '6px 18px 12px', position: 'sticky', top: 0, background: 'var(--surface-page)', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="back-link" onClick={onBack}><Icon path={PATHS.chevLeft} size={17} width={2.2} />{sel.name.split(' ')[0]} · {sel.age}</button>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: S.blue, background: 'var(--surface-brand-soft)', padding: '4px 9px', borderRadius: 999 }}><Icon path={PATHS.clock} size={12} width={2.4} />Visit · now</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, color: S.strong, marginTop: 4 }}>What happens next?</div>
      </div>

      <div style={{ padding: '0 18px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 6 }}>
          {CATEGORY_ORDER.map((c) => {
            const m = META[c];
            return (
              <button key={c} onClick={() => addStep(c)} style={{ border: `1.5px solid ${m.color}`, background: m.soft, borderRadius: 14, padding: '13px 12px', display: 'flex', flexDirection: 'column', gap: 7, cursor: 'pointer', textAlign: 'left' }}>
                <Icon path={m.iconPath} size={22} stroke={m.color} width={1.9} />
                <span style={{ fontSize: 13, fontWeight: 700, color: S.strong, lineHeight: 1.15 }}>{m.label}</span>
              </button>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px dashed var(--border-default)', borderRadius: 14, color: S.subtle, fontSize: 12, fontWeight: 600, textAlign: 'center', padding: 8 }}>Tap to add<br />a step</div>
        </div>

        <div className="section-label" style={{ margin: '16px 0 9px' }}>This visit · {steps.length} step{steps.length === 1 ? '' : 's'}</div>
        {steps.length === 0 && (
          <div style={{ border: '1.5px dashed var(--border-default)', borderRadius: 14, padding: '26px 16px', textAlign: 'center', color: S.muted, fontSize: 13.5 }}>Tap a category above to add the first next step.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {steps.map((s) => {
            const m = META[s.cat];
            const high = s.priority === 'HIGH';
            return (
              <div key={s.id} className="card" style={{ borderLeft: `3px solid ${m.color}`, padding: '13px 13px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', background: m.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon path={m.iconPath} size={18} stroke={m.color} width={1.9} /></div>
                  <div className="grow"><div style={{ fontSize: 15, fontWeight: 700, color: S.strong }}>{m.label}</div></div>
                  <button onClick={() => removeStep(s.id)} style={{ border: 'none', background: '#F5F4F1', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', color: S.muted, flex: 'none' }}>✕</button>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: S.subtle, margin: '11px 0 6px' }}>DUE</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(Object.keys(DUE) as DueKey[]).map((k) => {
                    const on = s.due === k;
                    return <button key={k} onClick={() => setDue(s.id, k)} style={{ border: `1.5px solid ${on ? m.color : 'var(--border-default)'}`, background: on ? m.soft : '#fff', color: on ? m.color : S.muted, fontSize: 12, fontWeight: 600, padding: '6px 11px', borderRadius: 999, cursor: 'pointer' }}>{DUE[k].label}</button>;
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 12.5, color: S.muted }}>Due <strong style={{ color: S.body }}>{formatDueLabel(new Date(Date.now() + DUE[s.due].days * DAY_MS))}</strong></span>
                  <button onClick={() => toggleHigh(s.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1.5px solid ${high ? 'var(--status-warning)' : 'var(--border-default)'}`, background: high ? 'var(--status-warning-soft)' : '#fff', color: high ? '#C35721' : S.muted, fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 999, cursor: 'pointer' }}>
                    <Icon path="M4 22V4a1 1 0 0 1 1-1h10l-1.5 4L15 11H5" size={13} stroke={high ? '#C35721' : S.muted} width={1.8} fill={high ? '#C35721' : 'none'} />{high ? 'High' : 'Normal'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Saved
// ============================================================================
function Saved({ firstName, count, onWorklist, onNext }: { firstName: string; count: number; onWorklist: () => void; onNext: () => void }) {
  return (
    <div style={{ padding: '40px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'nsPop .3s ease' }}>
      <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#E9FBF0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}><Icon path={PATHS.check} size={44} stroke="#128C4A" width={2.4} /></div>
      <div style={{ fontSize: 23, fontWeight: 700, color: S.strong }}>Next steps saved</div>
      <div style={{ fontSize: 14, color: S.muted, margin: '6px 0 22px', maxWidth: 270 }}>{count} next step{count === 1 ? '' : 's'} for {firstName} · reminders scheduled automatically.</div>
      <div style={{ width: '100%', maxWidth: 300, background: '#0B141A', borderRadius: 16, padding: 12, textAlign: 'left', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}><Whatsapp size={18} /><span style={{ fontSize: 12, fontWeight: 700, color: '#E6EAED' }}>WhatsApp · sent to {firstName}</span></div>
        <div style={{ background: '#075E54', color: '#fff', borderRadius: '8px 8px 8px 3px', padding: '10px 12px', fontSize: 12.5, lineHeight: 1.5 }}>Hello {firstName}, thank you for visiting {CLINIC.name} today. Your next steps are saved — we’ll remind you before each date. Reply STOP to opt out.</div>
      </div>
      <button className="btn btn--primary btn--full btn--h50" style={{ maxWidth: 300, marginBottom: 10 }} onClick={onWorklist}>Go to worklist</button>
      <button className="btn btn--ghost btn--full btn--h50" style={{ maxWidth: 300 }} onClick={onNext}>Next patient →</button>
    </div>
  );
}

// ============================================================================
// Worklist
// ============================================================================
function WorklistRow({ r, onOpen }: { r: DecoratedStep; onOpen: () => void }) {
  return (
    <button className="ns-row" style={{ borderLeft: `4px solid ${r.color}` }} onClick={onOpen}>
      <div className="icon-tile" style={{ background: r.soft, width: 40, height: 40 }}><Icon path={r.iconPath} size={20} stroke={r.color} width={1.9} /></div>
      <div className="grow">
        <div style={{ fontSize: 14.5, fontWeight: 700, color: S.strong }}>{r.name}</div>
        <div style={{ fontSize: 12, color: S.muted, marginTop: 1 }}>{r.detail && r.detail !== r.categoryLabel ? `${r.categoryLabel} · ${r.detail}` : r.categoryLabel}</div>
        <div style={{ display: 'flex', gap: 7, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {r.showOver && <span className="badge" style={{ color: '#fff', background: 'var(--status-danger)' }}>{r.overBadge}</span>}
          {r.isHigh && <span className="badge" style={{ color: '#C35721', background: 'var(--status-warning-soft)' }}>High</span>}
          {r.showAttempts && <span style={{ fontSize: 11, color: '#994242', fontWeight: 700 }}>{r.attemptsLabel}</span>}
          {r.showDelivery && <span style={{ fontSize: 11, fontWeight: 700, color: r.deliveryTint }}>{r.delivery}</span>}
        </div>
      </div>
      <Icon path={PATHS.chevRight} size={20} stroke="var(--ml-blue)" width={2.4} />
    </button>
  );
}
function SectionHead({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 9px' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: S.strong }}>{label}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: dot, padding: '1px 8px', borderRadius: 999 }}>{count}</span>
    </div>
  );
}
const EMPTY_SECTIONS: WorklistSections = { overdue: [], today: [], soon: [], unreach: [] };

function Worklist({ filter, setFilter, onOpenPatient }: { filter: Category | 'all'; setFilter: (f: Category | 'all') => void; onOpenPatient: (pid: string) => void }) {
  const { data: sData } = useEngineData(() => engine.sections(filter), [filter]);
  const { data: doneData } = useEngineData(() => engine.doneRows(), []);
  const s = sData ?? EMPTY_SECTIONS;
  const done = doneData ?? [];
  return (
    <div style={{ animation: 'nsFade .2s ease' }}>
      <div style={{ padding: '6px 18px 10px', position: 'sticky', top: 0, background: 'var(--surface-page)', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div className="h-screen" style={{ fontSize: 21 }}>Today’s worklist</div>
          <span style={{ fontSize: 12, color: S.muted, flex: 'none' }}>{formatTodayLabel()}</span>
        </div>
        <div className="nsScroll" style={{ display: 'flex', gap: 7, marginTop: 11, overflowX: 'auto' }}>
          {FILTERS.map((f) => {
            const on = filter === f.value;
            return <button key={f.label} className={`chip chip--brand${on ? ' chip--on' : ''}`} onClick={() => setFilter(f.value)}>{f.label}</button>;
          })}
        </div>
      </div>

      <div style={{ padding: '6px 18px 24px' }}>
        <SectionHead dot="var(--status-danger)" label="Overdue" count={s.overdue.length} />
        <Rows list={s.overdue} onOpenPatient={onOpenPatient} />
        <SectionHead dot="var(--ml-burnt-orange)" label="Due today" count={s.today.length} />
        <Rows list={s.today} onOpenPatient={onOpenPatient} />
        <SectionHead dot="var(--ml-periwinkle)" label="Due soon · next 7 days" count={s.soon.length} />
        <Rows list={s.soon} onOpenPatient={onOpenPatient} />
        <SectionHead dot="var(--ml-maroon)" label="Unreachable" count={s.unreach.length} />
        <Rows list={s.unreach} onOpenPatient={onOpenPatient} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 9px' }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--status-success)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: S.muted }}>Completed today</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', background: 'var(--status-success)', padding: '1px 8px', borderRadius: 999 }}>{done.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {done.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#F3F8F5', borderRadius: 12 }}>
              <Icon path={PATHS.check} size={17} stroke="var(--status-success)" width={2.6} />
              <div><span style={{ fontSize: 13.5, fontWeight: 600, color: S.body, textDecoration: 'line-through', textDecorationColor: S.subtle }}>{r.name}</span><span style={{ fontSize: 12, color: S.muted }}> · {r.detail}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function Rows({ list, onOpenPatient }: { list: DecoratedStep[]; onOpenPatient: (pid: string) => void }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{list.map((r) => <WorklistRow key={r.id} r={r} onOpen={() => onOpenPatient(r.pid)} />)}</div>;
}

// ============================================================================
// Patient sheet (all open steps)
// ============================================================================
function PatientSheet({ patient, avatar, onClose, onDone, onMore, onNudge, onCall }: {
  patient: Patient; avatar: [string, string]; onClose: () => void; onDone: (id: string) => void; onMore: (id: string) => void; onNudge: () => void; onCall: () => void;
}) {
  const [bg, color] = avatar;
  const { data } = useEngineData(() => engine.openStepsForPatient(patient.id), [patient.id]);
  const steps = data ?? [];
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet nsScroll" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)', marginBottom: 14 }}>
          <div className="avatar" style={{ width: 44, height: 44, background: bg, color }}>{initials(patient.name)}</div>
          <div className="grow"><div style={{ fontSize: 16.5, fontWeight: 700, color: S.strong }}>{patient.name}</div><div style={{ fontSize: 12.5, color: S.muted }}>{maskMobile(patient.mobile)}</div></div>
          <button onClick={onCall} style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid var(--border-default)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}><Icon path={PATHS.phone} size={20} stroke="#128C4A" width={2} /></button>
        </div>
        <div className="section-label" style={{ marginBottom: 10 }}>Open next steps · {steps.length}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {steps.map((s) => (
            <div key={s.id} style={{ border: '1px solid var(--border-subtle)', borderLeft: `4px solid ${s.color}`, borderRadius: 14, padding: 13, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flex: 'none', background: s.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon path={s.iconPath} size={20} stroke={s.color} width={1.9} /></div>
                <div className="grow"><div style={{ fontSize: 15, fontWeight: 700, color: S.strong }}>{s.categoryLabel}</div><div style={{ fontSize: 12, fontWeight: 600, color: s.statusColor }}>{s.statusText}</div></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                <button onClick={() => onDone(s.id)} style={{ flex: 1, height: 44, borderRadius: 11, border: 'none', background: '#128C4A', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Icon path={PATHS.check} size={17} stroke="#fff" width={2.6} />Done</button>
                <button onClick={onNudge} style={{ flex: 1, height: 44, borderRadius: 11, border: '1.5px solid var(--border-default)', background: '#fff', color: S.strong, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{patient.consent ? 'Remind' : 'Call'}</button>
                <button onClick={() => onMore(s.id)} style={{ width: 50, height: 44, borderRadius: 11, border: '1.5px solid var(--border-default)', background: '#fff', color: S.muted, fontSize: 19, fontWeight: 700, cursor: 'pointer', lineHeight: 1 }}>⋯</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step sheet (one step, more actions)
// ============================================================================
function ActionRow({ icon, bg, label, onClick }: { icon: React.ReactNode; bg: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 13, border: 'none', background: 'transparent', cursor: 'pointer', padding: '13px 8px', textAlign: 'left' }}>
      <span style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{icon}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: S.strong }}>{label}</span>
    </button>
  );
}
function StepSheet({ step, onBack, onComplete, onNudge, onCall, onLog, onReschedule, onCancel, onDecline }: {
  step: StepView; onBack: () => void; onComplete: () => void; onNudge: () => void; onCall: () => void; onLog: () => void; onReschedule: () => void; onCancel: () => void; onDecline: () => void;
}) {
  const m = META[step.cat];
  return (
    <div className="scrim" style={{ zIndex: 21 }} onClick={onBack}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} style={{ padding: '14px 18px 26px' }}>
        <div className="sheet-handle" />
        <button className="back-link" style={{ fontWeight: 700, fontSize: 12.5 }} onClick={onBack}><Icon path={PATHS.chevLeft} size={15} width={2.4} />All steps for {step.name}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)', margin: '8px 0 12px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flex: 'none', background: m.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon path={m.iconPath} size={20} stroke={m.color} width={1.9} /></div>
          <div><div style={{ fontSize: 15.5, fontWeight: 700, color: S.strong }}>{m.label}</div><div style={{ fontSize: 12.5, color: S.muted }}>Due {formatDueLabel(step.dueDate)}</div></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ActionRow bg="#E9FBF0" label="Mark complete" onClick={onComplete} icon={<Icon path={PATHS.check} size={19} stroke="#128C4A" width={2.2} />} />
          <ActionRow bg="#E7FBEF" label="Send WhatsApp nudge" onClick={onNudge} icon={<Whatsapp size={19} />} />
          <ActionRow bg="#FBEDE4" label="Call patient" onClick={onCall} icon={<Icon path={PATHS.phone} size={19} stroke="#C35721" width={2} />} />
          <ActionRow bg="#F0EFEC" label="Log contact attempt" onClick={onLog} icon={<Icon path={PATHS.clock} size={19} stroke="#595959" width={2} />} />
          <ActionRow bg="#EFEDFF" label="Reschedule due date" onClick={onReschedule} icon={<Icon path={PATHS.calendar} size={19} stroke="#1E14BE" width={2} />} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={onCancel} style={{ flex: 1, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', padding: 12, borderRadius: 12, fontSize: 13.5, fontWeight: 700, color: S.muted }}>Cancel step</button>
            <button onClick={onDecline} style={{ flex: 1, border: '1.5px solid var(--status-warning)', background: 'var(--status-warning-soft)', cursor: 'pointer', padding: 12, borderRadius: 12, fontSize: 13.5, fontWeight: 700, color: '#C35721' }}>Patient declined</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Complete dialog
// ============================================================================
function CompleteDialog({ step, onBack, onConfirm }: { step: WorkStep; onBack: () => void; onConfirm: () => void }) {
  return (
    <div className="dialog-scrim" onClick={onBack}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 700, color: S.strong, marginBottom: 3 }}>Mark complete</div>
        <div style={{ fontSize: 13, color: S.muted, marginBottom: 16 }}>{step.name} · {META[step.cat].label}</div>
        <div className="field-label">Completion date</div>
        <div style={{ height: 46, borderRadius: 12, border: '1.5px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', fontSize: 14.5, fontWeight: 600, color: S.strong, margin: '0 0 14px' }}>Today · 6 Jul 2026<Icon path={PATHS.calendar} size={18} stroke="var(--text-muted)" width={2} /></div>
        <div className="field-label">Note <span style={{ fontWeight: 500, color: S.subtle }}>optional · non-clinical</span></div>
        <div style={{ minHeight: 56, borderRadius: 12, border: '1.5px solid var(--border-default)', padding: '11px 14px', fontSize: 13.5, color: S.subtle, marginBottom: 18 }}>e.g. “Report collected, shown to doctor”</div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button onClick={onBack} style={{ flex: 1, height: 48, borderRadius: 12, border: '1.5px solid var(--border-default)', background: '#fff', fontSize: 15, fontWeight: 700, color: S.muted, cursor: 'pointer' }}>Back</button>
          <button onClick={onConfirm} style={{ flex: 2, height: 48, borderRadius: 12, border: 'none', background: '#128C4A', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Confirm complete</button>
        </div>
      </div>
    </div>
  );
}
