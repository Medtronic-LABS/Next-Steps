import { describe, expect, it } from 'vitest';
import { decorate, orderSection } from '../src/logic';
import type { WorkStep } from '../src/types';

// SEED's real Ganesh Pawar (3 attempts, NORMAL, 4d overdue) vs Meena Joshi
// (4 attempts, HIGH, 9d overdue) pair sorts "correctly" through the engine
// today only because their priorities differ — orderSection's priority-first
// comparator happens to agree with attempts-descending by coincidence, which
// would make a SEED-based assertion pass for the wrong reason. Hand-build a
// same-priority pair with `over` reversed relative to `attempts` to remove
// that masking effect, and call orderSection directly — it is the one
// comparator the engine applies to every worklist section, including
// 'unreach', so this is exactly what the engine runs internally.
const step = (name: string, over: number, attempts: number): WorkStep => ({
  id: name,
  pid: name,
  name,
  cat: 'FOLLOW_UP_CALL',
  detail: '',
  due: '2 Jul',
  over,
  priority: 'NORMAL',
  delivery: '—',
  attempts,
  section: 'unreach',
  status: 'SCHEDULED',
});

describe('TC-ORDER-003 — FR-A-6.3 unreachable ordered by attempts (EXPECTED FAIL)', () => {
  it('orders Meena Joshi (4 attempts) before Ganesh Pawar (3 attempts)', () => {
    const ganesh = decorate(step('Ganesh Pawar', 9, 3));
    const meena = decorate(step('Meena Joshi', 3, 4));

    const ordered = orderSection([ganesh, meena]);

    expect(ordered.map((s) => s.name)).toEqual(['Meena Joshi', 'Ganesh Pawar']);
  });
});
