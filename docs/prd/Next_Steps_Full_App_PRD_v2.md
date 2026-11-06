# Next Steps: Full Application Suite (v2.0)
## Product Requirements Document (PRD)

---

## 1. Executive Summary & Document Control

| Property | Specification |
| :--- | :--- |
| **Product Name** | **Next Steps** (Frontline Care Coordination Suite) |
| **Version** | **v2.0 — Latest Production Implementation** |
| **Platform Scope** | Frontline Mobile PWA & Android APK, Web Admin Portal, Express/SQLite Backend, OpenPHC CCE Ingestion Engine |
| **Domain** | Public Health Continuum of Care (Maternal, Newborn, NCDs, Cancer) |
| **Target Geography** | Rural and Semi-Urban Public Health Systems (Madhya Pradesh Pilot Reference: Rewa District, Teonthar Block) |
| **Infrastructure Standard** | **[OpenPHC](https://github.com/orgs/openphc)** Infrastructure Protocols (CloudEvents v1.0, FHIR R4 Task) |
| **Primary Repository** | `Medtronic-LABS/Next-Steps` (Monorepo) |

> [!NOTE]
> **Core Philosophy**: **Care Coordination in < 30 Seconds.** Next Steps is not a diagnostic tool, Electronic Health Record (EHR), or clinical charting system. Per Requirement **BR-017**, it strictly captures actionable next steps metadata: *Who, Where, When, What Step, and Risk Tier*, closing the referral feedback loop across all healthcare tiers.

---

## 2. Problem Statement & System Objectives

In decentralized public health systems, referral adherence and care continuity collapse between village communities and secondary/tertiary facilities. In maternal healthcare:
1. **The Drop-off Void**: Up to 45% of pregnant women flagged for high-risk evaluations (e.g., severe anaemia, pre-eclampsia, ultrasound needs) fail to reach referral facilities.
2. **Paper-Slip Blindness**: Referrals issued on paper slips give community workers (**ASHAs**) and village clinic nurses (**ANMs**) zero visibility into whether the patient reached the Community Health Centre (CHC) or District Hospital (DH).
3. **Data Entry Fatigue**: Frontline health workers are burdened with duplicative, heavy clinical charting in national portals, resulting in delayed care documentation.

### Core Objectives
- **Zero-Friction Staging**: Stage follow-ups, diagnostic appointments, and specialist referrals in **under 30 seconds**.
- **Bi-Directional Closed Loop**: When a referral is completed at a CHC or District Hospital, the closure status and clinical provenance immediately reflect back on the frontline worker's device.
- **Offline-First Durability**: Enable continuous field operation without mobile network access; automatically synchronize and enqueue events upon reconnection.
- **Standards-Based Interoperability**: Emit transactional **CloudEvents v1.0** containing **FHIR R4 Task** resources into the **OpenPHC Care Coordination Engine (CCE)**.

---

## 3. High-Level Architecture & Topology

The Next Steps suite is structured as a coordinated monorepo comprising three active application tiers and a native mobile wrapper:

```
+----------------------------------------------------------------------------------------+
|                                CLIENT TIER (FRONTLINE & ADMIN)                          |
+-------------------------------------------------------+--------------------------------+
|   Frontline Field PWA (React 18 + Vite + TS)          |   Supervisory Web Admin Portal  |
|   `-- Wrapped in Native Android APK (Capacitor 8)     |   (React 18 + Vite Web Desktop) |
+---------------------------+---------------------------+----------------+---------------+
                            | Sync Push / Pull                           | HTTPS Web App
                            v                                            v
+----------------------------------------------------------------------------------------+
|                        EDGE / EC2 APPLICATION HOST (13.232.251.63)                     |
|   Nginx Reverse Proxy + TLS (nextsteps-admin.mdtlabs.org & nextsteps-api.mdtlabs.org)  |
+-------------------------------+--------------------------------------------------------+
|   Static Web Locations:       |   Backend API Reverse Proxy (/api/ -> port 4000):      |
|   * /     -> Admin Portal     |   +--------------------------------------------------+ |
|   * /app/ -> Frontline PWA    |   |  Express + TypeScript Backend Server             | |
|   * /apk  -> Android APK      |   +--------------------------------------------------+ |
|                               |   |  * Universal SQLite Store (WAL Mode)             | |
|                               |   |  * Transactional CCE Outbox Queue (cce_outbox)   | |
|                               |   |  * CCE Outbox Background Dispatcher Daemon       | |
|                               |   +---------------------------+----------------------+ |
+-------------------------------+-------------------------------+------------------------+
                                                                | Keycloak OAuth2 + CloudEvents
                                                                v
+----------------------------------------------------------------------------------------+
|                             OPENPHC CLOUD ECOSYSTEM                                    |
|   * Keycloak Auth Server (OAuth2 Client Credentials -> JWT Bearer Tokens)              |
|   * OpenPHC CCE Ingestion Gateway (POST https://api.cce.mdtlabs.org/v1/events)         |
+----------------------------------------------------------------------------------------+
```

---

## 4. Clinical Personas & 9-Tier Public Health Hierarchy (RBAC)

The application models the exact Indian public healthcare delivery hierarchy across 9 distinct roles, each equipped with role-specific workflows and clinical guardrails.

```
      [ LEVEL 5: DISTRICT HOSPITAL / TERTIARY ]
      * DH Staff Nurse (Inpatient triage, tertiary admissions, C-sections)
      * District Programme Officer / DPO (District-wide analytics & governance)
                         ^
                         | Escalations & Upward Tertiary Referrals
                         |
      [ LEVEL 4: FIRST REFERRAL UNIT / CHC (COMMUNITY HEALTH CENTRE) ]
      * CHC Staff Nurse (FRU admission, on-site resolution, referral triage)
      * CHC Medical Officer (Specialist care, surgical evaluation)
                         ^
                         | Upward Referrals & Specialist Diagnostics
                         |
      [ LEVEL 3: PRIMARY HEALTH CENTRE (PHC) ]
      * PHC Staff Nurse (Outpatient care, routine facility delivery)
      * PHC Medical Officer (Catchment supervision, block cascade insights)
                         ^
                         | Primary Referrals & Escalations
                         |
      [ LEVEL 2: AYUSHMAN AROGYA MANDIR / SUB-CENTRE ]
      * AAM ANM (Auxiliary Nurse Midwife - Primary frontline step prescriber)
      * MPW-M (Multi-Purpose Worker Male - Field tracking & NCD follow-up)
      * CHO (Community Health Officer - Clinical mid-level lead)
                         ^
                         | Community Case Identification & Outreach
                         |
      [ LEVEL 1: VILLAGE COMMUNITY ROSTER ]
      * ASHA Samta (Accredited Social Health Activist)
        - ANC: Close-only guardrail (provenance recording, non-contact)
        - PNC: HBNC visit scheduling & neonatal danger sign referrals
```

### Detailed Role-Permission Matrix

| Level | Persona Key | Facility / Tier | Step Creation | Step Closure | Worklist Scope | Primary Governance |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **Community** | `asha` (ASHA Samta) | Village Gharonda | ❌ ANC (Close-Only)<br/>✅ PNC (HBNC visits) | Community follow-up, non-contact | Village roster | Verifies home visits; records attendance provenance |
| **Sub-centre** | `anm` (AAM ANM) | Sub-centre Ghurehta | ✅ Full (ANC, PMSMA, Ref, Lab) | ✅ On-site & Community | Facility & Catchment | Primary frontline prescriber |
| **Sub-centre** | `mpw_m` (MPW-M) | Sub-centre Ghurehta | ✅ Follow-up, Ref | ✅ On-site & Field | Facility & Catchment | Field tracking, immunisation, NCD follow-up |
| **HWC / AAM** | `cho` (CHO) | AAM Ghurehta | ✅ Full Clinical Steps | ✅ On-site & Catchment | Catchment-wide | Mid-level clinical evaluations |
| **Primary** | `phc_sn` (PHC Staff Nurse) | PHC Sirmour | ✅ Facility Steps | ✅ Delivered on-site | Facility | Outpatient clinic delivery, triage |
| **Primary** | `phc_mo` (PHC Medical Officer) | PHC Sirmour | ✅ Facility Steps | ✅ Supervisory View | Facility **or** Catchment | Block doctor; monitors drop-outs and cascade |
| **Secondary** | `chc_sn` (CHC Staff Nurse) | CHC Teonthar | ✅ FRU Inpatient/Outpatient | ✅ Delivered on-site | Facility (Inbound referrals) | Direct referral intake and closure |
| **Secondary** | `chc_mo` (CHC Medical Officer) | CHC Teonthar | ✅ FRU Specialist Steps | ✅ Delivered on-site | Facility & Catchment | Specialist management, high-risk triage |
| **Tertiary** | `dh_sn` (DH Staff Nurse) | District Hospital Rewa | ✅ Tertiary Diagnostics | ✅ Delivered on-site | Facility (Tertiary queue) | Inpatient evaluation, C-section / NICU intake |
| **District** | `dpo` (District Officer) | District Hospital Rewa | ❌ (Administrative) | ❌ (Supervisory) | District-wide | Administrative indicators and performance analytics |

> [!IMPORTANT]
> **Clinical Guardrail — ASHA Close-Only in ANC**: Under National Health Mission (NHM) and SUMAN guidelines, ASHAs are not licensed to order lab diagnostics or clinical referrals during pregnancy. The application strictly hides "Enter Next Steps" for ASHAs in the ANC module and displays: *"New next steps are added by the ANM or facility staff."* In PNC, ASHAs are explicitly authorized to schedule Home-Based Newborn Care (HBNC) visits and refer sick neonates.

---

## 5. Clinical Program Registers & Workflows

Next Steps organizes maternal, child, and adult chronic healthcare into four core program registers:

### 5.1. Antenatal Care (ANC)
- **Cohort**: Pregnant women from pregnancy confirmation to delivery.
- **Risk Stratification**: Binary routing priority — **`NORMAL`** vs **`HRP`** (High Risk Pregnancy).
- **Core Staged Steps**:
  1. **ANC Routine Contact**: Pre-calculated intervals (`+2w`, `+4w`, or manual picker).
  2. **PMSMA Visit**: Automatically scheduled for the **9th of the following month** under the Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA) specialist drive.
  3. **Diagnostic Orders**: Basic ANC Lab Battery (Hb, Urine Albumin, Blood Group) and Obstetric Ultrasound (USG).
  4. **Referrals**: Staged to PHC, CHC (FRU), or District Hospital (DH Rewa).

### 5.2. Postnatal Care & Newborn (PNC)
- **Cohort**: Postpartum mothers and newborns through Day 42.
- **Risk Stratification**: High-risk mother (`MOTHER`) vs High-risk neonate (`NEWBORN`).
- **Core Staged Steps**:
  1. **HBNC Routine Schedule**: Automated batch generator for institutional (Days 3, 7, 14, 21, 28, 42) or home births (Day 1 included).
  2. **Newborn Danger Signs Referral**: Urgent referral for hypothermia, respiratory distress, or severe jaundice to SNCU/MNCU at CHC/DH.

### 5.3. Non-Communicable Diseases (NCDs)
- **Cohort**: Adults screened or diagnosed with Hypertension (`HTN`) and Diabetes (`DM`).
- **Core Staged Steps**:
  1. **Medication Refill Tracking**: Follow-up date scheduled for 30-day antihypertensive/antidiabetic dispensing.
  2. **Bi-Monthly Complication Check**: Evaluation at PHC/CHC for target organ damage.

### 5.4. Cancer Screening
- **Cohort**: Adults evaluated for Oral, Breast, and Cervical precancerous lesions.
- **Core Staged Steps**:
  1. **Secondary Diagnostic Imaging / Biopsy**: Staged at District Hospital.
  2. **Treatment Adherence Follow-up**: Post-referral confirmation within 14 days.

---

## 6. Clinical Provenance & Referral Resolution Engine

A critical failure of traditional health IT is recording *that* an event closed without recording *where* it occurred. Next Steps features an intelligent provenance capture engine:

```
[ Step Resolution Initiated ]
            |
            v
{ Is User at Target Facility Tier? }
     |                              |
    YES                             NO (Community or Lower Facility)
     |                              |
     v                              v
[ "Care was delivered here on-site" ]   [ Ask Mandatory Provenance: "Where did care happen?" ]
     |                                           |
     |                           +---------------+---------------+----------------+
     |                           v               v               v                v
     |                     [At recommended  [At another     [At private     [Delivered here on-site
     |                        facility]     public facility]  provider]      (Below referred level)]
     |                           |               |               |                |
     |                           |               |               |                v
     |                           |               |               |         [ FLAG AS DOWNGRADED ]
     |                           |               |               |         [ Alert Supervisory  ]
     |                           |               |               |         [ Catchment Queue    ]
     v                           v               v               v                |
   +------------------------------------------------------------------------------+-------+
   |                                STEP STATUS: DONE                                     |
   |  * closed_at: ISO Timestamp                                                          |
   |  * closed_by: Role & Facility (e.g., "CHC SN · CHC Teonthar")                         |
   |  * closed_source: DELIVERED_ON_SITE | AT_REFERRED_FACILITY | OTHER_PUBLIC | PRIVATE  |
   |  * closed_level: Facility tier where care occurred                                   |
   |  * downgraded: 0 (Normal) | 1 (Flagged)                                              |
   +--------------------------------------------------------------------------------------+
```

### Provenance Audit Attributes
Every closed step stores:
- `closed_at`: ISO 8601 UTC timestamp of closure.
- `closed_by`: Role title and facility identifier (e.g., `"CHC SN · CHC Teonthar"`).
- `closed_source`: Provenance category (`DELIVERED_ON_SITE`, `AT_REFERRED_FACILITY`, `OTHER_PUBLIC_FACILITY`, `PRIVATE_PROVIDER`).
- `closed_level`: The facility tier where care physically occurred.
- `downgraded`: Boolean flag (1/0) indicating whether care was delivered at a tier lower than clinically advised.

---

## 7. Central Backend & Offline Sync Engine

The central backend is an Express & TypeScript service running on port 4000, designed for atomic local execution and multi-client field synchronization.

### 7.1. Database Engine: Universal SQLite
- **Engine**: Node.js 20+ built-in `DatabaseSync` (`node:sqlite`) with fallback to `better-sqlite3`.
- **Mode**: Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) for concurrent read/write throughput.
- **Schema Model**:

```
  +------------------------+                    +------------------------+
  |       FACILITIES       |                    |        VILLAGES        |
  +------------------------+                    +------------------------+
  | id (PK)                |                    | id (PK)                |
  | name, short_name       |                    | name                   |
  | level, nin_code        |                    | subcentre_id (FK)      |
  | block, district        |                    | asha_name, asha_phone  |
  +-----------+------------+                    +-----------+------------+
              | 1                                           | 1
              |                                             |
              | N                                           | N
  +-----------v------------+                    +-----------v------------+
  |         USERS          |                    |        PATIENTS        |
  +------------------------+                    +------------------------+
  | id (PK)                |                    | id (PK)                |
  | name, phone, role      |                    | name, name_hi, phone   |
  | facility_id (FK)       |                    | service, village_id(FK)|
  | is_active, created_at  |                    | status (NORMAL | HRP)  |
  +-----------+------------+                    | consent_whatsapp, abha |
              |                                 +-----------+------------+
              | generates                                   | 1
              v                                             |
  +------------------------+                                | N
  |       AUDIT_LOGS       |                    +-----------v------------+
  +------------------------+                    |         STEPS          |
  | id (PK), user_id       |                    +------------------------+
  | action, details, time  |                    | id (PK)                |
  +------------------------+                    | patient_id (FK)        |
                                                | cat, level, due, sent  |
                                                | status (OPEN | DONE)   |
                                                | owner_role, created_by |
                                                | closed_at, closed_by   |
                                                | closed_source, clevel  |
                                                | downgraded (0 | 1)     |
                                                +-----------+------------+
                                                            | 1
                                                            | generates
                                                            v N
                                                +------------------------+
                                                |       CCE_OUTBOX       |
                                                +------------------------+
                                                | id (PK), event_type    |
                                                | payload (CloudEvents)  |
                                                | status (PENDING|SENT)  |
                                                | retry_count, errors    |
                                                | created_at, dispatched |
                                                +------------------------+
```

### 7.2. Synchronization Endpoints

#### Push Endpoint (`POST /api/sync/push`)
- Receives batches of updated patients and steps from offline field devices.
- **Partial Step Resolution**: Automatically resolves existing step properties (`cat`, `level`, `owner_role`) to safely process partial updates (closures) without triggering SQLite NOT NULL constraints.
- **CCE Dispatch**: Atomically commits patient/step changes and enqueues corresponding task events to `cce_outbox`.
- **Audit Trail**: Records a synchronization record in `audit_logs`.

#### Pull Endpoint (`GET /api/sync/pull?since=<ISO_TIMESTAMP>&facilityId=<ID>`)
- Returns incremental changes recorded since the client's last synchronization checkpoint.

---

## 8. OpenPHC CCE Integration & Transactional Outbox

Next Steps serves as an authentic frontline event producer for the OpenPHC ecosystem.

### 8.1. Outbox Pattern Daemon
To eliminate data loss during network degradation:
1. Application steps are written to SQLite within an atomic transaction.
2. In the same transaction, a CloudEvent record is written to `cce_outbox` with status `'PENDING'`.
3. An asynchronous background daemon (`outboxWorker.ts`) polls every 3,000 ms, pulls batches of 10 events, acquires an OAuth2 bearer token from Keycloak, and dispatches them to the CCE Gateway.
4. On failure, exponential backoff is triggered (up to 5 retries); failed events enter an `'FAILED'` state for administrative inspection and replay.

### 8.2. CloudEvents v1.0 & FHIR R4 Task Schema
Events emitted to `https://api.cce.mdtlabs.org/v1/events` adhere strictly to:
- `specversion`: `"1.0"`
- `type`: `"org.openphc.task.created"` or `"org.openphc.task.updated"`
- `source`: `"nextsteps/rewa-district"`
- `subject`: `"Patient/<PATIENT_ID>"`
- `datacontenttype`: `"application/json"`
- `data`:
  ```json
  {
    "resourceType": "Task",
    "id": "step-892147",
    "status": "ready",
    "intent": "order",
    "priority": "urgent",
    "code": {
      "coding": [{ "system": "http://openphc.org/codes/tasks", "code": "REFERRAL" }]
    },
    "for": { "reference": "Patient/w1" },
    "executionPeriod": { "end": "2026-09-20" },
    "restriction": {
      "recipient": [{ "display": "CHC Teonthar", "identifier": { "value": "CHC" } }]
    }
  }
  ```

---

## 9. Supervisory Web Admin Portal (`admin-panel`)

The admin portal provides desktop-grade governance for medical officers, district administrators, and technical operations.

| View Name | Technical Purpose | Target User |
| :--- | :--- | :--- |
| **CCE Event Telemetry & Ingestion Cockpit** | Live WebSocket/polling monitor showing CCE Gateway health, Keycloak token validity, outbox queue depth, latency ms, and manual batch replay controls. | Systems Admin / IT Lead |
| **Staff Personas & User Management** | Provisioning and deactivating frontline accounts across all 9 public health roles, assigned facilities, and phone credentials. | District Health Admin |
| **Health Facility Ladder & Catchment Mapping** | Master directory linking District Hospitals, CHCs, PHCs, Sub-centres, and 12+ villages with NIN codes and ASHA assignments. | Block Medical Officer / DPO |
| **District & Block Supervisory Insights** | Person-wise deduplicated tracking, aggregate indicator performance, and care cascade drop-off analysis. | Chief Medical Officer (CMO) |
| **SLA Escalation Rules & Deployment** | System configurations, timeout intervals, notification overrides, and sync batch tuning. | Operations Lead |
| **Access & Security Audit Logs** | Immutable, time-stamped audit logs detailing every user login, data sync, and clinical closure. | Compliance / Auditor |

---

## 10. Mobile Runtime & Android Native Shell

The frontline client is built as a responsive Progressive Web App (PWA) wrapped inside an Android native shell using **Capacitor 8**.

- **Package ID**: `org.medtroniclabs.nextsteps`
- **Application Name**: Next Steps for Maternal Care
- **Target SDK**: Android 36 (minSdk 24 — Android 7.0+ for low-cost frontline tablets/smartphones)
- **Direct APK Distribution**: Hosted directly on the live production server at `/apk` and `/download`.
- **Offline Storage**: Dexie.js (IndexedDB) with reactive UI subscriptions.
- **Design Tokens**: Authentic Medtronic LABS tokens (Inter font family, `#1E14BE` brand blue, `#1B6B47` success green, `#994242` alert red).

---

## 11. Production Infrastructure & Deployment Specification

### Production Server Details
- **Public IP**: `13.232.251.63` (AWS EC2, Ubuntu 24.04 LTS, Region: `ap-south-1`)
- **Web Admin Portal**: [`https://nextsteps-admin.mdtlabs.org/`](https://nextsteps-admin.mdtlabs.org/)
- **Frontline Field App**: [`https://nextsteps-admin.mdtlabs.org/app/`](https://nextsteps-admin.mdtlabs.org/app/)
- **Backend API**: [`https://nextsteps-api.mdtlabs.org/`](https://nextsteps-api.mdtlabs.org/) and [`https://nextsteps-admin.mdtlabs.org/api/`](https://nextsteps-admin.mdtlabs.org/api/)
- **Process Manager**: PM2 managing `next-steps-backend` on local port 4000.
- **Reverse Proxy**: Nginx with Let's Encrypt automated TLS certificate renewals.

### Co-Existence with VDA
The EC2 server concurrently hosts Medtronic LABS VDA (`vda-admin.mdtlabs.org` and `vda-api.mdtlabs.org`). Next Steps configuration guarantees:
1. Strict domain-name matching in Nginx server blocks (no catch-all wildcards).
2. Completely isolated local ports (`4000` for Next Steps, `3000`/`8080` for VDA).
3. Independent data directories (`/var/www/next-steps/` vs `/var/www/vda/`).

### Deployment Packaging Pipeline
- Production artifacts are packaged via [`create_deployment_zip.py`](file:///c:/Users/devil/Desktop/next-steps/create_deployment_zip.py) into a self-contained archive: [`next_steps_ec2_deployment.zip`](file:///c:/Users/devil/Desktop/next-steps/next_steps_ec2_deployment.zip).
- Execution of `deploy.sh` on EC2:
  1. Preserves `/var/www/next-steps/data/nextsteps.db` (zero data loss).
  2. Updates compiled static assets for `admin-panel` and `mobile-web`.
  3. Reloads PM2 backend with active database migrations.
  4. Tests and reloads Nginx gracefully.

---

## 12. Non-Functional & Operational Requirements

| Requirement | Metric / Standard | Realized Implementation |
| :--- | :--- | :--- |
| **Prescription Latency** | < 30 seconds total encounter time | 2-tap staging grid with auto-calculated intervals |
| **Web Asset Payload** | < 150 kB gzipped | Production bundle: **109.6 kB gzipped** (`index-B81xj5YK.js`) |
| **Cold Startup Time** | < 1.5 seconds on 3G | Pre-bundled assets, zero external font blocking |
| **Offline Resilience** | 100% operation without network | Full Dexie/IndexedDB local fallback with queue |
| **CCE Event Loss** | 0% event loss | Transactional outbox with exponential retry daemon |
| **Security & Privacy** | ISO 27001 / HIPAA alignment | Phone number masking (`+91 98•••• •022`), ABHA ID hashing, TLS 1.3 |
| **Touch Ergonomics** | Min 44px touch targets | Thumb-zone navigation optimized for single-hand mobile use |
