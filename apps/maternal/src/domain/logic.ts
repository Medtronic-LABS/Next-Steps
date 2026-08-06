// Pure domain logic — ported from the prototype's DCLogic helpers & view-models.
// No React, no I/O: fully unit-testable and reused by both UI and (future) Cloud Functions.
import { CAT, LVL, MON, ROLES, TODAY, TODAY_ISO } from './constants';
import type { RoleKey, Step, Woman } from './types';

// ---------- id ----------
let _sid = 0;
/** Client-generated id → idempotent outbox replay. Falls back if crypto is unavailable. */
export function uid(prefix = 's'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}${++_sid}`;
}

// ---------- dates ----------
export function fmt(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.getDate() + ' ' + MON[d.getMonth()];
}
export function fmtLong(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
}
export function isoOf(d: Date): string {
  const p = (n: number) => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
/** Whole days between TODAY and an ISO date (positive = in the past / overdue). */
export function diff(iso: string): number {
  return Math.round((TODAY.getTime() - new Date(iso + 'T00:00:00').getTime()) / 86_400_000);
}
export function weeks(w: Woman): number | null {
  return w.lmp ? Math.floor(diff(w.lmp) / 7) : null;
}
export function edd(w: Woman): string | null {
  return w.lmp ? isoOf(new Date(new Date(w.lmp + 'T00:00:00').getTime() + 280 * 86_400_000)) : null;
}
export function gestText(w: Woman): string {
  const k = weeks(w);
  return k === null ? 'Not recorded' : k + ' weeks';
}
export function ord(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ---------- people ----------
export function mask(p: string): string {
  return '+91 ' + p.slice(3, 5) + '•••• •' + p.slice(-3);
}
export function initials(n: string): string {
  const a = n.split(' ');
  return (a[0][0] + (a[1] ? a[1][0] : '')).toUpperCase();
}
export function avatarFor(id: string): string {
  const AVA = ['#1E14BE', '#6165DE', '#994242', '#C35721', '#2E9E6B', '#655AD0'];
  const num = parseInt(id.replace(/\D/g, '') || '0', 10);
  return AVA[num % AVA.length];
}
export function openCount(w: Woman): number {
  return w.steps.filter((s) => s.status === 'OPEN').length;
}
export function hasOverdue(w: Woman): boolean {
  return w.steps.some((s) => s.status === 'OPEN' && !!s.due && diff(s.due) > 0);
}

// ---------- PMSMA scheduling ----------
export function clampPmsmaDay(day: number): number {
  return Math.min(28, Math.max(1, day || 9));
}
export function nextPmsma(pmsmaDay: number): string {
  const day = clampPmsmaDay(pmsmaDay);
  let d = new Date(TODAY.getFullYear(), TODAY.getMonth(), day);
  if (d < TODAY) d = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, day);
  return isoOf(d);
}

// ---------- step view-model ----------
export interface StepVM {
  icon: string;
  title: string;
  catLabel: string;
  lc: string;
  lsoft: string;
  levelLabel: string;
  open: boolean;
  dueColor: string;
  dueLabel: string;
}

export function stepVM(s: Step, _w: Woman): StepVM {
  const cm = CAT[s.cat];
  const lm = LVL[s.level];
  const open = s.status === 'OPEN';
  const isRef = s.cat === 'REFERRAL';
  let title = cm.label;
  let dueColor = '#70706E';
  let dueLabel = '';
  if (isRef) title = 'Referral to ' + lm.label;
  if (s.session) title = 'PMSMA session · ' + lm.facility;

  if (!open) {
    dueLabel = 'Completed ' + fmt(s.cdate);
    dueColor = '#1B6B47';
  } else if (isRef) {
    const d = diff(s.sent || TODAY_ISO);
    dueLabel = d >= 7 ? 'Awaiting ' + lm.label + ' · ' + d + ' days' : 'Sent ' + fmt(s.sent) + ' · awaiting ' + lm.label;
    dueColor = d >= 7 ? '#994242' : '#6165DE';
  } else if (!s.due) {
    const d = diff(s.sent || TODAY_ISO);
    dueLabel = d >= 7 ? 'Not done yet · ' + d + ' days at ' + lm.label : 'Added ' + fmt(s.sent || TODAY_ISO) + ' · at ' + lm.label;
    dueColor = d >= 7 ? '#994242' : '#6165DE';
  } else {
    const d = diff(s.due);
    if (d > 0) { dueColor = '#994242'; dueLabel = d + ' day' + (d > 1 ? 's' : '') + ' overdue'; }
    else if (d === 0) { dueColor = '#C35721'; dueLabel = 'Due today'; }
    else { dueColor = '#2E9E6B'; dueLabel = 'Due ' + fmt(s.due); }
    if (s.rem === 'failed') dueLabel += ' · unreachable';
  }
  return { icon: cm.icon, title, catLabel: cm.label, lc: lm.c, lsoft: lm.s, levelLabel: lm.label, open, dueColor, dueLabel };
}

// ---------- worklist ----------
export interface WorklistRow {
  icon: string;
  lc: string;
  lsoft: string;
  womanName: string;
  stepLine: string;
  dueColor: string;
  dueLabel: string;
  gestLabel: string;
  gestFg: string;
  gestBg: string;
  womanId: string;
}
export interface WorklistSection {
  title: string;
  dot: string;
  pillBg: string;
  count: string;
  rows: WorklistRow[];
}

interface Pair { s: Step; w: Woman; }

function allSteps(women: Woman[]): Pair[] {
  const out: Pair[] = [];
  women.forEach((w) => w.steps.forEach((s) => out.push({ s, w })));
  return out;
}

export function worklistVM(
  women: Woman[],
  roleKey: RoleKey,
  filter: string,
  riskFilter: string,
): WorklistSection[] {
  const role = ROLES[roleKey];
  const isAsha = roleKey === 'asha';
  const mine = allSteps(women).filter(({ s, w }) =>
    (s.level === role.level || s.owner === roleKey || (isAsha && s.cat === 'PMSMA_VISIT')) &&
    (filter === 'ALL' || s.cat === filter) &&
    (riskFilter === 'ALL' || (riskFilter === 'HRP' ? w.risk === 'HRP' : w.risk !== 'HRP')));

  const b: Record<string, Pair[]> = { overdue: [], today: [], incoming: [], pending: [], soon: [], unreach: [], closed: [] };
  mine.forEach(({ s, w }) => {
    if (s.status === 'CANCELLED') return; // cancelled / declined — off the worklist
    if (s.status === 'DONE') { if (s.cdate === TODAY_ISO) b.closed.push({ s, w }); return; }
    if (s.cat === 'REFERRAL') { b.incoming.push({ s, w }); return; }
    if (!s.due) { b.pending.push({ s, w }); return; }
    const d = diff(s.due);
    if (s.rem === 'failed') { b.unreach.push({ s, w }); return; }
    if (d > 0) b.overdue.push({ s, w });
    else if (d === 0) b.today.push({ s, w });
    else if (d >= -14) b.soon.push({ s, w });
  });

  const row = ({ s, w }: Pair): WorklistRow => {
    const vm = stepVM(s, w);
    const k = weeks(w);
    return {
      icon: vm.icon, lc: vm.lc, lsoft: vm.lsoft,
      womanName: w.name, stepLine: vm.title + ' · ' + w.village,
      dueColor: vm.dueColor, dueLabel: vm.dueLabel,
      gestLabel: (k === null ? 'New' : k + ' wks') + ' · ' + w.risk,
      gestFg: w.risk === 'HRP' ? 'var(--ml-burnt-orange)' : '#1B6B47',
      gestBg: w.risk === 'HRP' ? 'var(--ml-peach)' : '#D9F7E8',
      womanId: w.id,
    };
  };

  const anmOrAsha = roleKey === 'anm' || roleKey === 'asha';
  const defs = [
    { key: 'overdue', title: 'Overdue', dot: '#994242', pillBg: '#F7E3E3' },
    { key: 'today', title: 'Due today', dot: '#C35721', pillBg: '#FBE7DC' },
    { key: 'incoming', title: anmOrAsha ? 'Referrals sent' : 'Referrals to act on', dot: '#1E14BE', pillBg: '#EFEDFF' },
    { key: 'pending', title: 'To be done here', dot: '#2E9E6B', pillBg: '#D9F7E8' },
    { key: 'unreach', title: 'Unreachable', dot: '#909090', pillBg: '#ECEBE7' },
    { key: 'soon', title: 'Due soon · 14 days', dot: '#6165DE', pillBg: '#E7E7FB' },
    { key: 'closed', title: 'Closed today', dot: '#2E9E6B', pillBg: '#D9F7E8' },
  ];
  return defs
    .filter((x) => b[x.key].length)
    .map((x) => ({ title: x.title, dot: x.dot, pillBg: x.pillBg, count: b[x.key].length + '', rows: b[x.key].map(row) }));
}

// ---------- alerts ----------
export type AlertType = 'REFERRAL_STALE' | 'UNREACHABLE' | 'STEP_OVERDUE' | 'NOT_DONE';
export interface AlertVM {
  stepId: string;
  womanId: string;
  womanName: string;
  village: string;
  tone: string;
  typeLabel: string;
  message: string;
  acked: boolean;
}

export function alertsVM(women: Woman[], roleKey: RoleKey, acked: Record<string, boolean>): AlertVM[] {
  const role = ROLES[roleKey];
  const out: { s: Step; w: Woman; type: AlertType; d: number }[] = [];
  allSteps(women).forEach(({ s, w }) => {
    if (s.status !== 'OPEN') return;
    const mine = s.level === role.level || s.owner === roleKey;
    if (!mine) return;
    if (s.cat === 'REFERRAL') { const d = diff(s.sent || TODAY_ISO); if (d >= 7) out.push({ s, w, type: 'REFERRAL_STALE', d }); return; }
    if (!s.due) { const d = diff(s.sent || TODAY_ISO); if (d >= 7) out.push({ s, w, type: 'NOT_DONE', d }); return; }
    const d = diff(s.due);
    if (s.rem === 'failed') { out.push({ s, w, type: 'UNREACHABLE', d }); return; }
    if (d >= 3) out.push({ s, w, type: 'STEP_OVERDUE', d });
  });

  const LBL: Record<AlertType, string> = {
    REFERRAL_STALE: 'Referral not acted on', UNREACHABLE: 'Cannot reach her',
    STEP_OVERDUE: 'Step overdue', NOT_DONE: 'Still not done',
  };
  const TONE: Record<AlertType, string> = {
    REFERRAL_STALE: '#1E14BE', UNREACHABLE: '#909090', STEP_OVERDUE: '#994242', NOT_DONE: '#C35721',
  };

  return out.map(({ s, w, type, d }) => {
    const vm = stepVM(s, w);
    const message =
      type === 'REFERRAL_STALE' ? `Referral to ${vm.levelLabel} sent ${d} days ago — still no visit recorded. She is ${weeks(w)} weeks pregnant.`
      : type === 'NOT_DONE' ? `${vm.catLabel} added ${d} days ago at ${vm.levelLabel} — still not recorded as done.`
      : type === 'UNREACHABLE' ? `${vm.catLabel} due ${fmt(s.due)} · ${s.unreach || 3} failed reminder attempts. Try a home visit.`
      : `${vm.catLabel} at ${vm.levelLabel} is ${d} days overdue · ${w.risk}.`;
    return {
      stepId: s.id, womanId: w.id, womanName: w.name, village: w.village,
      tone: TONE[type], typeLabel: LBL[type], message, acked: !!acked[s.id],
    };
  });
}

export function ashaFor(village: string, villages: { name: string; asha: string }[]): string {
  const f = villages.find((x) => x.name === village);
  return f ? f.asha : '—';
}
