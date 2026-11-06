# Product Requirements & Persona Specifications

This directory contains the functional requirements, frontline persona definitions, role-based access control (RBAC) specifications, and user experience workflows for the **Next Steps Care Coordination Platform**.

---

## 📑 Product Documentation Index

| Document | Focus & Scope | Target Personas | Key Content |
| :--- | :--- | :--- | :--- |
| **[Next_Steps_Full_App_PRD_v2.md](./Next_Steps_Full_App_PRD_v2.md)** | **Full Application PRD (Mobile Web, PWA, Android, Admin)**<br>End-to-end product requirements specification covering the 4-tab clinical mobile interface, offline sync, AI Copilot, and catchment navigation. | • ASHA & ANM<br>• PHC / CHC Staff Nurse<br>• Medical Officer (MO)<br>• District Program Officer | • 4-Tab Navigation (`Lookup`, `Worklist`, `Alerts`, `Insights`)<br>• IndexedDB Offline Transaction Log<br>• RAG-powered AI Copilot<br>• Service Switching (ANC, PNC, NCD) |
| **[whatsapp_bot_prd.md](./whatsapp_bot_prd.md)** | **WhatsApp Frontline Bot PRD**<br>Interactive conversational workflows, quick action buttons, Meta Graph API v21 constraints, and message flows. | • ANM / CHO (Sub-centre)<br>• PHC Staff Nurse<br>• CHC Staff Nurse | • Menu & Worklist Navigation<br>• 30-Second Prescription Flow<br>• Arrival & Care Delivery Flow<br>• Dynamic Bilingual Switching<br>• Button Title $\le 20$ Char Rules |
| **[Next-Steps_Personas_Permissions_Admin_v1.docx](./Next-Steps_Personas_Permissions_Admin_v1.docx)** | **Personas, Permissions & Admin Panel Requirements**<br>Comprehensive specification detailing role hierarchies, facility catchments, supervisory permissions, and admin telemetry. | • System Administrators<br>• Block & District Supervisors<br>• Clinical Governance Leads | • 7-Tier Persona Hierarchy<br>• Catchment Assignment Matrix<br>• User Management REST Endpoints<br>• Outbox Telemetry Monitoring |

---

## 👥 Frontline Persona Matrix

| Role | Facility Tier | Core Capabilities | Primary Channel |
| :--- | :--- | :--- | :--- |
| **ASHA Worker** | Village / Community | Home visit registration, overdue visit reminders, mother counseling. | WhatsApp / SMS |
| **ANM / CHO** | Sub-centre / HWC | Patient intake, worklist triage, ANC/PNC scheduling, facility referrals. | WhatsApp & Mobile PWA |
| **PHC Staff Nurse** | Primary Health Centre | Expected arrivals check-in, doctor consult coordination, lab updates. | WhatsApp & Mobile PWA |
| **CHC Staff Nurse** | Community Health Centre | Specialist arrivals (USG, High-Risk), delivery triage, care completion. | WhatsApp & Mobile PWA |
| **Medical Officer (MO)** | PHC / CHC | Clinical fact confirmation, high-risk plan parameterization, review queue. | Desktop Portal & Mobile |
| **District Officer** | District Hospital / HQ | Program metrics, catchment reassignment, outbox failure resolution. | Admin Desktop Portal |
