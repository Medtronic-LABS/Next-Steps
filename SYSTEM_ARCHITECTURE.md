# Next Steps: End-to-End System Architecture

> 📄 **Canonical Document Location**: This technical architecture specification has been organized into the project documentation directory:  
> 👉 **[docs/architecture/SYSTEM_ARCHITECTURE.md](./docs/architecture/SYSTEM_ARCHITECTURE.md)**

---

### Quick Summary
- **Scope**: Complete architectural specification for the Next Steps platform, detailing the WhatsApp Bot, Mobile PWA, Admin Portal, Node.js Backend, SQLite Database, and CCE Outbox daemon.
- **Key Components**:
  - High-concurrency WhatsApp webhook router with per-user Promise queue serialization.
  - Dynamic bilingual engine (English $\leftrightarrow$ Hindi) with persistent user preference.
  - Transactional Outbox pattern with Keycloak OAuth2 client credentials grant.
  - SQLite WAL mode running on AWS EC2 (`13.232.251.63`).

For the full detailed specification, please view **[docs/architecture/SYSTEM_ARCHITECTURE.md](./docs/architecture/SYSTEM_ARCHITECTURE.md)**.
