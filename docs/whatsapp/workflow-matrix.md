# Workflow → Service Matrix

Per spec §21.7/§25.10. Since this is a greenfield build, the "existing Firebase
service" column is N/A everywhere — every service listed is new, built in this pass
unless marked otherwise.

| Workflow (spec §1) | Firebase domain service | Firestore data touched | Status |
| --- | --- | --- | --- |
| Role-aware menu | `UserService.resolveUser`, `menuWorkflow` | `users`, `facilities` | Built |
| Find patient / view open steps | `PatientService.searchPatients`, `CareStepService.getOpenSteps` | `patients`, `careSteps` | Built |
| Stage and confirm a referral | `ReferralService.stageStep` / `confirmStep` | `careSteps`, `auditEvents`, `cceOutbox` | Built |
| Today's work / overdue drill-down | `WorklistService.getWorklistSummary` / `getOverdueSteps` | `careSteps` | Built |
| Closure with conditional provenance | `ClosureService.closeStep` | `careSteps`, `auditEvents`, `cceOutbox` | Built |
| One-tap on-site closure (receiving facility) | `ClosureService.closeStep` (called from Priya's workflow) | `careSteps`, `auditEvents`, `cceOutbox` | **Deferred — Phase 4** |
| Proactive overdue alert | `WorklistService.getOverdueSteps` + scheduled function | `careSteps`, new `alerts` collection | **Deferred — Phase 5** |
| Expected arrivals / arrival confirmation | new `ArrivalService.recordArrival` | `careSteps` (`arrivedAt`/`arrivedByUserId`/`arrivalFacilityId`) | **Deferred — Phase 4** |
| Call outcome | `ContactOutcomeService.recordContactOutcome` | `careSteps.contactOutcomes[]`, `auditEvents` | Built |
| Rescheduling (presets) | `RescheduleService.rescheduleStep` | `careSteps.dueDate`, `careSteps.rescheduleHistory[]`, `auditEvents` | Built |
| Audit for every relevant transition | `AuditService.recordAuditEvent` | `auditEvents` | Built |
| CCE event for every relevant transition | `CCEOutboxService.createCCEEvent` | `cceOutbox` | Built (outbox writer only — no consumer/dispatcher yet, that's Phase 5+) |

## Missing backend/domain functionality carried forward

- `ArrivalService` (Phase 4) — arrival is deliberately *not* the same as
  `ClosureService.closeStep`; needs its own event and its own audit/CCE wiring.
- CCE outbox **consumer** (background worker that flips `PENDING -> SENT`) — Phase 5+.
  This pass only writes to the outbox; nothing drains it yet.
- Scheduled overdue-alert function and approved WhatsApp templates — Phase 5.
- Number-to-user enrolment/admin tooling (spec §11) — out of scope for the synthetic
  MVP; the seed script is the only "enrolment" mechanism for now.

## Assumption flagged for review: closure provenance values

Spec §3 says closure offers "four provenance answers" but doesn't name them. This
build uses:

1. `AT_REFERRED_FACILITY` — care was completed at the facility the referral named.
2. `OTHER_FACILITY` — completed, but at a different public facility.
3. `PRIVATE_PROVIDER` — completed with a private provider.
4. `NOT_COMPLETED` — patient was not seen anywhere.

`ClosureService.determineDowngrade()` sets `downgraded = true` for anything other
than `AT_REFERRED_FACILITY`. If the real prototype (once linked) already defines
these differently, this mapping should be reconciled with it rather than kept as
the source of truth.
