import { describe, expect, it } from 'vitest';
import { NEXT_STEPS_TASK_CODE_SYSTEM, buildCloudEvent, mapNextStepToFhirTask } from '../src/logic';
import { PATIENTS, WORK } from '../src/seed';
import type { Category, Patient, StepStatus } from '../src/types';

// PRD §17 (ITEM-6-TEST-CASES.md TC-MAT-004). Closes the loop on TC-CFG-004
// at the event level: a step completed in the maternal seed clinic must
// still emit a well-formed CloudEvents envelope wrapping a FHIR Task, with
// the same Task.code system and the same status mapping as the diabetes
// profile. `../src/maternalSeed` does not exist yet, so it is imported
// dynamically inside the test body (same technique as TC-CFG-004/005): a
// static import of a missing module fails at collection time, before any
// test runs, registering zero assertions; a dynamic import defers that
// failure to runtime, where it surfaces as the named assertions below.
// `mapNextStepToFhirTask` and `buildCloudEvent` are imported statically from
// the real, unmodified ../src/logic.ts — the code under test is whether the
// maternal seed clinic's data flows through it unchanged, not the mapping
// itself.

interface MaternalWorkStep {
  id: string;
  pid: string;
  visitId: string;
  name: string;
  cat: Category;
  detail: string;
  dueDate: Date;
  priority: 'NORMAL' | 'HIGH';
  delivery: string;
  attempts: number;
  status: StepStatus;
  completedDate?: Date | null;
}

describe('TC-MAT-004 — CCE emission is unchanged under the maternal profile (EXPECTED FAIL)', () => {
  it('emits the same Task.code system and status mapping for a completed maternal step as for the diabetes profile, with subject matching the FHIR reference', async () => {
    let MATERNAL_WORK: MaternalWorkStep[] | undefined;
    let MATERNAL_PATIENTS: Patient[] | undefined;
    try {
      ({ MATERNAL_WORK, MATERNAL_PATIENTS } = (await import('../src/maternalSeed')) as unknown as {
        MATERNAL_WORK: MaternalWorkStep[];
        MATERNAL_PATIENTS: Patient[];
      });
    } catch {
      MATERNAL_WORK = undefined;
      MATERNAL_PATIENTS = undefined;
    }

    expect(MATERNAL_WORK, 'a maternal seed clinic work list must exist (../src/maternalSeed)').toBeDefined();
    expect(MATERNAL_PATIENTS, 'a maternal seed clinic patient list must exist (../src/maternalSeed)').toBeDefined();

    const maternalStep = (MATERNAL_WORK ?? []).find((w) => w.status === 'COMPLETED');
    expect(
      maternalStep,
      'the maternal seed clinic must contain at least one completed step (e.g. a completed ANC visit)',
    ).toBeDefined();

    const maternalPatient = (MATERNAL_PATIENTS ?? []).find((p) => p.id === maternalStep?.pid);
    expect(
      maternalPatient,
      "the completed maternal step's patient must exist in the maternal seed clinic's patient list",
    ).toBeDefined();

    // The diabetes profile's seed clinic (../src/seed.ts) ships no
    // COMPLETED step, so a reference step is derived from it — same
    // category and same completed status the maternal step is compared
    // against, to make "same mapping as the diabetes profile" a concrete
    // check rather than an assumption.
    const diabetesReferenceStep = { ...WORK[0], status: 'COMPLETED' as StepStatus, completedDate: new Date() };
    const diabetesPatient = PATIENTS.find((p) => p.id === diabetesReferenceStep.pid)!;
    const diabetesTask = mapNextStepToFhirTask(diabetesReferenceStep, diabetesPatient);

    const maternalTask = mapNextStepToFhirTask(maternalStep!, maternalPatient!);
    const maternalEvent = buildCloudEvent(maternalTask);

    expect(maternalEvent.specversion, 'the emitted envelope must be CloudEvents v1.0').toBe('1.0');
    expect(maternalEvent.datacontenttype, 'the envelope must wrap a FHIR resource').toBe('application/fhir+json');
    expect(maternalEvent.data, 'the envelope must wrap the mapped FHIR Task').toBe(maternalTask);

    expect(
      maternalTask.code.coding[0]?.system,
      'Task.code.coding[].system must be the fixed Next Steps coding system, unchanged by the maternal profile',
    ).toBe(NEXT_STEPS_TASK_CODE_SYSTEM);
    expect(
      maternalTask.code.coding[0]?.system,
      'Task.code.coding[].system must be identical to the diabetes profile',
    ).toBe(diabetesTask.code.coding[0]?.system);

    expect(
      maternalTask.status,
      'the COMPLETED -> Task.status mapping must be identical to the diabetes profile',
    ).toBe(diabetesTask.status);

    expect(
      maternalEvent.subject,
      'subject must match the patient reference inside data — no drift between the two',
    ).toBe(maternalTask.for.reference.replace(/^Patient\//, ''));
  });
});
