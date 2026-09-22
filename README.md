# Next Steps: Frontline Care Coordination & WhatsApp Platform

Next Steps is an enterprise care coordination platform designed to close the loop on frontline maternal, child, and chronic health coordination across village, sub-centre (HWC), primary health centre (PHC), and community/district hospital facilities.

Built on the **[OpenPHC](https://github.com/orgs/openphc/repositories)** infrastructure specifications and integrated with the live **Medtronic LABS Care Coordination Engine (CCE)**, Next Steps provides a unified coordination layer accessible through:
1. **WhatsApp Care Coordination Bot**: Zero-install frontline chatbot for ASHAs, ANMs, and PHC/CHC Nurses with interactive lists and quick action buttons.
2. **Next Steps Frontline Web & Mobile App**: 4-tab responsive web application (Lookup, Worklist, Alerts, Insights with AI Copilot) packaged for Android and Mobile Web.
3. **Supervisory Admin & Telemetry Portal**: Web dashboard for facility management, SLA rules, persona assignments, and CCE outbox telemetry.

---

## Architecture Overview

```
+----------------------------------------------------------------------------------------------------+
|                                    NEXT STEPS CARE COORDINATION                                   |
+----------------------------------------------------------------------------------------------------+
           |                                                                 |
           v                                                                 v
+-----------------------+   Deep-Links (Register / Charts)       +-----------------------+
|  WhatsApp Cloud API   | <====================================> | Frontline Web App     |
|  (Meta Graph API v21) |                                        | (React 18 + TS + Vite)|
+-----------------------+                                        +-----------------------+
           |                                                                 |
           | Webhook & Interactive Action Buttons                            | REST / Synchronous
           v                                                                 v
+----------------------------------------------------------------------------------------------------+
|                                   NEXT STEPS BACKEND ENGINE                                        |
|                          (Node.js / Express + TypeScript + SQLite / Postgres)                      |
|                                                                                                    |
| • WhatsApp Workflow Router (Worklist, Arrivals, Prescriptions, Closures, OCR, Demo Resets)         |
| • OpenPHC CloudEvents v1.0 & FHIR R4 Task Generator                                                |
| • Reliable Outbox Worker (Exponential Backoff, In-Memory/DB Persistence)                           |
| • Keycloak OAuth2 Client Manager (Auto Token Rotation)                                             |
+----------------------------------------------------------------------------------------------------+
           |                                                                 |
           v                                                                 v
+-----------------------------------+                       +-----------------------------------+
|      Live Keycloak Auth Server    |                       |    Live OpenPHC CCE Gateway       |
| keycloak.cce.mdtlabs.org/realms/cce|                       |   api.cce.mdtlabs.org/v1/events   |
+-----------------------------------+                       +-----------------------------------+
```

---

## 1. WhatsApp Care Coordination Bot

The WhatsApp Bot provides an accessible, zero-install interface for frontline community health workers and facility nurses.

### Key Capabilities
- **Worklist Management (`Worklist`)**: Instant access to overdue and due-today patient visits tailored to the worker's facility catchment.
- **30-Second Care Step Prescription**:
  - Referrals to Primary Health Centres (PHC), Community Health Centres (CHC), and District Hospitals (DH).
  - Antenatal Care (ANC) checkups (`+2w`, `+4w`, or custom dates).
  - Diagnostic orders (Ultrasound USG, Hemoglobin, Urine Albumin).
  - Postnatal (PNC) and Home-Based Newborn Care (HBNC) protocols.
- **Inbound Expected Arrivals**:
  - Staff nurses at PHC and CHC receive real-time notifications of incoming referrals from sub-centres.
  - One-tap arrival confirmation (`✅ Confirm Arrived`).
- **Care Step Closure**: Select specific open steps and record outcomes (Completed, Escalated, Cancelled) with immediate worklist updates.
- **Secure Web App Deep-Links**:
  - 🔒 *Patient Registration Form*: Opens the responsive registration view with pre-selected catchment without requiring user login.
  - 👤 *Medical Chart Link*: Direct deep-link to the patient's longitudinal care timeline.
- **Privacy-First & Clean Messaging**: Frontline workers see clear, human-readable medical coordination messages; technical CCE database outbox sync occurs silently in the background.

### Supported Personas & Commands
| Role | Facility Level | Core Workflows | Quick Commands |
| :--- | :--- | :--- | :--- |
| **ANM / CHO** | Sub-centre / HWC | Patient Intake, Worklist, Prescribe Next Steps, OCR Import | `menu`, `worklist`, `alerts`, `register`, `ocr` |
| **Staff Nurse** | PHC (Sirmour) | Expected Arrivals, Inbound Referrals, Worklist, Doctor Consult | `arrivals`, `worklist`, `alerts`, `menu` |
| **Staff Nurse** | CHC (Teonthar) | High-Risk Specialist Arrivals, Ultrasound Intake, Secondary Worklist | `arrivals`, `worklist`, `menu` |

---

## 2. Next Steps Frontline Web & Mobile App (`/mobile-app`)

A responsive, touch-optimized web application using the Medtronic LABS Design System:
- **4-Tab Navigation**:
  - `Lookup`: Quick search by name, phone, or ABHA/RCH ID, with instant deep-linking.
  - `Worklist`: Categorized patient lists (Overdue, Due Today, Upcoming) with one-tap status actions.
  - `Alerts`: Escalated overdue referrals and high-risk pregnancy notifications.
  - `Insights`: Real-time catchment metrics, care cascade charts, and an **AI RAG Copilot**.
- **AI Insights Copilot**:
  - Role-specific contextual answering (scoped strictly to the worker's facility and service).
  - Markdown-rendered responses with clean tables and bullet points.
  - One-tap question bubbles (e.g., *"Show HRP dropouts"*, *"ANC visit completion rate"*, *"Top overdue villages"*).
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

All care steps and encounter closures automatically generate **CloudEvents v1.0** payloads wrapping **FHIR R4 `Task`** resources:

```json
{
  "specversion": "1.0",
  "id": "evt_1788637758027_k9a2",
  "source": "org.openphc.nextsteps.subcentre",
  "type": "org.openphc.task.created",
  "subject": "Patient/pw_01",
  "datacontenttype": "application/json",
  "time": "2026-09-22T18:00:00.000Z",
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

---

## Directory Structure

```
next-steps/
├── backend/                  # Express + TypeScript backend service
│   ├── src/
│   │   ├── whatsapp/         # WhatsApp bot router, webhook, & workflows
│   │   │   ├── webhook.ts    # Meta verification & incoming message handler
│   │   │   ├── router.ts     # Session state & keyword dispatch
│   │   │   ├── client.ts     # WhatsApp Cloud API HTTP client
│   │   │   └── workflows/    # Worklist, referral, arrival, closure, OCR workflows
│   │   ├── cce/              # CloudEvents & FHIR R4 transformer, outbox worker
│   │   ├── db/               # SQLite database schemas and migrations
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
├── deploy/                   # EC2 and production deployment artifacts
│   ├── nginx.conf            # Reverse proxy config (Admin, Mobile Web, Backend)
│   ├── setup-ec2.sh          # Server provisioner
│   └── create_deployment_zip.py # Packaging utility for EC2 bundles
└── docker-compose.yml        # Container orchestration
```

---

## Getting Started Locally

### Prerequisites
- Node.js 18+ and npm
- (Optional) Meta WhatsApp Business Cloud API App credentials

### 1. Environment Configuration
Create or update `backend/.env`:
```env
PORT=4000
NODE_ENV=development

# WhatsApp Cloud API
WHATSAPP_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=108...
WHATSAPP_VERIFY_TOKEN=nextsteps_webhook_verify_2026

# Public App Base URL (Used for WhatsApp deep-links)
FRONTEND_URL=http://localhost:3000

# OpenPHC CCE Integration
CCE_KEYCLOAK_URL=https://keycloak.cce.mdtlabs.org/realms/cce/protocol/openid-connect/token
CCE_CLIENT_ID=nextstep-emitter
CCE_CLIENT_SECRET=ZsFq...
CCE_GATEWAY_URL=https://api.cce.mdtlabs.org/v1/events
```

### 2. Start the Backend Service
```bash
cd backend
npm install
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

## WhatsApp Bot Setup & Testing

### 1. Webhook Verification
In your Meta App Dashboard under WhatsApp > Configuration:
- **Callback URL**: `https://<YOUR_DOMAIN>/api/whatsapp/webhook`
- **Verify Token**: Match the value in `WHATSAPP_VERIFY_TOKEN` (e.g. `nextsteps_webhook_verify_2026`)
- **Webhook Fields**: Subscribe to `messages`.

### 2. Testing Bot Interactions
Send a WhatsApp message from a registered test phone:
- Type **`menu`** to view your persona dashboard.
- Tap **`Worklist`** to inspect pending patients.
- Type **`role anm`**, **`role phc`**, or **`role chc`** to switch between frontline personas.
- Type **`demo reset`** to restore the initial test scenario.

---

## Deployment to AWS EC2

Next Steps is configured to run alongside existing services on AWS EC2 (`13.232.251.63`) using Nginx:
- **Admin Panel**: `https://nextsteps-admin.mdtlabs.org`
- **Mobile Web App**: `https://nextsteps-admin.mdtlabs.org/app/`
- **Backend API & Webhooks**: `https://nextsteps-admin.mdtlabs.org/api/`

To package and upload updates:
```bash
# 1. Build and package the bundle
python deploy/create_deployment_zip.py

# 2. Upload to EC2
scp deploy/next_steps_ec2_deployment.zip ubuntu@13.232.251.63:/home/ubuntu/

# 3. Extract and restart on EC2
ssh ubuntu@13.232.251.63
sudo unzip -o /home/ubuntu/next_steps_ec2_deployment.zip -d /var/www/next-steps
sudo systemctl restart nextsteps-backend
```

---

## License

MIT © Medtronic LABS
