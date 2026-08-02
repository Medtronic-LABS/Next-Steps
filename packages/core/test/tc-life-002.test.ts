import { describe, expect, it } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { Id } from '../src/types';

// BR-013/§11.2 make decline's reason optional — deliberately different from
// cancel, where BR-013 makes the reason mandatory (TC-LIFE-001). The real
// declineStep(id) takes no reason parameter at all and never writes
// WorkStep.status; it only flips a private `closed` boolean (see the header
// comment in tc-life-003.test.ts). So a declined step is never observable as
// status DECLINED through the public API, and there is no declineReason field
// anywhere to read. The signature below is written against what BR-013/§11.2
// require.
type DeclineStepRequired = (id: Id, reason?: string) => Promise<void>;

describe('TC-LIFE-002 — BR-013, §11.2 decline reason optional (EXPECTED FAIL)', () => {
  it('accepts a decline with no reason and sets status to DECLINED', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { declineStep: DeclineStepRequired };

    await call.declineStep('w5');

    const step = await engine.getStep('w5');
    expect(step?.status).toBe('DECLINED');
  });

  it('accepts a decline with a reason, storing it, and sets status to DECLINED', async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as { declineStep: DeclineStepRequired };

    await call.declineStep('w6', 'Patient no longer wants this step');

    const step = await engine.getStep('w6');
    expect(step?.status).toBe('DECLINED');
    expect((step as unknown as { declineReason?: string | null } | undefined)?.declineReason).toBe(
      'Patient no longer wants this step',
    );
  });
});
