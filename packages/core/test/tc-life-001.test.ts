import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id } from '../src/types';

// BR-013 requires cancelStep(id, reason?) to reject a missing reason and to
// store whatever reason it's given. CoordinationEngine#cancelStep(id: Id):
// Promise<void> has no reason parameter at all, so there is no existing
// function matching BR-013's shape to import and call. The test below is
// written against the signature BR-013 requires and cast onto the real
// method. packages/core/tsconfig.json only includes "src" (see include in
// tsconfig.json), so this test file is never passed through tsc by
// `npm run typecheck`, and vitest itself transpiles TS via esbuild without
// type-checking — so the signature mismatch cannot surface as a compile
// error in this project's toolchain. It only shows up at runtime, as the
// failing assertions below.
//
// The Then column's "no history entry appended" clause is not asserted here:
// WorkStep carries no history field at all (§11.4 history is TC-HIST-001,
// blocked on item 2), so there is nothing on the public API to check it
// against.
type CancelStepWithReason = (id: Id, reason?: string) => Promise<void>;

describe('TC-LIFE-001 — BR-013, FR-A-6.5 cancellation requires a reason (EXPECTED FAIL)', () => {
  it('rejects a cancel with no reason', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { cancelStep: CancelStepWithReason };
    await expect(call.cancelStep('w1')).rejects.toThrow();
  });

  it('leaves the stored status at SCHEDULED after a rejected no-reason cancel', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { cancelStep: CancelStepWithReason };
    await expect(call.cancelStep('w1')).rejects.toThrow();
    const step = await engine.getStep('w1');
    expect(step?.status).toBe('SCHEDULED');
  });

  it('accepts a cancel with a reason, setting status to CANCELLED and storing the reason', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { cancelStep: CancelStepWithReason };
    await call.cancelStep('w2', 'Patient moved clinics');
    const step = await engine.getStep('w2');
    expect(step?.status).toBe('CANCELLED');
    expect((step as unknown as { reason?: string } | undefined)?.reason).toBe('Patient moved clinics');
  });
});
