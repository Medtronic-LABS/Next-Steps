# Item 2 — Test Cases

**Scope:** Visit entity, append-only History, transition validation,
`completedDate`, cancel/decline reasons.

**Deferred:** the Reminder entity (§10.4). It is a nine-field record whose
purpose is to serve a scheduling engine that does not exist in V1-A. Building
it now produces an empty table. It moves to item 4, where "reminder reach"
(§13) is computed, or item 5.

**Sources:** §10.2, §10.3, §11.2, §11.4, FR-A-4.2, FR-A-7.1, FR-A-7.3,
BR-002 through BR-007, BR-013.

Two cases already exist and are currently red: TC-LIFE-001 and TC-LIFE-003.
They stay as written. Everything below is new.

---

## Build order

**2a — Visit.** TC-VISIT-001 to 005. Adds `visitId` to every step and a Visit
record. Structural; nothing else can be tested properly until it lands.

**2b — History and transitions.** TC-LIFE-002 to 006, TC-HIST-001 to 003,
TC-COMP-001. This is the batch that turns the eight failing assertions green.

Write and commit the cases for 2a, implement 2a, then repeat for 2b. Do not
merge the batches.

---

## 2a — Visit

### TC-VISIT-001 — one visit, many steps, independent lifecycles
| | |
|---|---|
| PRD | BR-004, BR-006 |
| Type | Unit |
| Priority | Must |
| **Given** | A patient and a new visit |
| **When** | Three steps are captured in that visit and one is completed |
| **Then** | All three carry the same `visitId`. Each has a distinct `nextStepId`. Completing one leaves the other two at their prior status, with unchanged due dates. |
| Why it could break | Steps currently attach to a patient with no visit. Without `visitId`, median-days-to-completion (§13) cannot be computed at all. |

### TC-VISIT-002 — due date mandatory
| | |
|---|---|
| PRD | BR-005, FR-A-5.2 |
| Type | Unit |
| Priority | Must |
| **Given** | A capture in progress |
| **When** | A step is saved with no due date, once for each of the five categories |
| **Then** | Save is rejected all five times. No step is persisted. **No orphan visit is persisted either** — assert the visit count is unchanged. |
| Why it could break | Rejecting the step but keeping the visit leaves orphan records that inflate visit counts and corrupt per-visit metrics. |

### TC-VISIT-003 — visit timestamp defaults to now
| | |
|---|---|
| PRD | BR-002, §10.2 |
| Type | Unit |
| Priority | Must |
| **Given** | The normal capture flow, no backdating |
| **When** | A visit is recorded |
| **Then** | `visitDateTime` is within 5 seconds of the current time. `isBackdated` is `false`. `createdBy` and `createdAt` are both set. |
| Why it could break | A missing or wrong visit timestamp silently distorts every duration metric downstream. |

### TC-VISIT-004 — backdating limited to 30 days
| | |
|---|---|
| PRD | BR-003, FR-A-4.2 |
| Type | Unit |
| Priority | Must |
| **Given** | Today is 20 June |
| **When** | Visits are recorded with dates 21 May, 22 May, 20 June and 21 June |
| **Then** | 21 May rejected (31 days back). 22 May accepted, `isBackdated = true`. 20 June accepted, `isBackdated = false`. 21 June rejected (future). |
| Why it could break | The 30-day window and the future bound are separate checks. Implementations commonly add one and forget the other. |

### TC-VISIT-005 — every step belongs to exactly one visit
| | |
|---|---|
| PRD | BR-006 |
| Type | Unit |
| Priority | Must |
| **Given** | A store containing seed data plus newly captured steps |
| **When** | Every step is enumerated |
| **Then** | Each has a non-null `visitId` resolving to an existing visit. No step has more than one. **Seed data must be migrated, not exempted.** |
| Why it could break | The easy path is adding `visitId` to new steps and leaving seed steps null, which makes every seeded metric a special case. |

---

## 2b — History, transitions, completion

### TC-LIFE-002 — decline reason optional
| | |
|---|---|
| PRD | BR-013, §11.2 |
| Type | Unit |
| Priority | Must |
| **Given** | An open step at SCHEDULED |
| **When** | Decline is recorded with no reason, and separately with a reason |
| **Then** | Both accepted. Status becomes DECLINED in both cases. Where given, `declineReason` is stored. |
| Why it could break | Symmetry bias — it is tempting to apply BR-013's cancel rule to decline. The PRD deliberately differs, because a patient refusing care is a real outcome while a cancellation is an entry correction. |

### TC-LIFE-004 — completion date bounds
| | |
|---|---|
| PRD | FR-A-7.1, §11.2 |
| Type | Unit |
| Priority | Must |
| **Given** | A step from a visit dated 10 June; today is 20 June |
| **When** | Completion is attempted with dates 9 June, 10 June, 20 June, 21 June |
| **Then** | 9 June rejected (before visit). 10 June accepted. 20 June accepted. 21 June rejected (future). |
| Why it could break | Both bounds are inclusive. An off-by-one at either end shifts median-days-to-completion without any visible symptom. |

### TC-LIFE-005 — CREATED to SCHEDULED is legal
| | |
|---|---|
| PRD | §11.2 |
| Type | Unit |
| Priority | Should |
| **Given** | A step at CREATED |
| **When** | It is transitioned to SCHEDULED |
| **Then** | Accepted. A history entry is appended with `fromStatus: CREATED`, `toStatus: SCHEDULED`. |
| Why it could break | Adding transition validation (TC-LIFE-003) risks over-blocking. This case guards the legal path while that one guards the illegal ones. |

### TC-LIFE-006 — reopen within 48 hours
| | |
|---|---|
| PRD | FR-A-7.3, BR-007, §11.2 |
| Type | Unit |
| Priority | Must |
| **Given** | A step completed at a known timestamp T |
| **When** | Reopen is attempted at T+47:59:59, T+48:00:00 and T+48:00:01 |
| **Then** | T+47:59:59 accepted → status SCHEDULED. T+48:00:01 rejected. **T+48:00:00 exactly: see note below.** A successful reopen appends a history entry and clears `completedDate` and `completedBy`. |
| Why it could break | Reopen is the only permitted exit from a terminal state (BR-007). If the window is wrong in either direction you either block legitimate error correction or leave completed steps mutable indefinitely. |

> **Open question — needs a PRD answer before this is implemented.**
> §11.2 and FR-A-7.3 both say "within 48 hours" without specifying whether
> the boundary is inclusive. The golden suite raised the same point in its
> §8 list. Until it is answered, implement **T+48:00:00 exactly as accepted**
> (inclusive) and mark the assertion `PROVISIONAL` in a comment. Do not let
> the implementation silently decide.

### TC-HIST-001 — history is append-only and ordered
| | |
|---|---|
| PRD | §11.4, BR-007 |
| Type | Unit |
| Priority | Must |
| **Given** | A step taken through CREATED → SCHEDULED → COMPLETED |
| **When** | Its history is read |
| **Then** | Exactly three entries in chronological order. Each carries `at`, `byUser`, `fromStatus`, `toStatus`. The first has `fromStatus: null`. |
| Why it could break | History is what makes the patient care timeline real and what an audit asks for first. |

### TC-HIST-002 — reasons are recorded in history
| | |
|---|---|
| PRD | §11.4, BR-013 |
| Type | Unit |
| Priority | Must |
| **Given** | Two steps: one cancelled with reason "Patient moved city", one declined with no reason |
| **When** | Their histories are read |
| **Then** | The cancel entry has `reason: "Patient moved city"`. The decline entry has `reason: null` and is still present as an entry. |
| Why it could break | Storing the reason on the step but not in history means the timeline shows a status change with no explanation. |

### TC-HIST-003 — history cannot be mutated
| | |
|---|---|
| PRD | §11.4 |
| Type | Unit |
| Priority | Must |
| **Given** | A step with three history entries |
| **When** | A caller attempts to modify an entry's `toStatus`, delete an entry, or reorder the array |
| **Then** | The stored history is unchanged after each attempt. A returned history array must not be a live reference into the store. |
| Why it could break | Returning the internal array by reference makes "immutable" a comment rather than a property. This is the most likely way the guarantee is quietly lost. |

### TC-COMP-001 — completion fields set and immutable
| | |
|---|---|
| PRD | §10.3, BR-007 |
| Type | Unit |
| Priority | Must |
| **Given** | A step at SCHEDULED |
| **When** | It is completed on 15 June, then completion is attempted again on 16 June |
| **Then** | After the first: `completedDate` = 15 June, `completedBy` set, status COMPLETED. The second attempt is rejected (TC-LIFE-003) and `completedDate` remains 15 June. |
| Why it could break | Overlaps with TC-LIFE-003 deliberately. That case checks the status is protected; this one checks the completion *data* is too. A guard that returns early without writing status could still overwrite the date. |

---

## Guardrails for this item

Beyond the standing set, item 2 adds fields to the central object, which makes
BR-017 the live risk.

| Check | Rule |
|---|---|
| BR-017 | No field added to Visit, Next Step or History accepts diagnosis, notes, prescriptions, results, vitals or medical history. §10.2 states explicitly that a visit contains no clinical fields by design. |
| BR-017 | `detailText` is capped at 200 characters and its helper text keeps it non-clinical. Do not widen it. |
| Boundary | `apps/` still imports nothing but the engine interface. |

Run `grep -rniE "diagnos|prescri|symptom|vitals|hba1c|glucose|dosage|allerg"`
over the diff before committing 2a and 2b.

---

## What success looks like

After 2b, the eight currently-failing assertions turn green **without any test
file being edited.** That is the signal that the data model did the right thing
rather than merely something plausible.

Expected final state: 19 existing + roughly 20 new assertions, all passing,
except any marked PROVISIONAL pending the 48-hour ruling.

---

## Sign-off

| Reviewer | Date | Cases approved |
|---|---|---|
| | | |
