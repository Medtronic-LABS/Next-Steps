// Pure display + coordination logic. No I/O, no framework.

import { META } from './catalog';
import { AVATARS } from './seed';
import { resolveUpid, type IdentityConfig } from './identity';
import { getCategoryLabel, type ProgrammeProfile } from './profile';
import type { Category, Delivery, Gender, Id, Patient, StepStatus, WorklistSection, WorkStep } from './types';

export * from './identity';

/** §11.2: only these three statuses are terminal — never overdue (§11.1). */
const TERMINAL_STATUSES: ReadonlySet<StepStatus> = new Set(['COMPLETED', 'CANCELLED', 'DECLINED']);

/** Clinic timezone (§10 default). Not yet clinic-configurable (§10.5 covers only the unreachable threshold). */
export const CLINIC_TIMEZONE = 'Asia/Kolkata';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar day index of `d` in the clinic timezone — equal iff same clinic calendar day. */
export function clinicDayIndex(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return Math.floor(Date.UTC(get('year'), get('month') - 1, get('day')) / DAY_MS);
}

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

export interface OverdueInfo {
  isOverdue: boolean;
  daysOverdue: number;
}

/** §11.1: isOverdue = dueDate < today AND status is not terminal; derived on read, never stored. */
export function deriveOverdue(dueDate: Date, status: StepStatus, now: Date = new Date()): OverdueInfo {
  if (!isValidDate(dueDate) || TERMINAL_STATUSES.has(status)) {
    return { isOverdue: false, daysOverdue: 0 };
  }
  const daysOverdue = Math.max(0, clinicDayIndex(now) - clinicDayIndex(dueDate));
  return { isOverdue: daysOverdue > 0, daysOverdue };
}

/** §10.5: default unreachable-attempts threshold, when a clinic hasn't configured its own. */
export const DEFAULT_UNREACHABLE_THRESHOLD = 3;

/**
 * FR-A-6.1, §11.3: worklist section membership, derived on every read from
 * dueDate, status and attempts — never stored. Returns null when a step
 * qualifies for none of the five sections (e.g. due more than 7 days out).
 *
 * PROVISIONAL: Unreachable takes precedence over Overdue when a step
 * qualifies for both — FR-A-6.1 doesn't state a precedence rule; this is
 * pending a PRD ruling (see ITEM-3-TEST-CASES.md TC-SECT-003's open question).
 */
export function deriveSection(
  step: WorkStep,
  unreachableThreshold: number = DEFAULT_UNREACHABLE_THRESHOLD,
  now: Date = new Date(),
): WorklistSection | null {
  if (TERMINAL_STATUSES.has(step.status)) return null;
  if (step.attempts >= unreachableThreshold) return 'unreach';
  const todayIndex = clinicDayIndex(now);
  const dueIndex = clinicDayIndex(step.dueDate);
  if (dueIndex < todayIndex) return 'overdue';
  if (dueIndex === todayIndex) return 'today';
  if (dueIndex <= todayIndex + 7) return 'soon';
  return null;
}

// §13 — dashboard metric formulas. Normative; every figure derives solely
// from Next Step coordination state (BR-018). 'Period' membership is by
// dueDate unless a metric states otherwise (median days to completion uses
// completedDate; overdue buckets, patient counts and unreachable are
// snapshots, never period-bound).

/** A step's period membership: `date` falls within the `periodDays` ending on `now`, inclusive at both ends. */
export function inPeriod(date: Date, periodDays: number, now: Date): boolean {
  const todayIndex = clinicDayIndex(now);
  const dueIndex = clinicDayIndex(date);
  return dueIndex <= todayIndex && todayIndex - dueIndex < periodDays;
}

function computeRatePct(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

export interface RateResult {
  numerator: number;
  denominator: number;
  rate: number;
}

function rateResult(numerator: number, denominator: number): RateResult {
  return { numerator, denominator, rate: computeRatePct(numerator, denominator) };
}

/**
 * §13 completion rate: COMPLETED ÷ steps with dueDate in period and status
 * not CANCELLED. DECLINED counts in the denominator (uncompleted care);
 * CANCELLED (entry error) is excluded from both numerator and denominator.
 */
export function completionRate<T extends { dueDate: Date; status: StepStatus }>(
  steps: T[],
  periodDays: number,
  now: Date = new Date(),
): RateResult {
  const eligible = steps.filter((s) => s.status !== 'CANCELLED' && inPeriod(s.dueDate, periodDays, now));
  const numerator = eligible.filter((s) => s.status === 'COMPLETED').length;
  return rateResult(numerator, eligible.length);
}

/** §13 on-time completion rate: COMPLETED with completedDate <= dueDate (inclusive), over the same denominator as `completionRate`. */
export function onTimeCompletionRate<
  T extends { dueDate: Date; status: StepStatus; completedDate?: Date | null },
>(steps: T[], periodDays: number, now: Date = new Date()): RateResult {
  const eligible = steps.filter((s) => s.status !== 'CANCELLED' && inPeriod(s.dueDate, periodDays, now));
  const numerator = eligible.filter(
    (s) =>
      s.status === 'COMPLETED' &&
      s.completedDate != null &&
      clinicDayIndex(s.completedDate) <= clinicDayIndex(s.dueDate),
  ).length;
  return rateResult(numerator, eligible.length);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface MedianDaysResult {
  overall: number;
  byCategory: Record<string, number>;
}

/**
 * §13 median days to completion: median of (completedDate - visitDate) over
 * steps COMPLETED in the period, overall and per category. Period
 * membership here is by completedDate — the opposite rule from
 * `completionRate`, which is by dueDate.
 */
export function medianDaysToCompletion<
  T extends { cat: string; visitDate: Date; status: StepStatus; completedDate?: Date | null },
>(steps: T[], periodDays: number, now: Date = new Date()): MedianDaysResult {
  const durations: number[] = [];
  const byCategory = new Map<string, number[]>();
  for (const s of steps) {
    if (s.status !== 'COMPLETED' || s.completedDate == null) continue;
    if (!inPeriod(s.completedDate, periodDays, now)) continue;
    const days = clinicDayIndex(s.completedDate) - clinicDayIndex(s.visitDate);
    durations.push(days);
    const list = byCategory.get(s.cat);
    if (list) list.push(days);
    else byCategory.set(s.cat, [days]);
  }
  const byCategoryMedian: Record<string, number> = {};
  for (const [cat, list] of byCategory) byCategoryMedian[cat] = median(list);
  return { overall: median(durations), byCategory: byCategoryMedian };
}

export interface OverdueBuckets {
  '1-7': Id[];
  '8-30': Id[];
  '31-90': Id[];
  '90+': Id[];
}

/**
 * §13 overdue buckets: open steps with isOverdue = true, as of now — a
 * snapshot, never period-bound — aged into 1-7 / 8-30 / 31-90 / 90+ day
 * buckets, boundary-inclusive and mutually exclusive.
 */
export function overdueBuckets<T extends { id: Id; dueDate: Date; status: StepStatus }>(
  steps: T[],
  now: Date = new Date(),
): OverdueBuckets {
  const buckets: OverdueBuckets = { '1-7': [], '8-30': [], '31-90': [], '90+': [] };
  for (const s of steps) {
    const { isOverdue, daysOverdue } = deriveOverdue(s.dueDate, s.status, now);
    if (!isOverdue) continue;
    if (daysOverdue <= 7) buckets['1-7'].push(s.id);
    else if (daysOverdue <= 30) buckets['8-30'].push(s.id);
    else if (daysOverdue <= 90) buckets['31-90'].push(s.id);
    else buckets['90+'].push(s.id);
  }
  return buckets;
}

/**
 * §13 patients needing attention: distinct patients having >= 1 overdue or
 * unreachable open step — a snapshot. Counts patients, not steps, so a
 * patient qualifying on both counts is still counted once.
 */
export function patientsNeedingAttention<T extends { pid: Id; dueDate: Date; status: StepStatus; attempts: number }>(
  steps: T[],
  unreachableThreshold: number = DEFAULT_UNREACHABLE_THRESHOLD,
  now: Date = new Date(),
): number {
  const patients = new Set<Id>();
  for (const s of steps) {
    if (TERMINAL_STATUSES.has(s.status)) continue;
    const { isOverdue } = deriveOverdue(s.dueDate, s.status, now);
    if (isOverdue || s.attempts >= unreachableThreshold) patients.add(s.pid);
  }
  return patients.size;
}

/**
 * §13, §10.5 unreachable patients: distinct patients having >= 1 open step
 * with attempts >= the clinic-configured threshold — a snapshot. Terminal
 * steps never count, regardless of attempts.
 */
export function unreachablePatients<T extends { pid: Id; status: StepStatus; attempts: number }>(
  steps: T[],
  threshold: number = DEFAULT_UNREACHABLE_THRESHOLD,
): number {
  const patients = new Set<Id>();
  for (const s of steps) {
    if (TERMINAL_STATUSES.has(s.status)) continue;
    if (s.attempts >= threshold) patients.add(s.pid);
  }
  return patients.size;
}

/** Today plus the following 14 days, inclusive — 15 datapoints (PROVISIONAL far-boundary reading, ITEM-4-TEST-CASES.md). */
const UPCOMING_LOAD_WINDOW_DAYS = 15;

export interface UpcomingLoad {
  /** Per-day counts; index 0 is today, index 14 is 14 days out. */
  series: number[];
  total: number;
}

/** §13 upcoming load: count of open steps with dueDate in the next 14 days, per day (not a single aggregate total). */
export function upcomingLoad<T extends { dueDate: Date; status: StepStatus }>(
  steps: T[],
  now: Date = new Date(),
): UpcomingLoad {
  const series = new Array(UPCOMING_LOAD_WINDOW_DAYS).fill(0) as number[];
  const todayIndex = clinicDayIndex(now);
  for (const s of steps) {
    if (TERMINAL_STATUSES.has(s.status)) continue;
    const offset = clinicDayIndex(s.dueDate) - todayIndex;
    if (offset >= 0 && offset < UPCOMING_LOAD_WINDOW_DAYS) series[offset]++;
  }
  return { series, total: series.reduce((a, b) => a + b, 0) };
}

/**
 * §13, BR-019 referral completion rate: as `completionRate`, restricted to
 * SPECIALIST_REFERRAL steps and split by specialty only. Callers must not
 * pass a named destination through — grouping here keys on `specialty`
 * alone, and only `dueDate`/`status` are copied into the per-specialty
 * rate computation, so no destination string can leak into the result.
 */
export function referralCompletionRateBySpecialty<T extends { specialty: string; dueDate: Date; status: StepStatus }>(
  steps: T[],
  periodDays: number,
  now: Date = new Date(),
): Record<string, RateResult> {
  const bySpecialty = new Map<string, { dueDate: Date; status: StepStatus }[]>();
  for (const s of steps) {
    const list = bySpecialty.get(s.specialty);
    const entry = { dueDate: s.dueDate, status: s.status };
    if (list) list.push(entry);
    else bySpecialty.set(s.specialty, [entry]);
  }
  const result: Record<string, RateResult> = {};
  for (const [specialty, list] of bySpecialty) result[specialty] = completionRate(list, periodDays, now);
  return result;
}

/** §13: percentages display with their denominator, e.g. "50% (2 of 4)", so a small sample is never mistaken for a settled figure. */
export function formatRateWithDenominator(numerator: number, denominator: number): string {
  return `${computeRatePct(numerator, denominator)}% (${numerator} of ${denominator})`;
}

export interface LostToFollowUpOptions {
  threshold: number;
  lostToFollowUpDays: number;
}

/**
 * §13 lost to follow-up (PROVISIONAL — flagged in §13/§20/§21 as a default
 * proposal, not settled). Distinct patients where EVERY open step is >=
 * lostToFollowUpDays overdue, AND attempts >= threshold on the most recent
 * of them (ties broken by array order), AND no visit since those steps
 * became due.
 */
export function lostToFollowUp<
  T extends { patientId: Id; steps: { dueDate: Date; status: StepStatus; attempts: number }[]; lastVisitDate: Date },
>(patients: T[], options: LostToFollowUpOptions, now: Date = new Date()): number {
  let count = 0;
  for (const patient of patients) {
    const openSteps = patient.steps.filter((s) => !TERMINAL_STATUSES.has(s.status));
    if (openSteps.length === 0) continue;

    const allOverdueEnough = openSteps.every(
      (s) => deriveOverdue(s.dueDate, s.status, now).daysOverdue >= options.lostToFollowUpDays,
    );
    if (!allOverdueEnough) continue;

    const mostRecent = openSteps.reduce((latest, s) => (s.dueDate >= latest.dueDate ? s : latest));
    if (mostRecent.attempts < options.threshold) continue;

    const earliestDue = openSteps.reduce((earliest, s) => (s.dueDate < earliest.dueDate ? s : earliest)).dueDate;
    if (patient.lastVisitDate >= earliestDue) continue;

    count++;
  }
  return count;
}

/** §10, FR-A-6.4: the bare display label for a due date — 'Today', '19 Jun', '28 Jul' — derived, never stored. */
export function formatDueLabel(dueDate: Date, now: Date = new Date()): string {
  if (!isValidDate(dueDate)) return '';
  if (clinicDayIndex(dueDate) === clinicDayIndex(now)) return 'Today';
  return new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIMEZONE, day: 'numeric', month: 'short' }).format(
    dueDate,
  );
}

/** §10, FR-D-2.4: the admin worklist header's "today" label, e.g. 'Monday, 6 July' — derived from `now` in clinic time, never a fixed literal. */
export function formatTodayLabel(now: Date = new Date()): string {
  const weekday = now.toLocaleString('en-US', { timeZone: CLINIC_TIMEZONE, weekday: 'long' });
  const day = now.toLocaleString('en-US', { timeZone: CLINIC_TIMEZONE, day: 'numeric' });
  const month = now.toLocaleString('en-US', { timeZone: CLINIC_TIMEZONE, month: 'long' });
  return `${weekday}, ${day} ${month}`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/** Masked mobile for lists (PRD FR-A-2.3), e.g. "98•••••210". */
export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.slice(0, 2) + '•••••' + digits.slice(-3);
}

/** Avatar [background, foreground] for a patient index. */
export function avatarFor(index: number): [string, string] {
  const [bg, color] = AVATARS[index % AVATARS.length].split('|');
  return [bg, color];
}

export function deliveryColor(d: Delivery): string {
  switch (d) {
    case 'Read':
      return '#6165DE';
    case 'Delivered':
      return '#128C4A';
    case 'Failed':
      return '#994242';
    case 'Sent':
      return '#595959';
    default:
      return '#909090';
  }
}

/** A worklist/board step enriched with everything the UI renders. */
export interface DecoratedStep extends WorkStep {
  isOverdue: boolean;
  daysOverdue: number;
  /** Legacy alias for `daysOverdue` (BR-014 ordering, existing callers). */
  over: number;
  categoryLabel: string;
  color: string;
  soft: string;
  iconPath: string;
  statusText: string;
  statusColor: string;
  isHigh: boolean;
  showOver: boolean;
  overBadge: string;
  /** Bare due-date label — 'Today', '19 Jun', '28 Jul' (§10, FR-A-6.4). */
  dueLabel: string;
  showAttempts: boolean;
  attemptsLabel: string;
  showDelivery: boolean;
  deliveryTint: string;
}

export function decorate(w: WorkStep, now: Date = new Date(), profile?: ProgrammeProfile): DecoratedStep {
  const m = META[w.cat];
  const { isOverdue, daysOverdue } = deriveOverdue(w.dueDate, w.status, now);
  const label = formatDueLabel(w.dueDate, now);
  return {
    ...w,
    isOverdue,
    daysOverdue,
    over: daysOverdue,
    categoryLabel: getCategoryLabel(w.cat, profile),
    color: m.color,
    soft: m.soft,
    iconPath: m.iconPath,
    statusText: isOverdue
      ? 'Overdue · was due ' + label
      : label === 'Today'
        ? 'Due today'
        : 'Due ' + label,
    statusColor: isOverdue ? 'var(--status-danger)' : 'var(--text-muted)',
    isHigh: w.priority === 'HIGH',
    showOver: isOverdue,
    overBadge: daysOverdue + 'd overdue',
    dueLabel: label,
    showAttempts: w.attempts > 0,
    attemptsLabel: w.attempts + ' failed attempts',
    showDelivery: w.delivery !== '—',
    deliveryTint: deliveryColor(w.delivery),
  };
}

/** Build the SVG polyline/area/dots for a small completion trend. */
export function trendPath(values: number[]): {
  line: string;
  area: string;
  dots: { x: number; y: number }[];
} {
  const W = 288;
  const H = 88;
  const pad = 8;
  const min = 58;
  const max = 84;
  const n = values.length;
  const sx = (W - 2 * pad) / (n - 1);
  const x = (i: number) => pad + i * sx;
  const y = (v: number) => 6 + ((max - v) / (max - min)) * (H - 6);
  const dots = values.map((v, i) => ({ x: +x(i).toFixed(1), y: +y(v).toFixed(1) }));
  const line = dots.map((d) => d.x + ',' + d.y).join(' ');
  const area = pad + ',' + H + ' ' + line + ' ' + x(n - 1).toFixed(1) + ',' + H;
  return { line, area, dots };
}

/**
 * Worklist ordering within a section (PRD BR-014, FR-A-6.3). `isUnreach`
 * should be passed explicitly by callers that already know which section a
 * list came from (section membership is derived, not stored — see
 * `deriveSection`); when omitted it falls back to inspecting each step's own
 * `section`, for callers working from a hand-built fixture rather than a
 * bucket the caller already labelled.
 */
export function orderSection(
  steps: DecoratedStep[],
  isUnreach: boolean = steps.every((s) => (s as unknown as { section?: string }).section === 'unreach'),
): DecoratedStep[] {
  // Unreachable orders by most failed attempts first (FR-A-6.3) — a distinct
  // comparator from every other section, which orders by priority then days
  // overdue.
  if (isUnreach) {
    return [...steps].sort((a, b) => b.attempts - a.attempts || a.name.localeCompare(b.name));
  }
  const pr = (s: DecoratedStep) => (s.priority === 'HIGH' ? 0 : 1);
  return [...steps].sort(
    (a, b) => pr(a) - pr(b) || b.over - a.over || a.name.localeCompare(b.name),
  );
}

// Best-effort gender guess from an Indian first name. Curated common names;
// returns null when unsure so the caller keeps whatever is already selected.
const FEMALE_NAMES = new Set([
  'meera', 'mira', 'lakshmi', 'laxmi', 'sunita', 'anjali', 'fatima', 'meena', 'kavita', 'kavitha',
  'priya', 'sita', 'seeta', 'gita', 'geeta', 'geetha', 'radha', 'pooja', 'puja', 'neha', 'divya',
  'deepa', 'deepika', 'anita', 'anitha', 'rekha', 'shreya', 'aishwarya', 'sneha', 'nisha', 'ritu',
  'swati', 'jyoti', 'usha', 'asha', 'rani', 'kumari', 'devi', 'sonia', 'sonal', 'manisha', 'vandana',
  'sushma', 'sarita', 'rashmi', 'poonam', 'preeti', 'preity', 'payal', 'komal', 'aarti', 'arti',
  'bhavna', 'bhavana', 'chitra', 'ekta', 'gauri', 'heena', 'hina', 'indira', 'kalpana', 'lata',
  'madhuri', 'nandini', 'padma', 'rachna', 'sangeeta', 'sangita', 'tara', 'uma', 'vidya', 'yamini',
  'zara', 'ananya', 'diya', 'isha', 'isha', 'kavya', 'myra', 'riya', 'saanvi', 'tanvi', 'aditi',
  'charu', 'nidhi', 'rupa', 'roopa', 'seema', 'shalini', 'shanti', 'simran', 'tanya', 'trisha',
  'vaishali', 'nikita', 'namrata', 'aparna', 'archana', 'bhoomi', 'chandni', 'darshana', 'esha',
  'falguni', 'hema', 'jaya', 'jhanvi', 'kiran', 'leela', 'mala', 'maya', 'mona', 'neelam', 'nikki',
  'nirmala', 'parul', 'pallavi', 'pinky', 'radhika', 'ragini', 'reena', 'renu', 'roshni', 'sana',
  'shweta', 'sweta', 'shobha', 'shraddha', 'smita', 'sonam', 'suman', 'sudha', 'tanu', 'vidhi',
  'vimala', 'yogita', 'zoya', 'ayesha', 'noor', 'saira', 'shabana', 'nargis', 'ruksana',
]);
const MALE_NAMES = new Set([
  'ramesh', 'iqbal', 'vijay', 'ganesh', 'mohan', 'arjun', 'rahul', 'prakash', 'deepak', 'amit',
  'sunil', 'anil', 'rajesh', 'suresh', 'rakesh', 'sanjay', 'vikram', 'ajay', 'manoj', 'ashok',
  'ravi', 'kumar', 'krishna', 'karan', 'rohit', 'rohan', 'sachin', 'vivek', 'nikhil', 'gaurav',
  'harish', 'naresh', 'dinesh', 'mahesh', 'umesh', 'yogesh', 'jitesh', 'nitesh', 'hitesh', 'bharat',
  'chetan', 'darshan', 'girish', 'hemant', 'jayesh', 'kunal', 'lalit', 'mukesh', 'naveen', 'pankaj',
  'raj', 'rajan', 'sameer', 'samir', 'tarun', 'uday', 'varun', 'yash', 'aarav', 'aditya', 'aryan',
  'dev', 'ishaan', 'kabir', 'reyansh', 'vihaan', 'vivaan', 'shivam', 'siddharth', 'pranav', 'aayush',
  'ayaan', 'faisal', 'imran', 'salman', 'sohail', 'zaid', 'abdul', 'ahmed', 'ahmad', 'ali', 'farhan',
  'rizwan', 'bilal', 'akash', 'alok', 'anand', 'anup', 'arun', 'ashish', 'balaji', 'chandan',
  'gopal', 'govind', 'harsh', 'jatin', 'kamal', 'kishore', 'madhav', 'mahendra', 'nitin', 'om',
  'parth', 'pavan', 'praveen', 'rajiv', 'rajeev', 'ramanujan', 'sagar', 'sandeep', 'sandip',
  'santosh', 'saurabh', 'shankar', 'shyam', 'srinivas', 'subhash', 'tushar', 'venkat', 'vinod',
  'vishal', 'yusuf', 'zubair', 'mohammed', 'mohammad', 'nikesh', 'ratan', 'ganpat', 'keshav',
]);

export function guessGender(fullName: string): Gender | null {
  const first = fullName.trim().toLowerCase().split(/\s+/)[0];
  if (!first) return null;
  if (FEMALE_NAMES.has(first)) return 'Female';
  if (MALE_NAMES.has(first)) return 'Male';
  return null;
}

// FHIR R4 Task mapping (PRD §17, ITEM-5-TEST-CASES.md 5b). BR-017: coordination
// metadata only — who (for, identifier), what category (code), by when
// (restriction), current status (status). No reasonCode, reasonReference, or
// any field carrying step.detail; a step's free-text never travels here.
// BR-019: code carries category only, never a referral destination.

/** Task.code coding system for the five categories — distinct, coded values a receiver can route on. */
export const NEXT_STEPS_TASK_CODE_SYSTEM = 'http://next-steps.local/fhir/task-code';

/** Task.identifier[] system for the internal step id, distinct from any patient identifier system. */
export const NEXT_STEPS_STEP_IDENTIFIER_SYSTEM = 'http://next-steps.local/identifier/step';

/** The category → Task.code mapping — fixed across every programme profile (§17, TC-CFG-004). */
export const TASK_CODE_BY_CATEGORY: Record<Category, string> = {
  FOLLOW_UP_VISIT: 'follow-up-visit',
  LAB_INVESTIGATION: 'lab-investigation',
  SPECIALIST_REFERRAL: 'specialist-referral',
  FOLLOW_UP_CALL: 'follow-up-call',
  OTHER: 'other',
};

/** §11.2, §13: DECLINED maps to `rejected`, distinct from CANCELLED's `cancelled` — the asymmetry the metrics rest on. */
const TASK_STATUS_BY_STEP_STATUS: Record<StepStatus, string> = {
  CREATED: 'requested',
  SCHEDULED: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DECLINED: 'rejected',
};

export interface FhirTask {
  resourceType: 'Task';
  identifier: { system: string; value: string }[];
  status: string;
  code: { coding: { system: string; code: string }[] };
  for: { reference: string };
  encounter: { reference: string };
  restriction: { period: { end: string } };
}

/**
 * §17: maps a Next Step to a minimal FHIR R4 Task carrying only coordination
 * metadata — who this is for, what category, by when, and current status.
 */
export function mapNextStepToFhirTask(step: WorkStep, patient: Patient, config?: IdentityConfig): FhirTask {
  return {
    resourceType: 'Task',
    identifier: [{ system: NEXT_STEPS_STEP_IDENTIFIER_SYSTEM, value: step.id }],
    status: TASK_STATUS_BY_STEP_STATUS[step.status],
    code: { coding: [{ system: NEXT_STEPS_TASK_CODE_SYSTEM, code: TASK_CODE_BY_CATEGORY[step.cat] }] },
    for: { reference: `Patient/${resolveUpid(patient, config)}` },
    encounter: { reference: `Encounter/${step.visitId}` },
    restriction: { period: { end: step.dueDate.toISOString() } },
  };
}

// CloudEvents v1.0 structured-mode envelope (PRD §17, ITEM-5-TEST-CASES.md 5c;
// verified cce-collector-service contract). Context attribute names are exact,
// lowercase CloudEvents spec names — the collector's 400 on a malformed
// envelope is a case-sensitive key match, so `dataContentType` is a distinct,
// wrong key rather than a harmless variant of `datacontenttype`.

/** CloudEvents `source`: identifies this Next Steps deployment. No patient, clinic, or otherwise identifying content. */
export const NEXT_STEPS_EVENT_SOURCE = 'http://next-steps.local/source';

/** CloudEvents `type`: identifies this as a Next Steps Task coordination event. */
export const NEXT_STEPS_EVENT_TYPE = 'org.openphc.next-steps.task';

export interface CloudEvent {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  subject: string;
  datacontenttype: 'application/fhir+json';
  correlationid: string;
  data: FhirTask;
}

/**
 * §17, verified collector contract: wraps a single mapped Task in a
 * CloudEvents v1.0 envelope. One envelope per step — never a Bundle, never an
 * array in `data` — since the collector has no Bundle handling. `subject` is
 * read back out of `task.for.reference` (the very value mapNextStepToFhirTask
 * built Task.for from) with the "Patient/" prefix stripped, rather than
 * recomputed independently from the patient — any drift between `subject`
 * and the reference inside `data` is the collector's hardest validation, a
 * hard 422.
 */
export function buildCloudEvent(task: FhirTask): CloudEvent {
  return {
    specversion: '1.0',
    id: crypto.randomUUID(),
    source: NEXT_STEPS_EVENT_SOURCE,
    type: NEXT_STEPS_EVENT_TYPE,
    subject: task.for.reference.replace(/^Patient\//, ''),
    datacontenttype: 'application/fhir+json',
    correlationid: task.identifier[0]?.value ?? '',
    data: task,
  };
}
