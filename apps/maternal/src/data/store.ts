// App store (Zustand). Ports the prototype's DCLogic navigation + mutations.
// Every mutation updates in-memory state, persists to Dexie, and enqueues an
// outbox entry so offline writes replay to Firestore idempotently on reconnect.
import { create } from 'zustand';
import type {
  Category, DeploymentConfig, DialogState,
  OutboxEntry, RoleKey, Screen, StagedStep, Step, TabKey, Woman,
} from '../domain/types';
import { ROLES, TODAY_ISO } from '../domain/constants';
import { CAT, LVL } from '../domain/constants';
import { ashaFor, nextPmsma, uid, isoOf } from '../domain/logic';
import { bootstrap, DEFAULT_CONFIG, enqueue, persistWoman } from './db';
import { drainOutbox, getLastSynced } from './sync';

interface RegDraft {
  name: string;
  phone: string;
  village: string;
  abha: string;
  status: 'normal' | 'high';
  consent: boolean;
}
interface CaptureDraft {
  womanId: string;
  steps: StagedStep[];
}

interface AppState {
  hydrated: boolean;
  women: Woman[];
  config: DeploymentConfig;

  screen: Screen;
  role: RoleKey | null;
  tab: TabKey | null;
  selId: string | null;
  query: string;
  filter: string;
  riskFilter: string;
  dialog: DialogState | null;
  cap: CaptureDraft | null;
  reg: RegDraft | null;
  acked: Record<string, boolean>;
  toast: string | null;
  lastSynced: number | undefined;

  // lifecycle
  hydrate: () => Promise<void>;
  showToast: (t: string) => void;

  // nav
  pickRole: (r: RoleKey) => void;
  switchRole: () => void;
  setTab: (t: TabKey) => void;
  openWoman: (id: string) => void;
  back: () => void;
  setQuery: (q: string) => void;
  setFilter: (f: string) => void;
  setRiskFilter: (r: string) => void;

  // register
  openRegister: () => void;
  setReg: (patch: Partial<RegDraft>) => void;
  saveReg: () => void;

  // capture
  openCapture: (id: string) => void;
  openOption: (cat: Category) => void;
  removeStaged: (sid: string) => void;
  saveCapture: () => void;

  // dialogs
  setDialog: (d: DialogState | null) => void;
  dismissDialog: () => void;
  confirmReferral: () => void;
  confirmDated: () => void;
  confirmPmsma: () => void;
  // step action menu
  openStepMenu: (stepId: string) => void;
  openComplete: (stepId: string) => void;
  confirmComplete: () => void;
  openReschedule: (stepId: string) => void;
  confirmReschedule: () => void;
  logContactAttempt: (stepId: string) => void;
  cancelStep: (stepId: string) => void;
  declineStep: (stepId: string) => void;
  callPatient: (stepId: string) => void;
  openSms: (stepId: string) => void;
  openScan: () => void;
  confirmScan: () => void;
  ackAlert: (stepId: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

const outbox = (op: OutboxEntry['op'], payload: unknown): OutboxEntry => ({
  id: uid('ob'),
  op,
  payload,
  createdAt: Date.now(),
  synced: false,
});

export const useApp = create<AppState>((set, get) => ({
  hydrated: false,
  women: [],
  config: DEFAULT_CONFIG,
  screen: 'launcher',
  role: null,
  tab: null,
  selId: null,
  query: '',
  filter: 'ALL',
  riskFilter: 'ALL',
  dialog: null,
  cap: null,
  reg: null,
  acked: {},
  toast: null,
  lastSynced: undefined,

  async hydrate() {
    const { women, config } = await bootstrap();
    const lastSynced = await getLastSynced();
    set({ women, config, lastSynced, hydrated: true });
  },

  showToast(t) {
    set({ toast: t });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set({ toast: null }), 2600);
  },

  // ---------- nav ----------
  pickRole(r) {
    set({ role: r, screen: 'lookup', tab: 'lookup', selId: null, query: '', dialog: null, filter: 'ALL', riskFilter: 'ALL' });
  },
  switchRole() {
    set({ screen: 'launcher', role: null, dialog: null, cap: null });
  },
  setTab(t) {
    set({ screen: t as Screen, tab: t, selId: null, dialog: null });
  },
  openWoman(id) {
    set({ screen: 'journey', selId: id, dialog: null });
  },
  back() {
    set({ screen: (get().tab || 'lookup') as Screen, cap: null, dialog: null });
  },
  setQuery(q) { set({ query: q }); },
  setFilter(f) { set({ filter: f }); },
  setRiskFilter(r) { set({ riskFilter: r }); },

  // ---------- register ----------
  openRegister() {
    set({ screen: 'register', dialog: null, reg: { name: '', phone: '', village: '', abha: '', status: 'normal', consent: true } });
  },
  setReg(patch) {
    const reg = get().reg ?? { name: '', phone: '', village: '', abha: '', status: 'normal', consent: true };
    set({ reg: { ...reg, ...patch } });
  },
  saveReg() {
    const r = get().reg;
    const role = get().role;
    if (!r || !role) return;
    const digits = r.phone.replace(/\D/g, '').slice(-10);
    if (!r.name.trim() || digits.length < 10 || !r.village) {
      get().showToast('Name, mobile and village are required');
      return;
    }
    const asha = ashaFor(r.village, get().config.villages);
    const id = uid('w');
    const woman: Woman = {
      id, name: r.name.trim(), hi: '', phone: '+91' + digits, village: r.village, vhi: '',
      asha, abha: r.abha || '', age: null, lmp: null, g: null, p: null,
      risk: r.status === 'high' ? 'HRP' : 'Normal', sc: ROLES[role].facility, consent: !!r.consent, steps: [],
    };
    void persistWoman(woman);
    void enqueue(outbox('register', woman));
    set({ women: [woman, ...get().women], screen: 'journey', selId: id, reg: null });
    get().showToast(woman.name + ' registered · linked ASHA ' + asha);
  },

  // ---------- capture ----------
  openCapture(id) {
    set({ screen: 'capture', dialog: null, cap: { womanId: id, steps: [] } });
  },
  openOption(cat) {
    const role = get().role;
    if (!role) return;
    if (cat === 'REFERRAL') { set({ dialog: { type: 'referral', level: null } }); return; }
    if (cat === 'PMSMA_VISIT') { set({ dialog: { type: 'pmsma' } }); return; }
    if (cat === 'ANC_VISIT') {
      const d = new Date(Date.parse(TODAY_ISO + 'T00:00:00') + 14 * 86_400_000);
      set({ dialog: { type: 'anc', cat, date: isoOf(d) } });
      return;
    }
    addStaged(get, set, { cat, level: ROLES[role].level, sent: TODAY_ISO });
    get().showToast(CAT[cat].label + ' added · ' + ROLES[role].facility);
  },
  removeStaged(sid) {
    const cap = get().cap;
    if (!cap) return;
    set({ cap: { ...cap, steps: cap.steps.filter((s) => s.sid !== sid) } });
  },
  saveCapture() {
    const cap = get().cap;
    const role = get().role;
    if (!cap || !role || !cap.steps.length) return;
    const fresh: Step[] = cap.steps.map((s) => ({
      id: uid('s'), cat: s.cat, level: s.level, due: s.due ?? null, sent: s.sent ?? null,
      status: 'OPEN', rem: null, owner: role, session: !!s.session,
    }));
    const women = get().women.map((w) => (w.id !== cap.womanId ? w : { ...w, steps: [...w.steps, ...fresh] }));
    const updated = women.find((w) => w.id === cap.womanId);
    if (updated) void persistWoman(updated);
    void enqueue(outbox('addSteps', { womanId: cap.womanId, steps: fresh }));
    set({ women, screen: 'journey', cap: null });
    const n = fresh.length;
    get().showToast(n + ' step' + (n > 1 ? 's' : '') + ' saved · reminders scheduled');
  },

  // ---------- dialogs ----------
  setDialog(d) { set({ dialog: d }); },
  dismissDialog() { set({ dialog: null }); },
  confirmReferral() {
    const dl = get().dialog;
    const role = get().role;
    if (!dl || !dl.level || !role) return;
    addStaged(get, set, { cat: 'REFERRAL', level: dl.level, sent: TODAY_ISO });
    set({ dialog: null });
    get().showToast('Referral to ' + LVL[dl.level].label + ' ready to send');
  },
  confirmDated() {
    const dl = get().dialog;
    const role = get().role;
    if (!dl || !dl.date || !dl.cat || !role) return;
    addStaged(get, set, { cat: dl.cat, level: ROLES[role].level, due: dl.date });
    set({ dialog: null });
    get().showToast(CAT[dl.cat].label + ' set for ' + shortFmt(dl.date));
  },
  confirmPmsma() {
    const date = nextPmsma(get().config.pmsmaDay);
    addStaged(get, set, { cat: 'PMSMA_VISIT', level: 'PHC', due: date, session: true });
    set({ dialog: null });
    get().showToast('Added to PMSMA session · ' + shortFmt(date));
  },
  // ----- step action menu -----
  openStepMenu(stepId) {
    set({ dialog: { type: 'stepmenu', stepId } });
  },
  openComplete(stepId) {
    set({ dialog: { type: 'complete', stepId, src: null } });
  },
  confirmComplete() {
    const dl = get().dialog;
    const role = get().role;
    if (!dl || !role || dl.type !== 'complete' || !dl.stepId || !dl.src) return; // needs a care source (FR-F-7)
    const r = ROLES[role];
    patchStep(get, set, dl.stepId, {
      status: 'DONE', outcome: 'COMPLETED', cdate: TODAY_ISO, csrc: dl.src, cby: r.short + ' · ' + r.facility,
    }, 'closeStep');
    set({ dialog: null });
    get().showToast('Step completed · visible to every level');
  },
  openReschedule(stepId) {
    const step = findStep(get().women, stepId);
    const def = step?.due || isoOf(new Date(Date.parse(TODAY_ISO + 'T00:00:00') + 7 * 86_400_000));
    set({ dialog: { type: 'reschedule', stepId, date: def } });
  },
  confirmReschedule() {
    const dl = get().dialog;
    if (!dl || dl.type !== 'reschedule' || !dl.stepId || !dl.date) return;
    patchStep(get, set, dl.stepId, { due: dl.date, rem: null }); // clear reminder → regenerate
    set({ dialog: null });
    get().showToast('Due date rescheduled · reminders regenerated');
  },
  logContactAttempt(stepId) {
    const step = findStep(get().women, stepId);
    patchStep(get, set, stepId, { rem: 'failed', unreach: (step?.unreach ?? 0) + 1 });
    set({ dialog: null });
    get().showToast('Contact attempt logged · marked unreachable');
  },
  cancelStep(stepId) {
    patchStep(get, set, stepId, { status: 'CANCELLED', cdate: TODAY_ISO });
    set({ dialog: null });
    get().showToast('Step cancelled');
  },
  declineStep(stepId) {
    const role = get().role;
    const r = role ? ROLES[role] : null;
    patchStep(get, set, stepId, {
      status: 'CANCELLED', outcome: 'NOT_COMPLETED', csrc: 'DECLINED', cdate: TODAY_ISO,
      cby: r ? r.short + ' · ' + r.facility : null,
    }, 'closeStep');
    set({ dialog: null });
    get().showToast('Marked — she declined');
  },
  callPatient(stepId) {
    const w = get().women.find((x) => x.steps.some((s) => s.id === stepId));
    get().showToast('Dialling ' + (w ? w.name : 'her') + '…');
  },
  openSms(stepId) { set({ dialog: { type: 'sms', stepId } }); },
  openScan() { set({ dialog: { type: 'scan' } }); },
  confirmScan() {
    set({ dialog: null, query: '9812345022' });
    get().showToast('ABHA matched · Lakshmi Bai');
  },
  ackAlert(stepId) {
    const acked = { ...get().acked, [stepId]: true };
    const role = get().role;
    void enqueue(outbox('ackAlert', { stepId, at: Date.now(), by: role ? ROLES[role].short : '' }));
    set({ acked });
    get().showToast('Marked — working on it');
  },
}));

// ---------- helpers (kept outside the store object to avoid `this`) ----------
type SetFn = (partial: Partial<AppState>) => void;
type GetFn = () => AppState;

function addStaged(get: GetFn, set: SetFn, st: Omit<StagedStep, 'sid'>) {
  const cap = get().cap;
  if (!cap) return;
  set({ cap: { ...cap, steps: [...cap.steps, { sid: uid('st'), ...st }] } });
}

/** Find a step across all women (used by the step action menu). */
function findStep(women: Woman[], stepId?: string): Step | undefined {
  if (!stepId) return undefined;
  for (const w of women) {
    const s = w.steps.find((x) => x.id === stepId);
    if (s) return s;
  }
  return undefined;
}

/** Apply a patch to one step: update memory, persist to Dexie, enqueue outbox. */
function patchStep(get: GetFn, set: SetFn, stepId: string, patch: Partial<Step>, op: OutboxEntry['op'] = 'updateStep') {
  let touched: Woman | undefined;
  const women = get().women.map((w) => {
    if (!w.steps.some((s) => s.id === stepId)) return w;
    const nw = { ...w, steps: w.steps.map((s) => (s.id !== stepId ? s : { ...s, ...patch })) };
    touched = nw;
    return nw;
  });
  if (touched) void persistWoman(touched);
  void enqueue(outbox(op, { womanId: touched?.id, stepId, ...patch }));
  set({ women });
}

function shortFmt(iso: string): string {
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(iso + 'T00:00:00');
  return d.getDate() + ' ' + MON[d.getMonth()];
}

// Kick a sync attempt when connectivity returns (durable no-op if unconfigured).
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void drainOutbox(Date.now()).then(() => {
      void getLastSynced().then((ls) => useApp.setState({ lastSynced: ls }));
    });
  });
}
