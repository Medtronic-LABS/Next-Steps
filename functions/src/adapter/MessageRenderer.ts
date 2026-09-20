import { issueActionToken, issueActionTokens } from '../conversation/ConversationService.js';
import type { CareStep, Patient, Provenance, Role, User } from '../domain/types.js';
import type { WorklistSummary } from '../domain/WorklistService.js';
import type { AnyAlert } from '../domain/AlertService.js';
import type { OutboundMessage } from './WhatsAppClient.js';

/** Fixed navigation commands never carry patient/step context (spec §9). */
export const CMD = {
  MENU: 'cmd:MENU',
  MORE: 'cmd:MORE',
  FIND_PATIENT: 'cmd:FIND_PATIENT',
  WORKLIST: 'cmd:WORKLIST',
  EXPECTED_ARRIVALS: 'cmd:EXPECTED_ARRIVALS',
  ADD_NEXT_STEP: 'cmd:ADD_NEXT_STEP',
  ALERTS: 'cmd:ALERTS',
} as const;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const ROLE_LABELS: Record<Role, string> = { ANM: 'ANM', STAFF_NURSE: 'Staff Nurse' };

function menuOptions(role: Role): { id: string; title: string; description: string }[] {
  const options: { id: string; title: string; description: string }[] = [
    { id: CMD.WORKLIST, title: "Today's work", description: 'Due today and overdue' },
    { id: CMD.FIND_PATIENT, title: 'Find a patient', description: 'Search and view open steps' },
    { id: CMD.ADD_NEXT_STEP, title: 'Add next step', description: 'Stage a referral for any patient' },
    { id: CMD.ALERTS, title: 'Alerts', description: 'Recently sent reminders' },
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
  return options;
}

/**
 * "Buttons + More" (spec's own UI mapping table) instead of a list — the
 * first 2 options plus a "More" button; tapping it reveals the rest as a
 * second buttons message (renderMoreMenu). Always fits WhatsApp's 3-button
 * cap on both messages: 4 options -> 2 + More, then 2 more; 5 (STAFF_NURSE)
 * -> 2 + More, then exactly 3 more.
 */
export function renderMenu(to: string, user: User, facilityName: string): OutboundMessage {
  const options = menuOptions(user.role);
  const identityLine = `${user.name} · ${ROLE_LABELS[user.role]} · ${facilityName}`;
  const greeting = `${timeOfDayGreeting()}, ${user.name}. What do you need?`;
  const body = [identityLine, greeting, ...options.map((o) => `• ${o.title} — ${o.description}`)].join('\n');

  const primary = options.slice(0, 2);
  const buttons = primary.map((o) => ({ id: o.id, title: o.title }));
  if (options.length > 2) buttons.push({ id: CMD.MORE, title: 'More' });

  return { kind: 'buttons', to, body, buttons };
}

export function renderMoreMenu(to: string, role: Role): OutboundMessage {
  const rest = menuOptions(role).slice(2);
  return {
    kind: 'buttons',
    to,
    body: 'More options:',
    buttons: rest.map((o) => ({ id: o.id, title: o.title })),
  };
}

/**
 * Flow-based alternative to renderMenu/renderMoreMenu — every option on one
 * native RadioButtonsGroup screen instead of buttons + a second "More" tap.
 * Shares the flow_reply routing pattern with the closure/select-item Flows
 * (MessageRenderer's siblings) via kind: 'menu' in the submitted payload.
 */
export function renderMenuFlow(to: string, flowId: string, user: User, facilityName: string): OutboundMessage {
  const options = menuOptions(user.role);
  const identityLine = `${user.name} · ${ROLE_LABELS[user.role]} · ${facilityName}`;
  const greeting = `${timeOfDayGreeting()}, ${user.name}. What do you need?`;
  return {
    kind: 'flow',
    to,
    body: `${identityLine}\n${greeting}`,
    flowId,
    flowCta: 'Menu',
    screenId: 'MENU',
    flowActionData: {
      greeting: 'What do you need?',
      items: options.map((o) => ({ id: o.id, title: o.title })),
    },
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
  // 'SELECT_PATIENT_FOR_STAGE' for the "Add next step" flow (spec: stage
  // regardless of existing open steps), 'SELECT_PATIENT' for normal find.
  actionType: 'SELECT_PATIENT' | 'SELECT_PATIENT_FOR_STAGE' = 'SELECT_PATIENT',
): Promise<OutboundMessage> {
  const matches = patients.slice(0, 10);
  const tokens = await issueActionTokens(
    whatsappSenderId,
    matches.map((p) => ({ type: actionType, patientId: p.id })),
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

/**
 * Flow-based alternative to renderPatientList — same dropdown-select Flow
 * shared with the worklist/expected-arrivals screens (screens/select-item.flow.json).
 * No action tokens: the selected patient id is the Flow's own screen output.
 */
export function renderPatientListFlow(to: string, flowId: string, patients: Patient[]): OutboundMessage {
  const matches = patients.slice(0, 10);
  const items = matches.map((p) => ({ id: p.id, title: p.displayName }));
  return {
    kind: 'flow',
    to,
    body: `Found ${patients.length} match${patients.length === 1 ? '' : 'es'}.`,
    flowId,
    flowCta: 'View matches',
    screenId: 'SELECT',
    flowActionData: { kind: 'patient', items },
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

/**
 * Flow-based alternative to renderExpectedArrivals — shares select-item.flow.json
 * with renderPatientListFlow/renderWorklistFlow. A step needs both a
 * patientId and stepId to route (unlike a plain patient pick), so the
 * option id is the composite `${patientId}::${stepId}`, split back apart
 * in the router.
 */
export function renderExpectedArrivalsFlow(
  to: string,
  flowId: string,
  patientNamesById: Record<string, string>,
  steps: CareStep[],
): OutboundMessage {
  if (steps.length === 0) {
    return { kind: 'text', to, body: 'No patients are currently expected.' };
  }
  const items = steps.map((s) => ({
    id: `${s.patientId}::${s.id}`,
    title: patientNamesById[s.patientId] ?? s.patientId,
    description: `Referred — due ${fmtDate(s.dueDate)}`,
  }));
  return {
    kind: 'flow',
    to,
    body: `${steps.length} patient${steps.length === 1 ? '' : 's'} expected.`,
    flowId,
    flowCta: 'View patients',
    screenId: 'SELECT',
    flowActionData: { kind: 'step', items },
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

/**
 * Native WhatsApp Flow alternative to renderProvenancePrompt's flat list —
 * one screen instead of a list-tap round trip. Requires a published Flow
 * (Meta dashboard) whose id is passed in by the caller; unlike the other
 * render* functions this one takes no whatsappSenderId/issueActionToken,
 * because the Flow's own screen fields (step_id/patient_id/provenance) are
 * the correlated state, not an opaque conversation action token (spec §9
 * tokens are a WhatsApp-adapter concern for buttons/lists specifically).
 */
export function renderClosureProvenanceFlow(
  to: string,
  flowId: string,
  stepId: string,
  patientId: string,
): OutboundMessage {
  return {
    kind: 'flow',
    to,
    body: 'What happened with this referral?',
    flowId,
    flowCta: 'Close referral',
    screenId: 'PROVENANCE',
    flowActionData: { step_id: stepId, patient_id: patientId },
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

/** Flow-based alternative to renderWorklist — see renderExpectedArrivalsFlow for the composite-id note. */
export function renderWorklistFlow(
  to: string,
  flowId: string,
  patientNamesById: Record<string, string>,
  summary: WorklistSummary,
): OutboundMessage {
  const allSteps = [...summary.overdue, ...summary.dueToday];
  if (allSteps.length === 0) {
    return { kind: 'text', to, body: 'Nothing overdue or due today.' };
  }
  const overdueIds = new Set(summary.overdue.map((s) => s.id));
  const items = allSteps.map((s) => ({
    id: `${s.patientId}::${s.id}`,
    title: `${patientNamesById[s.patientId] ?? s.patientId} — ${s.kind}`,
    description: `Due ${fmtDate(s.dueDate)}${overdueIds.has(s.id) ? ' (overdue)' : ''}`,
  }));
  return {
    kind: 'flow',
    to,
    body: "Today's work",
    flowId,
    flowCta: 'View steps',
    screenId: 'SELECT',
    flowActionData: { kind: 'step', items },
  };
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

function alertSummaryLine(alert: AnyAlert): string {
  const date = fmtDate(alert.sentAt.slice(0, 10));
  switch (alert.template) {
    case 'care_step_overdue_v1':
      return `${date} — Overdue reminder (${alert.deliveryStatus.toLowerCase()})`;
    case 'work_due_today_v1':
      return `${date} — ${alert.count} step${alert.count === 1 ? '' : 's'} due today (${alert.deliveryStatus.toLowerCase()})`;
    case 'expected_arrivals_summary_v1':
      return `${date} — ${alert.count} patient${alert.count === 1 ? '' : 's'} expected (${alert.deliveryStatus.toLowerCase()})`;
  }
}

/** "Alerts" menu item — a read-only history of proactive pushes sent to this user. */
export function renderAlertHistory(to: string, alerts: AnyAlert[]): OutboundMessage {
  if (alerts.length === 0) {
    return { kind: 'text', to, body: 'No alerts sent yet.' };
  }
  return { kind: 'text', to, body: ['Recent alerts:', ...alerts.map((a) => `• ${alertSummaryLine(a)}`)].join('\n') };
}
