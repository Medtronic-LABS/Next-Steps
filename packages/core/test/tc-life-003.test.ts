import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id } from '../src/types';

// completeStep/cancelStep/declineStep each just flip a private boolean
// (`completed`/`closed`) and never touch WorkStep.status, so no SEED step
// (all seeded SCHEDULED) can ever be observed with status COMPLETED,
// CANCELLED or DECLINED via the public API — there is no pure
// transition-validation function to import and call directly either. There
// is also no 'reopen' method, so the single COMPLETED -> SCHEDULED exception
// cannot be exercised, and CREATED/SCHEDULED are not reachable as target
// states through any public method. What follows instead drives the three
// real terminal actions in sequence against a SEED step and checks that a
// second, different terminal action is rejected — which is the concrete gap
// §11.2 calls out ("nothing currently rejects any transition").
type TerminalAction = (engine: InMemoryCoordinationEngine, id: Id) => Promise<void>;

const TERMINAL_ACTIONS: Record<'COMPLETED' | 'CANCELLED' | 'DECLINED', TerminalAction> = {
  COMPLETED: (engine, id) => engine.completeStep(id),
  CANCELLED: (engine, id) => engine.cancelStep(id, 'test setup — reason required by BR-013'),
  DECLINED: (engine, id) => engine.declineStep(id),
};

describe('TC-LIFE-003 — §11.2 illegal transitions rejected (EXPECTED FAIL)', () => {
  for (const [firstStatus, firstAction] of Object.entries(TERMINAL_ACTIONS)) {
    for (const [secondStatus, secondAction] of Object.entries(TERMINAL_ACTIONS)) {
      if (secondStatus === firstStatus) continue;

      it(`rejects ${secondStatus} on a step already ${firstStatus}, and leaves its status unchanged`, async () => {
        const engine = new InMemoryCoordinationEngine();
        const id = 'w4';

        await firstAction(engine, id);
        const before = (await engine.getStep(id))?.status;

        await expect(secondAction(engine, id)).rejects.toThrow();

        const after = (await engine.getStep(id))?.status;
        expect(after).toBe(before);
      });
    }
  }
});
