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
| One-tap on-site closure (receiving facility) | `ClosureService.closeStep` (called from Priya's workflow) | `careSteps`, `auditEvents`, `cceOutbox` | Built |
| Proactive overdue alert | `AlertService.dispatchOverdueAlerts` + scheduled function (`scheduled/overdueAlerts.ts`) | `careSteps`, `alerts` | Built |
| Expected arrivals / arrival confirmation | `ArrivalService.getExpectedArrivals` / `recordArrival` | `careSteps` (`arrivedAt`/`arrivedByUserId`/`arrivalFacilityId`) | Built |
| Call outcome | `ContactOutcomeService.recordContactOutcome` | `careSteps.contactOutcomes[]`, `auditEvents` | Built |
| Rescheduling (presets) | `RescheduleService.rescheduleStep` | `careSteps.dueDate`, `careSteps.rescheduleHistory[]`, `auditEvents` | Built |
| Audit for every relevant transition | `AuditService.recordAuditEvent` | `auditEvents` | Built |
| CCE event for every relevant transition | `CCEOutboxService.createCCEEvent` | `cceOutbox` | Built (outbox writer only — no consumer/dispatcher yet, that's Phase 5+) |

## Missing backend/domain functionality carried forward

- No real CCE endpoint exists yet — `CCEOutboxService.drainCCEOutbox()` (scheduled
  every 5 min via `scheduled/cceOutboxConsumer.ts`) sends through `CCEClient`
  (`adapter/CCEClient.ts`), which defaults to an in-memory mock until
  `CCE_ENDPOINT_URL`/`CCE_API_KEY` are configured — mirrors the
  `WhatsAppClient` real/mock split. `alerts` documents are separate from
  `cceOutbox` and are written/updated directly by `AlertService`, not via the
  outbox pattern.
- `work_due_today_v1` and `expected_arrivals_summary_v1` templates (spec §16) are
  named but unused — only `care_step_overdue_v1` has a scheduled sender. Today's
  work and expected arrivals remain pull-only (worker opens the menu), not pushed.
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
