# Item 5 — Test Cases

**Scope:** patient identity as a configurable identifier list, FHIR R4 Task
mapping, CloudEvents v1.0 envelope, and the coordination event outbox with a
stubbed dispatcher.

**Sources:** §10.5 (outbox entity), §17 (mapping and stub mode), §11.2
(transitions that emit), BR-017, plus the verified `cce-collector-service`
contract on `release-1.0.0`.

**Verified contract** — read from the collector source, not from documentation:

| Aspect | Fact |
|---|---|
| Endpoint | `POST /v1/events`, CloudEvents v1.0 structured JSON |
| `data` | Exactly one raw FHIR R4 resource. Bundles are unsupported. |
| `subject` | Required, non-blank. Must equal the patient reference extracted from inside `data`. Mismatch is a hard 422. |
| Extraction | For non-Patient resources: `getSubject()` then `getPatient()`, `Patient/` prefix stripped. No scheme validation — opaque string. |
| Patient resources | Walks `identifier[]` for a `system` matching collector config (default `http://openphc.org/identifier/upid`), **silently falls back to `Patient.id`** if none matches |
| Idempotency | Derived from `(id, source)`, 30-day lookback. Duplicate returns 200 with `status: "duplicate"`. |
| Limits | 1MB payload, `id` ≤ 50 chars |

That silent fallback is the sharpest trap in the contract — a mismatched
`system` produces no error, just correlation on the wrong value. TC-ID-005
covers it.

---

## Build order

**5a — identity.** TC-ID-001 to 005. Everything downstream needs a resolvable
subject.

**5b — FHIR Task mapping.** TC-FHIR-001 to 007. Pure functions.

**5c — CloudEvents envelope.** TC-CE-001 to 003. Pure functions.

**5d — outbox and dispatcher.** TC-OUT-001 to 006. Engine wiring.

The event-stream view is UI and follows 5d. No separate cases beyond
TC-OUT-004.

---

## 5a — Patient identity

### TC-ID-001 — patient ids are opaque UUIDs
| | |
|---|---|
| PRD | §15, §10.1 |
| Type | Unit |
| Priority | Must |
| **Given** | A new patient is registered |
| **When** | The record is read |
| **Then** | Its id is a well-formed UUID. It is not sequential, not derived from the mobile number, and not derived from the name. Two patients registered in succession have unrelated ids. |
| Why it could break | Sequential ids leak enrolment counts and collide across deployments. Deriving from mobile puts a phone number into every log line, Kafka partition key and dedup table on the platform. |

### TC-ID-002 — identifiers are a list with system URIs
| | |
|---|---|
| PRD | §10.1, §17 |
| Type | Unit |
| Priority | Must |
| **Given** | A patient carrying a local identifier and a programme identifier |
| **When** | The identifier list is read |
| **Then** | Both are present as `{system, value}` entries. The shape matches FHIR `Patient.identifier`. Adding a second identifier does not remove or alter the first. |
| Why it could break | A single identifier field makes ABHA adoption a migration. A list makes it an append. |

### TC-ID-003 — resolveUpid returns the configured system
| | |
|---|---|
| PRD | §17 |
| Type | Unit |
| Priority | Must |
| **Given** | A patient with a local identifier and one under `http://openphc.org/identifier/upid`. The deployment is configured to that system. |
| **When** | `resolveUpid(patient)` is called |
| **Then** | It returns the value of the configured-system identifier, not the local one. |
| Why it could break | Every event's `subject` flows through this one function. If it reads the wrong identifier, the whole commitment graph correlates on the wrong key — and nothing rejects it. |

### TC-ID-004 — resolveUpid falls back when no programme identifier exists
| | |
|---|---|
| PRD | §17 |
| Type | Unit |
| Priority | Must |
| **Given** | A patient carrying only a local identifier |
| **When** | `resolveUpid(patient)` is called |
| **Then** | It returns the local identifier and does not throw. The patient remains fully usable. |
| Why it could break | Patients reach a clinic before their programme registration completes. Throwing here would exclude exactly the least-connected patients — the ones the product exists for. |

### TC-ID-005 — emitted Patient carries the configured system URI
| | |
|---|---|
| PRD | §17, verified collector behaviour |
| Type | Unit |
| Priority | Must |
| **Given** | A patient with a programme identifier, and a configured system URI |
| **When** | A minimal FHIR Patient resource is built for emission |
| **Then** | `identifier[]` contains an entry whose `system` is exactly the configured URI and whose `value` equals `resolveUpid(patient)`. |
| Why it could break | The collector walks `identifier[]` for a matching `system` and **silently falls back to `Patient.id`** if none matches. A wrong or absent system URI produces no error — just correlation against the wrong value, discovered much later and hard to unpick. |

---

## 5b — FHIR Task mapping

### TC-FHIR-001 — category maps to Task.code
| | |
|---|---|
| PRD | §17 |
| Type | Unit |
| Priority | Must |
| **Given** | One step in each of the five categories |
| **When** | Each is mapped to a Task |
| **Then** | Each produces a distinct `Task.code`, expressed as a coding with a system and a code. No two categories share a code. |
| Why it could break | A bare display string is not interoperable. The receiving side needs a coded value to route on. |

### TC-FHIR-002 — status mapping covers every state
| | |
|---|---|
| PRD | §17, §11.2 |
| Type | Unit |
| Priority | Must |
| **Given** | Steps in CREATED, SCHEDULED, COMPLETED, CANCELLED and DECLINED |
| **When** | Each is mapped |
| **Then** | `Task.status` is `requested`, `ready`, `completed`, `cancelled` and `rejected` respectively. Every internal status maps to exactly one valid FHIR `TaskStatus`. |
| Why it could break | DECLINED maps to `rejected`, not `cancelled` — the distinction that carries the DECLINED/CANCELLED asymmetry from §13. Collapsing them loses the meaning the whole metric rests on. |

### TC-FHIR-003 — due date maps to the restriction period
| | |
|---|---|
| PRD | §17 |
| Type | Unit |
| Priority | Must |
| **Given** | A step due 26 July 2026 |
| **When** | It is mapped |
| **Then** | `Task.restriction.period.end` is that date in ISO-8601. It is not placed in `authoredOn`, `lastModified` or `executionPeriod`. |
| Why it could break | Several date fields on Task look plausible. `restriction.period.end` is the one that means "must be done by". |

### TC-FHIR-004 — Task.for references the resolved UPID
| | |
|---|---|
| PRD | §17, verified collector behaviour |
| Type | Unit |
| Priority | Must |
| **Given** | A step for a patient whose `resolveUpid` returns `X` |
| **When** | It is mapped |
| **Then** | `Task.for.reference` is exactly `Patient/X`. |
| Why it could break | The collector strips the prefix and compares the remainder against the envelope's `subject`. Any inconsistency is a hard 422 with the event rejected. |

### TC-FHIR-005 — visit maps to the encounter reference
| | |
|---|---|
| PRD | §17 |
| Type | Unit |
| Priority | Should |
| **Given** | A step belonging to a visit |
| **When** | It is mapped |
| **Then** | `Task.encounter.reference` is `Encounter/<visitId>`. |
| Why it could break | Without it the CCE cannot group steps arising from one consultation, which is BR-004's whole point. |

### TC-FHIR-006 — app identifiers travel with the resource
| | |
|---|---|
| PRD | §17 |
| Type | Unit |
| Priority | Must |
| **Given** | A step with a known internal id |
| **When** | It is mapped |
| **Then** | `Task.identifier[]` contains an entry carrying the internal step id under a Next Steps system URI. |
| Why it could break | §17 requires app UUIDs to travel as identifiers so a returning event can be correlated back to the originating step. Without it, receive is impossible later. |

### TC-FHIR-007 — no clinical content in the Task
| | |
|---|---|
| PRD | BR-017 |
| Type | Unit + static check |
| Priority | Must |
| **Given** | A step with `detailText` populated |
| **When** | It is mapped |
| **Then** | The Task contains no `reasonCode`, `reasonReference`, `Observation`, `Condition`, or free-text field carrying clinical content. Every populated field is coordination metadata: who, what category, by when, current status. |
| Why it could break | FHIR Task has fields designed to carry clinical justification. Populating them because they exist would cross the boundary the product's regulatory position depends on. |

---

## 5c — CloudEvents envelope

### TC-CE-001 — envelope carries every required attribute
| | |
|---|---|
| PRD | Verified collector contract |
| Type | Unit |
| Priority | Must |
| **Given** | A mapped Task for a known patient |
| **When** | The CloudEvents envelope is built |
| **Then** | `specversion` is `"1.0"`. `id`, `source`, `type`, `subject`, `datacontenttype` and `data` are all present and non-blank. `id` is at most 50 characters. `datacontenttype` is `application/fhir+json`. Attribute names are lowercase — `datacontenttype`, not `dataContentType`. |
| Why it could break | The collector rejects a malformed envelope with 400 before it looks at the payload. camelCase attribute names are the most likely mistake and the least obvious. |

### TC-CE-002 — subject matches the patient reference inside data
| | |
|---|---|
| PRD | Verified collector contract |
| Type | Unit |
| Priority | Must |
| **Given** | A Task whose `for.reference` is `Patient/X` |
| **When** | The envelope is built |
| **Then** | `subject` is exactly `X` — the reference with the `Patient/` prefix stripped. Assert this for a step mapped through the full pipeline, not a hand-built pair. |
| Why it could break | This is the collector's hardest validation and a 422 on mismatch. Building `subject` from one source and the reference from another is the natural way to get it wrong. |

### TC-CE-003 — data is a single resource, never a Bundle
| | |
|---|---|
| PRD | Verified collector contract |
| Type | Unit |
| Priority | Must |
| **Given** | A visit with three next steps |
| **When** | Events are built for all three |
| **Then** | Three separate envelopes, each with a single Task as `data`. `data.resourceType` is `Task`. No envelope contains a Bundle or an array. |
| Why it could break | Batching three steps into one Bundle is the obvious optimisation. The collector has no Bundle handling — patient-reference extraction fails and the event is rejected. |

---

## 5d — Outbox and dispatcher

### TC-OUT-001 — every transition writes exactly one event
| | |
|---|---|
| PRD | §10.5, §11.2 |
| Type | Unit |
| Priority | Must |
| **Given** | A step taken through capture, then completion |
| **When** | The outbox is read |
| **Then** | Exactly two events, in order. Each carries `eventId`, `nextStepId`, `eventType`, `payload` and `dispatchStatus`. A rejected transition writes **no** event. |
| Why it could break | An event written for a rejected transition tells the CCE something happened that did not. Duplicate events on one transition inflate every downstream count. |

### TC-OUT-002 — event types map to lifecycle changes
| | |
|---|---|
| PRD | §10.5, §17 |
| Type | Unit |
| Priority | Must |
| **Given** | Steps taken through capture, completion, cancellation and decline |
| **When** | The outbox is read |
| **Then** | Event types are CREATED, COMPLETED, CANCELLED and STATUS_CHANGED as §17 defines them. Each transition produces the type matching its target state. |
| Why it could break | Emitting STATUS_CHANGED for everything is simpler and loses the semantics the receiving side routes on. |

### TC-OUT-003 — events start pending
| | |
|---|---|
| PRD | §10.5 |
| Type | Unit |
| Priority | Must |
| **Given** | A newly written event, dispatcher not yet run |
| **When** | It is read |
| **Then** | `dispatchStatus` is PENDING. |
| Why it could break | Marking an event dispatched at write time means a failed send is invisible and the event is never retried. |

### TC-OUT-004 — stub mode does not dispatch
| | |
|---|---|
| PRD | §17, §21.2 |
| Type | Unit |
| Priority | Must |
| **Given** | The dispatcher configured in stub mode |
| **When** | A step is completed |
| **Then** | The event is written with a fully formed payload. No network call is attempted. `dispatchStatus` reflects the stubbed state distinctly from PENDING and from DISPATCHED. |
| Why it could break | §17 permits stub mode for the pilot and §21.2 states it does not affect evaluation of the core hypothesis. The payload must still be complete and inspectable — that is the whole point. |

### TC-OUT-005 — a dispatch failure never blocks the clinic
| | |
|---|---|
| PRD | §17 — *"CCE unavailability must never block clinic operations"* |
| Type | Unit |
| Priority | Must |
| **Given** | A dispatcher configured to fail on every attempt |
| **When** | A step is completed |
| **Then** | The completion succeeds. The step's status is COMPLETED. The event is written and left in a retryable state. No error surfaces to the caller. |
| Why it could break | This is the single most important case in the item. It is the concept note's resilience claim expressed as a test — care continues when the coordination layer is unavailable. A synchronous dispatch inside the transition would make an unreachable CCE stop the clinic working. |

### TC-OUT-006 — retries are idempotent
| | |
|---|---|
| PRD | Verified collector contract |
| Type | Unit |
| Priority | Must |
| **Given** | An event whose first dispatch attempt failed |
| **When** | It is retried |
| **Then** | The envelope carries the **same** `id` and `source` as the first attempt. A new id is not generated. |
| Why it could break | The collector dedupes on `(id, source)` with a 30-day lookback. A fresh id per attempt defeats that entirely and every retry creates a duplicate commitment in the graph. |

---

## Guardrails

| Check | Rule |
|---|---|
| BR-017 | No clinical field in any Task, Patient or envelope |
| BR-019 | No referral destination in any emitted resource |
| Boundary | `apps/` imports only the engine interface |
| Regression | All 91 existing assertions stay green |
| Privacy | No mobile number, name or address in `subject`, `id` or `source` — these reach logs, dedup tables and Kafka partition keys |

That last one is new to this item and worth a static check.

---

## What success looks like

Complete a step in the admin worklist and watch a CloudEvents envelope appear
in the event stream, containing a FHIR R4 Task with the right status, the right
code, and a subject that matches its own patient reference — with the
dispatcher stubbed by configuration rather than by absence.

That is the architecture claim, demonstrated rather than asserted.

---

## Open question for OpenPHC

The identifier system is collector-side deployment configuration
(`cce.collector.fhir.patient-identifier-system`), so one collector serves one
identifier namespace. Ask whether all participants in a deployment are expected
to share a single identifier system, or whether per-source configuration is
planned. It determines whether a multi-district deployment can support
districts on different programme identifiers.

---

## Sign-off

| Reviewer | Date | Cases approved |
|---|---|---|
| | | |
