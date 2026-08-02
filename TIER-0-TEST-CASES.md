# Next Steps — Tier 0 Test Cases

**Subset of:** Golden Test Suite v2.0
**Scope:** the cases executable against the current V1-A build, expanded to
absolute assertions so they can be implemented directly.
**Excluded:** everything requiring auth, a backend, a reminder engine, real
sync, an Android device, or multi-clinic isolation. Those stay in the golden
suite for the pilot build.

Golden-suite IDs are carried in the `Golden ID` field so traceability to the
AC matrix in §5 of that document survives.

---

## How to read the status column

| Status | Meaning |
|---|---|
| **READY** | Can be implemented and should pass today |
| **EXPECTED FAIL** | Can be implemented today and should fail — documents a real defect |
| **BLOCKED: item N** | Needs the data model or logic from that item first |

Write the EXPECTED FAIL cases first. A test suite that goes green on day one
has proved nothing.

---

## Shared fixtures

**`SEED`** — the existing `Anand Diabetes Care` fixture: 9 patients, 10 steps
(`w1`–`w10`), nothing closed. Tests using it must start from a cleared store.

**`F-METRICS`** — a purpose-built fixture for §13. The seed's insight numbers
are hardcoded fakes and must not be used for metric tests.

| Step | Category | Visit date | Due date | Status | Completed |
|---|---|---|---|---|---|
| m1 | FOLLOW_UP_VISIT | 1 Jun | 10 Jun | COMPLETED | 8 Jun |
| m2 | LAB_INVESTIGATION | 1 Jun | 10 Jun | COMPLETED | 14 Jun |
| m3 | SPECIALIST_REFERRAL | 1 Jun | 12 Jun | DECLINED | — |
| m4 | FOLLOW_UP_CALL | 1 Jun | 12 Jun | CANCELLED | — |
| m5 | FOLLOW_UP_VISIT | 1 Jun | 15 Jun | SCHEDULED | — |

Period = 1–30 June. "Today" for these tests = 20 June.

---

## A. Capture and catalogue

### TC-CAT-001 — category due-date defaults
| | |
|---|---|
| Golden ID | VIS-007 |
| PRD | FR-A-5.2 |
| Status | **READY** |
| Type | Unit |
| Priority | Must |
| **Given** | Default clinic configuration |
| **When** | The default due-date key is read for each category |
| **Then** | Exactly: Follow-up Visit = 1 month; Lab Investigation = 1 week; Specialist Referral = 2 weeks; Follow-up Phone Call = 3 days; Other Clinic Action = 1 week |
| Why it could break | Defaults are the main lever on the sub-60-second target. A silent change alters capture speed and every downstream due date. |

### TC-CAT-002 — five categories, no more
| | |
|---|---|
| Golden ID | — (new) |
| PRD | FR-A-5.1, BR-017 |
| Status | **READY** |
| Type | Unit |
| Priority | Must |
| **Given** | The category catalogue |
| **When** | All category keys are enumerated |
| **Then** | Exactly five: FOLLOW_UP_VISIT, LAB_INVESTIGATION, SPECIALIST_REFERRAL, FOLLOW_UP_CALL, OTHER. No category label contains a clinical term (diagnosis, prescription, result, vitals). |
| Why it could break | Adding a sixth "clinical" category is the most likely BR-017 violation, and it would look like a helpful feature. |

### TC-VISIT-001 — one visit, many steps, independent lifecycles
| | |
|---|---|
| Golden ID | VIS-005 |
| PRD | BR-004, BR-006 |
| Status | **BLOCKED: item 2** |
| Type | Unit |
| Priority | Must |
| **Given** | A patient and a new visit |
| **When** | Three steps are captured in one visit and one is completed |
| **Then** | All three carry the same `visitId`; each has a distinct `nextStepId`; completing one leaves the other two at SCHEDULED |
| Why it could break | Steps currently attach to a patient with no visit at all. Without `visitId`, "median days to completion" (§13) cannot be computed. |

### TC-VISIT-002 — due date mandatory
| | |
|---|---|
| Golden ID | VIS-006 |
| PRD | BR-005 |
| Status | **BLOCKED: item 2** |
| Type | Unit |
| Priority | Must |
| **Given** | A capture in progress |
| **When** | A step is saved with no due date, for each of the five categories |
| **Then** | Save is rejected for all five; no step and no visit is persisted |
| Why it could break | Partial persistence on a rejected save leaves orphan visits. |

---

## B. Worklist ordering and sections

### TC-ORDER-001 — overdue section ordering
| | |
|---|---|
| Golden ID | WORK-002 |
| PRD | BR-014, FR-A-6.3 |
| Status | **READY** |
| Type | Unit |
| Priority | Must |
| **Given** | `SEED`, overdue section |
| **When** | The section is ordered |
| **Then** | Exactly, in order: Ramesh Kulkarni (HIGH, 8d), Iqbal Khan (NORMAL, 6d), Sunita Rao (NORMAL, 5d) |
| Why it could break | Priority must beat urgency. If the comparator inverts, the most urgent patient drops below a lower-priority one and the administrator works the wrong queue. |

### TC-ORDER-002 — overdue tie-break is deterministic
| | |
|---|---|
| Golden ID | WORK-002 |
| PRD | BR-014 |
| Status | **READY** |
| Type | Unit |
| Priority | Must |
| **Given** | Two NORMAL steps, both 4 days overdue, patients "Zoya Khan" and "Aarti Bose" |
| **When** | The section is ordered |
| **Then** | Aarti Bose precedes Zoya Khan |
| Why it could break | Non-deterministic ordering makes the worklist jump between refreshes, which destroys trust in it. |

### TC-ORDER-003 — unreachable ordered by attempts
| | |
|---|---|
| Golden ID | WORK-004 |
| PRD | FR-A-6.3 |
| Status | **EXPECTED FAIL** |
| Type | Unit |
| Priority | Must |
| **Given** | `SEED`, unreachable section — Ganesh Pawar (3 attempts), Meena Joshi (4 attempts) |
| **When** | The section is ordered |
| **Then** | Meena Joshi precedes Ganesh Pawar — most failed attempts first |
| Why it could break | FR-A-6.3 specifies a *different* comparator for Unreachable than for the other sections. The current implementation applies one comparator everywhere, so this orders by days overdue instead of attempts. |

### TC-SECTION-001 — worklist sections match the spec
| | |
|---|---|
| Golden ID | WORK-001 |
| PRD | FR-A-6.1 |
| Status | **EXPECTED FAIL** |
| Type | Unit |
| Priority | Must |
| **Given** | `SEED` |
| **When** | The worklist is built |
| **Then** | Sections are exactly, in order: Overdue, Due today, Due soon (next 7 days), Unreachable, Completed today |
| Why it could break | The build has an extra `upcoming` section not present in FR-A-6.1. Either the PRD needs amending or the section needs removing — this is a decision, not a bug fix. Raise before changing. |

### TC-FILTER-001 — category filters
| | |
|---|---|
| Golden ID | WORK-005 |
| PRD | FR-A-6.2 |
| Status | **READY** |
| Type | Unit |
| Priority | Should |
| **Given** | `SEED` |
| **When** | The worklist is filtered to LAB_INVESTIGATION |
| **Then** | Overdue contains only Ramesh Kulkarni; Due today contains only Vijay Menon; Unreachable contains only Meena Joshi; ordering within each section is unchanged from unfiltered |
| Why it could break | Filters that reorder as a side effect confuse the administrator mid-task. |

---

## C. Patient search and privacy

### TC-SEARCH-001 — mobile search digit boundaries
| | |
|---|---|
| Golden ID | PAT-003 |
| PRD | FR-A-2.2 |
| Status | **READY** |
| Type | Unit |
| Priority | Must |
| **Given** | `SEED` |
| **When** | Searches are run with 1, 3, 4, 9 and 10 digits |
| **Then** | Per FR-A-2.2: prefix matching applies only from 4 digits upward; a full 10-digit input matches exactly. Confirm the exact behaviour against the clause before asserting — the current implementation matches on any digit count. |
| Why it could break | Matching on one or two digits returns most of the clinic, which defeats search-before-create (BR-001). |

### TC-SEARCH-002 — name search is token-prefix, case-insensitive
| | |
|---|---|
| Golden ID | PAT-004 |
| PRD | FR-A-2.2 |
| Status | **READY** |
| Type | Unit |
| Priority | Should |
| **Given** | `SEED` |
| **When** | "iye", "IYE" and "lak" are searched |
| **Then** | All three return Lakshmi Iyer. "yer" returns nothing — matching is starts-with per token, not substring. |
| Why it could break | Substring matching looks more helpful and produces noisier results under time pressure. |

### TC-MASK-001 — mobile masked in lists
| | |
|---|---|
| Golden ID | PAT-007 |
| PRD | FR-A-2.3 |
| Status | **EXPECTED FAIL** |
| Type | Unit |
| Priority | Must |
| **Given** | Patients with mobiles `98450 12210` and `90080 12234` |
| **When** | Each is rendered for a list row |
| **Then** | The masked form preserves the patient's own leading digits — `98•••••210` and `90•••••234` respectively |
| Why it could break | The current implementation hardcodes a `98` prefix, so every number renders as if it began 98. Cosmetic today; visibly wrong the moment real numbers appear in a clinic demo. |

---

## D. Lifecycle

### TC-LIFE-001 — cancellation requires a reason
| | |
|---|---|
| Golden ID | LIFE-003 |
| PRD | BR-013, FR-A-6.5 |
| Status | **EXPECTED FAIL** |
| Type | Unit |
| Priority | Must |
| **Given** | An open step |
| **When** | Cancel is attempted with no reason |
| **Then** | Rejected; status stays SCHEDULED; no history entry appended. With a reason, status becomes CANCELLED and the reason is stored on the step. |
| Why it could break | `cancelStep(id)` currently takes no reason argument at all, so BR-013 cannot be satisfied. This is a signature change, not a validation fix. |

### TC-LIFE-002 — decline reason optional
| | |
|---|---|
| Golden ID | LIFE-004 |
| PRD | BR-013 |
| Status | **BLOCKED: item 2** |
| Type | Unit |
| Priority | Must |
| **Given** | An open step |
| **When** | Decline is recorded with no reason |
| **Then** | Accepted; status becomes DECLINED; pending reminders cancelled |
| Why it could break | Symmetry bias — it is tempting to make decline behave like cancel. The PRD deliberately differs. |

### TC-LIFE-003 — illegal transitions rejected
| | |
|---|---|
| Golden ID | LIFE-005 |
| PRD | §11.2 |
| Status | **EXPECTED FAIL** |
| Type | Unit |
| Priority | Must |
| **Given** | One step in each terminal state: COMPLETED, CANCELLED, DECLINED |
| **When** | Each is transitioned to every other status |
| **Then** | Every attempt is rejected with a validation error and the stored status is unchanged. The single exception is COMPLETED → SCHEDULED via Reopen within 48 hours. |
| Why it could break | Nothing currently rejects any transition. A double-tap on Complete after Cancel silently corrupts state, and every metric downstream inherits the error. |

### TC-LIFE-004 — completion date bounds
| | |
|---|---|
| Golden ID | LIFE-006 |
| PRD | FR-A-7.1 |
| Status | **BLOCKED: item 2** |
| Type | Unit |
| Priority | Must |
| **Given** | A step from a visit dated 10 June; today is 20 June |
| **When** | Completion is attempted with dates 9 June, 10 June, 20 June and 21 June |
| **Then** | 9 June rejected (precedes visit); 10 June accepted; 20 June accepted; 21 June rejected (future) |
| Why it could break | Both boundaries are inclusive. Off-by-one here silently distorts median-days-to-completion. |

### TC-HIST-001 — history is append-only
| | |
|---|---|
| Golden ID | LIFE-012 |
| PRD | §11.4, BR-007 |
| Status | **BLOCKED: item 2** |
| Type | Unit |
| Priority | Must |
| **Given** | A step taken through CREATED → SCHEDULED → COMPLETED |
| **When** | The history is read |
| **Then** | Three entries in chronological order, each carrying `{at, byUser, fromStatus, toStatus, reason}`. No entry can be modified or removed. |
| Why it could break | History is what makes the patient care timeline real and what an audit asks for first. |

---

## E. Overdue derivation

### TC-OVER-001 — overdue boundary
| | |
|---|---|
| Golden ID | LIFE-011 |
| PRD | §11.1, §11.3 |
| Status | **BLOCKED: item 3** |
| Type | Unit |
| Priority | Must |
| **Given** | Today is 20 June. Three SCHEDULED steps due 19, 20 and 21 June. |
| **When** | Overdue flags are derived |
| **Then** | 19 June → overdue, 1 day. 20 June → **not** overdue, 0 days. 21 June → not overdue. |
| Why it could break | "Due today" must not read as overdue. Getting this wrong inflates the overdue backlog metric by a full day's worth of steps every single day. |

### TC-OVER-002 — terminal steps are never overdue
| | |
|---|---|
| Golden ID | LIFE-011 |
| PRD | §11.1 |
| Status | **BLOCKED: item 3** |
| Type | Unit |
| Priority | Must |
| **Given** | Steps due 1 June with statuses COMPLETED, CANCELLED, DECLINED; today is 20 June |
| **When** | Overdue flags are derived |
| **Then** | None is overdue. `isOverdue = dueDate < today AND status is not terminal`. |
| Why it could break | Forgetting the terminal clause means completed work keeps appearing on the worklist forever. |

### TC-OVER-003 — overdue is derived, not stored
| | |
|---|---|
| Golden ID | — (new) |
| PRD | §11.1 |
| Status | **BLOCKED: item 3** |
| Type | Unit |
| Priority | Must |
| **Given** | A step due yesterday |
| **When** | The clock is advanced by seven days and the step is read again |
| **Then** | `daysOverdue` has increased to 8 with no write having occurred |
| Why it could break | The build currently stores `over` as a frozen integer. If it stays stored, the backlog silently stops ageing and the Detect step of the loop does not exist. |

---

## F. Metrics (§13)

All use `F-METRICS`. These carry decisions that exist only in the PRD, which
makes them the highest-value tests in the suite.

### TC-METRIC-001 — completion rate
| | |
|---|---|
| Golden ID | DASH-005 |
| PRD | §13 |
| Status | **BLOCKED: item 4** |
| Type | Unit |
| Priority | Must |
| **Given** | `F-METRICS`, period 1–30 June |
| **When** | Overall completion rate is computed |
| **Then** | **50% (2 of 4).** Numerator = m1, m2. Denominator = m1, m2, m3, m5. m4 is excluded because CANCELLED is entry error; m3 is included because a DECLINED action is uncompleted care. |
| Why it could break | The DECLINED/CANCELLED asymmetry is a deliberate product judgement. Any reimplementation from first principles would most likely treat them the same and be wrong. |

### TC-METRIC-002 — on-time completion rate
| | |
|---|---|
| Golden ID | DASH-006 |
| PRD | §13 |
| Status | **BLOCKED: item 4** |
| Type | Unit |
| Priority | Must |
| **Given** | `F-METRICS` |
| **When** | On-time rate is computed |
| **Then** | **25% (1 of 4).** m1 completed 8 Jun against a 10 Jun due date, so on time. m2 completed 14 Jun against 10 Jun, so not. Denominator is the same as completion rate. |
| Why it could break | Using completed steps as the denominator instead of the completion-rate denominator inflates this to 50%. |

### TC-METRIC-003 — median days to completion
| | |
|---|---|
| Golden ID | DASH-007 |
| PRD | §13 |
| Status | **BLOCKED: item 4** |
| Type | Unit |
| Priority | Must |
| **Given** | `F-METRICS` |
| **When** | Median days to completion is computed |
| **Then** | **10 days.** m1 = 8 Jun − 1 Jun = 7; m2 = 14 Jun − 1 Jun = 13; median of [7, 13] = 10. Measured from **visit date**, not due date. |
| Why it could break | Two traps: measuring from due date instead of visit date, and mishandling the even-count median. Add a three-value case to cover the odd path. |

### TC-METRIC-004 — overdue buckets are mutually exclusive
| | |
|---|---|
| Golden ID | DASH-008 |
| PRD | §13 |
| Status | **BLOCKED: item 4** |
| Type | Unit |
| Priority | Must |
| **Given** | Open steps at exactly 1, 7, 8, 30, 31, 90 and 91 days overdue |
| **When** | Backlog buckets are computed |
| **Then** | 1–7 contains {1, 7}; 8–30 contains {8, 30}; 31–90 contains {31, 90}; 90+ contains {91}. Every step appears in exactly one bucket; totals sum to 7. |
| Why it could break | Boundary-inclusive bucketing is easy to get wrong at both ends, and double-counted steps make the backlog look worse than it is. |

### TC-METRIC-005 — patients needing attention counts distinct patients
| | |
|---|---|
| Golden ID | DASH-009 |
| PRD | §13 |
| Status | **BLOCKED: item 4** |
| Type | Unit |
| Priority | Must |
| **Given** | One patient with three overdue steps, one patient with one overdue step |
| **When** | Patients-needing-attention is computed |
| **Then** | **2**, not 4 |
| Why it could break | This is the doctor dashboard's hero number. Counting steps instead of patients overstates the problem and undermines trust in every other figure. |

### TC-METRIC-006 — upcoming load window
| | |
|---|---|
| Golden ID | DASH-011 |
| PRD | §13 |
| Status | **BLOCKED: item 4** |
| Type | Unit |
| Priority | Should |
| **Given** | Today is 20 June. Open steps due on 20 June, 3 July (day 13), 4 July (day 14) and 5 July (day 15). |
| **When** | Upcoming load is computed |
| **Then** | Includes 20 June, 3 July and 4 July. Excludes 5 July. Window is the next 14 days inclusive. |
| Why it could break | Off-by-one at the far edge silently drops a day of workload from planning. |

---

## G. Guardrails — run every round

### TC-GUARD-001 — no clinical fields
| | |
|---|---|
| Golden ID | PAT-021 |
| PRD | BR-017 |
| Status | **READY** |
| Type | Static check |
| Priority | Must |
| **Given** | The whole repository |
| **When** | Type definitions, forms and message templates are searched for `diagnosis`, `prescription`, `symptom`, `vitals`, `bp`, `hba1c`, `glucose`, `medication`, `dose`, `allergy`, `notes` used as a clinical field |
| **Then** | No matches outside comments and the PRD text itself |
| Why it could break | This is the regulatory boundary and the promise in the concept note. It will be crossed by accident, in a helpful-looking commit, not on purpose. |

### TC-GUARD-002 — engine boundary intact
| | |
|---|---|
| Golden ID | — (new) |
| PRD | §6.2 |
| Status | **READY** |
| Type | Static check |
| Priority | Must |
| **Given** | Everything under `apps/` |
| **When** | Searched for `localStorage`, a concrete engine class, or imports from `seed.ts` |
| **Then** | No matches |
| Why it could break | This boundary is the central architectural claim of the product. One convenience import falsifies it. |

### TC-GUARD-003 — no named specialists
| | |
|---|---|
| Golden ID | DASH-012 |
| PRD | BR-019 |
| Status | **READY** |
| Type | Unit + review |
| Priority | Must |
| **Given** | Referral steps carrying `referralDestination` values |
| **When** | Any insight or aggregate is produced |
| **Then** | Aggregation keys are specialty codes only. No destination string appears in any aggregate, label, tooltip or export. |
| Why it could break | Destination is captured to help the patient. Aggregating it turns the product into a specialist-ranking tool, which §3.3 and BR-019 explicitly forbid. |

### TC-GUARD-004 — care-journey language
| | |
|---|---|
| Golden ID | DASH-017 |
| PRD | §3.3 |
| Status | **READY** |
| Type | Review |
| Priority | Should |
| **Given** | All user-facing copy in both apps |
| **When** | Reviewed against §3.3 |
| **Then** | No label frames a metric as staff or clinic performance. Administrator throughput appears only in the admin worklist header and never in the doctor app. |
| Why it could break | Performance framing changes how clinics receive the product, and it is a one-word mistake to make. |

---

## Findings raised while writing these cases

Five defects and one open decision surfaced before a line of test code was
written. This is the process working as intended.

| # | Case | Nature |
|---|---|---|
| 1 | TC-ORDER-003 | Unreachable section uses the wrong comparator — FR-A-6.3 specifies attempts-descending |
| 2 | TC-SECTION-001 | An `upcoming` section exists that FR-A-6.1 does not define — **decision needed, not a fix** |
| 3 | TC-MASK-001 | Masked mobile hardcodes a `98` prefix |
| 4 | TC-LIFE-001 | `cancelStep` accepts no reason, so BR-013 cannot be met |
| 5 | TC-LIFE-003 | No transition validation exists; terminal states are not protected |
| 6 | TC-OVER-003 | `daysOverdue` is stored rather than derived, contradicting §11.1 |

Item 2 of the build plan already covers 4 and 5. Item 3 covers 6. Items 1 and
3 are small and can go in alongside. Item 2 needs answering before it is coded.

---

## Sign-off

No test in this document should be implemented until the `Then` column has
been read and approved by a human who knows the PRD. Approval means: *if the
code disagrees with this assertion, the code is wrong.*

| Reviewer | Date | Cases approved |
|---|---|---|
| | | |
