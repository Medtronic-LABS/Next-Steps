import { describe, expect, it, vi } from 'vitest';
import * as core from '../src/index';
import type { Category, Id, Patient, StepStatus } from '../src/types';

// ITEM-7-AI-INSIGHTS.md AI-4 (batch 7c — guardrails).
//
// No function in packages/core/src/insights.ts ever calls
// `ModelClient.narrate`. `executeIntent` (batch 7b) returns aggregate §13
// results only, and nothing wires those results, or anything else, into a
// call to the model for narration. There is therefore no place today where
// AI-4 ("aggregates only leave the device") could even be enforced — the
// pipeline stage that would send a payload to the model does not exist.
//
// This test hypothesizes that missing stage as a standalone `answerQuestion`
// function — the natural remaining piece of the AI-1 pipeline (question ->
// intent -> execute -> narrate) — and calls it through optional chaining, so
// `answerQuestion` is `undefined` here and the call resolves to `undefined`
// without ever invoking the stub client, never throwing. The assertions
// below are genuine runtime comparisons against the captured payload array
// (not the response), not import- or construction-time failures, and
// nothing here is a try/catch hiding a thrown error.
//
// TC-AI-006/008 showed this pattern already: a hypothesized function that
// doesn't exist yet resolves to `undefined`, and the real failure is a
// concrete runtime comparison against what the documented behaviour
// requires — here, that at least one payload was captured at all.

interface InsightsStep {
  id: Id;
  pid: Id;
  cat: Category;
  dueDate: Date;
  status: StepStatus;
  completedDate?: Date | null;
  attempts: number;
}

interface AiIntent {
  type: string;
  periodDays?: number;
  category?: Category;
}

interface ModelClient {
  extractIntent(question: string): Promise<AiIntent>;
  narrate(question: string, metrics: unknown): Promise<string>;
}

type InsightsModule = {
  answerQuestion?: (
    client: ModelClient,
    question: string,
    steps: InsightsStep[],
    patients: Patient[],
    now?: Date,
  ) => Promise<unknown>;
};

const NOW = new Date('2026-06-20T12:00:00.000Z');
const d = (s: string) => new Date(s + 'T12:00:00.000Z');

// A clinic with named patients and mobile numbers (AI-4's own framing) — the
// exact shape any outbound payload must never contain a trace of.
const F_AI_PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'Sunita Rao',
    mobile: '+919876543210',
    gender: 'Female',
    age: 29,
    cid: 'C-001',
    consent: true,
    last: '10 Jun',
    open: 1,
    overdue: 0,
    identifier: [{ system: 'local', value: 'C-001' }],
  },
  {
    id: 'p2',
    name: 'Ramesh Iyer',
    mobile: '+919876500000',
    gender: 'Male',
    age: 41,
    cid: 'C-002',
    consent: true,
    last: '12 Jun',
    open: 1,
    overdue: 1,
    identifier: [{ system: 'local', value: 'C-002' }],
  },
];

const F_AI_PAYLOAD_STEPS: InsightsStep[] = [
  { id: 's1', pid: 'p1', cat: 'FOLLOW_UP_VISIT', dueDate: d('2026-06-10'), status: 'COMPLETED', completedDate: d('2026-06-08'), attempts: 1 },
  { id: 's2', pid: 'p2', cat: 'FOLLOW_UP_VISIT', dueDate: d('2026-06-12'), status: 'SCHEDULED', attempts: 1 },
];

function capturingModelClient(): { client: ModelClient; payloads: unknown[] } {
  const payloads: unknown[] = [];
  const client: ModelClient = {
    extractIntent: vi.fn().mockResolvedValue({ type: 'COMPLETION_RATE', periodDays: 30 }),
    narrate: vi.fn().mockImplementation(async (_question: string, metrics: unknown) => {
      payloads.push(metrics);
      return 'ok';
    }),
  };
  return { client, payloads };
}

describe('TC-AI-010 — no patient-level data reaches the model (EXPECTED FAIL)', () => {
  it('never sends a patient name, mobile number, identifier, or per-patient row to the model client', async () => {
    const { client, payloads } = capturingModelClient();
    const answerQuestion = (core as unknown as InsightsModule).answerQuestion;

    await answerQuestion?.(client, 'What is our completion rate this month?', F_AI_PAYLOAD_STEPS, F_AI_PATIENTS, NOW);

    expect.soft(
      payloads.length,
      'AI-4: answering a question must call the model client with an inspectable payload — no pipeline exists yet that assembles and sends one, so aggregate-only compliance cannot be verified at all',
    ).toBeGreaterThan(0);

    const serialized = JSON.stringify(payloads);

    for (const patient of F_AI_PATIENTS) {
      expect.soft(
        serialized.includes(patient.name),
        `AI-4: patient name "${patient.name}" must never appear in any payload sent to the model`,
      ).toBe(false);
      expect.soft(
        serialized.includes(patient.mobile),
        `AI-4: mobile number "${patient.mobile}" must never appear in any payload sent to the model`,
      ).toBe(false);
      expect.soft(
        serialized.includes(patient.id),
        `AI-4: patient identifier "${patient.id}" must never appear in any payload sent to the model`,
      ).toBe(false);
    }

    for (const step of F_AI_PAYLOAD_STEPS) {
      expect.soft(
        serialized.includes(step.pid),
        `AI-4: a per-patient identifier ("${step.pid}") from a raw step row must never appear in any payload sent to the model`,
      ).toBe(false);
    }
  });
});
