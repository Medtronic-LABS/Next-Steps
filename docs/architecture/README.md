# System Architecture Specifications

This directory contains the core technical architecture blueprints, runtime topology specifications, and integration contracts for the **Next Steps Care Coordination Platform** and the upstream **OpenPHC Care Coordination Engine**.

---

## 📑 Architecture Directory Index

| Document | Purpose & Description | Key Technologies |
| :--- | :--- | :--- |
| **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)** | **Next Steps End-to-End System Architecture**<br>Comprehensive technical specification detailing how the WhatsApp Bot, Frontline Mobile App, Admin Portal, Node.js Backend, SQLite Database, and CCE Outbox interconnect. | • Meta WhatsApp Cloud API (Graph v21)<br>• React 18, TypeScript, Vite<br>• Node.js 20 LTS, Express 4<br>• SQLite 3 WAL Mode<br>• Keycloak OAuth2 / OIDC<br>• CloudEvents 1.0 & HL7 FHIR R4 |
| **[OpenPHC_Architecture_Description_V1.1.docx](./OpenPHC_Architecture_Description_V1.1.docx)** | **Medtronic LABS OpenPHC Architecture Specification V1.1**<br>Official arc42 / ISO 42010 architectural baseline governing the multi-tenant CCE care coordination hub, 35 building blocks, 4 zones, and 14 ADRs. | • Kubernetes, Helm, Microservices<br>• Apache Kafka (Partitioned Event Bus)<br>• PostgreSQL 16 (Row-Level Security)<br>• ClickHouse Analytics<br>• JSONLogic & FHIR PlanDefinition |

---

## 🏗️ Next Steps System Architecture Overview

```
+----------------------------------------------------------------------------------------------------+
│                                   NEXT STEPS CARE COORDINATION                                     │
+----------------------------------------------------------------------------------------------------+
           │                                                                 │
           ▼                                                                 ▼
+-----------------------+   Deep-Links (Register / Charts)       +-----------------------+
|  WhatsApp Cloud API   | <====================================> | Frontline Web App     |
|  (Meta Graph API v21) |                                        | (React 18 + TS + Vite)|
+-----------------------+                                        +-----------------------+
           │                                                                 │
           │ Webhook & Interactive Action Buttons                            │ REST / Offline Sync
           ▼                                                                 ▼
+----------------------------------------------------------------------------------------------------+
│                                   NEXT STEPS BACKEND ENGINE                                        │
│                          (Node.js / Express + TypeScript + SQLite WAL)                             │
│                                                                                                    │
│ • WhatsApp Conversational Engine (Worklist, Arrivals, Closures, OCR, Demo Resets)                 │
│ • Per-User FIFO Message Queue (Parallel Execution for Distinct Users)                             │
│ • Dynamic Bilingual Engine (English <-> Hindi with User Preference Persistence)                   │
│ • Transactional Outbox Daemon (cce_event_outbox with Exponential Backoff)                          │
│ • Keycloak Client Credentials Manager (In-Memory Token Cache)                                     │
+----------------------------------------------------------------------------------------------------+
           │                                                                 │
           ▼                                                                 ▼
+-----------------------------------+                       +-----------------------------------+
|      Live Keycloak Auth Server    |                       |      Live OpenPHC CCE Gateway     |
| keycloak.cce.mdtlabs.org/realms/cce|                       |   api.cce.mdtlabs.org/v1/events   |
+-----------------------------------+                       +-----------------------------------+
```

---

## 🔑 Key Engineering Principles

1. **Frontline Isolation**: Frontline health workers (ASHAs, ANMs) using WhatsApp or the mobile app never experience blocking cloud latency. All writes land in the local SQLite database running in Write-Ahead Logging mode (`PRAGMA journal_mode = WAL;`).
2. **Transactional Outbox Pattern**: Clinical mutations in `steps` and outgoing CloudEvents in `cce_event_outbox` occur inside an atomic database transaction.
3. **Multi-User Concurrency**: Inbound WhatsApp webhooks are processed concurrently for different phone numbers using independent Promise queues, while guaranteeing strict FIFO serialization for individual users.
4. **Bilingual Frontline UX**: Full English and Hindi dictionary localization with persistent user preference stored in `users.preferred_lang`.
