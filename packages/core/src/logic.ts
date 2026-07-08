// Pure display + coordination logic. No I/O, no framework.

import { META } from './catalog';
import { AVATARS } from './seed';
import type { Delivery, Gender, WorkStep } from './types';

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
  return '98•••••' + mobile.replace(/\D/g, '').slice(-3);
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
  categoryLabel: string;
  color: string;
  soft: string;
  iconPath: string;
  statusText: string;
  statusColor: string;
  isHigh: boolean;
  showOver: boolean;
  overBadge: string;
  dueLabel: string;
  showAttempts: boolean;
  attemptsLabel: string;
  showDelivery: boolean;
  deliveryTint: string;
}

export function decorate(w: WorkStep): DecoratedStep {
  const m = META[w.cat];
  return {
    ...w,
    categoryLabel: m.label,
    color: m.color,
    soft: m.soft,
    iconPath: m.iconPath,
    statusText:
      w.over > 0
        ? 'Overdue · was due ' + w.due
        : w.due === 'Today'
          ? 'Due today'
          : 'Due ' + w.due,
    statusColor: w.over > 0 ? 'var(--status-danger)' : 'var(--text-muted)',
    isHigh: w.priority === 'HIGH',
    showOver: w.over > 0,
    overBadge: w.over + 'd overdue',
    dueLabel: w.due === 'Today' ? 'Due today' : 'Due ' + w.due,
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

/** Worklist ordering within a section (PRD BR-014). */
export function orderSection(steps: DecoratedStep[]): DecoratedStep[] {
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
