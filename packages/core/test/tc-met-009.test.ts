import { describe, expect, it } from 'vitest';
import { unreachablePatients } from '../src/logic';
import type { Id, StepStatus } from '../src/types';

// §13, §10.5 — "Unreachable patients: Distinct patients having >= 1 open
// step with unreachableAttempts >= clinic threshold (snapshot)." The
// threshold is clinic configuration, not a constant (§10.5), and terminal
// steps are never counted regardless of attempts. `unreachablePatients`
// does not exist yet, so this import is expected to fail.

interface MetricStep {
  id: Id;
  pid: Id;
  status: StepStatus;
  attempts: number;
}

const STEPS: MetricStep[] = [
  { id: 's1', pid: 'pQ', status: 'SCHEDULED', attempts: 2 },
  { id: 's2', pid: 'pR', status: 'SCHEDULED', attempts: 3 },
  { id: 's3', pid: 'pS', status: 'SCHEDULED', attempts: 4 },
  // Terminal with high attempts — must never count, at any threshold.
  { id: 's4', pid: 'pT', status: 'COMPLETED', attempts: 9 },
];

describe('TC-MET-009 — §13/§10.5 unreachable patients respects the clinic-configured threshold (EXPECTED FAIL)', () => {
  it('at threshold 3, pR and pS qualify (2); at threshold 4, only pS qualifies (1); the terminal step never counts', () => {
    expect(unreachablePatients(STEPS, 3), 'threshold 3: pR (3 attempts) and pS (4 attempts)').toBe(2);
    expect(unreachablePatients(STEPS, 4), 'threshold 4: only pS (4 attempts)').toBe(1);
  });
});
