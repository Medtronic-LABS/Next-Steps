# Next Steps for Maternal Care — PWA build & deployment plan

Turning the HTML prototype (`Next Steps for Maternal Care.dc.html`) into an offline-first
progressive web app on Firebase. Testing is out of scope for this plan.

---

## 1 · What we are building

A field app for high-risk-pregnancy follow-through, used by five logins:

| Login | Level | Next-step options |
|---|---|---|
| ANM | Sub-centre | Referral (PHC / CHC / DH / Tertiary), ANC visit (date), PMSMA visit (monthly session) |
| PHC Staff Nurse | PHC | Referral (up + back to sub-centre), Follow-up, Lab, Imaging, Treatment, PMSMA visit |
| CHC Staff Nurse | CHC | same as PHC |
| DH Staff Nurse | District Hospital | same, no PMSMA |
| Tertiary Staff Nurse | Tertiary | same, no PMSMA |

Non-negotiables carried from the prototype:
- Coordination data only — no clinical records, ever.
- Search by phone or ABHA/RCH ID, never by name (BR-101).
- Pregnancy status is a two-value routing label, no reason or danger-sign detail (NS-12).
- Village is a configured list; the linked ASHA is resolved from it and displayed, never typed (NS-8).
- Alerts mean *a pregnant woman needs attention* — never a score of anyone's work (BR-019).

---

## 2 · Stack

| Concern | Choice |
|---|---|
| App | React 18 + Vite + TypeScript |
| Styling | Medtronic LABS design tokens (`tokens/*.css` + `styles.css`) as the single stylesheet source |
| PWA | `vite-plugin-pwa` (Workbox) — precache shell, runtime-cache assets |
| Local store | IndexedDB via Dexie — the app reads and writes locally first |
| Sync | Firestore with `persistentLocalCache` + a Dexie outbox for writes made offline |
| Auth | Firebase Auth — phone OTP for field staff, custom claims for `role` + `facilityId` |
| Backend logic | Cloud Functions (escalation timers, reminder dispatch, referral routing) |
| Push | FCM web push for alerts |
| Reminders | Cloud Functions → WhatsApp Business / DLT-registered SMS provider |
| Hosting | Firebase Hosting (PWA), Firestore + Functions in `asia-south1` |
| CI/CD | GitHub Actions → `firebase deploy` on merge to `main` |

---

## 3 · Data model (Firestore)

```
config/{deploymentId}
  profile: "maternal"
  fields: [...]                  // which registration fields are collected
  villages: [{ name, ashaName, ashaPhone }]
  pmsmaDay: 9
  intervals: { referralStaleDays: 7, notDoneDays: 7, overdueAlertDays: 3 }
  labels: { ... }                // deployment-specific wording

women/{womanId}
  name, phone, abhaId?, village, ashaName
  status: "NORMAL" | "HRP"       // routing label only
  lmp?, edd?                     // recorded at a visit, not at registration
  consentWhatsApp: bool
  homeSubcentreId, createdBy, createdAt

women/{womanId}/steps/{stepId}
  cat: REFERRAL | ANC_VISIT | PMSMA_VISIT | FOLLOW_UP | LAB | IMAGING | TREATMENT
  level: SUBCENTRE | PHC | CHC | DH | TERTIARY
  due?, sentAt?, sessionDate?
  status: OPEN | DONE | CANCELLED
  ownerRole, createdBy, createdAt
  closedAt?, closedBy?, closedSource?   // AT_FACILITY | OTHER_PUBLIC | PRIVATE | CONFIRMED_WITH_HER

alerts/{alertId}
  womanId, stepId, type, level, facilityId, ackBy?, ackAt?, resolvedAt?

reminders/{reminderId}
  womanId, stepId, channel, templateId, scheduledFor, state
```

Indexes: `steps` by `(level, status, due)` and `(ownerRole, status, due)`; `alerts` by `(facilityId, resolvedAt)`.

Security rules: a user reads and writes women in her own catchment chain and steps at her own
level or created by her; `config/*` is read-only to the app; closure fields are append-only.

---

## 4 · Screens (from the prototype)

1. **Login** — phone + OTP, then facility/role confirmation.
2. **Lookup** — phone / ABHA search, QR scan, recently seen, "Register a pregnant woman".
3. **Register** — name, mobile, village (dropdown → linked ASHA shown), ABHA/RCH optional, pregnancy status pair, WhatsApp consent pair. Field set driven by `config.fields`.
4. **Worklist** — grouped Overdue / Due today / Referrals / To be done here / Unreachable / Due soon / Closed today; category and risk filters.
5. **Alerts** — overdue, referral not acted on, still not done, unreachable; Open / Call / Ack.
6. **Journey** — indigo name band, Gestation + EDD card, risk strip, phone + SMS state, open steps, completed history.
7. **Next steps (capture)** — role-specific option grid; referral sheet (up/back levels), ANC date sheet, PMSMA session sheet; staged list; save.
8. **Close step** — where care actually happened, recorded with who and where.

---

## 5 · Offline-first behaviour

- App shell and design-system CSS/fonts precached; the app opens with no network.
- Reads come from Dexie (hydrated from Firestore); UI never blocks on the network.
- Writes go to Dexie plus an outbox, replayed on reconnect; each step carries a client-generated id so replay is idempotent.
- A sync chip in the app bar shows *last synced* time, matching the prototype's header.
- Conflicts: last-write-wins per field, except step closure — the first recorded closure stands.

---

## 6 · Cloud Functions

| Function | Trigger | Job |
|---|---|---|
| `onStepWrite` | Firestore | schedule reminders per `config.intervals`, fan out referral to the target level's worklist |
| `sweepEscalations` | Scheduled, daily | raise overdue / referral-stale / not-done alerts, route to her home sub-centre and linked ASHA |
| `dispatchReminders` | Scheduled, hourly | send due WhatsApp/SMS inside quiet hours (9am–7pm), max 1 per step per day |
| `buildPmsmaSession` | Scheduled, monthly | assemble the PMSMA list for the configured day at each PHC |

---

## 7 · Delivery phases

**Phase 1 — Foundation (week 1)**
Vite + TS scaffold, design tokens wired, Firebase project, Auth with role claims, routing shell, bottom-tab navigation.

**Phase 2 — Core records (week 2)**
Firestore schema and rules, `config` loader, Register screen (config-driven fields, village → ASHA), Lookup with phone/ABHA search.

**Phase 3 — Steps engine (weeks 3–4)**
Journey screen, Next-steps capture with all role option sets, referral/ANC/PMSMA sheets, close-step flow with source capture.

**Phase 4 — Worklist & alerts (week 5)**
Grouped worklist with filters, alerts screen with ack, `onStepWrite` + `sweepEscalations`.

**Phase 5 — Offline & PWA (week 6)**
Dexie store, outbox sync, service worker, install prompt, icons and splash, sync indicator.

**Phase 6 — Reminders (week 7)**
WhatsApp/SMS templates (Hindi + English), quiet hours and rate limits, `dispatchReminders`, FCM push for alerts.

**Phase 7 — Deploy & handover (week 8)**
Staging and production Firebase projects, GitHub Actions deploy, seed configuration for the pilot block, field-ready build.

---

## 8 · Deployment

```bash
# one-time
npm create vite@latest next-steps-maternal -- --template react-ts
firebase login && firebase init hosting firestore functions

# firebase.json — SPA rewrite + no-cache on the service worker
# hosting.public = "dist", rewrites: [{ source: "**", destination: "/index.html" }]

npm run build
firebase deploy --only hosting,firestore:rules,functions
```

Environments: `next-steps-maternal-stg` and `next-steps-maternal-prod`, each with its own
`config/{deploymentId}` document so field labels, villages, ASHA links and intervals change
without a release. Rollback is `firebase hosting:rollback`.

---

## 9 · Out of scope for this plan

Automated tests, clinical data capture, HMIS/RCH portal integration, Android wrapper, and
programme-officer dashboards (MO / DPO views exist in the earlier prototype and can be added later).

