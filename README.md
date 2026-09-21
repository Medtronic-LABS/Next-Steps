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

## WhatsApp channel (`feature/whatsapp-channel`, `functions/`)

A separate Firebase Cloud Functions backend under `functions/` implements a
condition-neutral coordination channel over WhatsApp — patient search/create
with dedup, next steps for any programme (referral, ANC, follow-up, review,
...), role-aware menus for ANM / CHC Staff Nurse, proactive alerts, and a
Reset Demo endpoint. It does not share code or fixtures with `packages/core`
or `cphc-next-steps-prototype/` yet. See
[`docs/whatsapp/spec.md`](./docs/whatsapp/spec.md) for the original spec,
[`docs/whatsapp/architecture.md`](./docs/whatsapp/architecture.md) for how it
fits (or doesn't yet) alongside the rest of this repo, and
[`docs/whatsapp/deployment.md`](./docs/whatsapp/deployment.md) for the full
step-by-step Firebase + Meta setup below.

```bash
cd functions
npm install
npm run typecheck
npm test              # unit + golden conversation tests, Firestore emulator
```

The test suite above runs entirely against the Firebase Local Emulator Suite
with a mock WhatsApp client — no external accounts needed. To actually send
and receive on real WhatsApp, you need your own Firebase project and Meta
WhatsApp Business app; nothing in this repo is tied to any specific one.

### Setting up your own Firebase + Meta WhatsApp deployment

Every value below is something **you** create and supply — nothing is
hardcoded in this repo, and none of it should ever be committed.

1. **Firebase project** (yours): create one at console.firebase.google.com,
   enable Firestore (Native mode), upgrade to the Blaze plan (required for
   Cloud Functions v2 / Secret Manager / Cloud Scheduler — usage stays in
   the free tier), then link it locally:
   ```bash
   firebase use --add <your-project-id>   # writes .firebaserc, gitignored per-checkout intent
   ```
2. **Meta developer app + WhatsApp test number** (yours): create at
   developers.facebook.com, add the WhatsApp product, claim a free test
   number. This gives you a Phone Number ID and WABA ID.
3. **Secrets** (yours — never hardcode these anywhere, always via Secret
   Manager):
   ```bash
   firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
   firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN
   firebase functions:secrets:set META_APP_SECRET
   firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN   # any string you invent
   firebase functions:secrets:set RESET_DEMO_TOKEN        # any string you invent
   ```
   Each prompts interactively — the value is never typed into a command
   line or committed to a file. `functions/.env.example` documents every
   variable name (with blank values) for local `functions/.env` dev use;
   copy it, fill in your own values, never commit the copy (it's
   gitignored).
4. **Deploy**: `firebase deploy --only functions`.
5. **Seed + bind your test users**: `functions/src/fixtures/seed.ts` ships
   fixture phone numbers (`+9198000001xx`) that won't match your real
   WhatsApp number — see deployment.md §5 for how to point a seeded user at
   a real number you control.
6. **Webhook config on Meta's side**: Callback URL = your deployed
   `whatsappWebhook` URL, verify token = the string from step 3, subscribe
   to the `messages` field, and — the one non-obvious step — subscribe your
   WABA to the app via the Graph API (`/subscribed_apps`); the guided setup
   wizard doesn't do this for you. Full detail, including the exact
   symptoms of skipping each step, in
   [`docs/whatsapp/deployment.md`](./docs/whatsapp/deployment.md).

Every placeholder above (`<your-project-id>`, phone number IDs, tokens) is
something you generate for your own accounts — this repo's history and
current state contain no live credentials for any deployment.
