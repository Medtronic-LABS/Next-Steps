// ITEM-8-HRP-NEWBORN.md NS-1, NS-11, NS-13, NS-14 — the role-scoped
// worklist experience for the four version-1 data-entry roles. Shown in
// place of the original admin flow only when the active deployment
// declares roles (engine.rolesEnabled()) — see main.tsx.
//
// Talks to the CoordinationEngine interface only, per CLAUDE.md's
// architecture rule; FACILITIES and the role/scope helpers below are the
// same kind of public, deployment-config export as META/DUE/FILTERS
// already used by App.tsx — never a concrete engine or its own storage,
// and never a direct seed-data import.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  FACILITIES,
  ROLE_OPTIONS,
  VILLAGES,
  formatDueLabel,
  initials,
  loadPersistedEntry,
  maskMobile,
  persistEntryChoice,
  resolveAshaForVillage,
  resolveEntry,
  type CompletionLocation,
  type Facility,
  type Gender,
  type Id,
  type PregnancyStatus,
  type Referral,
  type ReferralDirection,
  type RegistrationField,
  type Role,
  type RoleContext,
  type TrackingOutcome,
  type WorklistFilter,
  type WorklistRow,
} from '@next-steps/core';
import { engine, useEngineData, useEngineSync } from './lib/engine';
import { Icon, Logo, PATHS } from './components/icons';

const S = {
  strong: 'var(--text-strong)',
  body: 'var(--text-body)',
  muted: 'var(--text-muted)',
  subtle: 'var(--text-subtle)',
  blue: 'var(--ml-blue)',
} as const;

// ============================================================================
// Deployment configuration for the standalone picker (NS-13) — the same
// shape a host application would supply as URL parameters. Scope values
// (an ASHA's own name, a sub-centre id, a facility id) match the seeded
// maternal deployment's registration data one-for-one.
// ============================================================================
interface RoleEntryOption {
  context: RoleContext;
  title: string;
  subtitle: string;
  detail: string;
  icon: string;
}

const ROLE_ENTRY_OPTIONS: RoleEntryOption[] = [
  { context: { role: 'ASHA', scope: 'Radha Kumari' }, title: 'ASHA', subtitle: 'Ward 3, Rampur', detail: '~1,000 population', icon: PATHS.user },
  { context: { role: 'ANM_CHO', scope: 'SHC-RAMPUR' }, title: 'ANM / CHO', subtitle: 'Rampur SHC-AAM', detail: '~5,000 population', icon: PATHS.home },
  { context: { role: 'PHC_SN', facilityId: 'FAC-PHC-RAMPUR' }, title: 'Staff nurse', subtitle: 'Rampur PHC', detail: 'Arrivals', icon: PATHS.hospital },
  { context: { role: 'DH_SN', facilityId: 'FAC-DH-001' }, title: 'Staff nurse', subtitle: 'District Hospital', detail: 'Arrivals', icon: PATHS.hospital },
];

function roleOptionFor(context: RoleContext): RoleEntryOption | undefined {
  return ROLE_ENTRY_OPTIONS.find((o) => o.context.role === context.role);
}

function paramsFromLocation(): Record<string, string | undefined> {
  const sp = new URLSearchParams(window.location.search);
  return {
    role: sp.get('role') ?? undefined,
    scope: sp.get('scope') ?? undefined,
    facility: sp.get('facility') ?? undefined,
  };
}

/** A worklist row carries no display index; a stable hash keeps avatar colour consistent per patient without a lookup. */
function avatarPalette(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const PALETTE: [string, string][] = [
    ['#EFEDFF', '#1E14BE'], ['#E4F7EE', '#2E9E6B'], ['#FBEDE4', '#C35721'],
    ['#ECEDFB', '#6165DE'], ['#F0EFEC', '#595959'], ['#FDECEC', '#994242'],
  ];
  return PALETTE[hash % PALETTE.length];
}

// ============================================================================
// NS-11: eight named filters, care-journey labels (§3.3) — the subject of
// each is the patient's care, never a person's performance.
// ============================================================================
const WORKLIST_FILTERS: { value: WorklistFilter; label: string }[] = [
  { value: 'ALL_REGISTERED', label: 'All registered' },
  { value: 'REFERRAL_PENDING', label: 'Referral pending' },
  { value: 'ANC_DUE', label: 'ANC due' },
  { value: 'PMSMA_DUE', label: 'PMSMA due' },
  { value: 'TRACKING_NEEDED', label: 'Tracking needed' },
  { value: 'PRIVATE_CARE_DUE', label: 'Private care due' },
  { value: 'AT_RISK_OF_DROP_OUT', label: 'At risk of drop-out' },
  { value: 'LOST_TO_FOLLOW', label: 'Lost to follow-up' },
];
const FILTER_ROW_HINT: Record<WorklistFilter, string> = {
  ALL_REGISTERED: '',
  REFERRAL_PENDING: 'Referral pending',
  ANC_DUE: 'ANC visit due',
  PMSMA_DUE: 'PMSMA session',
  TRACKING_NEEDED: 'Tracking needed',
  PRIVATE_CARE_DUE: 'Private care follow-up',
  AT_RISK_OF_DROP_OUT: 'At risk of drop-out',
  LOST_TO_FOLLOW: 'Lost to follow-up',
};

// ============================================================================
// Worklist scope chips (ANM_CHO only — her scope already is her catchment,
// per NS-1; this regroups the eight existing filters into what she acts on
// directly vs. what she should stay aware of, it does not widen or narrow
// patientsInScope()). PHC_SN/DH_SN don't reach WorklistScreen at all (they
// use ArrivalsScreen), so they have no scope chips here.
// ============================================================================
type WorklistScope = 'FACILITY' | 'CATCHMENT';
const FACILITY_SCOPE_FILTERS: WorklistFilter[] = ['ALL_REGISTERED', 'ANC_DUE', 'PMSMA_DUE', 'TRACKING_NEEDED', 'PRIVATE_CARE_DUE'];
const SCOPE_CHIPS: { value: WorklistScope; label: string }[] = [
  { value: 'FACILITY', label: 'At my facility' },
  { value: 'CATCHMENT', label: 'In my catchment' },
];

/** Design reference: every chip's "on" state tints with the acting role's own accent, never one fixed brand colour. */
const ROLE_ACCENT: Record<Role, string> = {
  ASHA: 'var(--ml-burnt-orange)',
  ANM_CHO: 'var(--status-success)',
  PHC_SN: 'var(--ml-periwinkle)',
  DH_SN: 'var(--ml-merlot)',
};

// ============================================================================
// NS-7 / NS-6 vocabularies, in care-journey language.
// ============================================================================
const TRACKING_OUTCOMES: { value: TrackingOutcome; label: string }[] = [
  { value: 'COMPLETED_REFERRED_PUBLIC_FACILITY', label: 'Completed — at the referred facility' },
  { value: 'COMPLETED_OTHER_PUBLIC_FACILITY', label: 'Completed — at another public facility' },
  { value: 'COMPLETED_PRIVATE_FACILITY', label: 'Completed — at a private facility' },
  { value: 'PLAN_TO_GO_LATER', label: 'Not yet — plans to go later' },
  { value: 'DOES_NOT_WANT_TO_GO', label: 'Does not want to go' },
  { value: 'COULD_NOT_BE_CONTACTED', label: 'Could not be contacted' },
];
const COMPLETION_LOCATIONS: { value: CompletionLocation; label: string }[] = [
  { value: 'REFERRED_PUBLIC_FACILITY', label: 'Seen here, as referred' },
  { value: 'OTHER_PUBLIC_FACILITY', label: 'Seen at another public facility' },
  { value: 'PRIVATE_FACILITY', label: 'Seen at a private facility' },
];

function facilityName(id: Id): string {
  return FACILITIES.find((f) => f.id === id)?.name ?? id;
}
function referralDirectionFor(destination: Facility): ReferralDirection {
  return destination.tier === 'SHC' ? 'DOWNWARD' : 'UPWARD';
}

// ============================================================================
// Root
// ============================================================================
type RoleScreen = 'worklist' | 'capture' | 'arrivals' | 'patient';

export default function RoleApp() {
  useEngineSync();
  const [context, setContext] = useState<RoleContext | null>(() => resolveEntry(paramsFromLocation()) ?? loadPersistedEntry());
  const [screen, setScreen] = useState<RoleScreen>('worklist');
  const [patientId, setPatientId] = useState<Id | null>(null);
  const [referralId, setReferralId] = useState<Id | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [closedByFacility, setClosedByFacility] = useState<Record<Id, Referral[]>>({});
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  };

  const homeScreenFor = (r: Role): RoleScreen => (r === 'PHC_SN' || r === 'DH_SN' ? 'arrivals' : 'worklist');

  const chooseContext = (next: RoleContext) => {
    persistEntryChoice(next);
    setContext(next);
    setScreen(homeScreenFor(next.role));
    setPatientId(null);
    setReferralId(null);
    setSwitcherOpen(false);
  };

  const openPatient = (pid: Id, refId?: Id) => {
    setPatientId(pid);
    setReferralId(refId ?? null);
    setScreen('patient');
  };
  const closePatient = () => {
    setPatientId(null);
    setReferralId(null);
    if (context) setScreen(homeScreenFor(context.role));
  };
  const onReferralClosed = (referral: Referral) => {
    if (!context?.facilityId) return;
    setClosedByFacility((prev) => ({ ...prev, [context.facilityId!]: [referral, ...(prev[context.facilityId!] ?? [])] }));
  };

  if (!context) {
    return <RolePicker onChoose={chooseContext} />;
  }

  const option = roleOptionFor(context);

  return (
    <div className="screen">
      <header className="appbar">
        <div className="appbar__brand">
          <div className="logo"><Logo /></div>
          <div>
            <div className="appbar__title">Next Steps</div>
            <div className="appbar__sub">{option?.title ?? context.role} · {option?.subtitle ?? ''}</div>
          </div>
        </div>
        <button
          onClick={() => setSwitcherOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1.5px solid var(--border-default)', background: '#fff', cursor: 'pointer', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: S.strong }}
        >
          Switch role<Icon path={PATHS.chevDown} size={14} width={2.4} />
        </button>
      </header>

      <div className="body nsScroll">
        {screen === 'worklist' && (context.role === 'ASHA' || context.role === 'ANM_CHO') && (
          <WorklistScreen context={context} onOpenPatient={openPatient} />
        )}
        {screen === 'capture' && context.role === 'ANM_CHO' && (
          <CaptureScreen context={context} onBack={() => setScreen('worklist')} onSaved={(pid) => openPatient(pid)} />
        )}
        {screen === 'arrivals' && (context.role === 'PHC_SN' || context.role === 'DH_SN') && (
          <ArrivalsScreen context={context} closedThisSession={closedByFacility[context.facilityId ?? ''] ?? []} onOpenPatient={openPatient} />
        )}
        {screen === 'patient' && patientId && (
          <PatientDetailScreen
            patientId={patientId}
            referralId={referralId}
            context={context}
            onBack={closePatient}
            onToast={showToast}
            onReferralClosed={onReferralClosed}
          />
        )}
      </div>

      {context.role === 'ANM_CHO' && screen !== 'patient' && (
        <nav className="tabbar">
          <button className="tab" style={{ color: screen === 'worklist' ? S.blue : S.subtle }} onClick={() => setScreen('worklist')}>
            <Logo size={22} color="currentColor" /><span>Worklist</span>
          </button>
          <button className="tab" style={{ color: screen === 'capture' ? S.blue : S.subtle }} onClick={() => setScreen('capture')}>
            <Icon path={PATHS.plus} size={22} width={2} /><span>Register</span>
          </button>
        </nav>
      )}

      {switcherOpen && (
        <RoleSwitcherSheet
          current={context}
          onChoose={chooseContext}
          onClose={() => setSwitcherOpen(false)}
          onPicker={() => { setContext(null); setSwitcherOpen(false); }}
        />
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
// Role picker (NS-13) — the standalone entry. Not a login.
// ============================================================================
function RolePicker({ onChoose }: { onChoose: (c: RoleContext) => void }) {
  return (
    <div className="screen">
      <div style={{ padding: '30px 20px 6px' }}>
        <div className="logo" style={{ width: 42, height: 42, borderRadius: 13, marginBottom: 16 }}><Logo size={22} /></div>
        <div className="h-screen" style={{ fontSize: 23 }}>Who&rsquo;s using Next Steps?</div>
        <div className="p-sub" style={{ marginTop: 6 }}>Choose how you&rsquo;re viewing today&rsquo;s worklist.</div>
        <div style={{ fontSize: 11.5, color: S.subtle, marginTop: 8, lineHeight: 1.5 }}>
          This is not a sign-in — there&rsquo;s no password or account here. A role switcher in the header lets a
          demonstration move between viewpoints at any time.
        </div>
      </div>
      <div style={{ padding: '18px 18px 24px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {ROLE_OPTIONS.map((role) => {
          const opt = ROLE_ENTRY_OPTIONS.find((o) => o.context.role === role);
          if (!opt) return null;
          return (
            <button key={role} className="ns-row" style={{ height: 'auto', padding: 15 }} onClick={() => onChoose(opt.context)}>
              <div className="icon-tile" style={{ background: 'var(--surface-brand-soft)' }}>
                <Icon path={opt.icon} size={22} stroke="var(--ml-blue)" width={1.9} />
              </div>
              <div className="grow">
                <div style={{ fontSize: 16, fontWeight: 700, color: S.strong }}>{opt.title}</div>
                <div style={{ fontSize: 13, color: S.muted, marginTop: 1 }}>{opt.subtitle} · {opt.detail}</div>
              </div>
              <Icon path={PATHS.chevRight} size={20} stroke="var(--ml-blue)" width={2.4} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Role switcher (NS-13) — available in the header in every mode.
// ============================================================================
function RoleSwitcherSheet({ current, onChoose, onClose, onPicker }: {
  current: RoleContext; onChoose: (c: RoleContext) => void; onClose: () => void; onPicker: () => void;
}) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="section-label" style={{ marginBottom: 10 }}>Switch viewpoint</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {ROLE_OPTIONS.map((role) => {
            const opt = ROLE_ENTRY_OPTIONS.find((o) => o.context.role === role);
            if (!opt) return null;
            const on = current.role === role;
            return (
              <button
                key={role}
                className="ns-row"
                style={{ height: 'auto', padding: 13, borderColor: on ? 'var(--ml-blue)' : undefined, background: on ? 'var(--surface-brand-soft)' : '#fff' }}
                onClick={() => onChoose(opt.context)}
              >
                <div className="icon-tile" style={{ width: 36, height: 36, background: on ? '#fff' : 'var(--surface-brand-soft)' }}>
                  <Icon path={opt.icon} size={18} stroke="var(--ml-blue)" width={1.9} />
                </div>
                <div className="grow">
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: S.strong }}>{opt.title}</div>
                  <div style={{ fontSize: 12, color: S.muted }}>{opt.subtitle}</div>
                </div>
                {on && <Icon path={PATHS.check} size={18} stroke="var(--ml-blue)" width={2.6} />}
              </button>
            );
          })}
        </div>
        <button className="back-link" style={{ marginTop: 14, justifyContent: 'center', width: '100%' }} onClick={onPicker}>
          Back to the role picker
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Shared bits
// ============================================================================
function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ border: '1.5px dashed var(--border-default)', borderRadius: 14, padding: '26px 16px', textAlign: 'center', color: S.muted, fontSize: 13.5 }}>
      {text}
    </div>
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

// ============================================================================
// ASHA / ANM_CHO worklist — NS-11's eight filters, NS-14's unread badges.
// ============================================================================
function WorklistScreen({ context, onOpenPatient }: { context: RoleContext; onOpenPatient: (pid: Id, referralId?: Id) => void }) {
  const [filter, setFilter] = useState<WorklistFilter>('ALL_REGISTERED');
  const [scope, setScope] = useState<WorklistScope>('FACILITY');
  const scopeKey = `${context.role}:${context.scope ?? ''}`;
  const hasScopeChips = context.role === 'ANM_CHO';
  const visibleFilters = !hasScopeChips || scope === 'CATCHMENT'
    ? WORKLIST_FILTERS
    : WORKLIST_FILTERS.filter((f) => FACILITY_SCOPE_FILTERS.includes(f.value));

  const { data: rowsData } = useEngineData(() => engine.worklist(context, filter), [scopeKey, filter]);
  const rows = rowsData ?? [];
  const { data: unread } = useEngineData(() => engine.unreadCounts(context), [scopeKey, filter]);

  useEffect(() => {
    engine.markFilterOpened(context, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey]);

  const selectFilter = (f: WorklistFilter) => {
    setFilter(f);
    engine.markFilterOpened(context, f);
  };

  const selectScope = (s: WorklistScope) => {
    setScope(s);
    if (s === 'FACILITY' && !FACILITY_SCOPE_FILTERS.includes(filter)) selectFilter('ALL_REGISTERED');
  };

  return (
    <div style={{ animation: 'nsFade .2s ease' }}>
      <div
        style={{ padding: '6px 18px 10px', position: 'sticky', top: 0, background: 'var(--surface-page)', zIndex: 2, '--chip-accent': ROLE_ACCENT[context.role] } as CSSProperties}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="h-screen" style={{ fontSize: 21 }}>Worklist</div>
          {!!unread?.total && (
            <span className="badge" style={{ color: '#fff', background: 'var(--status-danger)' }}>{unread.total} new</span>
          )}
        </div>
        {hasScopeChips && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, marginBottom: 7 }}>
            <span style={{ flex: 'none', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: S.muted }}>Scope</span>
            {SCOPE_CHIPS.map((s) => (
              <button key={s.value} className={`chip chip--brand chip--sm${scope === s.value ? ' chip--on' : ''}`} onClick={() => selectScope(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="nsScroll" style={{ display: 'flex', gap: 7, marginTop: hasScopeChips ? 0 : 11, overflowX: 'auto' }}>
          {visibleFilters.map((f) => {
            const on = filter === f.value;
            const count = unread?.byFilter[f.value] ?? 0;
            return (
              <button key={f.value} className={`chip chip--brand${on ? ' chip--on' : ''}`} style={{ position: 'relative' }} onClick={() => selectFilter(f.value)}>
                {f.label}
                {count > 0 && (
                  <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--status-danger)', color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '6px 18px 24px' }}>
        {rows.length === 0 ? (
          <EmptyState text="No patients in this list right now." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {rows.map((r) => (
              <WorklistPatientRow key={r.id + (r.referralId ?? '')} row={r} hint={FILTER_ROW_HINT[filter]} onOpen={() => onOpenPatient(r.id, r.referralId)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function WorklistPatientRow({ row, hint, onOpen }: { row: WorklistRow; hint: string; onOpen: () => void }) {
  const [bg, color] = avatarPalette(row.id);
  return (
    <button className="ns-row" onClick={onOpen}>
      <div className="avatar" style={{ background: bg, color }}>{initials(row.name)}</div>
      <div className="grow">
        <div style={{ fontSize: 15, fontWeight: 600, color: S.strong }}>{row.name}</div>
        <div style={{ fontSize: 12, color: S.muted, marginTop: 1 }}>
          {maskMobile(row.mobile)}{row.villageName ? ` · ${row.villageName}` : ''}
        </div>
        {(hint || row.dueDate) && (
          <div style={{ display: 'flex', gap: 7, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {hint && <span className="badge" style={{ color: S.blue, background: 'var(--surface-brand-soft)' }}>{hint}</span>}
            {row.dueDate && <span style={{ fontSize: 11, fontWeight: 700, color: S.subtle }}>Due {formatDueLabel(row.dueDate)}</span>}
          </div>
        )}
      </div>
      <Icon path={PATHS.chevRight} size={20} stroke="var(--ml-blue)" width={2.4} />
    </button>
  );
}

// ============================================================================
// ANM_CHO capture — NS-3 registration additions.
// ============================================================================
interface CaptureForm {
  name: string; mobile: string; gender: Gender; age: string; cid: string;
  villageName: string; abhaOrRch: string; consent: boolean; pregnancyStatus: PregnancyStatus;
}
const EMPTY_CAPTURE_FORM: CaptureForm = {
  name: '', mobile: '', gender: 'Female', age: '', cid: '', villageName: '', abhaOrRch: '', consent: true, pregnancyStatus: 'NORMAL',
};

/** NS-17: which of the profile-configured registration fields are collected under this deployment. */
function useRegistrationFields(): Set<RegistrationField> {
  return new Set(engine.registrationFields());
}

function CaptureScreen({ context, onBack, onSaved }: { context: RoleContext; onBack: () => void; onSaved: (pid: Id) => void }) {
  const [form, setForm] = useState<CaptureForm>(EMPTY_CAPTURE_FORM);
  const fields = useRegistrationFields();
  const set = (patch: Partial<CaptureForm>) => setForm((f) => ({ ...f, ...patch }));
  const canSave = form.name.trim().length > 0 && form.mobile.replace(/\D/g, '').length === 10;
  const linkedAsha = resolveAshaForVillage(form.villageName);

  const save = async () => {
    if (!canSave) return;
    const digits = form.mobile.replace(/\D/g, '');
    const mobile = digits.slice(0, 5) + ' ' + digits.slice(5);
    const patient = await engine.createPatient({
      name: form.name.trim(),
      mobile,
      gender: form.gender,
      age: /^\d+$/.test(form.age) ? Number(form.age) : 0,
      cid: form.cid.trim() || form.name.trim(),
      consent: form.consent,
      villageName: fields.has('villageName') ? form.villageName || undefined : undefined,
      registeredAtFacilityId: context.scope,
      identifiers: form.abhaOrRch.trim() ? [{ system: 'urn:next-steps:abha-or-rch', value: form.abhaOrRch.trim() }] : undefined,
      pregnancyStatus: fields.has('pregnancyStatus') ? form.pregnancyStatus : undefined,
    });
    setForm(EMPTY_CAPTURE_FORM);
    onSaved(patient.id);
  };

  return (
    <div style={{ padding: '4px 18px 20px', animation: 'nsFade .2s ease' }}>
      <button className="back-link" onClick={onBack}><Icon path={PATHS.chevLeft} size={17} width={2.2} />Back to worklist</button>
      <div className="h-screen" style={{ marginBottom: 3 }}>Register a patient</div>
      <div className="p-sub" style={{ marginBottom: 16 }}>Name and mobile are required. No clinical details — ever.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        <Field label="Full name" value={form.name} onChange={(v) => set({ name: v })} placeholder="Patient's full name" />
        <Field label="Mobile number" value={form.mobile} onChange={(v) => set({ mobile: v })} placeholder="10-digit mobile" prefix="+91" numeric maxLen={10} />
        {(fields.has('age') || fields.has('gender')) && (
          <div style={{ display: 'flex', gap: 11 }}>
            {fields.has('age') && (
              <div style={{ flex: 1 }}><Field label="Age" value={form.age} onChange={(v) => set({ age: v })} placeholder="e.g. 27" numeric maxLen={3} /></div>
            )}
            {fields.has('gender') && (
              <div style={{ flex: 1 }}>
                <div className="field-label">Gender</div>
                <select value={form.gender} onChange={(e) => set({ gender: e.target.value as Gender })} className="input" style={{ fontWeight: 600, cursor: 'pointer' }}>
                  <option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option>
                </select>
              </div>
            )}
          </div>
        )}
        {fields.has('villageName') && (
          <div>
            <div className="field-label">Village</div>
            <select value={form.villageName} onChange={(e) => set({ villageName: e.target.value })} className="input" style={{ fontWeight: 600, cursor: 'pointer' }}>
              <option value="" disabled>Select village</option>
              {VILLAGES.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </div>
        )}
        {fields.has('ashaName') && linkedAsha && (
          <div>
            <div className="field-label">Linked ASHA</div>
            <div style={{ height: 48, borderRadius: 13, border: '1.5px solid var(--border-subtle)', background: 'var(--surface-page)', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 15, fontWeight: 600, color: S.body }}>{linkedAsha}</div>
          </div>
        )}
        <Field label="ABHA / RCH ID" value={form.abhaOrRch} onChange={(v) => set({ abhaOrRch: v })} placeholder="—" optional />

        {fields.has('pregnancyStatus') && (
          <div style={{ border: '1.5px solid var(--border-subtle)', borderRadius: 15, padding: 14, background: '#fff' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: S.strong, marginBottom: 11 }}>Pregnancy status</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => set({ pregnancyStatus: 'NORMAL' })} style={{ flex: 1, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: form.pregnancyStatus === 'NORMAL' ? 700 : 600, border: form.pregnancyStatus === 'NORMAL' ? '1.5px solid var(--status-success)' : '1.5px solid var(--border-default)', background: form.pregnancyStatus === 'NORMAL' ? 'var(--status-success-soft)' : '#fff', color: form.pregnancyStatus === 'NORMAL' ? 'var(--status-success)' : S.muted }}>{form.pregnancyStatus === 'NORMAL' ? '✓ Normal' : 'Normal'}</button>
              <button onClick={() => set({ pregnancyStatus: 'HIGH_RISK' })} style={{ flex: 1, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: form.pregnancyStatus === 'HIGH_RISK' ? 700 : 600, border: form.pregnancyStatus === 'HIGH_RISK' ? '1.5px solid var(--status-danger)' : '1.5px solid var(--border-default)', background: form.pregnancyStatus === 'HIGH_RISK' ? 'var(--status-danger-soft)' : '#fff', color: form.pregnancyStatus === 'HIGH_RISK' ? 'var(--status-danger)' : S.muted }}>{form.pregnancyStatus === 'HIGH_RISK' ? '✓ High risk' : 'High risk'}</button>
            </div>
          </div>
        )}

        <div style={{ border: '1.5px solid var(--border-subtle)', borderRadius: 15, padding: 14, background: '#fff' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: S.strong, marginBottom: 11 }}>WhatsApp reminders</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => set({ consent: true })} style={{ flex: 1, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: form.consent ? 700 : 600, border: form.consent ? '1.5px solid #25D366' : '1.5px solid var(--border-default)', background: form.consent ? '#E9FBF0' : '#fff', color: form.consent ? '#128C4A' : S.muted }}>{form.consent ? '✓ Yes, consented' : 'Yes'}</button>
            <button onClick={() => set({ consent: false })} style={{ flex: 1, height: 42, borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: !form.consent ? 700 : 600, border: !form.consent ? '1.5px solid var(--status-warning)' : '1.5px solid var(--border-default)', background: !form.consent ? 'var(--status-warning-soft)' : '#fff', color: !form.consent ? '#C35721' : S.muted }}>{!form.consent ? 'No — call only' : 'No'}</button>
          </div>
        </div>
      </div>

      <button className="btn btn--primary btn--full btn--h52" style={{ marginTop: 16 }} disabled={!canSave} onClick={save}>Save &amp; open patient</button>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, optional, prefix, numeric, maxLen }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; optional?: boolean; prefix?: string; numeric?: boolean; maxLen?: number;
}) {
  return (
    <div>
      <div className="field-label">{label} {optional ? <span style={{ fontWeight: 500, color: S.subtle }}>optional</span> : <span style={{ color: 'var(--status-danger)' }}>*</span>}</div>
      <div style={{ height: 48, borderRadius: 13, border: '1.5px solid var(--border-default)', background: '#fff', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
        {prefix && <span style={{ fontSize: 15, color: S.muted, marginRight: 6 }}>{prefix}</span>}
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

// ============================================================================
// PHC_SN / DH_SN arrivals — NS-4's arrival worklist.
// ============================================================================
function ArrivalsScreen({ context, closedThisSession, onOpenPatient }: {
  context: RoleContext; closedThisSession: Referral[]; onOpenPatient: (pid: Id, referralId: Id) => void;
}) {
  const { data } = useEngineData(() => engine.arrivalWorklist(context), [context.facilityId]);
  const { data: unread } = useEngineData(() => engine.unreadCounts(context), [context.facilityId]);
  const rows = data ?? [];
  const overdue = rows.filter((r) => r.status === 'OVERDUE');
  const due = rows.filter((r) => r.status === 'PENDING');

  useEffect(() => {
    engine.markFilterOpened(context, 'REFERRAL_PENDING');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.facilityId]);

  return (
    <div style={{ padding: '6px 18px 24px', animation: 'nsFade .2s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 4px' }}>
        <div className="h-screen" style={{ fontSize: 21 }}>Arrivals</div>
        {!!unread?.total && <span className="badge" style={{ color: '#fff', background: 'var(--status-danger)' }}>{unread.total} new</span>}
      </div>
      <div className="p-sub" style={{ marginBottom: 6 }}>{facilityName(context.facilityId ?? '')} · referrals expected here</div>

      <SectionHead dot="var(--status-danger)" label="Overdue" count={overdue.length} />
      {overdue.length === 0 ? <EmptyState text="No overdue arrivals." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {overdue.map((r) => <ArrivalPatientRow key={r.id} row={r} onOpen={() => onOpenPatient(r.patientId, r.id)} />)}
        </div>
      )}

      <SectionHead dot="var(--ml-burnt-orange)" label="Due" count={due.length} />
      {due.length === 0 ? <EmptyState text="No arrivals due." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {due.map((r) => <ArrivalPatientRow key={r.id} row={r} onOpen={() => onOpenPatient(r.patientId, r.id)} />)}
        </div>
      )}

      <SectionHead dot="var(--status-success)" label="Completed this session" count={closedThisSession.length} />
      {closedThisSession.length === 0 ? <EmptyState text="Nothing closed yet." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {closedThisSession.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#F3F8F5', borderRadius: 12 }}>
              <Icon path={PATHS.check} size={17} stroke="var(--status-success)" width={2.6} />
              <span style={{ fontSize: 13, color: S.body }}>Referral resolved · {r.completionLocation === 'PRIVATE_FACILITY' ? 'private facility' : r.completionLocation === 'OTHER_PUBLIC_FACILITY' ? 'another public facility' : 'this facility'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function ArrivalPatientRow({ row, onOpen }: { row: { id: Id; patientId: Id; direction: ReferralDirection; status: string }; onOpen: () => void }) {
  const { data: patient } = useEngineData(() => engine.getPatient(row.patientId), [row.patientId]);
  const [bg, color] = avatarPalette(row.patientId);
  return (
    <button className="ns-row" onClick={onOpen}>
      <div className="avatar" style={{ background: bg, color }}>{patient ? initials(patient.name) : '···'}</div>
      <div className="grow">
        <div style={{ fontSize: 15, fontWeight: 600, color: S.strong }}>{patient?.name ?? 'Loading…'}</div>
        <div style={{ fontSize: 12, color: S.muted, marginTop: 1 }}>{patient ? maskMobile(patient.mobile) : ''}</div>
        <div style={{ display: 'flex', gap: 7, marginTop: 6 }}>
          <span className="badge" style={{ color: row.status === 'OVERDUE' ? '#fff' : S.blue, background: row.status === 'OVERDUE' ? 'var(--status-danger)' : 'var(--surface-brand-soft)' }}>
            {row.status === 'OVERDUE' ? 'Overdue' : (row.direction === 'DOWNWARD' ? 'Referred back' : 'Referred up')}
          </span>
        </div>
      </div>
      <Icon path={PATHS.chevRight} size={20} stroke="var(--ml-blue)" width={2.4} />
    </button>
  );
}

// ============================================================================
// Shared patient detail — actions filtered by role.
// ============================================================================
function PatientDetailScreen({ patientId, referralId, context, onBack, onToast, onReferralClosed }: {
  patientId: Id; referralId: Id | null; context: RoleContext; onBack: () => void; onToast: (m: string) => void; onReferralClosed: (r: Referral) => void;
}) {
  const { data: patient } = useEngineData(() => engine.getPatient(patientId), [patientId]);
  const { data: ownReferral } = useEngineData(
    () => (referralId ? engine.getReferral(referralId) : Promise.resolve(undefined)),
    [referralId],
  );

  // ASHA has no "raise referral" action, so a referral she needs to track
  // was raised by the ANM at the patient's own sub-centre — found there.
  const ashaLookup = context.role === 'ASHA' && !referralId && patient?.registeredAtFacilityId
    ? { role: 'ANM_CHO' as const, scope: patient.registeredAtFacilityId }
    : null;
  const { data: ashaPending } = useEngineData(
    () => (ashaLookup ? engine.worklist(ashaLookup, 'REFERRAL_PENDING') : Promise.resolve([])),
    [ashaLookup?.scope, patientId],
  );
  const derivedReferralId = referralId ?? ashaPending?.find((r) => r.id === patientId)?.referralId ?? null;
  const { data: derivedReferral } = useEngineData(
    () => (derivedReferralId && derivedReferralId !== referralId ? engine.getReferral(derivedReferralId) : Promise.resolve(undefined)),
    [derivedReferralId],
  );
  const referral = ownReferral ?? derivedReferral;
  const effectiveReferralId = referral?.id ?? null;

  const [sheet, setSheet] = useState<'facility' | 'onward' | 'tracking' | 'close' | 'anc' | 'pmsma' | null>(null);

  if (!patient) return <EmptyState text="Loading…" />;
  const [bg, color] = avatarPalette(patient.id);

  const raiseReferral = async (destination: Facility) => {
    await engine.raiseReferral(patient.id, { expectedAtFacilityId: destination.id, direction: referralDirectionFor(destination) }, context);
    setSheet(null);
    onToast(`Referral raised to ${destination.name}`);
  };
  const referOnward = async (destination: Facility) => {
    const closed = await engine.closeReferral(effectiveReferralId!, context, { completionLocation: 'REFERRED_PUBLIC_FACILITY' });
    await engine.raiseReferral(patient.id, { expectedAtFacilityId: destination.id, direction: referralDirectionFor(destination) }, context);
    onReferralClosed(closed);
    setSheet(null);
    onToast(`Referred onward to ${destination.name}`);
    onBack();
  };
  const closeArrival = async (completionLocation: CompletionLocation) => {
    const closed = await engine.closeReferral(effectiveReferralId!, context, { completionLocation });
    onReferralClosed(closed);
    setSheet(null);
    onToast('Arrival closed');
    onBack();
  };
  const recordTracking = async (outcome: TrackingOutcome, privateFollowUpDate?: Date) => {
    await engine.recordTrackingOutcome(effectiveReferralId!, { outcome, privateFollowUpDate }, context);
    setSheet(null);
    onToast('Tracking outcome recorded');
  };
  const scheduleAnc = async (dueDate: Date) => {
    await engine.scheduleAncVisit(patient.id, dueDate, context);
    setSheet(null);
    onToast('ANC visit scheduled');
  };
  const schedulePmsma = async () => {
    const row = await engine.schedulePmsma(patient.id, context);
    setSheet(null);
    onToast(row.dueDate ? `Added to the PMSMA session on ${formatDueLabel(row.dueDate)}` : 'Added to the next PMSMA session');
  };

  return (
    <div style={{ animation: 'nsFade .2s ease' }}>
      <div style={{ background: 'linear-gradient(135deg,#1E14BE,#3A2FD6)', padding: '16px 18px 20px', color: '#fff' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'rgba(255,255,255,.16)', cursor: 'pointer', color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '6px 11px', borderRadius: 999, marginBottom: 14 }}>
          <Icon path={PATHS.chevLeft} size={15} width={2.4} />Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div className="avatar" style={{ width: 52, height: 52, background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: 19 }}>{initials(patient.name)}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{patient.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{patient.gender} · {patient.age}{patient.villageName ? ` · ${patient.villageName}` : ''}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.16)', padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600 }}>
            <Icon path={PATHS.phone} size={14} width={2} />{maskMobile(patient.mobile)}
          </span>
          {patient.ashaName && (
            <span style={{ background: 'rgba(255,255,255,.16)', padding: '6px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600 }}>ASHA · {patient.ashaName}</span>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 18px 24px' }}>
        {referral && referral.status === 'PENDING' && (
          <div className="card" style={{ padding: 14, marginBottom: 16, borderLeft: '4px solid var(--ml-blue)' }}>
            <div className="section-label" style={{ marginBottom: 6 }}>Referral pending</div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: S.strong }}>{facilityName(referral.expectedAtFacilityId)}</div>
            <div style={{ fontSize: 12.5, color: S.muted, marginTop: 2 }}>Raised {formatDueLabel(referral.raisedAt)}{referral.escalationCount > 0 ? ` · escalated ${referral.escalationCount}×` : ''}</div>
          </div>
        )}

        <div className="section-label" style={{ margin: '4px 0 10px' }}>Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {context.role === 'ANM_CHO' && (
            <>
              <ActionButton icon={PATHS.arrowUpRight} label="Raise a referral" onClick={() => setSheet('facility')} />
              <ActionButton icon={PATHS.calendar} label="Schedule ANC visit" onClick={() => setSheet('anc')} />
              <ActionButton icon={PATHS.home} label="Schedule PMSMA" onClick={() => setSheet('pmsma')} />
              {referral?.status === 'PENDING' && (
                <ActionButton icon={PATHS.clock} label="Record tracking outcome" onClick={() => setSheet('tracking')} />
              )}
            </>
          )}
          {context.role === 'ASHA' && (
            referral?.status === 'PENDING'
              ? <ActionButton icon={PATHS.clock} label="Record tracking outcome" onClick={() => setSheet('tracking')} />
              : <EmptyState text="No open referral to track for this patient right now." />
          )}
          {(context.role === 'PHC_SN' || context.role === 'DH_SN') && effectiveReferralId && (
            <>
              <ActionButton icon={PATHS.check} label="Close arrival" onClick={() => setSheet('close')} />
              <ActionButton icon={PATHS.arrowUpRight} label="Refer onward" onClick={() => setSheet('onward')} />
            </>
          )}
        </div>
      </div>

      {(sheet === 'facility' || sheet === 'onward') && (
        <FacilityPickerSheet
          excludeId={sheet === 'onward' ? context.facilityId : undefined}
          onClose={() => setSheet(null)}
          onPick={sheet === 'onward' ? referOnward : raiseReferral}
        />
      )}
      {sheet === 'tracking' && <TrackingOutcomeSheet onClose={() => setSheet(null)} onPick={recordTracking} />}
      {sheet === 'close' && <CompletionLocationSheet onClose={() => setSheet(null)} onPick={closeArrival} />}
      {sheet === 'anc' && <DateDialog title="Schedule ANC visit" onBack={() => setSheet(null)} onConfirm={scheduleAnc} />}
      {sheet === 'pmsma' && <ConfirmDialog title="Schedule PMSMA" body={`Adds ${patient.name.split(' ')[0]} to the village's next PMSMA session — a fixed date on the 9th of the month.`} onBack={() => setSheet(null)} onConfirm={schedulePmsma} />}
    </div>
  );
}
function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button className="ns-row" onClick={onClick} style={{ justifyContent: 'flex-start' }}>
      <div className="icon-tile" style={{ width: 38, height: 38, background: 'var(--surface-brand-soft)' }}>
        <Icon path={icon} size={19} stroke="var(--ml-blue)" width={2} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color: S.strong }}>{label}</span>
    </button>
  );
}

// ============================================================================
// Sheets & dialogs
// ============================================================================
function FacilityPickerSheet({ excludeId, onClose, onPick }: { excludeId?: Id; onClose: () => void; onPick: (f: Facility) => void }) {
  const options = FACILITIES.filter((f) => f.isReferralDestination && f.id !== excludeId);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="section-label" style={{ marginBottom: 10 }}>Choose the destination facility</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((f) => (
            <button key={f.id} className="ns-row" onClick={() => onPick(f)}>
              <div className="grow">
                <div style={{ fontSize: 14.5, fontWeight: 700, color: S.strong }}>{f.name}</div>
                <div style={{ fontSize: 12, color: S.muted }}>{f.tier}</div>
              </div>
              <Icon path={PATHS.chevRight} size={18} stroke="var(--ml-blue)" width={2.4} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function TrackingOutcomeSheet({ onClose, onPick }: { onClose: () => void; onPick: (o: TrackingOutcome, privateFollowUpDate?: Date) => void }) {
  const [privateDate, setPrivateDate] = useState('');
  const [awaitingPrivateDate, setAwaitingPrivateDate] = useState(false);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        {!awaitingPrivateDate ? (
          <>
            <div className="section-label" style={{ marginBottom: 10 }}>What happened, from the home visit or call?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TRACKING_OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  className="ns-row"
                  onClick={() => (o.value === 'COMPLETED_PRIVATE_FACILITY' ? setAwaitingPrivateDate(true) : onPick(o.value))}
                >
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: S.strong }}>{o.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="section-label" style={{ marginBottom: 10 }}>Follow-up date the private provider advised</div>
            <div className="p-sub" style={{ marginBottom: 12 }}>If she doesn&rsquo;t have it to hand, leave this blank — Next Steps will create a follow-up call instead.</div>
            <input type="date" value={privateDate} onChange={(e) => setPrivateDate(e.target.value)} className="input" style={{ marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 9 }}>
              <button className="btn btn--ghost btn--full btn--h50" onClick={() => setAwaitingPrivateDate(false)}>Back</button>
              <button className="btn btn--primary btn--full btn--h50" onClick={() => onPick('COMPLETED_PRIVATE_FACILITY', privateDate ? new Date(privateDate) : undefined)}>
                {privateDate ? 'Save with date' : 'Save without a date'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function CompletionLocationSheet({ onClose, onPick }: { onClose: () => void; onPick: (c: CompletionLocation) => void }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="section-label" style={{ marginBottom: 10 }}>Where was she seen?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {COMPLETION_LOCATIONS.map((c) => (
            <button key={c.value} className="ns-row" onClick={() => onPick(c.value)}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: S.strong }}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function DateDialog({ title, onBack, onConfirm }: { title: string; onBack: () => void; onConfirm: (d: Date) => void }) {
  const [value, setValue] = useState('');
  return (
    <div className="dialog-scrim" onClick={onBack}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 700, color: S.strong, marginBottom: 14 }}>{title}</div>
        <div className="field-label">Due date</div>
        <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="input" style={{ marginBottom: 18 }} />
        <div style={{ display: 'flex', gap: 9 }}>
          <button className="btn btn--ghost btn--full btn--h50" onClick={onBack}>Back</button>
          <button className="btn btn--primary btn--full btn--h50" disabled={!value} onClick={() => value && onConfirm(new Date(value))}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
function ConfirmDialog({ title, body, onBack, onConfirm }: { title: string; body: string; onBack: () => void; onConfirm: () => void }) {
  return (
    <div className="dialog-scrim" onClick={onBack}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 700, color: S.strong, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: S.muted, marginBottom: 18, lineHeight: 1.5 }}>{body}</div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button className="btn btn--ghost btn--full btn--h50" onClick={onBack}>Back</button>
          <button className="btn btn--primary btn--full btn--h50" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
