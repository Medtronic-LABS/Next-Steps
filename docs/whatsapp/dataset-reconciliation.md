# Dataset Reconciliation

Tracked as follow-up work since `architecture.md`'s original discovery pass
(spec §21). This is the analysis and the decision, not a code merge — see
"Why not merge" below for why a literal merge doesn't fit.

⸻

## The two datasets

| | `cphc-next-steps-prototype/` | `functions/` (this backend) |
| --- | --- | --- |
| What it is | Static clickable HTML/JS mockup, one file (`public/index.html`) | Real Firestore + Cloud Functions backend |
| Purpose | UX walkthrough for user testing / stakeholder review | Working WhatsApp channel, spec §0–5 |
| Program | RCH/TB/NCD/Mental Health registers, Haryana pilot | ANM referral coordination, Haryana pilot (same province framing, different clinical program) |
| Facility | PHC Bapora, "6 sub-centres · 8 ANMs" | Rampur Sub-centre, CHC Teonthar |
| Named ANM/staff | Neelam Rani (and others, hardcoded in JS) | Anita (ANM), Priya (Staff Nurse) |
| Named patient | **Anita Devi**, age 24, village Dhani Mahu | Lakshmi Devi |
| Data model | None — hardcoded JS objects inline in the HTML, no schema | `functions/src/domain/types.ts` — `User`, `Patient`, `Facility`, `CareStep` |
| Backend | None (static Firebase Hosting only) | Firestore, Cloud Functions, Secret Manager |

## The collision worth flagging

The prototype's patient is named **"Anita Devi"**. This backend's ANM staff
member is named **"Anita"**. They are unrelated people playing unrelated
roles (patient vs. health worker) in two different synthetic datasets that
happen to share a first name and a Haryana-pilot framing. Anyone who has
seen both prototypes could reasonably read "Anita" in a WhatsApp
conversation transcript and think it's the prototype's patient — it isn't.

**Recommendation**: if these two prototypes are ever shown side by side to
the same audience (which seems likely, given they're both framed as the
Haryana ANM/CHO pilot), rename one. Renaming the backend's ANM to avoid
colliding with an existing *patient* name in a sibling demo is lower-risk
than renaming the prototype's patient, since the backend's fixtures are
frozen for golden-conversation tests (`test/golden/fixtures/*.json` assert
against `Anita`'s literal WhatsApp number and message text) — but either
direction requires updating references in multiple places, not a one-line
fix. Not done in this pass; flagging the decision rather than making it
unilaterally.

## Why not merge

A literal merge — one Firestore-backed dataset serving both a static HTML
mockup and a Cloud Functions backend — doesn't fit either system:

- The prototype has **no backend of its own**. Its "data" is JS object
  literals inlined in `public/index.html`, rendered client-side with no
  fetch, no auth, no persistence. Pointing it at this backend's Firestore
  would mean building an entire API layer and auth model for a project
  that was explicitly scoped as "clickable HTML/JS mockup ... Firebase
  Hosting only" (per its own `README_DEPLOY.md` and `architecture.md`'s
  original survey).
- The backend's fixtures are **frozen and asserted against** by name,
  phone number, and exact WhatsApp message text in the golden conversation
  tests. Renaming or restructuring them to match the prototype's Bapora/
  Dhani Mahu identities would require rewriting every fixture file under
  `test/golden/fixtures/`.
- The two systems model **different clinical programs** at different
  granularity — the prototype tracks four register categories (RCH/TB/
  NCD/Mental Health) with patient counts; this backend tracks a single
  `REFERRAL` step kind with a provenance/downgrade lifecycle. Forcing one
  schema to cover both would either lose the backend's lifecycle rules or
  invent register-category concepts the backend's spec never asked for.

## What *is* worth doing later

If a real merge is ever wanted, the lowest-risk path is: give the
prototype a thin backend of its own (not necessarily this one) using this
backend's `domain/types.ts` as a starting schema, rather than retrofitting
either existing artifact to serve the other's purpose.
