# Next Steps: Frontline Care Coordination & WhatsApp Platform

Next Steps is an enterprise frontline care coordination platform designed to close the referral loop on maternal, child, and chronic health coordination across village, sub-centre (Ayushman Arogya Mandir / HWC), primary health centre (PHC), and community/district hospital facilities.

Built on the **[OpenPHC](https://github.com/orgs/openphc/repositories)** infrastructure specifications and integrated with the live **Medtronic LABS Care Coordination Engine (CCE)**, Next Steps provides a unified, closed-loop coordination layer accessible through:

1. 💬 **WhatsApp Hybrid Chatbot**: Dual-mode frontline experience combining zero-install conversational messaging with **Native WhatsApp Flows (v6.0)** for rapid structured clinical forms.
2. 📱 **Next Steps Frontline Mobile Web App**: 4-tab responsive web application (*Lookup*, *Worklist*, *Alerts*, *Insights with AI Copilot*) packaged for Android APK and Mobile Web.
3. 🖥️ **Supervisory Admin & Telemetry Portal**: Web dashboard for facility catchment management, SLA rules, persona assignments, and real-time CCE outbox telemetry.

---

## 🏛️ System Architecture Overview

```
+----------------------------------------------------------------------------------------------------+
|                                    NEXT STEPS CARE COORDINATION                                   |
+----------------------------------------------------------------------------------------------------+
           |                                                                 |
           v                                                                 v
+-----------------------+   Deep-Links (Register / Charts)       +-----------------------+
|  WhatsApp Cloud API   | <====================================> | Frontline Web App     |
| (Meta Graph API v21)  |                                        | (React 18 + TS + Vite)|
|  • Conversational Bot |                                        | • Lookup, Worklist    |
|  • Native In-App Flows|                                        | • Alerts, AI Copilot  |
+-----------------------+                                        +-----------------------+
           |                                                                 |
           | Webhook Events & Flow Payloads                                  | REST / Synchronous
           v                                                                 v
+----------------------------------------------------------------------------------------------------+
|                                   NEXT STEPS BACKEND ENGINE                                        |
|                          (Node.js / Express + TypeScript + SQLite WAL / Postgres)                  |
|                                                                                                    |
| • WhatsApp Workflow Router (Worklist, Arrivals, Prescriptions, Closures, OCR, Demo Resets)         |
| • Native Flow Decryptor & Payload Processor (Registration, Referrals, Closures, ANC Vitals)        |
| • Automated High-Risk Pregnancy (HRP) Triage Rule Engine (BP, Hb, Danger Signs)                    |
| • OpenPHC CloudEvents v1.0 & FHIR R4 Task Generator                                                |
| • Reliable Transactional Outbox Worker (Exponential Backoff, Zero Data Loss Guarantee)             |
| • Keycloak OAuth2 Client Manager (Auto Token Rotation & Caching)                                   |
+----------------------------------------------------------------------------------------------------+
           |                                                                 |
           v                                                                 v
+-----------------------------------+                       +-----------------------------------+
|      Live Keycloak Auth Server    |                       |    Live OpenPHC CCE Gateway       |
| keycloak.cce.mdtlabs.org/realms/cce|                       |   api.cce.mdtlabs.org/v1/events   |
+-----------------------------------+                       +-----------------------------------+
```

---

## 📚 Project Documentation & Architectural Audits

All formal architectural evaluations, compliance blueprints, and product specifications are centrally organized in **[`docs/`](./docs/README.md)**:

| Category | Primary Documents | Key Highlights |
| :--- | :--- | :--- |
| **🛡️ Architectural & Security Audits** | • **[Enterprise Architecture & DPDP/ABDM Audit](./docs/audits/OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md)**<br>• **[CCE Integration Technical Audit](./docs/audits/CCE_ARCHITECTURE_AUDIT.md)**<br>• [Audits Overview & Heatmap](./docs/audits/README.md) | • **DPDP Act, 2023**: 4-Zone Privacy Isolation & Crypto-Shredding<br>• **ABDM**: Milestones 1 (ABHA), 2 (HIP), 3 (HIU Consent Gateway)<br>• **Cloudflare Security Audit**: Zero-Trust Threat Model<br>• 12 Structural Gaps Heatmap & P0–P3 Actionable Roadmap |
| **🏗️ System Architecture & Specs** | • **[Next Steps End-to-End Architecture](./docs/architecture/SYSTEM_ARCHITECTURE.md)**<br>• **[OpenPHC Architecture Specification V1.1](./docs/architecture/OpenPHC_Architecture_Description_V1.1.docx)**<br>• [Architecture Overview & Stack](./docs/architecture/README.md) | • WhatsApp Webhook Router & Per-User FIFO Queuing<br>• Transactional Outbox Pattern (`cce_event_outbox`)<br>• SQLite WAL mode + Keycloak OAuth2 token caching<br>• CloudEvents 1.0 & HL7 FHIR R4 Task specifications |
| **📋 Product Requirements & Personas** | • **[Full Next Steps App PRD v2](./docs/prd/Next_Steps_Full_App_PRD_v2.md)**<br>• **[WhatsApp Frontline Bot PRD](./docs/prd/whatsapp_bot_prd.md)**<br>• **[Personas & Permissions Requirements](./docs/prd/Next-Steps_Personas_Permissions_Admin_v1.docx)**<br>• [PRD Overview & Persona Matrix](./docs/prd/README.md) | • 4-Tab Frontline PWA (`Lookup`, `Worklist`, `Alerts`, `Insights`)<br>• 7-Tier Frontline Persona Matrix (ASHA, ANM, Staff Nurse, MO)<br>• Interactive WhatsApp Button UX (20-char strict constraints)<br>• RAG-powered AI Clinical Insights Copilot |

---

## 1. WhatsApp Hybrid Care Coordination Bot

The WhatsApp Bot provides a zero-install interface for frontline community health workers and facility staff nurses, combining quick conversational menus with **native in-app WhatsApp Flows**.

### 🌟 Native WhatsApp Flows (Flows v6.0)
Instead of answering 8–10 sequential text questions in chat, multi-step actions open as native interactive modal forms right inside WhatsApp:

| Flow Name | Published Flow ID | Screens & Fields | Clinical Purpose |
| :--- | :--- | :--- | :--- |
| **Patient Registration** | `2334490887381968` | **Screen 1 (Demographics)**: Mother's Name, Mobile Number, Village, Age.<br>**Screen 2 (Clinical)**: Last Menstrual Period (LMP), Initial Risk Tier, DPDP Digital Consent Checkbox. | Rapid frontline intake of pregnant mothers with legal consent capture. |
| **Prescribe Referral** | `2170160490199477` | **Screen 1 (Referral Details)**: Care Action Category (High-Risk ANC, Ultrasound, Severe Anemia, Pre-eclampsia), Target Facility Level (PHC, CHC, DH), Urgency Window (1, 3, 7 days), Notes. | Formal care coordination and facility escalation. |
| **Referral Closure Loop** | `2912060949141436` | **Screen 1 (Closure Provenance)**: Where Seen (Referred Facility, Other Govt Hospital, Private Clinic, Not Attended), Clinical Outcome (Resolved, Admitted, Higher Referral), Doctor's Advice. | Closes the loop on open referrals and records provenance of care. |
| **ANC Checklist & Vitals** | `29323505923923750` | **Screen 1 (ANC Vitals)**: Visit Round (ANC 1–4), Systolic BP, Diastolic BP, Weight (kg), Hemoglobin (g/dL), High-Risk Danger Signs Checklist (Headache, Swelling, Bleeding). | Standardized routine visit recording with automatic High-Risk Pregnancy (HRP) triage. |

### ⚡ Key Capabilities
- **Automated High-Risk Pregnancy (HRP) Triage**:
  - Submitting vitals with $\text{BP} \ge 140/90\text{ mmHg}$, $\text{Hb} < 7.0\text{ g/dL}$, or reported danger signs automatically escalates the patient to **High Risk Pregnancy (HRP)** status, creating urgent care steps.
- **Dynamic Bilingual Support (English $\leftrightarrow$ हिंदी)**:
  - Full conversational Hindi with clinical terms preserved. Tap **`🌐 भाषा / English`** or text `language` / `भाषा`.
  - User language preference persists in `users.preferred_lang` across sessions.
- **High-Throughput Multi-User Concurrency**:
  - **Per-User Isolated Queues**: Messages run on independent Promise chains without cross-user blocking.
  - **FIFO Serialization**: Serializes messages from the same sender to prevent rapid double-tap race conditions.
  - **Deduplication & Staleness Filter**: In-memory cache drops duplicate Meta webhook deliveries within a 15-minute TTL.
  - **SQLite WAL Mode**: Operates in Write-Ahead Logging mode (`PRAGMA journal_mode = WAL;`) for concurrent operations.

### 👥 Supported Personas & Role Mappings
When texting `Hi` or `Menu` to the bot, the user is authenticated by phone number:

| Persona | Default Test Number | Facility Catchment | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **ANM (Field Health Worker)** | `+91 98991 14279` | Sub-Centre Ghurehta | • Register Mother (Flow)<br>• Today's Worklist (Due visits)<br>• ANC Checklist & Vitals (Flow)<br>• Prescribe Referral to PHC/CHC (Flow) |
| **PHC Staff Nurse** | `+91 83778 60959` | PHC Sirmaur | • Expected Arrivals (Incoming referrals from ANMs)<br>• Mark Arrived & Care Delivered (Flow)<br>• Refer Higher to CHC/DH<br>• Overdue Referral Tracking |
| **CHC Specialist Nurse** | `+91 98452 78064` | CHC Teonthar | • Secondary Specialist Intake (Ultrasound, Severe Anemia)<br>• Inpatient Care Loop Closure<br>• Tertiary Escalation to Medical College |

*Unregistered numbers receive an automated, DPDP-compliant notice advising them to contact their facility coordinator, preventing unauthorized clinical data access.*

---

## 2. Next Steps Frontline Web & Mobile App (`/mobile-app`)

A responsive, touch-optimized web application utilizing the Medtronic LABS Design System:
- **4-Tab Navigation**:
  - `Lookup`: Quick search by name, phone, or ABHA ID with deep-linked medical records.
  - `Worklist`: Categorized patient lists (*Overdue*, *Due Today*, *Upcoming*) with one-tap status toggles.
  - `Alerts`: Escalated overdue referrals and high-risk pregnancy notifications.
  - `Insights`: Real-time catchment metrics, care cascade funnel analytics, and an **AI RAG Copilot**.
- **AI Insights Copilot**:
  - Contextual responses scoped strictly to the health worker's facility and service catchment.
  - Pre-curated prompts (*"Show HRP dropouts"*, *"ANC visit completion rate"*, *"Top overdue villages"*).
- **Multi-Service Switching**: Maternal Health (ANC/PNC), Child Health (Immunization/HBNC), and Chronic Disease (NCD Hypertension/Diabetes).

---

## 3. Supervisory Admin & Telemetry Portal (`/admin-panel`)

A web-based administration cockpit:
- **Live CCE Cockpit**: Real-time Keycloak token status, CCE API latency, and live outbox event feeds.
- **Role & Access Management**: 7 role tiers (ASHA, ANM, Staff Nurse, MO, Specialist, Care Coordinator, Nodal).
- **Catchment Hierarchy**: Blocks, PHCs, Sub-centres, and village mapping with CSV onboarding.
- **Care Cascade Analytics**: Visual funnel analysis tracking referral drop-offs across tiers.

---

## 4. OpenPHC CCE Integration Specifications

All care steps, registrations, and referral closures automatically generate **CloudEvents v1.0** payloads wrapping **FHIR R4 `Task`** resources:

```json
{
  "specversion": "1.0",
  "id": "evt_1788637758027_k9a2",
  "source": "org.openphc.nextsteps.subcentre",
  "type": "org.openphc.task.created",
  "subject": "Patient/pw_01",
  "datacontenttype": "application/json",
  "time": "2026-10-16T18:00:00.000Z",
  "facilityid": "FAC-SC-GHU",
  "protocolinstanceid": "proto_pw_01",
  "protocoldefinitionid": "cce-maternal-v1",
  "actionid": "referral",
  "data": {
    "resourceType": "Task",
    "id": "step_1788637758027_8dhd",
    "status": "requested",
    "intent": "order",
    "priority": "routine",
    "code": {
      "coding": [
        {
          "system": "http://openphc.org/fhir/CodeSystem/task-category",
          "code": "phc-referral",
          "display": "PHC Referral"
        }
      ]
    },
    "for": {
      "reference": "Patient/pw_01",
      "display": "Sunita Devi"
    }
  }
}
```

### Live CCE Authentication & Endpoints
- **Keycloak Token Endpoint**: `https://keycloak.cce.mdtlabs.org/realms/cce/protocol/openid-connect/token`
- **CCE Collector Ingestion Endpoint**: `POST https://api.cce.mdtlabs.org/v1/events`
- **Client ID**: `nextstep-emitter`

---

## 5. Directory Structure

```
next-steps/
├── backend/                  # Express + TypeScript backend service
│   ├── src/
│   │   ├── whatsapp/         # WhatsApp bot router, webhook, & workflows
│   │   │   ├── webhook.ts    # Meta verification & incoming message handler
│   │   │   ├── router.ts     # Session state, keyword dispatch, & Flow handlers
│   │   │   ├── client.ts     # WhatsApp Cloud API HTTP client
│   │   │   ├── senderResolution.ts # Phone-to-role authentication engine
│   │   │   └── workflows/    # Worklist, referral, arrival, closure, registration
│   │   ├── cce/              # CloudEvents & FHIR R4 transformer, outbox worker
│   │   ├── db/               # SQLite / Postgres database schemas & migrations
│   │   └── routes/           # REST APIs for sync, telemetry, and admin
│   └── package.json
├── mobile-app/               # Frontline Responsive Web App (4-tab interface)
│   ├── src/
│   │   ├── App.tsx           # Main application coordinator & RAG Copilot
│   │   ├── data/             # State machine, tokens, & HTML template
│   │   └── components/       # UI subcomponents
│   └── package.json
├── admin-panel/              # Supervisory desktop portal
│   ├── src/
│   └── package.json
├── scripts/                  # Meta WhatsApp Flow publishing automation
│   ├── publish_all_flows.mjs # Build & publish flows to WhatsApp Business API
│   └── publish_to_new_waba.mjs # Multi-WABA provisioning script
├── deploy/                   # EC2 and production deployment artifacts
│   ├── nginx.conf            # HTTP Nginx reverse proxy configuration
│   ├── nginx-ssl.conf        # Production SSL reverse proxy configuration
│   ├── setup-ec2.sh          # Server provisioner
│   └── create_deployment_zip.py # Automated packaging utility for EC2 bundles
└── docker-compose.yml        # Container orchestration
```

---

## 6. Getting Started Locally

### Prerequisites
- Node.js 18+ and npm
- (Optional) Meta WhatsApp Business Cloud API App credentials

### 1. Environment Configuration
Create or update `backend/.env`:
```env
PORT=4000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://nextsteps_user:nextsteps_secure_password_123@localhost:5432/nextsteps_db
SQLITE_DB_PATH=./data/nextsteps.db

# Meta WhatsApp Cloud API Configuration
WHATSAPP_PHONE_NUMBER_ID=1310073435531536
WHATSAPP_ACCESS_TOKEN=EAAX1g...
WHATSAPP_VERIFY_TOKEN=nextsteps_verify_token_2026
NEXTSTEPS_APP_BASE_URL=https://nextsteps-admin.mdtlabs.org

# Testing User Phone Numbers (Recognized automatically by role)
TEST_ANM_PHONE=+91XXXXXXXXXX
TEST_PHC_PHONE=+91XXXXXXXXXX
TEST_CHC_PHONE=+91XXXXXXXXXX

# Meta WhatsApp Flow IDs (Published natively on Meta Graph API)
FLOW_ID_REGISTRATION=2334490887381968
FLOW_ID_REFERRAL=2170160490199477
FLOW_ID_CLOSURE=2912060949141436
FLOW_ID_ANC=29323505923923750

# OpenPHC CCE Integration
CCE_KEYCLOAK_TOKEN_URL=https://keycloak.cce.mdtlabs.org/realms/cce/protocol/openid-connect/token
CCE_CLIENT_ID=nextstep-emitter
CCE_CLIENT_SECRET=ZsFq...
CCE_GATEWAY_URL=https://api.cce.mdtlabs.org/v1/events
CCE_SOURCE_SYSTEM=nextsteps/rewa-district
```

### 2. Start the Backend Service
```bash
cd backend
npm install
npm run build
npm run dev
```
Backend runs at `http://localhost:4000`.

### 3. Start the Frontline Web App
```bash
cd mobile-app
npm install
npm run dev
```
Frontline app runs at `http://localhost:3000`.

### 4. Start the Admin Panel
```bash
cd admin-panel
npm install
npm run dev
```
Admin portal runs at `http://localhost:5174`.

---

## 7. Meta WhatsApp Flow Publishing Automation

Next Steps includes programmatic CLI scripts to create, upload JSON assets, and publish WhatsApp Flows directly via Meta Graph API v21.0:

```bash
# Publish all 4 flows to the target WhatsApp Business Account (WABA)
node scripts/publish_to_new_waba.mjs
```

This script:
1. Validates JSON schemas against Meta Flow JSON specification v6.0.
2. Posts flow definitions to `https://graph.facebook.com/v21.0/{WABA_ID}/flows`.
3. Uploads `flow.json` as a `FLOW_JSON` multipart asset to `/{FLOW_ID}/assets`.
4. Triggers `/{FLOW_ID}/publish` and outputs the resulting IDs for `.env`.

---

## 8. Deployment to AWS EC2 (`13.232.251.63`)

Next Steps is deployed to AWS EC2 alongside existing platform services using Nginx and PM2:

### Live Production Endpoints
* 📱 **Frontline Mobile Web App:** `https://nextsteps-admin.mdtlabs.org/app/`
* 🖥️ **District Admin Portal:** `https://nextsteps-admin.mdtlabs.org/`
* 📲 **Android APK Download:** `https://nextsteps-admin.mdtlabs.org/apk`
* 💬 **WhatsApp Webhook:** `https://nextsteps-api.mdtlabs.org/api/whatsapp/webhook`
* 📡 **Backend Health:** `https://nextsteps-api.mdtlabs.org/health`

### Automated Build & Deployment Steps

From your local machine:
```powershell
# 1. Package the production deployment bundle
python deploy/create_deployment_zip.py

# 2. Copy the bundle to the EC2 server
scp deploy/next_steps_ec2_deployment.zip ubuntu@13.232.251.63:/home/ubuntu/

# 3. Deploy and restart services via SSH
ssh ubuntu@13.232.251.63 "unzip -o /home/ubuntu/next_steps_ec2_deployment.zip -d /home/ubuntu/deployment && cd /home/ubuntu/deployment && chmod +x deploy.sh && ./deploy.sh"
```

The `deploy.sh` script automatically:
* Copies production bundles to `/var/www/next-steps/`.
* Installs dependencies (`npm install --omit=dev`).
* Reloads the PM2 process manager (`pm2 start ecosystem.config.cjs`).
* Validates and reloads Nginx virtual hosts.
* Verifies local health at `http://127.0.0.1:4000/health`.

---

## 📄 License

MIT © Medtronic LABS
