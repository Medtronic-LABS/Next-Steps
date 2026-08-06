# Next Steps for Maternal Care

> Part of the `next-steps` monorepo, as the `@next-steps/maternal` app under `apps/`.
> This app is currently **self-contained** (its own `package.json`, `vite.config.ts`,
> `firebase.json`, rules and CI kept in this folder) — it is not yet wired into the
> root workspace build scripts or the shared `@next-steps/core` package. Run it from
> this directory (`apps/maternal`) with the commands below.

Offline-first PWA for high-risk-pregnancy follow-through, from sub-centre to
tertiary. Built from `pwa-plan.md`, with the design and behaviour ported verbatim
from the `Next Steps for Maternal Care.html` prototype.

**Coordination data only — no clinical records, ever.**

- Search by phone or ABHA/RCH ID, never by name (BR-101).
- Pregnancy status is a two-value routing label, no clinical detail (NS-12).
- Village is configured; the linked ASHA is resolved from it, never typed (NS-8).
- Alerts mean *a pregnant woman needs attention* — never a score of work (BR-019).

## Stack

React 18 · Vite · TypeScript · Zustand · Dexie (IndexedDB) · `vite-plugin-pwa`
(Workbox) · Firebase (Hosting / Firestore / Auth / Functions / FCM).

## Run it

```bash
npm install
npm run dev            # http://localhost:5173  — runs fully offline, no Firebase needed
npm run build          # tsc -b + vite build → dist/ (service worker + manifest)
npm run preview        # serve the production build
npm run typecheck      # types only
npx tsx scripts/smoke.ts   # runtime smoke test of the domain logic
```

On first run the app seeds the local Dexie store from the prototype's 8 women and
opens at the **launcher** — pick any of the six logins (ANM, PHC / CHC / DH /
Tertiary Staff Nurse, ASHA) to explore. Reads and writes go to IndexedDB first;
every write is also queued in an **outbox** for replay to Firestore on reconnect.
With no `VITE_FIREBASE_CONFIG` set, the app is a complete standalone offline PWA.

## What is verified vs. scaffolded

| Area | State |
|---|---|
| 7 screens, 6 dialogs, full design system | ✅ built & verified (`npm run build`) |
| Offline-first Dexie store + outbox | ✅ built & verified |
| Service worker, manifest, installable icons | ✅ generated in `dist/` |
| Domain logic (worklist, alerts, close, capture) | ✅ verified via `scripts/smoke.ts` |
| `firebase.json`, `firestore.rules`, indexes | 🧩 scaffold — ready to deploy |
| Cloud Functions (4) | 🧩 scaffold — compiles (`functions && npm run build`), not deployed |
| CI (`.github/workflows/deploy.yml`) | 🧩 scaffold |
| Live Firestore/Auth/FCM wiring, real SMS/WhatsApp | ⬜ out of scope for this pass |

## Project structure

```
src/
  styles/tokens.css      Medtronic LABS design system (verbatim)
  domain/                types · constants · logic (pure VMs) · seed
  data/                  db (Dexie) · store (Zustand) · sync (outbox replay)
  firebase/              lazy init · deployment-config loader
  components/            Icon · AppShell · BottomSheet · Dialogs · Toast
  screens/               Launcher · Lookup · Register · Worklist · Alerts · Journey · Capture
functions/src/index.ts   onStepWrite · sweepEscalations · dispatchReminders · buildPmsmaSession
firebase.json · firestore.rules · firestore.indexes.json
scripts/make-icons.mjs   generates public/icons/*.png
```

## Deploy (your Firebase project)

```bash
cp .env.example .env.local          # paste your Firebase web config (or leave unset)
firebase login
firebase use --add                  # select/create next-steps-maternal-stg / -prod

npm run build
cd functions && npm install && npm run build && cd ..
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```

Two environments (`-stg`, `-prod`), each with its own `config/{deploymentId}`
document (villages, ASHA links, `pmsmaDay`, intervals, labels) so field wording
changes without a release. Rollback: `firebase hosting:rollback`.

Auth uses phone OTP with custom claims (`role`, `level`, `facilityId`,
`catchment`); the security rules in `firestore.rules` key off those claims.
