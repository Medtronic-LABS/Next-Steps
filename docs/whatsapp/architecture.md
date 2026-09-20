# Architecture

## Discovery outcome

`docs/whatsapp/spec.md` (`whatsapp.md` in the original hand-off) §21 asks for a
repository-discovery pass before any implementation: inspect the existing
Firebase/PWA prototype, identify what already exists, and avoid duplicating
business logic. This backend was first built in a standalone scratch repo
(`Next-Steps-WhatsApp`) after searching every repo under
`/Users/sunitanadhamuni/Documents/OpenPHC` for the Anita/Priya/Lakshmi Devi,
Rampur Sub-centre/CHC Teonthar domain the spec describes and finding no exact
match:

| Repo | What it is | Why it doesn't match |
| --- | --- | --- |
| This repo, `packages/core` + `apps/admin`/`apps/doctor` | In-memory TS engine for an RSSDI diabetes clinic (admin/doctor PWA) | Different domain (doctor follow-through, not ANM referral); "Priya" is the clinic admin |
| This repo, `cphc-next-steps-prototype/` (this branch) | Static clickable HTML/JS mockup, ANM/CHO Haryana pilot, Firebase Hosting only | No Firestore/Functions backend; "Anita Devi" appears as a *patient*, not staff |
| `Next-steps-for-Maternal` (sibling repo) | Offline-first PWA + Firestore/Functions scaffold for HRP pregnancy follow-through | Closest in shape (REFERRAL steps, ANM/CHC roles, OPEN/DONE lifecycle) but a different clinical program and no matching synthetic identities |

Since none of those matched, the backend was built greenfield in
`Next-Steps-WhatsApp` and then **moved into this repo** on
`feature/whatsapp-channel` (branched from `cphc-next-steps`, the closest domain
match — same ANM/CHO Haryana pilot framing) so it lives with its sibling
prototype rather than as a disconnected repo. It still does not share code or
fixtures with `cphc-next-steps-prototype/` (that folder is a static clickable
mockup with its own Haryana/PHC Bapora synthetic data, this is a real
Firestore/Cloud Functions backend with its own Anita/Priya/Lakshmi Devi
fixtures) — reconciling the two into one synthetic dataset is follow-up work,
not done in this pass.

## Component architecture

```
Meta WhatsApp Cloud API
        |
        v
Firebase HTTPS Function  (functions/src/webhook/whatsappWebhook.ts)
  - GET  /whatsapp/webhook   -> Meta verification challenge
  - POST /whatsapp/webhook   -> inbound messages / button+list replies / status updates
        |
        v
WhatsApp Adapter  (functions/src/adapter/*)
  - senderResolution: phone number -> Firebase user
  - actionTokens: opaque token issue/resolve against conversation state
  - MessageRenderer: domain result -> WhatsApp list/button/template JSON
  - WhatsAppClient: Graph API calls (real) / in-memory recorder (mock, used until
    real Meta credentials exist)
        |
        +----------------------------+
        v                            v
Conversation State             Workflows (functions/src/workflows/*)
(functions/src/conversation)   menu / find-patient / referral / worklist / closure
  short-lived, expiring,             |
  never authoritative                v
                              Domain Services (functions/src/domain/*)
                              UserService, PatientService, CareStepService,
                              WorklistService, ReferralService, ClosureService,
                              RescheduleService, ContactOutcomeService,
                              AuditService, CCEOutboxService
                                     |
                       +-------------+-------------+
                       v             v             v
                   Firestore     Audit events   CCE outbox (PENDING/
                  (careSteps,    (auditEvents)   PROCESSING/SENT/FAILED)
                   patients,                            |
                   users, ...)                          v
                                                  CCE system (Phase 5+,
                                                  outbox consumer not yet built)
```

This follows the spec's own correction in §25: `WhatsApp → Cloud Functions → Domain
Services → Firestore`, never `WhatsApp → Firestore` directly. The `webhook/` and
`adapter/` layers own *only* WhatsApp protocol concerns (§5); every RBAC check,
step-lifecycle rule, provenance/downgrade determination, and CCE event shape lives
in `domain/`, so the same services could later back the PWA or other channels
without change.

## What's deferred to a later pass

- **Phase 4 (Priya)**: expected arrivals, arrival confirmation, one-tap on-site
  closure. Priya and CHC Teonthar exist in the seed data now (referrals need a
  destination facility), but her workflow logic is not implemented yet.
- **Phase 5 (proactive messaging)**: overdue-alert scheduled function, approved
  templates, outbound dispatch/retry tracking.
- **Phase 6 (hardening)**: broader reliability edge cases beyond what Phases 0–3
  already require (idempotency, expiry, stale actions are implemented; duplicate
  webhook delivery and message-status logging get deeper coverage later).
- **Real Meta/WhatsApp Business credentials and a real Firebase project** — nothing
  is deployed. `GraphApiWhatsAppClient` is written but unexercised until secrets
  exist. This repo has no root `.firebaserc` yet (project selection happens via
  `firebase use` locally); one should be added once a target project is chosen.
- **Reconciling with `cphc-next-steps-prototype/`** — see above; that folder's
  synthetic data (Haryana villages, PHC Bapora) and this backend's fixtures
  (Anita/Priya/Lakshmi Devi, Rampur/CHC Teonthar) are not yet the same dataset.
