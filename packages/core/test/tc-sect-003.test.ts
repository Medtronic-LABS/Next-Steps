import { describe, expect, it } from 'vitest';
import { deriveSection } from '../src/logic';
import type { WorkStep } from '../src/types';

// FR-A-6.1 — see ITEM-3-TEST-CASES.md's open question: the PRD lists the
// five worklist sections but does not state precedence when a step
// qualifies for more than one. §10.5's unreachable-threshold wording
// ("When attempts >= clinic threshold ... the step surfaces in the
// Unreachable worklist section") implies Unreachable wins over Overdue, so
// that is the PROVISIONAL interpretation asserted below — it needs a PRD
// ruling (same kind of open question as the 48-hour reopen boundary in
// ITEM-2-TEST-CASES.md).
//
// There is no engine state that isolates precedence from every other
// section rule at once (the seed's w9 is already 'unreach' by both the
// stored field and the derived value, so advancing the clock proves
// nothing about precedence). Hand-build a WorkStep fixture instead, the way
// tc-order-003 does for FR-A-6.3's ordering rule — call the section
// derivation FR-A-6.1 requires directly, with a due-10-days-ago,
// 4-attempt step and threshold 3, so both Overdue and Unreachable's
// individual conditions hold at once and only precedence decides the
// outcome. `deriveSection` does not exist on packages/core/src/logic.ts yet
// (section membership is still the frozen field read in inMemoryEngine.ts,
// per tc-sect-001/002), so this import itself is expected to fail.
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-06-20T09:00:00.000Z');

const step = (dueDate: Date, attempts: number): WorkStep => ({
  id: 'w-fixture',
  pid: 'p-fixture',
  visitId: 'v-fixture',
  name: 'Fixture Patient',
  cat: 'FOLLOW_UP_CALL',
  detail: '',
  dueDate,
  priority: 'NORMAL',
  delivery: '—',
  attempts,
  section: 'overdue',
  status: 'SCHEDULED',
});

describe('TC-SECT-003 — FR-A-6.1 unreachable takes precedence over overdue (PROVISIONAL, EXPECTED FAIL)', () => {
  it('a step due 10 days ago with 4 attempts against threshold 3 derives to unreach, not overdue, and to exactly one section', () => {
    const dueDate = new Date(NOW.getTime() - 10 * DAY_MS);
    const fixture = step(dueDate, 4);

    const section = deriveSection(fixture, 3);

    // PROVISIONAL: Unreachable wins over Overdue (see comment above).
    expect(section, 'should derive to unreach, not overdue').toBe('unreach');
    expect(['overdue', 'today', 'soon', 'unreach'], 'must resolve to exactly one section').toContain(section);
  });
});
