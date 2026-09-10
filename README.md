# Next Steps: Frontline Care Coordination Application

A cross-platform mobile and web application built on top of the **[OpenPHC](https://github.com/orgs/openphc/repositories)** infrastructure specifications, designed to close the loop on frontline maternal and public health coordination across village, sub-centre, primary health centre (PHC), and secondary/tertiary facilities.

Packaged for **Android (APK)**, **iOS**, and **Web (PWA)** using **React 18 + Vite + TypeScript + Capacitor** and styled with authentic **Medtronic LABS Design System tokens**.

---

## Table of Contents

- [Overview & Problem Statement](#overview--problem-statement)
- [Architecture & OpenPHC Layer](#architecture--openphc-layer)
- [Key Features](#key-features)
- [Design System & Aesthetics](#design-system--aesthetics)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Running the Web App](#1-running-the-web-app)
  - [2. Running the OpenPHC Mock Collector](#2-running-the-openphc-mock-collector)
  - [3. Building the Native Android APK](#3-building-the-native-android-apk)
  - [4. Installing the APK](#4-installing-the-apk)
- [OpenPHC CloudEvents & FHIR Specification](#openphc-cloudevants--fhir-specification)
- [Testing & Verification](#testing--verification)

---

## Overview & Problem Statement

In maternal healthcare across rural and semi-urban health systems (such as in Madhya Pradesh, India), pregnant women encounter high dropout rates along the referral and care continuum. Although antenatal care (ANC), ultrasound (USG), and high-risk pregnancy (HRP) specialist evaluations are advised, coordination between community health workers (**ASHAs**), village clinics (**Sub-centres / HWCs**), and referral hospitals (**PHC / CHC / District Hospitals**) is often fragmented on paper slips.

**Next Steps** is a lightweight care coordination solution that:
1. **Prescribes Next Steps in < 30 seconds** at the conclusion of an encounter.
2. **Eliminates redundant clinical data entry** (focuses strictly on coordination metadata: *Who, Where, When, What Step, Risk Tier* per **BR-017**).
3. **Guarantees offline-first durability** for remote frontline workers with zero network connectivity.
4. **Emits standard CloudEvents v1.0 and FHIR R4 Task payloads** directly compatible with the OpenPHC protocol engine (`cce-collector-service`).

---

## Architecture & OpenPHC Layer

```
+-------------------------------------------------------------------------------+
|                    NEXT STEPS MOBILE & WEB APPLICATION                       |
|         (React 18 + TypeScript + Medtronic LABS Design System + Capacitor)    |
+-------------------------------------------------------------------------------+
       |                                                    |
       v                                                    v
[Frontline Roles & UI]                               [Local OpenPHC Bridge]
• ASHA (Village level)                               • CloudEvents v1.0 Outbox Queue
• ANM / CHO (Sub-centre)                             • FHIR R4 Task Generator
• PHC & DH Staff Nurses                              • OpenPHC SLA Evaluator
• PHC Medical Officer (Insights)                     • Zero-Server Mock (cce-local-mock.cjs)
       |                                                    |
       +---------------------> [Dexie.js DB] <--------------+
                               (Offline Store)
```

### Local OpenPHC Bridge (Zero-Server Footprint)
- **Local Outbox Queue**: All care events are written atomically to an IndexedDB outbox table (`outboxEvents`) via Dexie.js before attempting network transmission.
- **CloudEvents v1.0 Spec**: Standardized event envelopes (`type: org.openphc.task.created`, `subject: Patient/...`, `source: org.openphc.nextsteps.<role>`).
- **FHIR R4 `Task` Resources**: Translates care steps into standard FHIR resources with coding, restrictions, intent, and priorities.
- **OpenPHC Event Inspector Drawer**: An in-app debug/audit drawer (accessible via the `CCE` status badge in the header) enabling real-time inspection and dispatch of emitted CloudEvents.
- **Standalone Mock Server (`cce-local-mock.cjs`)**: A zero-dependency Node.js HTTP server simulating OpenPHC's `POST /v1/events` ingestion endpoint.

---

## Key Features

### 1. Rapid Patient Lookup & Registration
- Instant lookup by **Mobile Number**, **ABHA / RCH ID**, or simulated **QR Code Token**.
- Pre-populated master village directory that **automatically links the corresponding ASHA** and her contact number (NS-3, NS-8).
- High-Risk Pregnancy tag is recorded as a simple routing priority: **`NORMAL`** vs **`HRP`** (NS-12).

### 2. 30-Second Next Steps Prescription Grid
- One-tap staging for critical next steps:
  - **Specialist Referral**: Facility tier selector (PHC, CHC, District Hospital Rewa, Tertiary).
  - **ANC Visit**: Interval proposals (`+2w`, `+4w`, or custom date picker).
  - **PMSMA Session**: Automated calculation to the **9th of next month** (NS-10).
  - **Diagnostics**: Ultrasound (USG) and laboratory investigations.

### 3. Frontline Role Switcher
- Fast role switching in the header between frontline personas:
  - **ANM / CHO** (Sub-centre / Health & Wellness Centre)
  - **ASHA** (Village Community Level)
  - **Staff Nurse** (PHC / CHC)
  - **DH Staff** (District Hospital Rewa)
  - **Medical Officer** (PHC In-Charge)

### 4. Supervisory Insights Dashboard
- **Woman-wise deduplication**: Unique pregnant woman counts (never inflated by individual test events).
- **Care Cascade Visualization**: Tracks drop-offs between referral issued, arrived at recommended facility, arrived at lower tier, or dropped out.
- **Simulated OpenPHC AI Insights Q&A**: Natural-language analytical queries (e.g., *"Show high-risk dropout rates by village"*).

---

## Design System & Aesthetics

The application uses design tokens from the **Medtronic LABS Design System**:
- **Palette**: Deep Navy (`#0f172a`), Clinical Teal (`#0d9488`), Alert Amber (`#f59e0b`), and High-Risk Rose (`#e11d48`).
- **Typography**: Clean system typography with accessible contrast and touch-target standards (min 44px for field hands).
- **Glassmorphic Accents**: Subtle backdrops, rounded cards, and smooth micro-animations for high-end feel.
- **Compact Footprint**: Web bundle is only **~114 kB gzipped**, loading instantly even on 2G/3G connections.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 / 19, TypeScript, Vite |
| **Mobile Runtime** | Capacitor 8 (`@capacitor/core`, `@capacitor/android`, `@capacitor/network`, `@capacitor/status-bar`) |
| **Offline Storage** | Dexie.js (IndexedDB wrapper with live reactive hooks) |
| **Icons** | Lucide React |
| **OpenPHC Protocol** | CloudEvents v1.0, FHIR R4 (`Task`, `Patient`), Node.js mock collector |
| **Android Build** | Gradle 8.14.3, OpenJDK 22, Android SDK 36 (minSdk 24) |

---

## Directory Structure

```
next-steps-app/
├── android/                   # Native Android Capacitor Project (Gradle)
│   ├── app/
│   │   ├── build/outputs/apk/debug/app-debug.apk   # Compiled Debug APK
│   │   └── src/main/
│   └── local.properties       # Android SDK location
├── src/
│   ├── components/            # UI components (Header, Modals, Event Drawer, etc.)
│   │   ├── common/
│   │   ├── forms/
│   │   └── layout/
│   ├── db/                    # Dexie.js offline database & sample seeds
│   │   ├── index.ts
│   │   └── seedData.ts
│   ├── openphc/               # OpenPHC bridge implementation
│   │   ├── cloudEventSchema.ts # CloudEvents v1.0 & FHIR R4 Task interfaces
│   │   ├── outboxManager.ts   # Outbox queue & sync manager
│   │   └── slaEvaluator.ts    # Escalation & deadline tracker
│   ├── views/                 # Core screen views
│   │   ├── AlertsView.tsx     # Overdue & SLA breaches
│   │   ├── FindAddView.tsx    # Patient search & registration
│   │   ├── InsightsView.tsx   # Supervisory MO metrics & AI insights
│   │   ├── PrescribeView.tsx  # Next Steps 30s prescription grid
│   │   └── RegisterView.tsx   # Woman registration modal
│   ├── App.tsx                # Main application coordinator
│   ├── index.css              # Medtronic LABS Design System stylesheet
│   └── main.tsx
├── cce-local-mock.cjs         # Full OpenPHC CCE microservice suite mock server (Port 8080)
├── next-steps-debug.apk       # Ready-to-install Android Debug APK (4.59 MB)
├── capacitor.config.json      # Capacitor native configuration
└── package.json
```

---

## Getting Started

### Prerequisites
- **Node.js** 18+ and **npm**
- *(Optional for Android build)* **Java 17 or 22** and **Android SDK 34+**

### 1. Running the Web App

```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
Open your browser at **`http://localhost:5173/`**.

### 2. Running the OpenPHC Mock Collector

In a separate terminal, launch the local event collector to receive and inspect dispatched CloudEvents:

```bash
npm run mock:cce
```
This starts an HTTP server on **`http://localhost:8080`** that logs incoming CloudEvents envelopes and FHIR `Task` payloads.

### 3. Building the Native Android APK

To bundle the web app, sync native assets, and build the APK:

```powershell
# 1. Build web assets and sync to native Android
npm run cap:sync

# 2. Compile debug APK with Gradle
cd android
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat assembleDebug
```

The compiled APK will be located at:
- Standard Path: `android/app/build/outputs/apk/debug/app-debug.apk`
- Convenience Copy: `next-steps-debug.apk` in project root

### 4. Installing the APK

#### Via ADB (USB Debugging / Emulator):
```powershell
adb install -r next-steps-debug.apk
```

#### Via Android Studio:
```bash
npx cap open android
```

#### Sideload on Physical Phone:
Transfer `next-steps-debug.apk` to your phone (via USB cable, Google Drive, WhatsApp, etc.) and tap to install.

---

## OpenPHC CloudEvents & FHIR Specification

Every Next Step action recorded in the app is packaged into a **CloudEvents v1.0** envelope wrapping a **FHIR R4 `Task`**:

```json
{
  "specversion": "1.0",
  "id": "evt_1788637758027_k9a2",
  "source": "org.openphc.nextsteps.subcentre",
  "type": "org.openphc.task.created",
  "subject": "Patient/pw_01",
  "datacontenttype": "application/json",
  "time": "2026-09-05T19:49:18.027Z",
  "facilityid": "SUBCENTRE",
  "protocolinstanceid": "proto_pw_01",
  "protocoldefinitionid": "cce-maternal-v1",
  "actionid": "referral",
  "data": {
    "resourceType": "Task",
    "id": "step_1788637758027_8dhd",
    "identifier": [
      { "system": "urn:openphc:step-id", "value": "step_1788637758027_8dhd" }
    ],
    "status": "requested",
    "intent": "order",
    "priority": "routine",
    "code": {
      "coding": [
        {
          "system": "http://openphc.org/fhir/CodeSystem/task-category",
          "code": "specialist-referral",
          "display": "Specialist Referral"
        }
      ],
      "text": "Specialist Referral"
    },
    "for": {
      "reference": "Patient/pw_01",
      "display": "Sunita Devi"
    },
    "restriction": {
      "period": {
        "end": "2026-09-19"
      }
    }
  }
}
```

---

## Testing & Verification

Run the automated integration test script to verify local OpenPHC event emission and mock collector ingestion:

```bash
node test-openphc-flow.cjs
```

Expected result:
```
==================================================
OPENPHC INGESTION FLOW TEST
==================================================
[1] Connecting to Local CCE Collector at http://localhost:8080/v1/events...
[2] Submitting CloudEvents v1.0 payload for Sunita Devi (Specialist Referral)...
--> HTTP Response Status: 200 OK
--> Ingestion Response: { status: 'ACCEPTED', eventId: 'evt_test_...' }
[SUCCESS] OpenPHC Collector successfully processed the CloudEvents v1.0 Task!
```

---

## License

MIT
