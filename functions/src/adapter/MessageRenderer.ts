import { issueActionToken, issueActionTokens } from '../conversation/ConversationService.js';
import type { CareStep, Patient, Provenance, Role, User } from '../domain/types.js';
import type { WorklistSummary } from '../domain/WorklistService.js';
import type { OutboundMessage } from './WhatsAppClient.js';

/** Fixed navigation commands never carry patient/step context (spec §9). */
export const CMD = {
  MENU: 'cmd:MENU',
  FIND_PATIENT: 'cmd:FIND_PATIENT',
  WORKLIST: 'cmd:WORKLIST',
  EXPECTED_ARRIVALS: 'cmd:EXPECTED_ARRIVALS',
} as const;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function renderMenu(to: string, role: Role): OutboundMessage {
  const options: { id: string; title: string; description: string }[] = [
    { id: CMD.FIND_PATIENT, title: 'Find a patient', description: 'Search and view open steps' },
    { id: CMD.WORKLIST, title: "Today's work", description: 'Due today and overdue' },
  ];
  // Expected arrivals is a receiving-facility concern (spec Phase 4) — only
  // staff at a destination facility (e.g. Priya, STAFF_NURSE) act on it.
  if (role === 'STAFF_NURSE') {
    options.push({
      id: CMD.EXPECTED_ARRIVALS,
      title: 'Expected arrivals',
      description: 'Patients referred to your facility',
    });
  }
  // WhatsApp reply buttons (max 3, shown immediately) instead of a list
  // message (options hidden behind a tap-to-reveal "Menu" button) — the menu
  // never has more than 3 options in this MVP, so buttons always fit.
  const body = ['What would you like to do?', ...options.map((o) => `• ${o.title} — ${o.description}`)].join('\n');
  return {
    kind: 'buttons',
    to,
    body,
    buttons: options.map((o) => ({ id: o.id, title: o.title })),
  };
}

export function renderFindPatientPrompt(to: string): OutboundMessage {
  return { kind: 'text', to, body: 'Type: find <patient name>' };
}

export function renderNoMatches(to: string, query: string): OutboundMessage {
  return { kind: 'text', to, body: `No patient found matching "${query}". Try again, or type menu.` };
}

export async function renderPatientList(
  to: string,
  whatsappSenderId: string,
  patients: Patient[],
): Promise<OutboundMessage> {
  const matches = patients.slice(0, 10);
  const tokens = await issueActionTokens(
    whatsappSenderId,
    matches.map((p) => ({ type: 'SELECT_PATIENT', patientId: p.id })),
  );
  const rows = matches.map((p, i) => ({ id: tokens[i]!, title: p.displayName }));
  return {
    kind: 'list',
    to,
    body: `Found ${patients.length} match${patients.length === 1 ? '' : 'es'}.`,
    buttonLabel: 'Select patient',
    sections: [{ rows }],
  };
}

export async function renderPatientSummary(
  to: string,
  whatsappSenderId: string,
  patient: Patient,
  openSteps: CareStep[],
): Promise<OutboundMessage> {
  if (openSteps.length === 0) {
    const token = await issueActionToken(whatsappSenderId, {
      type: 'STAGE_REFERRAL',
      patientId: patient.id,
    });
    return {
      kind: 'buttons',
      to,
      body: `${patient.displayName} has no open steps.`,
      buttons: [{ id: token, title: 'Stage referral' }],
    };
  }

  const tokens = await issueActionTokens(
    whatsappSenderId,
    openSteps.map((s) => ({ type: 'SELECT_STEP', patientId: patient.id, stepId: s.id })),
  );
  const rows = openSteps.map((s, i) => ({ id: tokens[i]!, title: `${s.kind} — due ${fmtDate(s.dueDate)}` }));
  return {
    kind: 'list',
    to,
    body: `${patient.displayName} — ${openSteps.length} open step${openSteps.length === 1 ? '' : 's'}.`,
    buttonLabel: 'View step',
    sections: [{ rows }],
  };
}

export async function renderReferralConfirm(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  destinationFacilityId: string,
  destinationFacilityName: string,
  dueDate: string,
): Promise<OutboundMessage> {
  const [confirmToken, changeToken] = (await issueActionTokens(whatsappSenderId, [
    { type: 'CONFIRM_REFERRAL', patientId, data: { destinationFacilityId, dueDate } },
    { type: 'CHANGE_REFERRAL', patientId },
  ])) as [string, string];
  return {
    kind: 'buttons',
    to,
    body: `Refer to ${destinationFacilityName}, due ${fmtDate(dueDate)}?`,
    buttons: [
      { id: confirmToken, title: 'Confirm' },
      { id: changeToken, title: 'Change' },
    ],
  };
}

export async function renderReferralConfirmed(
  to: string,
  destinationFacilityName: string,
): Promise<OutboundMessage> {
  return { kind: 'text', to, body: `Referral to ${destinationFacilityName} confirmed.` };
}

export async function renderStepActions(
  to: string,
  whatsappSenderId: string,
  actor: User,
  step: CareStep,
): Promise<OutboundMessage> {
  const patientId = step.patientId;
  const stepId = step.id;
  const actions: { type: string; patientId: string; stepId: string }[] = [
    { type: 'CALL', patientId, stepId },
    { type: 'START_CLOSE', patientId, stepId },
    { type: 'START_RESCHEDULE', patientId, stepId },
  ];
  // Confirm arrival is only offered to staff at the destination facility, and
  // only once (spec §2A/§18 — arrival is a separate, single event from closure).
  const canConfirmArrival = actor.facilityId === step.destinationFacilityId && step.arrivedAt === null;
  if (canConfirmArrival) actions.push({ type: 'CONFIRM_ARRIVAL', patientId, stepId });

  const tokens = await issueActionTokens(whatsappSenderId, actions);
  const buttons = [
    { id: tokens[0]!, title: 'Call' },
    { id: tokens[1]!, title: 'Completed' },
    { id: tokens[2]!, title: 'Reschedule' },
  ];
  if (canConfirmArrival) buttons.push({ id: tokens[3]!, title: 'Confirm arrival' });

  return { kind: 'buttons', to, body: 'What would you like to do?', buttons };
}

export async function renderExpectedArrivals(
  to: string,
  whatsappSenderId: string,
  patientNamesById: Record<string, string>,
  steps: CareStep[],
): Promise<OutboundMessage> {
  if (steps.length === 0) {
    return { kind: 'text', to, body: 'No patients are currently expected.' };
  }
  const tokens = await issueActionTokens(
    whatsappSenderId,
    steps.map((s) => ({ type: 'SELECT_STEP', patientId: s.patientId, stepId: s.id })),
  );
  const rows = steps.map((s, i) => ({
    id: tokens[i]!,
    title: patientNamesById[s.patientId] ?? s.patientId,
    description: `Referred — due ${fmtDate(s.dueDate)}`,
  }));
  return {
    kind: 'list',
    to,
    body: `${steps.length} patient${steps.length === 1 ? '' : 's'} expected.`,
    buttonLabel: 'View patient',
    sections: [{ rows }],
  };
}

export function renderArrivalRecorded(to: string, patientDisplayName: string): OutboundMessage {
  return { kind: 'text', to, body: `Arrival recorded for ${patientDisplayName}. Type menu to continue.` };
}

export async function renderCallInitiated(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
  patientDisplayName: string,
  phoneNumber: string,
): Promise<[OutboundMessage, OutboundMessage]> {
  const [spoke, noAnswer, wrongNumber] = (await issueActionTokens(whatsappSenderId, [
    { type: 'CONTACT_OUTCOME', patientId, stepId, data: { outcome: 'SPOKE_TO_PATIENT' } },
    { type: 'CONTACT_OUTCOME', patientId, stepId, data: { outcome: 'NO_ANSWER' } },
    { type: 'CONTACT_OUTCOME', patientId, stepId, data: { outcome: 'WRONG_NUMBER' } },
  ])) as [string, string, string];
  return [
    { kind: 'text', to, body: `Calling ${patientDisplayName}: ${phoneNumber}` },
    {
      kind: 'buttons',
      to,
      body: `Were you able to reach ${patientDisplayName}?`,
      buttons: [
        { id: spoke, title: 'Spoke to patient' },
        { id: noAnswer, title: 'No answer' },
        { id: wrongNumber, title: 'Wrong number' },
      ],
    },
  ];
}

export function renderContactOutcomeRecorded(to: string): OutboundMessage {
  return { kind: 'text', to, body: 'Noted. Type menu to continue.' };
}

const PROVENANCE_LABELS: Record<Provenance, string> = {
  AT_REFERRED_FACILITY: 'Seen at the referred facility',
  OTHER_FACILITY: 'Seen at a different facility',
  PRIVATE_PROVIDER: 'Seen by a private provider',
  NOT_COMPLETED: 'Not seen anywhere',
};

export async function renderProvenancePrompt(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
): Promise<OutboundMessage> {
  const provenances = Object.keys(PROVENANCE_LABELS) as Provenance[];
  const tokens = await issueActionTokens(
    whatsappSenderId,
    provenances.map((provenance) => ({ type: 'CLOSE_WITH_PROVENANCE', patientId, stepId, data: { provenance } })),
  );
  const rows = provenances.map((provenance, i) => ({ id: tokens[i]!, title: PROVENANCE_LABELS[provenance] }));
  return {
    kind: 'list',
    to,
    body: 'What happened with this referral?',
    buttonLabel: 'Select outcome',
    sections: [{ rows }],
  };
}

export function renderStepClosed(to: string, downgraded: boolean): OutboundMessage {
  return {
    kind: 'text',
    to,
    body: downgraded
      ? 'Closed. This did not resolve as originally referred — flagged for follow-up.'
      : 'Closed. Referral completed as intended.',
  };
}

const RESCHEDULE_PRESETS = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
] as const;

export async function renderReschedulePresets(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
): Promise<OutboundMessage> {
  const presetDates = RESCHEDULE_PRESETS.map(
    (preset) => new Date(Date.now() + preset.days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const tokens = await issueActionTokens(whatsappSenderId, [
    ...presetDates.map((toDate) => ({ type: 'RESCHEDULE', patientId, stepId, data: { toDate } })),
    { type: 'RESCHEDULE_CHOOSE_ANOTHER', patientId, stepId },
  ]);
  const presetRows = RESCHEDULE_PRESETS.map((preset, i) => ({ id: tokens[i]!, title: preset.label }));
  const chooseAnotherToken = tokens[tokens.length - 1]!;
  return {
    kind: 'list',
    to,
    body: 'When should this be rescheduled to?',
    buttonLabel: 'Select date',
    sections: [
      {
        rows: [...presetRows, { id: chooseAnotherToken, title: 'Choose another date' }],
      },
    ],
  };
}

export function renderRescheduleChooseAnotherUnavailable(to: string): OutboundMessage {
  return {
    kind: 'text',
    to,
    body: 'Free date entry is not available yet — please pick one of the presets, or type menu.',
  };
}

export function renderStepRescheduled(to: string, toDate: string): OutboundMessage {
  return { kind: 'text', to, body: `Rescheduled to ${fmtDate(toDate)}.` };
}

export async function renderWorklist(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  patientNamesById: Record<string, string>,
  summary: WorklistSummary,
): Promise<OutboundMessage> {
  void patientId;
  const allSteps = [...summary.overdue, ...summary.dueToday];
  if (allSteps.length === 0) {
    return { kind: 'text', to, body: 'Nothing overdue or due today.' };
  }

  const tokens = await issueActionTokens(
    whatsappSenderId,
    allSteps.map((s) => ({ type: 'SELECT_STEP', patientId: s.patientId, stepId: s.id })),
  );
  const tokenByStepId = new Map(allSteps.map((s, i) => [s.id, tokens[i]!]));
  const toRow = (s: CareStep) => ({
    id: tokenByStepId.get(s.id)!,
    title: `${patientNamesById[s.patientId] ?? s.patientId} — ${s.kind}`,
    description: `Due ${fmtDate(s.dueDate)}`,
  });

  const sections = [];
  if (summary.overdue.length > 0) {
    sections.push({ title: 'Overdue', rows: summary.overdue.map(toRow) });
  }
  if (summary.dueToday.length > 0) {
    sections.push({ title: 'Due today', rows: summary.dueToday.map(toRow) });
  }
  return { kind: 'list', to, body: "Today's work", buttonLabel: 'View step', sections };
}

export function renderSessionExpired(to: string): OutboundMessage {
  return {
    kind: 'text',
    to,
    body: 'That session has ended to protect patient information. Please find the patient again.',
  };
}

export function renderStaleAction(to: string): OutboundMessage {
  return { kind: 'text', to, body: 'This action is no longer available. Please open the patient again.' };
}

export function renderUnregistered(to: string): OutboundMessage {
  return { kind: 'text', to, body: 'You are not registered for this service.' };
}

export function renderUnrecognized(to: string): OutboundMessage {
  return { kind: 'text', to, body: "Sorry, I didn't understand that. Type menu to see your options." };
}

/** Approved template for a proactive overdue alert (spec §16/§17). */
export function renderOverdueAlert(
  to: string,
  patientDisplayName: string,
  stepKind: string,
  dueDate: string,
  overdueDays: number,
): OutboundMessage {
  return {
    kind: 'template',
    to,
    templateName: 'care_step_overdue_v1',
    params: {
      patient_display: patientDisplayName,
      step_label: stepKind,
      due_date: fmtDate(dueDate),
      overdue_duration: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`,
    },
  };
}

/** Approved template for the daily "work due today" push (spec §16). */
export function renderWorkDueTodaySummary(to: string, dueTodayCount: number): OutboundMessage {
  return {
    kind: 'template',
    to,
    templateName: 'work_due_today_v1',
    params: {
      due_today_count: String(dueTodayCount),
    },
  };
}

/** Approved template for the daily "expected arrivals" push to a receiving facility (spec §16). */
export function renderExpectedArrivalsSummary(to: string, expectedCount: number, facilityName: string): OutboundMessage {
  return {
    kind: 'template',
    to,
    templateName: 'expected_arrivals_summary_v1',
    params: {
      expected_count: String(expectedCount),
      facility_name: facilityName,
    },
  };
}
