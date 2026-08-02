import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// BR-002/§10.2 require a recorded Visit to default visitDateTime to now,
// mark isBackdated false, and stamp createdBy/createdAt. None of these
// fields exist anywhere — WorkStep has no visit-level data at all, and
// recordVisit returns Promise<void>. The call below is written against the
// Visit shape §10.2 defines; `result` is `undefined` in the real
// implementation, so the first property access is expected to throw.
interface VisitOptions {
  doctorId: Id;
  createdBy: Id;
}

interface StepCaptureInput {
  cat: Category;
  dueKey: '3d' | '1w' | '2w' | '1m' | '3m';
  priority: Priority;
}

interface RecordedVisit {
  visitId: Id;
  visitDateTime: Date;
  isBackdated: boolean;
  createdBy: Id;
  createdAt: Date;
}

type RecordVisitRequired = (
  patientId: Id,
  steps: StepCaptureInput[],
  options: VisitOptions,
) => Promise<{ visit: RecordedVisit }>;

describe('TC-VISIT-003 — BR-002, §10.2 visit timestamp defaults to now (EXPECTED FAIL)', () => {
  it('sets visitDateTime within 5 seconds of now, isBackdated false, and createdBy/createdAt', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired };

    const before = Date.now();
    const result = await call.recordVisit(
      'p1',
      [{ cat: 'OTHER', dueKey: '1w', priority: 'NORMAL' }],
      { doctorId: 'doc1', createdBy: 'admin1' },
    );
    const after = Date.now();

    const visitTime = result.visit.visitDateTime.getTime();
    expect(visitTime).toBeGreaterThanOrEqual(before - 5000);
    expect(visitTime).toBeLessThanOrEqual(after + 5000);
    expect(result.visit.isBackdated).toBe(false);
    expect(result.visit.createdBy).toBe('admin1');
    expect(result.visit.createdAt).toBeInstanceOf(Date);
  });
});
