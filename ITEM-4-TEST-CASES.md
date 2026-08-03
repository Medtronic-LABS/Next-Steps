# Item 4 — Test Cases

**Scope:** every doctor-dashboard figure computed from live coordination
state. Replaces the hardcoded `INSIGHTS_BY_PERIOD` fixtures and the fixed
`DRILL` ID map.

**Sources:** §13 (normative formulas), FR-D-2.2, FR-D-3, BR-018, BR-019, §3.3.

**Why this item matters:** `insights()` currently returns a lookup table and
`drill()` reads a hardcoded list of the ten seed IDs. Nothing the
administrator does appears in the doctor app. The most natural request a
funder will make — *"complete a few and show me the rate change"* — currently
produces no change at all.

---

## Deferred from this item

**Reminder reach.** §13 requires reminders SENT/DELIVERED/READ/FAILED in
period, which needs the Reminder entity (§10.4) that item 2 deferred. Not in
scope here.

**Consent coverage** *is* in scope — consented patients ÷ patients with ≥1
open step is computable from the Patient record today.

---

## Build order

**4a — pure metric functions.** TC-MET-001 to 012. All in `logic.ts`, no
engine involvement. Highest value, easiest to assert.

**4b — engine wiring.** TC-DASH-001 to 005. Replaces the fixtures and the
drill map so the dashboard responds to live state.

---

## Open question — period boundaries

§13 says a step belongs to a period by its due date, and periods are 7/30/90
days. It does not state whether the window is inclusive at both ends.

Provisional interpretation, used throughout below: **the period is the N days
ending today, inclusive** — for N=30 and today = 20 June, that is 22 May to
20 June. Mark assertions using the far boundary `PROVISIONAL`. Add to the
escalation list alongside the 48-hour reopen boundary and section precedence.

---

## Fixtures

### `F-METRICS`

Today is **20 June 2026**, clinic timezone Asia/Kolkata. Period = 30 days.

| id | category | visitDate | dueDate | status | completedDate | attempts | patient |
|---|---|---|---|---|---|---|---|
| m1 | FOLLOW_UP_VISIT | 1 Jun | 10 Jun | COMPLETED | 8 Jun | 0 | pA |
| m2 | LAB_INVESTIGATION | 1 Jun | 10 Jun | COMPLETED | 14 Jun | 0 | pB |
| m3 | SPECIALIST_REFERRAL | 1 Jun | 12 Jun | DECLINED | — | 0 | pC |
| m4 | FOLLOW_UP_CALL | 1 Jun | 12 Jun | CANCELLED | — | 0 | pD |
| m5 | FOLLOW_UP_VISIT | 1 Jun | 15 Jun | SCHEDULED | — | 0 | pA |
| m6 | LAB_INVESTIGATION | 1 Apr | 1 May | SCHEDULED | — | 4 | pE |

Note m6 falls **outside** the 30-day period by due date but is still open and
overdue — it exercises the difference between period-bound and snapshot
metrics.

Other cases build their own small fixtures. One fixture per concern.

---

## 4a — Pure metric functions

### TC-MET-001 — completion rate
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Must |
| **Given** | `F-METRICS`, 30-day period |
| **When** | Overall completion rate is computed |
| **Then** | **50% (2 of 4).** Numerator m1, m2. Denominator m1, m2, m3, m5. m4 excluded (CANCELLED is entry error). m3 included (DECLINED is uncompleted care). m6 excluded — due date outside period. |
| Why it could break | The DECLINED/CANCELLED asymmetry is a deliberate product judgement that exists only in the PRD. Any reimplementation from first principles would most likely treat them the same, and be wrong. |

### TC-MET-002 — period membership is by due date
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Must |
| **Given** | Today is 20 June. A step with visitDate 1 April, dueDate 1 May, COMPLETED on 5 June. |
| **When** | Completion rate is computed for the 30-day period |
| **Then** | The step is **excluded** from both numerator and denominator. Membership follows due date, not visit date and not completion date. |
| Why it could break | Using completion date here is the intuitive choice and it is wrong for this metric — though it *is* right for median days to completion, which makes the inconsistency a live trap. |

### TC-MET-003 — on-time completion rate
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Must |
| **Given** | `F-METRICS`, 30-day period |
| **When** | On-time rate is computed |
| **Then** | **25% (1 of 4).** m1 completed 8 Jun against due 10 Jun, on time. m2 completed 14 Jun against due 10 Jun, late. Denominator is identical to completion rate — 4, not 2. |
| Why it could break | Using completed steps as the denominator gives 50% and looks plausible. §13 specifies the same denominator as completion rate. |

### TC-MET-004 — on-time boundary is inclusive
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Must |
| **Given** | A step due 10 June, completed exactly 10 June |
| **When** | On-time rate is computed |
| **Then** | Counted as on time. §13 says `completedDate ≤ dueDate`. |
| Why it could break | A strict `<` silently penalises every step completed on its due date, which is the most common case. |

### TC-MET-005 — median days to completion
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Must |
| **Given** | `F-METRICS`, 30-day period |
| **When** | Median days to completion is computed, overall and per category |
| **Then** | Overall **10** — m1 is 8 Jun − 1 Jun = 7, m2 is 14 Jun − 1 Jun = 13, median of [7, 13] = 10. Per category: FOLLOW_UP_VISIT 7, LAB_INVESTIGATION 13. Measured from **visitDate**, over steps **completed in the period** — not steps due in it. |
| Why it could break | Three traps in one metric: measuring from due date instead of visit date, using the due-date period rule instead of the completion-date one, and mishandling an even-count median. |

### TC-MET-006 — median with an odd count
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Should |
| **Given** | Three completed steps with durations 4, 9 and 20 days |
| **When** | Median is computed |
| **Then** | **9** — the middle value, not the mean of 11 |
| Why it could break | Even and odd paths differ. TC-MET-005 covers even; this covers odd. |

### TC-MET-007 — overdue buckets are a snapshot and mutually exclusive
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Must |
| **Given** | Open steps at exactly 1, 7, 8, 30, 31, 90 and 91 days overdue. Today is 20 June, period 30 days. |
| **When** | Overdue buckets are computed |
| **Then** | 1–7 contains {1, 7}. 8–30 contains {8, 30}. 31–90 contains {31, 90}. 90+ contains {91}. Every step in exactly one bucket, total 7. **No step is excluded for falling outside the period** — this metric is a snapshot, not period-bound. |
| Why it could break | Two failure modes: boundary-inclusive bucketing wrong at either end, and wrongly applying the period filter. The second would hide the oldest backlog entirely, which is precisely the backlog that matters. |

### TC-MET-008 — patients needing attention counts distinct patients
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Must |
| **Given** | Patient pA with three overdue open steps; patient pE with one overdue open step that also has attempts above threshold |
| **When** | Patients-needing-attention is computed |
| **Then** | **2**, not 4. Definition is distinct patients having ≥1 overdue **or** unreachable open step. pE is counted once, not twice. |
| Why it could break | This is the doctor dashboard's hero number. Counting steps rather than patients overstates the problem and undermines confidence in every other figure on the screen. |

### TC-MET-009 — unreachable patients respects the clinic threshold
| | |
|---|---|
| PRD | §13, §10.5 |
| Type | Unit |
| Priority | Must |
| **Given** | Open steps with 2, 3 and 4 attempts across three distinct patients |
| **When** | Unreachable patients is computed at threshold 3, then at threshold 4 |
| **Then** | At 3: **2** patients. At 4: **1** patient. Terminal steps are never counted — the definition says open steps. |
| Why it could break | The threshold is clinic configuration (§10.5), not a constant, and it is one of the §21 questions clinicians will want to set during review. |

### TC-MET-010 — upcoming load is per day over 14 days
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Should |
| **Given** | Today is 20 June. Open steps due 20 June (×2), 3 July (day 13), 4 July (day 14), 5 July (day 15). |
| **When** | Upcoming load is computed |
| **Then** | A per-day series covering 14 days. 20 June shows 2. Day 13 and day 14 each show 1. **5 July is excluded** — outside the window. Total 4. |
| Why it could break | §13 says *per day*, not a single total. An aggregate count loses the shape the doctor needs for planning, and the far boundary is easy to slip by one. |

### TC-MET-011 — referral completion splits by specialty, never by destination
| | |
|---|---|
| PRD | §13, BR-019 |
| Type | Unit |
| Priority | Must |
| **Given** | Four SPECIALIST_REFERRAL steps: two with specialty `NEPHROLOGY` and destinations "Dr Rao's clinic" and "City Kidney Centre"; two with specialty `OPHTHALMOLOGY` |
| **When** | Referral completion rate is computed |
| **Then** | Two groups keyed on `NEPHROLOGY` and `OPHTHALMOLOGY`. **No aggregate key, label, tooltip or export value contains a destination string.** |
| Why it could break | Destination is captured to help the patient reach the right place. Aggregating on it turns Next Steps into a specialist-ranking tool, which BR-019 and §3.3 explicitly forbid. This is a reputational guardrail, not a cosmetic one. |

### TC-MET-012 — percentages carry their denominators
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Should |
| **Given** | A completion rate of 2 of 4 |
| **When** | It is formatted for display |
| **Then** | Output includes both the percentage and the denominator, e.g. `50% (2 of 4)`. |
| Why it could break | §13 requires this so small numbers are never misleading. "100%" from one step out of one is the kind of figure that destroys credibility when someone asks what it is based on. |

### TC-MET-013 — lost to follow-up
| | |
|---|---|
| PRD | §13 — **PROVISIONAL** |
| Type | Unit |
| Priority | Should |
| **Given** | Patient pX with two open steps, both 35 days overdue, most recent having attempts 4 against threshold 3, no visit since. Patient pY with one step 35 days overdue and one step 5 days overdue. |
| **When** | Lost-to-follow-up is computed with `lostToFollowUpDays` 30 |
| **Then** | pX counted. pY **not** counted — the definition requires *every* open step to be ≥30 days overdue. Result is 1. |
| Why it could break | The "every open step" clause is the discriminating one and the easy mistake is "any". §13 flags this whole definition as a default proposal and a §21 open question — mark the assertion PROVISIONAL and do not treat it as settled. |

---

## 4b — Engine wiring

### TC-DASH-001 — insights derive from live state
| | |
|---|---|
| PRD | FR-D-3, BR-018 |
| Type | Unit |
| Priority | Must |
| **Given** | A seeded clinic. Completion rate is read and recorded. |
| **When** | One open step with a due date inside the period is completed, and completion rate is read again |
| **Then** | The value has changed, and equals what the §13 formula gives for the new state. Assert the exact new figure, not merely that it differs. |
| Why it could break | `insights()` returns a hardcoded lookup table. This is the single biggest live-demo hazard in the product — the obvious thing a funder asks for produces no visible change. |

### TC-DASH-002 — drill-downs derive from live state
| | |
|---|---|
| PRD | FR-D-2.2 |
| Type | Unit |
| Priority | Must |
| **Given** | A seeded clinic. A new step is captured for a new patient with a due date in the past. |
| **When** | The overdue drill-down is read |
| **Then** | The newly captured step appears in it. Assert on the new patient's presence specifically. |
| Why it could break | `drill()` reads a fixed map of the ten seed IDs, so nothing captured can ever appear. The doctor's view of who is at risk is permanently incomplete. |

### TC-DASH-003 — period toggle changes results
| | |
|---|---|
| PRD | FR-D-3 |
| Type | Unit |
| Priority | Must |
| **Given** | A step due 60 days ago and COMPLETED, plus a step due 5 days ago and COMPLETED |
| **When** | Completion rate is computed for 7, 30 and 90 days |
| **Then** | Each window includes only steps whose due dates fall inside it. The 7-day and 90-day figures differ, and each matches the §13 formula for its own window. |
| Why it could break | An earlier commit made the toggle change the *displayed fixture*. This asserts it changes the actual computation. |

### TC-DASH-004 — every figure traces to coordination state
| | |
|---|---|
| PRD | BR-018 |
| Type | Static check |
| Priority | Must |
| **Given** | The insights implementation |
| **When** | Its inputs are inspected |
| **Then** | Every figure derives from Next Step, Visit or Patient coordination fields. No hardcoded `INSIGHTS_BY_PERIOD` or equivalent fixture remains in the source. |
| Why it could break | Leaving one fixture behind as a fallback means a figure on screen that no formula produced. |

### TC-DASH-005 — administrator throughput stays out of the doctor app
| | |
|---|---|
| PRD | §13, §3.3 |
| Type | Static check + review |
| Priority | Must |
| **Given** | Both apps |
| **When** | Searched for administrator-throughput figures |
| **Then** | It appears only in the admin worklist header. No throughput, staff or per-user performance figure appears anywhere in the doctor app. |
| Why it could break | §13 is explicit that this is the one metric confined to the admin app. §3.3 frames the whole product as care-journey, not staff performance — and how clinics receive Next Steps depends on holding that line. |

---

## Guardrails

| Check | Rule |
|---|---|
| BR-018 | Every dashboard figure derives solely from coordination state |
| BR-019 | No aggregate keyed on a named specialist or destination |
| §3.3 | No copy framing a metric as staff or clinic performance |
| BR-017 | No clinical field introduced |
| Boundary | `apps/` imports only the engine interface |
| Regression | All 70 existing assertions stay green |

---

## What success looks like

Open both apps side by side. Complete a step in the administrator worklist,
refresh the doctor dashboard, and watch the completion rate move to the value
§13 predicts.

That closes the demo hazard, and it is the moment the doctor app stops being
a mock-up.

---

## Sign-off

| Reviewer | Date | Cases approved |
|---|---|---|
| | | |
