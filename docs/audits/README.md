# Architecture & Security Audits Repository

This directory contains the authoritative senior-level architectural evaluations, regulatory compliance audits, and threat models for the **Next Steps Care Coordination Platform** and its integration with the **Medtronic LABS Care Coordination Engine (CCE / OpenPHC)**.

---

## 📑 Audits Directory Index

| Document | Scope & Focus | Primary Standards & Regulations | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **[NATIONAL_SCALE_PRODUCTION_ARCHITECTURE_AUDIT.md](./NATIONAL_SCALE_PRODUCTION_ARCHITECTURE_AUDIT.md)** | **National-Scale Production & Security Audit (1M to 1.4B Population)**<br>Exhaustive code-level vulnerability audit (auth bypasses, open CORS, outbox non-atomicity), CCE engine review, and State-Federated Pod architecture for India. | • **India 1.4B Public Health Scale**<br>• **Cloudflare Security Audit Harness**<br>• **DPDP Act, 2023 & ABDM M1–M3**<br>• **Kafka Event Sharding & Citus PG** | • Source Code Vulnerability Matrix<br>• CCE Engine Repository Audit<br>• State-Federated Pod Topology<br>• Surviving the "Monday Sync Storm"<br>• Zero-Trust Threat Model<br>• P0–P3 Execution Roadmap |
| **[OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md](./OPENPHC_ROBUST_ARCHITECTURE_AUDIT.md)** | **Master Enterprise Architecture & Regulatory Audit**<br>Comprehensive synthesis of Medtronic LABS *OpenPHC Architecture Description V1.1* vs. live Next Steps edge platform. | • **DPDP Act, 2023** (Sections 5, 6, 8, 9, 11, 16)<br>• **ABDM Milestones 1, 2, 3**<br>• **Cloudflare Security Audit Harness**<br>• **Addy Osmani Agent Skills** | • 12-Gap Comparative Heatmap<br>• 4-Zone DPDP Privacy Architecture<br>• ABDM ABHA/HIP/HIU Blueprint<br>• Zero-Trust Threat Model<br>• Closed-Loop Target Topology<br>• P0–P3 Actionable Roadmap |
| **[CCE_ARCHITECTURE_AUDIT.md](./CCE_ARCHITECTURE_AUDIT.md)** | **Baseline CCE Integration Technical Audit**<br>Technical evaluation of live outbox worker, Keycloak OAuth2 auth, and CloudEvents transformation. | • **CloudEvents v1.0**<br>• **HL7 FHIR R4 Task**<br>• **OAuth2 RFC 6749** | • 7 Technical Bottlenecks<br>• Deterministic Event Hasher<br>• Keycloak Circuit Breaker<br>• Transactional Outbox Pattern |

---

## 🎯 High-Level Audit Findings Summary

### 1. Architectural Strengths (What Works Exceptionally Well)
- **Local-First Frontline Autonomy**: SQLite in WAL mode ensures frontline health workers (ASHAs/ANMs) experience zero latency regardless of cloud connectivity.
- **Transactional Outbox Engine**: Mutations and event queuing occur atomically in SQLite; network drops never lose clinical actions.
- **Keycloak Token Caching**: In-memory token management with proactive expiration renewal prevents redundant auth round-trips.
- **Canonical Envelope Foundation**: CloudEvents 1.0 JSON envelopes wrapping HL7 FHIR R4 Task definitions establish a standard interoperability baseline.

### 2. Core Strategic Gaps Identified & Solved

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     THE 12 STRUCTURAL GAPS                                      │
├───────────────────────────────────┬─────────────────────────────────┬───────────────────────────┤
│ Gap Category                      │ Current State Vulnerability     │ Target Architecture Fix   │
├───────────────────────────────────┼─────────────────────────────────┼───────────────────────────┤
│ 1. Data Zoning (DPDP)             │ Single flat SQLite database     │ 4 Isolated Network Zones  │
│ 2. Patient Pseudonymization       │ Cleartext names in CloudEvents  │ Opaque UUIDs via MPI      │
│ 3. Integration Directionality     │ Push-only to CCE collector      │ Inbound Receiver Webhook  │
│ 4. Event Idempotency              │ Randomized Date.now() IDs       │ Deterministic SHA-256 Hash│
│ 5. Care Plan State Management     │ Hardcoded mutable SQLite rows   │ Dynamic Versioned Engine  │
│ 6. Consent Lifecycle (DPDP)       │ Assumed implicit consent        │ Multilingual Digital Opt-in│
│ 7. Pediatric Controls (DPDP)      │ Unlinked newborn care tracking  │ Verifiable Mother Linkage │
│ 8. Audit Evidence                 │ Ephemeral SQLite audit table    │ Immutable WORM Hash-Ledger│
│ 9. ABDM Federation                │ Local database IDs (Patient/w1) │ ABHA M1/M2/M3 Bridge      │
│ 10. Workforce Governance          │ Unfederated users table         │ State Workforce Registry  │
│ 11. Transport & Data at Rest      │ Single bearer token, unencrypted│ mTLS 1.3 & SQLCipher edge │
│ 12. Batch Sync Ingestion          │ Sequential HTTP loop            │ POST /v1/events/batch     │
└───────────────────────────────────┴─────────────────────────────────┴───────────────────────────┘
```

---

## 🛡️ Regulatory & Compliance Summary

### India Digital Personal Data Protection (DPDP) Act, 2023
- **Fiduciary vs. Processor**: AIIMS / State Health Department is established as the **Data Fiduciary**; Medtronic LABS acts strictly as the contractual **Data Processor**.
- **Section 8(5) Safeguards**: Implementation of physical network segmentation (Identity, Coordination, Clinical Planning, Analytics) ensures that even in an adverse security event, PII cannot cross into operational or analytical queues.
- **Section 8(7) Purpose Fulfillment & Crypto-Shredding**: Each patient's PII in the MPI is encrypted with a dedicated Data Encryption Key (DEK). Right to Erasure destroys the DEK, rendering all historical backups, logs, and Kafka streams instantly unrecoverable.
- **Section 16 Data Localization**: All processing, storage, and AI/LLM inference is restricted 100% to India-domiciled cloud infrastructure.

### Ayushman Bharat Digital Mission (ABDM)
- **Milestone 1**: ABHA Number & Address generation/verification via Aadhaar or Mobile OTP.
- **Milestone 2**: Health Information Provider (HIP) registration with care-context linking.
- **Milestone 3**: Health Information User (HIU) consent manager integration enabling retrieval of prior institutional health records (ultrasound, discharge summaries) with Diffie-Hellman / AES-256 GCM encryption.

---

## 🚦 Roadmap Priorities

1. **P0 (Immediate)**: Deterministic Event Hashing (`cceTransformer.ts`) and Auth Circuit Breaker (`cceAuth.ts`).
2. **P1 (Weeks 2–4)**: Multilingual WhatsApp consent flows (DPDP Sec 5/6), CCE Batch Ingestion (`POST /v1/batch`), and Inbound Receiver Webhooks.
3. **P2 (Month 2)**: ABDM Milestone 1 (ABHA verification) and MPI 4-zone pseudonymization with per-patient crypto-shredding.
4. **P3 (Month 3)**: ABDM Milestones 2 & 3 (HIP / HIU integration and Consent Manager health data exchange).
