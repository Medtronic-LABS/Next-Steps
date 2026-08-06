// Domain types — coordination data only. No clinical records, ever.

export type RoleKey = 'asha' | 'anm' | 'phc_sn' | 'chc_sn' | 'dh_sn' | 'tert_sn';

export type Level = 'SUBCENTRE' | 'PHC' | 'CHC' | 'DH' | 'TERTIARY';

export type Category =
  | 'REFERRAL'
  | 'ANC_VISIT'
  | 'PMSMA_VISIT'
  | 'FOLLOW_UP'
  | 'LAB'
  | 'IMAGING'
  | 'TREATMENT'
  | 'HOME_VISIT';

export type StepStatus = 'OPEN' | 'DONE' | 'CANCELLED';

/** Reminder delivery state carried from the prototype seed. */
export type ReminderState = 'sent' | 'delivered' | 'failed' | null;

/** Two-value routing label only (NS-12). */
export type Risk = 'HRP' | 'Normal';

export type CloseOutcome = 'COMPLETED' | 'NOT_COMPLETED' | 'NO_CONTACT';

export type CloseSource =
  | 'AT_REFERRED_FACILITY'
  | 'OTHER_PUBLIC_FACILITY'
  | 'PRIVATE_PROVIDER'
  | 'PLANS_LATER'
  | 'DECLINED';

export interface Step {
  id: string;
  cat: Category;
  level: Level;
  status: StepStatus;
  due?: string | null;      // ISO date, when the step is scheduled
  sent?: string | null;     // ISO date, when a referral/step was raised
  rem?: ReminderState;      // reminder delivery state
  unreach?: number;         // failed reminder attempts
  session?: boolean;        // part of a monthly PMSMA session
  owner: RoleKey;           // ownerRole
  // Closure — append-only (FR-F-7)
  outcome?: CloseOutcome | null;
  cdate?: string | null;    // closedAt (ISO)
  csrc?: CloseSource | string | null; // closedSource
  cby?: string | null;      // closedBy (role · facility)
}

export interface Woman {
  id: string;
  name: string;
  hi?: string;              // name in Hindi (display only)
  phone: string;            // +91XXXXXXXXXX
  abha?: string;            // ABHA / RCH id (optional)
  village: string;
  vhi?: string;             // village in Hindi
  asha?: string;            // linked ASHA — resolved from village (NS-8), never typed
  age?: number | null;
  lmp?: string | null;      // recorded at a visit, not at registration
  g?: number | null;        // gravida
  p?: number | null;        // para
  risk: Risk;
  sc: string;               // home sub-centre
  consent: boolean;         // WhatsApp/SMS consent
  steps: Step[];
}

/** A next step staged in the capture screen before it is saved. */
export interface StagedStep {
  sid: string;
  cat: Category;
  level: Level;
  due?: string | null;
  sent?: string | null;
  session?: boolean;
}

export type Screen =
  | 'launcher'
  | 'lookup'
  | 'register'
  | 'worklist'
  | 'alerts'
  | 'journey'
  | 'capture';

export type TabKey = 'lookup' | 'worklist' | 'alerts';

export type DialogType = 'referral' | 'anc' | 'pmsma' | 'close' | 'sms' | 'scan';

export interface DialogState {
  type: DialogType;
  level?: Level | null;
  cat?: Category;
  date?: string;
  stepId?: string;
  outcome?: CloseOutcome | null;
  src?: CloseSource | null;
}

/** Deployment configuration — read-only to the app (config/{deploymentId}). */
export interface DeploymentConfig {
  deploymentId: string;
  villages: { name: string; asha: string; ashaPhone?: string }[];
  pmsmaDay: number;
  intervals: {
    referralStaleDays: number;
    notDoneDays: number;
    overdueAlertDays: number;
  };
}

/** Offline write queued for replay to Firestore (idempotent by client id). */
export interface OutboxEntry {
  id: string;                // client-generated id → idempotent replay
  op: 'register' | 'addSteps' | 'closeStep' | 'ackAlert';
  payload: unknown;
  createdAt: number;
  synced: boolean;
}
