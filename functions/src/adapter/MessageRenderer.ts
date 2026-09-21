import { issueActionToken, issueActionTokens } from '../conversation/ConversationService.js';
import type { CareStep, Patient, Provenance, Role, User } from '../domain/types.js';
import type { WorklistSummary } from '../domain/WorklistService.js';
import type { AnyAlert } from '../domain/AlertService.js';
import type { StepCategoryConfig } from '../fixtures/stepCategories.js';
import type { RegisterImportResult } from '../domain/RegisterImportService.js';
import type { OutboundMessage } from './WhatsAppClient.js';

/** Fixed navigation commands never carry patient/step context (spec §9). */
export const CMD = {
  MENU: 'cmd:MENU',
  FIND_PATIENT: 'cmd:FIND_PATIENT',
  WORKLIST: 'cmd:WORKLIST',
  EXPECTED_ARRIVALS: 'cmd:EXPECTED_ARRIVALS',
  ADD_NEXT_STEP: 'cmd:ADD_NEXT_STEP',
  ALERTS: 'cmd:ALERTS',
  IMPORT_REGISTER: 'cmd:IMPORT_REGISTER',
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
  // Register import (addendum §11) is an ANM-facing paper-register task.
  if (role === 'ANM') {
    options.push({
      id: CMD.IMPORT_REGISTER,
      title: 'Import register',
      description: 'Experimental — simulated extraction',
    });
  }
  return options;
}

/**
 * Buttons (max 3, shown immediately) when the menu fits; a list otherwise
 * — spec's own UI mapping table: "Four-item main menu -> List message or
 * buttons + More". Went through a buttons+More variant briefly; reverted
 * back to a plain list since Flows (the other option) can't be published
 * on this Meta app without Business Verification, and list keeps every
 * option one tap away without paginating behind "More".
 */
export function renderMenu(to: string, user: User, facilityName: string): OutboundMessage {
  const options = menuOptions(user.role);
  const identityLine = `${user.name} · ${ROLE_LABELS[user.role]} · ${facilityName}`;
  const greeting = `${timeOfDayGreeting()}, ${user.name}. What do you need?`;

  if (options.length <= 3) {
    const body = [identityLine, greeting, ...options.map((o) => `• ${o.title} — ${o.description}`)].join('\n');
    return { kind: 'buttons', to, body, buttons: options.map((o) => ({ id: o.id, title: o.title })) };
  }
  return {
    kind: 'list',
    to,
    body: `${identityLine}\n${greeting}`,
    buttonLabel: 'Menu',
    sections: [{ rows: options.map((o) => ({ id: o.id, title: o.title, description: o.description })) }],
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

export async function renderNoMatches(to: string, whatsappSenderId: string, query: string): Promise<OutboundMessage> {
  const token = await issueActionToken(whatsappSenderId, { type: 'START_REGISTRATION' });
  return {
    kind: 'buttons',
    to,
    body: `No patient found matching "${query}".`,
    buttons: [{ id: token, title: 'Add new patient' }],
  };
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

  // "None of these — create new patient" (addendum §2 dedup-before-create) —
  // only for the normal find flow, not the "Add next step" staging picker,
  // where the patient necessarily already exists.
  if (actionType === 'SELECT_PATIENT') {
    const createToken = await issueActionToken(whatsappSenderId, { type: 'START_REGISTRATION' });
    // WhatsApp list row titles cap at 24 characters.
    rows.push({ id: createToken, title: 'None — add new patient' });
  }

  return {
    kind: 'list',
    to,
    body: `Found ${patients.length} match${patients.length === 1 ? '' : 'es'}.`,
    buttonLabel: 'Select patient',
    sections: [{ rows }],
  };
}

/**
 * Condition-neutral "which kind of next step" picker (addendum §5/§17) —
 * categories are whatever the patient's programme(s) define, buttons when
 * they fit (<=3), a list otherwise.
 */
export async function renderNextStepCategoryPicker(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  categories: StepCategoryConfig[],
): Promise<OutboundMessage> {
  const tokens = await issueActionTokens(
    whatsappSenderId,
    categories.map((c) => ({
      type: 'SELECT_NEXT_STEP_CATEGORY',
      patientId,
      data: { programmeId: c.programmeId, categoryId: c.id },
    })),
  );
  // WhatsApp reply buttons require 1-3 — 0 would happen only for a
  // programme id not configured in stepCategories.ts, which shouldn't occur
  // given the caller's ['RCH'] fallback, but never send a 0-button message.
  if (categories.length >= 1 && categories.length <= 3) {
    return {
      kind: 'buttons',
      to,
      body: 'Which step would you like to add?',
      buttons: categories.map((c, i) => ({ id: tokens[i]!, title: c.label })),
    };
  }
  return {
    kind: 'list',
    to,
    body: 'Which step would you like to add?',
    buttonLabel: 'Select step',
    sections: [{ rows: categories.map((c, i) => ({ id: tokens[i]!, title: c.label })) }],
  };
}

export function renderNextStepCreated(to: string, categoryLabel: string, dueDate: string): OutboundMessage {
  return { kind: 'text', to, body: `${categoryLabel} added, due ${fmtDate(dueDate)}.` };
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

/** Programme/risk tag for the compact journey view (addendum §4) — condition-neutral: reads whatever attribute the programme defines. */
function journeyRiskTag(patient: Patient): string | null {
  for (const ctx of patient.programmeContexts) {
    if (ctx.attributes.pregnancyStatus === 'HIGH_RISK') return 'High risk';
  }
  return null;
}

export async function renderPatientSummary(
  to: string,
  whatsappSenderId: string,
  patient: Patient,
  openSteps: CareStep[],
  completedCount = 0,
): Promise<OutboundMessage> {
  const riskTag = journeyRiskTag(patient);
  const header = riskTag ? `${patient.displayName} — ${riskTag}` : patient.displayName;

  if (openSteps.length === 0) {
    // Kept as the original STAGE_REFERRAL action/title, not the newer
    // SELECT_PATIENT_FOR_STAGE category picker — the golden conversation
    // fixture (anita_lakshmi_referral.json) taps this exact button title
    // and expects the direct two-tap REFERRAL staging flow, unchanged.
    const token = await issueActionToken(whatsappSenderId, {
      type: 'STAGE_REFERRAL',
      patientId: patient.id,
    });
    const completedLine = completedCount > 0 ? ` ${completedCount} completed.` : '';
    return {
      kind: 'buttons',
      to,
      body: `${header} has no open steps.${completedLine}`,
      buttons: [{ id: token, title: 'Stage referral' }],
    };
  }

  const stepTokens = await issueActionTokens(
    whatsappSenderId,
    openSteps.map((s) => ({ type: 'SELECT_STEP', patientId: patient.id, stepId: s.id })),
  );
  const addStepToken = await issueActionToken(whatsappSenderId, {
    type: 'SELECT_PATIENT_FOR_STAGE',
    patientId: patient.id,
  });
  const rows = [
    ...openSteps.map((s, i) => ({ id: stepTokens[i]!, title: `${s.kind} — due ${fmtDate(s.dueDate)}` })),
    { id: addStepToken, title: 'Add next step', description: 'Stage another step for this patient' },
  ];
  const completedLine = completedCount > 0 ? ` · ${completedCount} completed` : '';
  return {
    kind: 'list',
    to,
    body: `${header} — ${openSteps.length} open step${openSteps.length === 1 ? '' : 's'}${completedLine}.`,
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
    steps.map((s) => ({ type: 'SELECT_EXPECTED_ARRIVAL', patientId: s.patientId, stepId: s.id })),
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
 * Inline Arrived/Not arrived (addendum §8) — selecting a patient from
 * Expected Arrivals goes straight here, not the generic Call/Completed/
 * Reschedule step-actions menu WhatsApp lists can't attach per-row buttons
 * to, so this is the closest native fidelity to the mockup's inline
 * buttons: one extra tap to open, then the same two choices.
 */
export async function renderArrivalPrompt(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
  patientDisplayName: string,
  originFacilityName: string,
  dueDate: string,
): Promise<OutboundMessage> {
  const [arrivedToken, notArrivedToken] = (await issueActionTokens(whatsappSenderId, [
    { type: 'ARRIVAL_CONFIRMED', patientId, stepId },
    { type: 'ARRIVAL_NOT_YET', patientId, stepId },
  ])) as [string, string];
  return {
    kind: 'buttons',
    to,
    body: `${patientDisplayName}\nReferral from ${originFacilityName}\nDue ${fmtDate(dueDate)}`,
    buttons: [
      { id: arrivedToken, title: 'Arrived' },
      { id: notArrivedToken, title: 'Not arrived' },
    ],
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

// WhatsApp list row titles cap at 24 characters — these must stay short.
const PROVENANCE_LABELS: Record<Provenance, string> = {
  AT_REFERRED_FACILITY: 'At referred facility',
  OTHER_FACILITY: 'At another facility',
  PRIVATE_PROVIDER: 'Private provider',
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

// --- Lightweight registration (addendum §2/§3) ---------------------------
// Sequential text prompts, not a native form — no Flow can be published on
// this Meta app (Business Verification blocked, see docs/whatsapp/flows.md)
// so this is the buttons/list/text-only path §16 asks for as the fallback.

export function renderRegistrationNamePrompt(to: string): OutboundMessage {
  return { kind: 'text', to, body: "Add new patient.\nWhat's their full name?" };
}

export function renderRegistrationPhonePrompt(to: string): OutboundMessage {
  return { kind: 'text', to, body: 'Mobile number?' };
}

export function renderRegistrationVillagePrompt(to: string): OutboundMessage {
  return { kind: 'text', to, body: 'Village?' };
}

export function renderRegistrationRchIdPrompt(to: string): OutboundMessage {
  return { kind: 'text', to, body: 'ABHA / RCH ID? (optional — type "skip" to leave blank)' };
}

export async function renderPregnancyStatusPrompt(to: string, whatsappSenderId: string): Promise<OutboundMessage> {
  const [normal, highRisk, notApplicable] = (await issueActionTokens(whatsappSenderId, [
    { type: 'REGISTRATION_PREGNANCY_STATUS', data: { pregnancyStatus: 'NORMAL' } },
    { type: 'REGISTRATION_PREGNANCY_STATUS', data: { pregnancyStatus: 'HIGH_RISK' } },
    { type: 'REGISTRATION_PREGNANCY_STATUS', data: { pregnancyStatus: 'NONE' } },
  ])) as [string, string, string];
  return {
    kind: 'buttons',
    to,
    body: 'Pregnancy status?',
    buttons: [
      { id: normal, title: 'Normal' },
      { id: highRisk, title: 'High risk' },
      { id: notApplicable, title: 'Not applicable' },
    ],
  };
}

export async function renderConsentPrompt(to: string, whatsappSenderId: string): Promise<OutboundMessage> {
  const [yes, no] = (await issueActionTokens(whatsappSenderId, [
    { type: 'REGISTRATION_CONSENT', data: { consent: 'true' } },
    { type: 'REGISTRATION_CONSENT', data: { consent: 'false' } },
  ])) as [string, string];
  return {
    kind: 'buttons',
    to,
    body: 'WhatsApp reminders\nMay we send you reminders on WhatsApp about your next steps?',
    buttons: [
      { id: yes, title: 'Yes, consented' },
      { id: no, title: 'No' },
    ],
  };
}

export function renderPatientCreated(to: string, patient: Patient): OutboundMessage {
  return { kind: 'text', to, body: `${patient.displayName} added. Type menu to continue.` };
}

/**
 * Fake OCR import result (addendum §11) — explicitly labeled experimental;
 * this demonstrates the interaction model (paper register -> extraction ->
 * matching -> human review of exceptions -> roster), not real OCR accuracy.
 */
export function renderRegisterImportResult(to: string, result: RegisterImportResult): OutboundMessage {
  return {
    kind: 'text',
    to,
    body: [
      '⚠ Experimental — extraction is simulated, not a validated OCR result.',
      'Register processed',
      `${result.rowsFound} rows found`,
      `${result.matched} matched to existing patients`,
      `${result.possibleMatches} possible matches`,
      `${result.newPatients} possible new patient${result.newPatients === 1 ? '' : 's'}`,
      `Review ${result.needsReview}`,
    ].join('\n'),
  };
}

/**
 * In-conversation alert card shown when opening the demo (addendum §10) —
 * interactive (View/Call/Completed), unlike the approved-template push
 * below which Meta requires for true outbound-initiated messages. This one
 * fires as part of a reply the user already triggered (opening the menu),
 * so it's not subject to the 24h/template restriction.
 */
export async function renderOpenAlertCard(
  to: string,
  whatsappSenderId: string,
  patientId: string,
  stepId: string,
  patientDisplayName: string,
  stepKind: string,
  dueDate: string,
  overdueDays: number,
): Promise<OutboundMessage> {
  const [viewToken, callToken, completeToken] = (await issueActionTokens(whatsappSenderId, [
    { type: 'SELECT_STEP', patientId, stepId },
    { type: 'CALL', patientId, stepId },
    { type: 'START_CLOSE', patientId, stepId },
  ])) as [string, string, string];
  return {
    kind: 'buttons',
    to,
    body: [
      '🔔 A patient in your care needs attention.',
      patientDisplayName,
      stepKind,
      `Due: ${fmtDate(dueDate)}`,
      `Status: ${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`,
    ].join('\n'),
    buttons: [
      { id: viewToken, title: 'View' },
      { id: callToken, title: 'Call' },
      { id: completeToken, title: 'Completed' },
    ],
  };
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
