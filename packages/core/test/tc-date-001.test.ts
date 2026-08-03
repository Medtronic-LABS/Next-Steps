import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// §10.3/§10 require `dueDate` to be a real Date (or ISO-8601 string) on every
// step, seed or captured. WorkStep today only stores `due: string`, a
// precomputed display label (e.g. 'w1'.due === '28 Jun' in seed.ts; freshly
// captured steps get `due: DUE[dueKey].date`, a fixed literal like '13 Jul'
// from catalog.ts). Neither can be compared, sorted or subtracted, which is
// exactly why every later derivation in this item depends on this landing
// first. `dueDate` is included on the capture input below so the call
// doesn't also fail on the real recordVisit's BR-005 dueKey validation
// (matches the pattern in tc-visit-001.test.ts); the real engine ignores it.
interface StepCaptureInput {
  cat: Category;
  dueKey: '3d' | '1w' | '2w' | '1m' | '3m';
  dueDate: Date;
  priority: Priority;
}

type RecordVisitFn = (
  patientId: Id,
  steps: StepCaptureInput[],
  options?: { doctorId?: Id; createdBy?: Id },
) => Promise<{ stepIds: Id[] }>;

const DISPLAY_LABEL = /^(Today|\d{1,2} [A-Z][a-z]{2})$/;

function isDateOrIsoString(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value));
  return false;
}

describe('TC-DATE-001 — §10.3, §10 due dates are dates, not display labels (EXPECTED FAIL)', () => {
  it('a seed step exposes dueDate as a Date/ISO value, not a display label', async () => {
    const engine = new InMemoryCoordinationEngine();

    const step = await engine.getStep('w1');
    const dueDate = (step as unknown as { dueDate?: unknown } | undefined)?.dueDate;

    expect(dueDate, 'expected getStep("w1") to expose a dueDate field').toBeDefined();
    expect(isDateOrIsoString(dueDate)).toBe(true);
    expect(DISPLAY_LABEL.test(String(dueDate))).toBe(false);
  });

  it('a freshly captured step exposes dueDate as a Date/ISO value, not a display label', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitFn };
    const targetDue = new Date('2026-07-28T00:00:00.000Z');

    const { stepIds } = await call.recordVisit(
      'p1',
      [{ cat: 'OTHER', dueKey: '1w', dueDate: targetDue, priority: 'NORMAL' }],
      { doctorId: 'doc1', createdBy: 'admin1' },
    );
    const step = await engine.getStep(stepIds[0]);
    const dueDate = (step as unknown as { dueDate?: unknown } | undefined)?.dueDate;

    expect(dueDate, 'expected the captured step to expose a dueDate field').toBeDefined();
    expect(isDateOrIsoString(dueDate)).toBe(true);
    expect(DISPLAY_LABEL.test(String(dueDate))).toBe(false);
  });
});
