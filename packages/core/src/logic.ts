// Pure display + coordination logic. No I/O, no framework.

import { META } from './catalog';
import { AVATARS } from './seed';
import type { Delivery, Gender, StepStatus, WorklistSection, WorkStep } from './types';

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

/** §10, FR-A-6.4: the bare display label for a due date — 'Today', '19 Jun', '28 Jul' — derived, never stored. */
export function formatDueLabel(dueDate: Date, now: Date = new Date()): string {
  if (!isValidDate(dueDate)) return '';
  if (clinicDayIndex(dueDate) === clinicDayIndex(now)) return 'Today';
  return new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TIMEZONE, day: 'numeric', month: 'short' }).format(
    dueDate,
  );
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

export function decorate(w: WorkStep, now: Date = new Date()): DecoratedStep {
  const m = META[w.cat];
  const { isOverdue, daysOverdue } = deriveOverdue(w.dueDate, w.status, now);
  const label = formatDueLabel(w.dueDate, now);
  return {
    ...w,
    isOverdue,
    daysOverdue,
    over: daysOverdue,
    categoryLabel: m.label,
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
