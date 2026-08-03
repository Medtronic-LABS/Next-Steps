import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryCoordinationEngine } from '../src/inMemoryEngine';
import type { HistoryEntry, Id, WorkStep } from '../src/types';

// FR-D-2.3: patient timeline must be reverse-chronological visits, each with
// its Next Steps and their current status and history — coordination data
// only (ITEM-4-TEST-CASES.md TC-DASH-006). The doctor app's Timeline
// component (apps/doctor/src/App.tsx ~135-177) takes no patient argument at
// all and renders three hand-authored visits for "Ramesh Kulkarni"
// regardless of who was tapped through to it. The CoordinationEngine
// interface (engine.ts) has no method returning per-patient visit history —
// this is written against the method FR-D-2.3 requires (a patient id in,
// that patient's visits with their steps and history, most recent first) and
// fails immediately because no such method exists on the engine.
interface TimelineVisit {
  visitId: Id;
  visitDateTime: Date;
  steps: (WorkStep & { history?: HistoryEntry[] })[];
}

interface EngineWithTimeline {
  patientTimeline(patientId: Id): Promise<TimelineVisit[]>;
}

const ARBITRARY_NOW = new Date('2026-06-20T06:30:00.000Z');

describe('TC-DASH-006 — FR-D-2.3 patient timeline derives from live state (EXPECTED FAIL)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(ARBITRARY_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the patient's visits, each with its steps and history, most recent visit first", async () => {
    const engine = new InMemoryCoordinationEngine();
    const call = engine as unknown as EngineWithTimeline;

    const patient = await engine.createPatient({
      name: 'Ismat Coriander Faleiro',
      mobile: '90000 22334',
      gender: 'Female',
      age: 51,
      cid: 'TC-DASH-006',
      consent: true,
    });

    const olderVisitDate = new Date('2026-05-25T06:30:00.000Z'); // 26 days back — within BR-003's 30-day backdating limit
    const { visitId: olderVisitId, stepIds: olderStepIds } = await engine.recordVisit(
      patient.id,
      [{ cat: 'FOLLOW_UP_VISIT', dueKey: '1w', priority: 'NORMAL' }],
      { doctorId: 'doc1', createdBy: 'admin1', visitDateTime: olderVisitDate },
    );
    await engine.completeStep(olderStepIds[0], new Date('2026-05-28T06:30:00.000Z'), 'doc1');

    const newerVisitDate = new Date('2026-06-18T06:30:00.000Z');
    const { visitId: newerVisitId, stepIds: newerStepIds } = await engine.recordVisit(
      patient.id,
      [{ cat: 'LAB_INVESTIGATION', dueKey: '2w', priority: 'NORMAL' }],
      { doctorId: 'doc1', createdBy: 'admin1', visitDateTime: newerVisitDate },
    );

    const timeline = await call.patientTimeline(patient.id);

    expect(
      timeline.map((v) => v.visitId),
      'expected most-recent-visit-first ordering',
    ).toEqual([newerVisitId, olderVisitId]);

    const newerVisit = timeline.find((v) => v.visitId === newerVisitId);
    const olderVisit = timeline.find((v) => v.visitId === olderVisitId);

    expect(newerVisit?.steps.some((s) => s.id === newerStepIds[0] && s.status === 'SCHEDULED')).toBe(true);

    const completedStep = olderVisit?.steps.find((s) => s.id === olderStepIds[0]);
    expect(completedStep?.status).toBe('COMPLETED');
    expect(completedStep?.history?.length ?? 0).toBeGreaterThan(0);
  });
});
