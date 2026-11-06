# Next Steps Documentation Hub

Welcome to the centralized documentation repository for the **Next Steps Care Coordination Platform**. This directory organizes all architectural blueprints, regulatory compliance audits, product requirements, and operational guides.

---

## 🧭 Documentation Sitemap

```
docs/
├── audits/                                    # Architectural Evaluations & Regulatory Audits
│   ├── README.md                              # Audits Summary & Strategic Heatmap
│   ├── NATIONAL_SCALE_PRODUCTION_ARCHITECTURE_AUDIT.md # National-Scale Production Audit (1M-1.4B Population)
│   ├── OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md   # Master Enterprise Audit (OpenPHC V1.1, DPDP Act 2023, ABDM M1-M3)
│   └── CCE_ARCHITECTURE_AUDIT.md              # Technical CCE Integration Audit (7 gaps, transactional outbox)
│
├── architecture/                              # Technical Architecture & Topology Specifications
│   ├── README.md                              # System Architecture Index & Stack Overview
│   ├── SYSTEM_ARCHITECTURE.md                 # Next Steps End-to-End Architecture (Bot, PWA, Node.js, SQLite, CCE)
│   └── OpenPHC_Architecture_Description_V1.1.docx # Upstream Medtronic LABS OpenPHC V1.1 Specification
│
└── prd/                                       # Product Requirements & Personas
    ├── README.md                              # PRD Directory Overview & Persona Matrix
    ├── Next_Steps_Full_App_PRD_v2.md          # Full Next Steps App PRD (Mobile Web, PWA, Android, Admin)
    ├── whatsapp_bot_prd.md                    # WhatsApp Frontline Bot Requirements & Flows
    └── Next-Steps_Personas_Permissions_Admin_v1.docx # Persona Hierarchies, RBAC & Admin Specifications
```

---

## 🌟 Quick Links by Stakeholder Role

| If you are a... | Start Here | Key Documents to Read |
| :--- | :--- | :--- |
| **System Architect / Tech Lead** | [Architecture Directory](./architecture/README.md) | 1. [SYSTEM_ARCHITECTURE.md](./architecture/SYSTEM_ARCHITECTURE.md)<br>2. [OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md](./audits/OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md) |
| **Data Protection Officer / Legal** | [Audits Directory](./audits/README.md) | 1. [OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md (Section 3: DPDP Act 2023)](./audits/OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md)<br>2. [ABDM Compliance Architecture (Section 4)](./audits/OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md) |
| **Product Manager / Clinical Lead** | [PRD Directory](./prd/README.md) | 1. [Next_Steps_Full_App_PRD_v2.md](./prd/Next_Steps_Full_App_PRD_v2.md)<br>2. [whatsapp_bot_prd.md](./prd/whatsapp_bot_prd.md) |
| **Backend & Integration Engineer** | [Architecture Directory](./architecture/README.md) | 1. [CCE_ARCHITECTURE_AUDIT.md](./audits/CCE_ARCHITECTURE_AUDIT.md)<br>2. [SYSTEM_ARCHITECTURE.md (Section 3.4 CCE Outbox)](./architecture/SYSTEM_ARCHITECTURE.md) |
| **Security & DevOps Engineer** | [Audits Directory](./audits/README.md) | 1. [Zero-Trust Threat Model (Section 5)](./audits/OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md)<br>2. [SYSTEM_ARCHITECTURE.md (Section 5 Security)](./architecture/SYSTEM_ARCHITECTURE.md) |

---

## 🏛️ Project Governance & Standards

- **Architectural Method**: arc42 container template and ISO/IEC/IEEE 42010 views.
- **Interoperability**: CloudEvents v1.0 envelopes wrapping HL7 FHIR R4 Task & ServiceRequest resources.
- **National Digital Health**: NHA Ayushman Bharat Digital Mission (ABDM) Milestones 1, 2, and 3.
- **Data Privacy**: Digital Personal Data Protection Act, 2023 (DPDP Act) with 4-zone isolation and per-patient crypto-shredding.
- **Engineering Discipline**: Lifecycle rigor inspired by Addy Osmani's Agent Skills and Cloudflare's Security Audit Harness.
