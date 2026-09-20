# Firestore Model

All collections are written only by Cloud Functions via the Admin SDK (see
`firestore.rules`). Field names are camelCase; timestamps are Firestore `Timestamp`.

## `users/{userId}`

```jsonc
{
  "id": "ANITA",
  "name": "Anita",
  "role": "ANM",                 // "ANM" | "STAFF_NURSE"
  "facilityId": "RAMPUR_SUBCENTRE",
  "phoneNumber": "+91...",       // E.164, used for sender resolution
  "status": "ACTIVE"             // "ACTIVE" | "INACTIVE" — inactive users are treated as unknown
}
```

## `facilities/{facilityId}`

```jsonc
{ "id": "RAMPUR_SUBCENTRE", "name": "Rampur Sub-centre", "tier": "SUBCENTRE" }
{ "id": "CHC_TEONTHAR", "name": "CHC Teonthar", "tier": "CHC" }
```

## `patients/{patientId}`

```jsonc
{ "id": "LAKSHMI_DEVI", "displayName": "Lakshmi Devi", "phoneNumber": "+919800000001", "synthetic": true }
```

## `careSteps/{stepId}`

The central lifecycle document. **Arrival and completion are independent** (spec
§2A) — `status` only ever moves `OPEN -> DONE`; arrival is recorded on separate
fields regardless of `status`.

```jsonc
{
  "id": "...",
  "patientId": "LAKSHMI_DEVI",
  "kind": "REFERRAL",
  "status": "OPEN",                     // "OPEN" | "DONE"
  "originFacilityId": "RAMPUR_SUBCENTRE",
  "destinationFacilityId": "CHC_TEONTHAR",
  "ownerUserId": "ANITA",
  "facilityId": "RAMPUR_SUBCENTRE",     // denormalized for the owner's worklist query
  "dueDate": "2026-09-22",

  // Arrival — set independently of status; never implies completion
  "arrivedAt": null,
  "arrivedByUserId": null,
  "arrivalFacilityId": null,

  // Closure — set only by ClosureService.closeStep(), append-only intent
  "closedAt": null,
  "closedByUserId": null,
  "provenance": null,        // "AT_REFERRED_FACILITY" | "OTHER_FACILITY" | "PRIVATE_PROVIDER" | "NOT_COMPLETED"
  "downgraded": null,        // boolean, derived from provenance at close time

  // Contact-outcome trail — appended by ContactOutcomeService, most recent last
  "contactOutcomes": [
    { "outcome": "NO_ANSWER", "byUserId": "ANITA", "at": "2026-09-19T10:03:00Z" }
  ],

  // Reschedule trail
  "rescheduleHistory": [
    { "fromDate": "2026-09-19", "toDate": "2026-09-22", "byUserId": "ANITA", "at": "..." }
  ],

  "createdAt": "...",
  "updatedAt": "..."
}
```

## `conversations/{conversationId}`

Keyed by WhatsApp sender id. Short-lived orchestration state only — never
authoritative (spec §8). See `conversation/types.ts`.

```jsonc
{
  "whatsappSenderId": "91XXXXXXXXXX",
  "userId": "ANITA",
  "workflow": "PATIENT_STEPS",
  "patientId": "LAKSHMI_DEVI",
  "stepId": "...",
  "currentState": "STEP_SELECTED",
  "lastAction": "...",
  "pendingActions": {
    "8f29c1a0-...": { "type": "CONFIRM_REFERRAL", "stepId": "...", "expiresAt": "..." }
  },
  "expiresAt": "...",
  "lastInboundMessageId": "wamid...."
}
```

## `conversations/{conversationId}/messages/{messageId}`

Lightweight transcript for debugging/support — direction, rendered payload
summary, timestamp. Not used for domain decisions.

## `auditEvents/{eventId}`

Immutable, append-only (spec §13). One per relevant state transition, created in
the same domain-service call that performs the transition.

```jsonc
{
  "eventType": "STEP_CLOSED",
  "stepId": "...",
  "patientId": "LAKSHMI_DEVI",
  "actorUserId": "ANITA",
  "actorRole": "ANM",
  "facilityId": "RAMPUR_SUBCENTRE",
  "provenance": "AT_REFERRED_FACILITY",
  "downgraded": false,
  "timestamp": "...",
  "channel": "WHATSAPP"
}
```

## `cceOutbox/{eventId}`

Outbox pattern (spec §14). `eventId` is a random id; idempotency against duplicate
*delivery* is provided upstream by the webhook's `whatsappMessages/{id}` dedupe
(spec §15) — a retried WhatsApp webhook never re-enters domain logic at all, so it
can never produce a second outbox write for the same transition. A deterministic
`(eventType, stepId)` key was considered and rejected: repeatable transitions on
the same step (reschedule, contact outcome) legitimately need more than one outbox
entry, and a deterministic key would silently overwrite an already-`SENT` record.

```jsonc
{
  "id": "b3f1...-uuid",
  "status": "PENDING",         // "PENDING" | "PROCESSING" | "SENT" | "FAILED"
  "payload": { /* CCE event shape */ },
  "attempts": 0,
  "lastError": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## `whatsappMessages/{whatsappMessageId}`

Keyed by the WhatsApp message id (idempotency key, spec §15). Existence of the
document means the message was already processed; the webhook checks this
transactionally before running any domain operation.

## `config/{deploymentId}` (not yet used in Phases 0–3)

Reserved for deployment-tunable values (reschedule presets, overdue thresholds)
once Phase 5 needs them — not read by anything built in this pass.
