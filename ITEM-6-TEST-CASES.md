# Item 6 — Test Cases

**Scope:** move per-deployment configuration out of code into a programme
profile, remove condition-specific vocabulary from both apps, and add a
maternal health profile with its own seed clinic.

**Sources:** FR-A-5.1, FR-A-5.2, §10.5, §13, §17, §3.3.

---

## The reframe

The five categories in FR-A-5.1 — Follow-up Visit, Lab Investigation,
Specialist Referral, Follow-up Phone Call, Other Clinic Action — are **already
condition-agnostic**. An ANC visit is a Follow-up Visit. Anaemia screening is a
Lab Investigation. An IFA adherence check is a Follow-up Phone Call.

Adding maternal-specific categories would contradict FR-A-5.1, break the FHIR
`Task.code` mapping built in item 5b, and break §13's by-category metrics.

What is condition-specific is **configuration**: category labels, default due
dates (FR-A-5.2 states these are configurable), reminder schedules per
category, the unreachable and lost-to-follow-up thresholds, the specialty list,
and the seed clinic.

So item 6 makes that configuration data rather than code, and demonstrates it
with a second profile.

---

## Build order

**6a — profile as data.** TC-CFG-001 to 005. Extracts configuration.

**6b — de-condition the vocabulary.** TC-CFG-006 to 007. Removes diabetology
shorthand from the apps.

**6c — maternal profile.** TC-MAT-001 to 004. Proves the abstraction works.

---

## 6a — Programme profile as data

### TC-CFG-001 — category default due dates come from the profile
| | |
|---|---|
| PRD | FR-A-5.2 |
| Type | Unit |
| Priority | Must |
| **Given** | Two profiles: one setting Follow-up Visit default to 1 month, another setting it to 2 weeks |
| **When** | The default due-date key for Follow-up Visit is read under each |
| **Then** | 1 month and 2 weeks respectively. The value is read from the profile, not from a constant in `catalog.ts`. |
| Why it could break | FR-A-5.2 says the defaults are configurable, with the current values described as *initial* defaults. They are the main lever on the sub-60-second capture target, and different programmes need different ones — an ANC follow-up interval is not a diabetes review interval. |

### TC-CFG-002 — category labels come from the profile
| | |
|---|---|
| PRD | FR-A-5.1, §3.3 |
| Type | Unit |
| Priority | Must |
| **Given** | A profile overriding the label for FOLLOW_UP_VISIT to "ANC visit" |
| **When** | Category labels are read |
| **Then** | The label is "ANC visit". The underlying category key is unchanged — still FOLLOW_UP_VISIT. |
| Why it could break | Labels are what a frontline worker reads; category keys are what the metrics and the CCE correlate on. Conflating them means a label change silently breaks aggregation. |

### TC-CFG-003 — thresholds come from the profile
| | |
|---|---|
| PRD | §10.5 |
| Type | Unit |
| Priority | Must |
| **Given** | A profile setting `unreachableThreshold` to 4 and `lostToFollowUpDays` to 45 |
| **When** | The worklist and the lost-to-follow-up metric are computed |
| **Then** | Both use the profile values, not the documented defaults of 3 and 30. |
| Why it could break | Item 3 made the unreachable threshold configurable but it is passed at the call site. §10.5 makes both clinic configuration, and §21 lists the lost-to-follow-up window as a question clinicians will answer during review — it must be changeable without a code edit. |

### TC-CFG-004 — category codes are stable across profiles
| | |
|---|---|
| PRD | §17, §13 |
| Type | Unit |
| Priority | Must |
| **Given** | The same step captured under a diabetes profile and under a maternal profile |
| **When** | Each is mapped to a FHIR Task |
| **Then** | `Task.code.coding[].code` is **identical** in both. Labels differ; codes do not. |
| Why it could break | This is the most important case in the item. If codes varied by profile, the CCE could not correlate a follow-up visit from a maternal clinic with one from a diabetes clinic, and §13's by-category metrics would fragment across deployments. The profile must change presentation, never the interoperability contract. |

### TC-CFG-005 — a partial profile falls back to documented defaults
| | |
|---|---|
| PRD | FR-A-5.2, §10.5 |
| Type | Unit |
| Priority | Should |
| **Given** | A profile specifying only `unreachableThreshold` |
| **When** | Category defaults, labels and `lostToFollowUpDays` are read |
| **Then** | Each returns the documented default. Nothing throws, nothing is undefined. |
| Why it could break | A deployment will supply a partial profile. Failing hard on an absent optional field turns a configuration convenience into a deployment blocker. |

---

## 6b — Removing condition-specific vocabulary

### TC-CFG-006 — drill-down keys derive from categories
| | |
|---|---|
| PRD | FR-D-2.2, §3.3 |
| Type | Unit + static check |
| Priority | Must |
| **Given** | The doctor dashboard's drill-down keys |
| **When** | They are enumerated |
| **Then** | Each derives from a category key or a coordination state. No key is a diabetology abbreviation — `invest` and `referral` as hardcoded literals must not appear. |
| Why it could break | `DrillKey` currently hardcodes diabetology shorthand into the doctor's dashboard shape. It works, but it means the dashboard's structure carries a condition assumption that no configuration can reach. |

### TC-CFG-007 — no condition name is hardcoded in either app
| | |
|---|---|
| PRD | §3.3 |
| Type | Static check |
| Priority | Must |
| **Given** | All user-facing copy in `apps/admin` and `apps/doctor` |
| **When** | Searched for condition names — diabetes, diabetic, diabetology, HbA1c, glycaemic, RSSDI |
| **Then** | No match outside the profile and seed data. Any condition name reaching the screen comes from configuration. |
| Why it could break | A single hardcoded "diabetes" in a heading undermines the condition-agnostic claim in the most visible possible way — on stage, mid-demo, in a maternal health configuration. |

---

## 6c — Maternal profile

### TC-MAT-001 — the maternal profile produces a valid worklist
| | |
|---|---|
| PRD | FR-A-6.1 |
| Type | Unit |
| Priority | Must |
| **Given** | The maternal profile and its seed clinic loaded |
| **When** | The worklist is built |
| **Then** | All five sections behave per FR-A-6.1 with at least one step in each of Overdue, Due today, Due soon, Unreachable and Completed today. Ordering follows BR-014 unchanged. |
| Why it could break | The switch has to be demonstrable in seconds with a populated screen. An empty section on stage reads as a broken app. |

### TC-MAT-002 — maternal next steps map onto the five categories
| | |
|---|---|
| PRD | FR-A-5.1 |
| Type | Unit |
| Priority | Must |
| **Given** | The maternal seed clinic containing an ANC visit, an anaemia screening, a referral for a high-risk pregnancy, an IFA adherence call, and an immunisation reminder |
| **When** | Each step's category is read |
| **Then** | They map to FOLLOW_UP_VISIT, LAB_INVESTIGATION, SPECIALIST_REFERRAL, FOLLOW_UP_CALL and OTHER respectively. **No sixth category exists.** |
| Why it could break | This case *is* the condition-agnostic claim. If a maternal workflow needs a new category, the claim is false and the FR-A-5.1 model is wrong. |

### TC-MAT-003 — §13 metrics compute identically under either profile
| | |
|---|---|
| PRD | §13 |
| Type | Unit |
| Priority | Must |
| **Given** | Two fixtures with identical coordination shape — same due dates, statuses and completion dates — one under each profile |
| **When** | Completion rate, on-time rate, median days to completion and the overdue buckets are computed |
| **Then** | Every figure is identical. No formula reads a label, a profile name or a condition. |
| Why it could break | §13's formulas must be programme-independent. A formula branching on profile would mean two deployments' numbers are not comparable — which destroys any cross-district reporting a programme leader needs. |

### TC-MAT-004 — CCE emission is unchanged under the maternal profile
| | |
|---|---|
| PRD | §17 |
| Type | Unit |
| Priority | Must |
| **Given** | A step completed in the maternal seed clinic |
| **When** | The coordination event is read from the outbox |
| **Then** | A well-formed CloudEvents envelope wrapping a FHIR Task, with the same `Task.code` system and the same status mapping as the diabetes profile. `subject` still matches the patient reference inside `data`. |
| Why it could break | Closes the loop on TC-CFG-004 at the event level. A funder watching the profile switch will reasonably ask whether the events still work — this is the answer. |

---

## Guardrails

| Check | Rule |
|---|---|
| BR-017 | The profile carries no clinical content — no diagnostic thresholds, protocols, dosages or treatment guidance. It configures labels, intervals and thresholds only. |
| BR-019 | The specialty list carries specialties, never named providers. |
| §3.3 | Care-journey language in every profile label. No staff-performance framing. |
| Regression | All 114 existing assertions stay green under the default profile. |

**BR-017 deserves emphasis here.** A "programme profile" is exactly the place
where clinical protocol content would feel natural to add — ANC schedules,
screening thresholds, supplementation dosages. It must not. The profile
configures coordination, not care.

---

## What success looks like

Load the maternal profile, and the same application shows ANC visits, anaemia
screening and IFA adherence calls across five sections, with identical metric
formulas and identical FHIR codes underneath.

Roughly thirty seconds on stage, and it answers *"is this just a diabetes
tool?"* better than any slide.

---

## Open question — now confirmed

§8.5 states no investigation catalogue is maintained in the MVP, and that the
system records only whether a laboratory investigation was requested.
§10.5 lists `InvestigationCatalogueItem` and `SpecialtyItem` as clinic-editable
entities "seeding FR-A-5.3" — and **there is no FR-A-5.3** in §8.5's numbered
list, which runs 5.1, 5.2, 5.4, 5.5, 5.6, 5.7.

This is the contradiction the golden suite raised in its §8 list, now confirmed
against both clauses. It needs a ruling before any catalogue work: is the
picklist in or out of the MVP?

Until answered, the profile carries a specialty list only (needed for BR-019
referral aggregation) and no investigation catalogue.

---

## Sign-off

| Reviewer | Date | Cases approved |
|---|---|---|
| | | |
