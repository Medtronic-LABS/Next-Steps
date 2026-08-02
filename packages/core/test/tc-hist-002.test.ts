import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id, StepStatus } from '../src/types';

// §11.4/BR-013 require the reason given on a cancel or decline to be recorded
// on that transition's history entry — not just on the step. WorkStep carries
// no history field at all today (see tc-life-003.test.ts), so there is
// nothing to read a reason off of regardless of what cancelStep/declineStep
// are given. cancelStep already accepts a reason argument at runtime (typed
// only, per tc-life-001.test.ts); declineStep's reason parameter is required
// by BR-013/§11.2 but does not exist yet (TC-LIFE-002).
interface HistoryEntry {
  at: Date;
  byUser: Id;
  fromStatus: StepStatus | null;
  toStatus: StepStatus;
  reason?: string | null;
}

type CancelStepRequired = (id: Id, reason?: string) => Promise<void>;
type DeclineStepRequired = (id: Id, reason?: string) => Promise<void>;

describe('TC-HIST-002 — §11.4, BR-013 reasons are recorded in history (EXPECTED FAIL)', () => {
  it('stores the cancel reason on its history entry', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { cancelStep: CancelStepRequired };

    await call.cancelStep('w7', 'Patient moved city');

    const step = await engine.getStep('w7');
    const history = (step as unknown as { history?: HistoryEntry[] } | undefined)?.history ?? [];
    const entry = history.find((h) => h.toStatus === 'CANCELLED');
    expect(entry, 'expected a CANCELLED history entry').toBeDefined();
    expect(entry?.reason).toBe('Patient moved city');
  });

  it('records a decline history entry with a null reason when none is given', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { declineStep: DeclineStepRequired };

    await call.declineStep('w8');

    const step = await engine.getStep('w8');
    const history = (step as unknown as { history?: HistoryEntry[] } | undefined)?.history ?? [];
    const entry = history.find((h) => h.toStatus === 'DECLINED');
    expect(entry, 'expected a DECLINED history entry').toBeDefined();
    expect(entry?.reason ?? null).toBeNull();
  });
});
