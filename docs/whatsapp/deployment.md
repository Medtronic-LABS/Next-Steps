# Deployment Runbook

Everything below was done by hand once, against a real Meta WhatsApp Business
test number and a real Firebase project, to prove the backend works outside
the emulator. Follow it in order — several steps have non-obvious
dependencies that failed silently the first time through.

⸻

## 1. Firebase project

1. Create a project at console.firebase.google.com. Any name.
2. **Firestore Database** (left sidebar) → **Create database** → Native
   mode, pick a region. Skip this and every `firebase deploy`/CLI command
   against Firestore fails with a `Cloud Firestore API has not been used…`
   403 that looks like a propagation delay but isn't — the database
   literally doesn't exist yet until you do this.
3. **Upgrade to Blaze** (pay-as-you-go): `console.firebase.google.com/project/<id>/usage/details`.
   Required for Cloud Functions v2, Secret Manager, and Cloud Scheduler even
   though this workload stays inside the free tier — Firebase gates the
   *capability*, not actual spend. Needs a card on file.
4. Link this checkout: `firebase use --add <project-id>` from the repo root
   (writes `.firebaserc`).
5. `firebase deploy --only firestore:rules,firestore:indexes`

## 2. Meta app + WhatsApp test number

1. developers.facebook.com → create an app, type **Business**.
2. Add the **WhatsApp** use case → **Step 1: Try it out** → claim a free
   test number. This gives you a **Phone Number ID** and a **WhatsApp
   Business Account (WABA) ID** — both safe to share, not secrets.
3. Under the same page, add your own phone as a recipient (**"To"** field →
   **Manage phone number list**) and verify it via the OTP WhatsApp sends.
   Do this for every phone number you want to test with — it's a per-number
   allowlist. Skipping it produces:
   `(#131030) Recipient phone number not in allowed list` on send.
4. Grab a **temporary access token** from the same page (24h expiry — you'll
   regenerate this more than once).
5. **App Settings → Basic** → copy the **App Secret**.
6. Pick any string yourself for the **verify token** — it's never issued by
   Meta, you invent it and enter it in two places (step 4 below and the
   Firebase secret in step 3).

## 3. Secrets

```bash
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID   # from 2.2
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN      # from 2.4
firebase functions:secrets:set META_APP_SECRET            # from 2.5
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN      # your own string, from 2.6
```

Each prompts interactively — the value never has to be typed into a shell
one-liner or pasted anywhere logged. Requires the Blaze upgrade (step 1.3) to
already be done, or this fails with a "must be on the Blaze plan" error
referencing Secret Manager specifically.

## 4. Deploy

```bash
firebase deploy --only functions
```

First deploy takes longer — it's also enabling `cloudfunctions`,
`cloudbuild`, `artifactregistry`, `cloudscheduler`, `run`, `eventarc`,
`pubsub`, and `secretmanager` APIs on the project. **The scheduled
functions (`overdueAlerts`, `dailySummaries`, `cceOutboxConsumer`)
sometimes fail on first deploy with `Could not create or update Cloud Run
service … internal error` — this is a transient propagation issue right
after those APIs first turn on, not a real failure. Retry just that
function:**

```bash
firebase deploy --only functions:overdueAlerts --force
```

## 5. Seed data

```bash
cd functions
GCLOUD_PROJECT=<project-id> GOOGLE_CLOUD_PROJECT=<project-id> npx tsx src/fixtures/loadFixtures.ts
```

Seeds Anita/Priya/Lakshmi Devi with their **fixture** phone numbers
(`+9198000001xx`) — the bot will not respond to your real number yet. To
test from a real phone, overwrite a seeded user's `phoneNumber` directly:

```bash
node -e "
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp();
getFirestore().collection('users').doc('ANITA').set({
  id: 'ANITA', name: 'Anita', role: 'ANM', facilityId: 'RAMPUR_SUBCENTRE',
  phoneNumber: '+91XXXXXXXXXX', status: 'ACTIVE'
}, { merge: true });
"
```

(Run with `GCLOUD_PROJECT`/`GOOGLE_CLOUD_PROJECT` set to the real project —
omitting them targets whatever default `initializeApp()` resolves to.)

## 6. Webhook configuration

1. `developers.facebook.com/apps/<app-id>/whatsapp-business/wa-settings/`
   → **Callback URL**: the deployed `whatsappWebhook` URL from step 4's
   output (`https://us-central1-<project>.cloudfunctions.net/whatsappWebhook`)
   → **Verify token**: the string from step 2.6 → **Verify and save**.
2. Under **Webhook fields**, find `messages` → **Subscribe**.
3. **This alone is not enough.** The Callback URL is set at the *App*
   level, but a specific WABA must separately be subscribed to receive
   events through it — a step the guided setup wizard does not do for you.
   Symptom: Meta's own "Check test webhooks" debug panel shows your message
   was received, but nothing ever hits the deployed function (`0` requests
   in Cloud Logging). Fix:

   ```bash
   curl -X POST "https://graph.facebook.com/v21.0/<waba-id>/subscribed_apps" \
     -H "Authorization: Bearer <access-token>"
   # -> {"success":true}
   ```

   Verify: `GET` the same URL — the response should list your app under
   `data[]`.

## 7. Publish the app

Real inbound messages — even from a number you've added as a tester — are
**not delivered** to your webhook while the app is unpublished:

> "Apps will only be able to receive test webhooks sent from the app
> dashboard while the app is unpublished. No production data, including
> from app admins, developers or testers, will be delivered unless the app
> has been published."

Publishing (for this basic messaging use case) mainly needs a **Privacy
Policy URL**. This repo hosts a minimal one already:
`hosting/privacy-policy.html` → deploy with `firebase deploy --only
hosting` → gives `https://<project>.web.app/privacy-policy.html`. Paste
that into **App Settings → Basic → Privacy Policy URL** → save → go to the
**Publish** page → **Publish**.

## 8. Verify end-to-end

Send `menu` from a phone number that is both (a) seeded as a user (step 5)
and (b) added as a Meta tester (step 2.3). Check delivery with:

```bash
gcloud logging read 'resource.type="cloud_run_revision" resource.labels.service_name="whatsappwebhook"' \
  --project=<project-id> --limit=20 --freshness=10m
```

A `facebookexternalua` user-agent POST with `status: 200` confirms Meta
reached the function. `firebase functions:log --only whatsappWebhook` is
usually sufficient too, but lags a few minutes behind `gcloud logging read`
for fresh events — prefer the latter when actively debugging.

⸻

## Known gaps

- **`CCE_ENDPOINT_URL` / `CCE_API_KEY`** are not set — `cceOutboxConsumer`
  runs against an in-memory mock. No real CCE system is integrated with
  this MVP yet.
- **Business Verification** (Meta's Step 3) was never done — this stays on
  the free test tier, capped to explicitly-added tester numbers, no real
  production traffic.
- **Access tokens are temporary** (24h). A production deploy needs a System
  User + permanent token, not the "Try it out" flow's temporary one.
