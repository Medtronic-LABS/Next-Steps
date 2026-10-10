import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  NextStepRecord,
  transformStepToCloudEvent,
  reconcileOfflineStepCompletion,
  transformPatientToCloudEvent,
} from './cceTransformer.js';

describe('cceTransformer - D2 Event Identity & K1 Plan Version', () => {
  const baseStep: NextStepRecord = {
    id: 'step-anc-001',
    patient_id: 'pat-12345',
    cat: 'ANC_VISIT',
    level: 'SUBCENTRE',
    due: '2026-11-01',
    status: 'REQUESTED',
    owner_role: 'ANM',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
    plan_version: '1.0',
  };

  it('D2: stable event identity for repeated delivery / retry of the exact same event', () => {
    const event1 = transformStepToCloudEvent(baseStep);
    const event2 = transformStepToCloudEvent(baseStep);

    assert.equal(event1.id, event2.id, 'Retry of same logical event must produce identical eventId');
    assert.equal(event1.correlationid, event2.correlationid);
  });

  it('D2: rescheduling due date produces a distinct eventId', () => {
    const originalEvent = transformStepToCloudEvent(baseStep);

    const rescheduledStep: NextStepRecord = {
      ...baseStep,
      due: '2026-11-15',
      updated_at: '2026-10-05T10:00:00Z',
    };
    const rescheduledEvent = transformStepToCloudEvent(rescheduledStep);

    assert.notEqual(
      originalEvent.id,
      rescheduledEvent.id,
      'Rescheduling due date must yield a distinct eventId to prevent CCE deduplication'
    );
  });

  it('D2: clinical notes modification produces a distinct eventId', () => {
    const originalEvent = transformStepToCloudEvent(baseStep);

    const notedStep: NextStepRecord = {
      ...baseStep,
      notes: 'Patient travelling, follow up scheduled for next week',
      updated_at: '2026-10-06T12:00:00Z',
    };
    const notedEvent = transformStepToCloudEvent(notedStep);

    assert.notEqual(
      originalEvent.id,
      notedEvent.id,
      'Adding or modifying notes must yield a distinct eventId'
    );
    assert.deepEqual(notedEvent.data.note, [
      { text: 'Patient travelling, follow up scheduled for next week' },
    ]);
  });

  it('D2: terminal transition (DONE) produces a distinct eventId', () => {
    const requestedEvent = transformStepToCloudEvent(baseStep);

    const completedStep: NextStepRecord = {
      ...baseStep,
      status: 'DONE',
      closed_at: '2026-10-09T14:00:00Z',
      closed_by: 'Nurse Anita',
      closed_source: 'WHATSAPP_WORKLIST',
      closed_level: 'SUBCENTRE',
      updated_at: '2026-10-09T14:00:00Z',
    };
    const completedEvent = transformStepToCloudEvent(completedStep);

    assert.notEqual(
      requestedEvent.id,
      completedEvent.id,
      'Transitioning to DONE must produce a distinct eventId'
    );
    assert.equal(completedEvent.data.status, 'completed');
  });

  it('K1: plan_version flows through CloudEvent envelope and FHIR Task', () => {
    const stepWithV2: NextStepRecord = {
      ...baseStep,
      plan_version: '2.0',
    };
    const event = transformStepToCloudEvent(stepWithV2);

    assert.equal(event.planversion, '2.0', 'CloudEvent envelope must carry planversion attribute');
    const versionExtension = event.data.extension.find(
      (e: any) => e.url === 'http://openphc.org/fhir/StructureDefinition/plan-version'
    );
    assert.ok(versionExtension, 'FHIR Task must contain plan-version extension');
    assert.equal(versionExtension.valueString, '2.0');
  });

  it('K1: offline completion of prior version task reconciles to active successor step', () => {
    // Frontline worker completed V1 task offline
    const offlineV1Completed: NextStepRecord = {
      id: 'step-v1-001',
      patient_id: 'pat-12345',
      cat: 'ANC_VISIT',
      level: 'SUBCENTRE',
      status: 'DONE',
      owner_role: 'ANM',
      closed_at: '2026-10-08T09:00:00Z',
      closed_by: 'ANM Sunita',
      plan_version: '1.0',
    };

    // System activated V2 online with new replacement steps
    const activeV2Steps: NextStepRecord[] = [
      {
        id: 'step-v2-001',
        patient_id: 'pat-12345',
        cat: 'ANC_VISIT',
        level: 'SUBCENTRE',
        status: 'OPEN',
        owner_role: 'ANM',
        due: '2026-10-15',
        plan_version: '2.0',
      },
      {
        id: 'step-v2-002',
        patient_id: 'pat-12345',
        cat: 'BP_CHECK',
        level: 'SUBCENTRE',
        status: 'OPEN',
        owner_role: 'ANM',
        due: '2026-10-20',
        plan_version: '2.0',
      },
    ];

    const result = reconcileOfflineStepCompletion(offlineV1Completed, activeV2Steps, '2.0');

    assert.ok(result.matchedSuccessor, 'Must match corresponding open successor step');
    assert.equal(result.matchedSuccessor?.id, 'step-v2-001');
    assert.equal(result.reconciledStep.successor_step_id, 'step-v2-001');
    assert.equal(result.reconciledStep.successor_plan_version, '2.0');

    // Transform reconciled step into CloudEvent
    const event = transformStepToCloudEvent(result.reconciledStep);
    const successorExtension = event.data.extension.find(
      (e: any) => e.url === 'http://openphc.org/fhir/StructureDefinition/successor-step-id'
    );
    assert.ok(successorExtension, 'CloudEvent must include successor-step-id extension');
        assert.equal(successorExtension.valueString, 'step-v2-001');
  });

  it('SEC-07: minimizes and masks patient demographics in CloudEvents', () => {
    const rawPatient = {
      id: 'pat-99999',
      name: 'Rekha Devi',
      phone: '+919876543210',
      village_name: 'Pipliya',
      service: 'ANC',
      status: 'HIGH_RISK',
      consent_whatsapp: true,
    };
    const event = transformPatientToCloudEvent(rawPatient);
    assert.equal(event.data.name[0].text, 'R***');
    assert.equal(event.data.telecom[0].value, '***3210');
  });
});
