# Next Steps

Post-consultation care coordination for independent diabetology (RSSDI) clinics,
built on the **OpenPHC Care Coordination Engine (CCE)**. Implements the Next Steps
MVP PRD v1.0 and follows the approved Medtronic LABS prototype.

Next Steps digitizes exactly one thing: **what should happen after the
consultation.** Right after the doctor sees the patient, the clinic administrator
records the doctor's intended next actions in under a minute. The system then owns
follow-through — it schedules WhatsApp reminders to the patient, drives a
prioritized daily worklist for the administrator, and gives the doctor operational
visibility into what is done, what is outstanding, and which patients risk falling
through the gaps.

Next Steps stores **coordination data only**. It is not an EMR and holds no
diagnoses, notes, prescriptions or billing data (PRD BR-017).

## Apps

Two installable React PWAs. They share no local data — only the CCE (PRD §6.2).

| App | Who | Screens |
| --- | --- | --- |
| **`apps/admin`** | Clinic administrator | Search-before-create · new patient (consent + duplicate) · patient summary · **capture** (5 categories, quick-pick due dates, priority, < 60s) · saved + WhatsApp confirmation · **worklist** (Overdue / Due today / Due soon / Unreachable / Completed) with complete · nudge · call · reschedule · cancel · decline, and an offline/sync chip. |
| **`apps/doctor`** | Doctor (read-only) | **Follow-through** dashboard (patients-needing-attention hero + 5 summary cards) · drill-down lists · patient care timeline · **Insights** (completion rate + trend, by-category, overdue backlog, referral completion, reminder reach). |

## The CCE boundary

`packages/core` is the whole coordination layer, framework-free:

- **`types.ts`** — the PRD data model: `Patient`, `WorkStep` / `CaptureStep`
  (FHIR Task-like next actions), 5 `Category` values, the
  `CREATED → SCHEDULED → COMPLETED / CANCELLED / DECLINED` lifecycle.
- **`engine.ts`** — the `CoordinationEngine` interface. Both apps talk to this
  and nothing else.
- **`inMemoryEngine.ts`** — the fake engine used in this build: an in-memory
  store persisted to `localStorage`, with same-origin live sync. **Swap this one
  class** for a real FHIR / Beckn-backed OpenPHC CCE client and neither app
  changes (PRD §17).
- **`catalog.ts`**, **`seed.ts`**, **`logic.ts`** — category metadata, the
  synthetic Anand Diabetes Care clinic, and the prioritization / worklist /
  insight logic (BR-014).
- **`styles/design.css`** — the Medtronic LABS design tokens (Inter, brand
  `#1E14BE`) and the shared component layer.

## Run it

```bash
npm install          # once, from the repo root (npm workspaces)

npm run dev:admin    # Admin  → http://localhost:5173
npm run dev:doctor   # Doctor → http://localhost:5174
```

Build both: `npm run build`. Typecheck all: `npm run typecheck`.

In the Admin app, tap the **Synced** chip to toggle offline and watch the pending
count grow as you act; work the worklist to complete / cancel / decline steps.

## This build's simplifications (PRD §22.1)

- Real FHIR / Beckn OpenPHC CCE → in-memory `localStorage` engine (same interface).
- Live WhatsApp Business API → DEEPLINK-style modelled reminders shown in the UI.
- Auth / real patient identity → the seeded synthetic clinic.
- Native Android (PRD Appendix A) → React PWAs, per project direction.
