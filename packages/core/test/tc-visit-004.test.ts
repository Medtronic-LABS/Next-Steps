import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Category, Id, Priority } from '../src/types';

// BR-003/FR-A-4.2 require backdating to be limited to the past 30 days, with
// future dates rejected too. The real recordVisit performs no date
// validation whatsoever and returns Promise<void>, so it has no isBackdated
// concept to check. "Today" is pinned with vi.setSystemTime so the fixture
// dates (21 May / 22 May / 20 June / 21 June) map onto a fixed 30-day
// boundary instead of the real wall-clock date.
interface VisitOptions {
  doctorId: Id;
  createdBy: Id;
  visitDateTime?: Date;
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
}

type RecordVisitRequired = (
  patientId: Id,
  steps: StepCaptureInput[],
  options: VisitOptions,
) => Promise<{ visit: RecordedVisit }>;

const TODAY = new Date('2026-06-20T12:00:00.000Z');
const oneStep = (): StepCaptureInput[] => [{ cat: 'OTHER', dueKey: '1w', priority: 'NORMAL' }];

describe('TC-VISIT-004 — BR-003, FR-A-4.2 backdating limited to 30 days (EXPECTED FAIL)', () => {
  beforeEach(() => {
    // shouldAdvanceTime keeps the engine's internal setTimeout-based delay()
    // resolving in real time while Date.now()/new Date() stay pinned to TODAY.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects a visit dated 31 days back (21 May)', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired };
    const visitDateTime = new Date('2026-05-21T12:00:00.000Z');

    await expect(
      call.recordVisit('p1', oneStep(), { doctorId: 'doc1', createdBy: 'admin1', visitDateTime }),
    ).rejects.toThrow();
  });

  it('accepts a visit dated 29 days back (22 May) and marks it backdated', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired };
    const visitDateTime = new Date('2026-05-22T12:00:00.000Z');

    const result = await call.recordVisit('p1', oneStep(), {
      doctorId: 'doc1',
      createdBy: 'admin1',
      visitDateTime,
    });

    expect(result.visit.isBackdated).toBe(true);
    expect(result.visit.visitDateTime.getTime()).toBe(visitDateTime.getTime());
  });

  it('accepts a visit dated today (20 June) and marks it not backdated', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired };
    const visitDateTime = new Date('2026-06-20T12:00:00.000Z');

    const result = await call.recordVisit('p1', oneStep(), {
      doctorId: 'doc1',
      createdBy: 'admin1',
      visitDateTime,
    });

    expect(result.visit.isBackdated).toBe(false);
  });

  it('rejects a visit dated in the future (21 June)', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { recordVisit: RecordVisitRequired };
    const visitDateTime = new Date('2026-06-21T12:00:00.000Z');

    await expect(
      call.recordVisit('p1', oneStep(), { doctorId: 'doc1', createdBy: 'admin1', visitDateTime }),
    ).rejects.toThrow();
  });
});
