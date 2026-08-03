# Item 3 — Test Cases

**Scope:** real dates on every step, `isOverdue` / `daysOverdue` derived on
read, worklist section derived rather than stored, clinic-timezone day
boundaries, seed data relative to today.

**Sources:** §10 (timestamps stored UTC, rendered in clinic timezone),
§10.3, §10.5 (`unreachableThreshold` default 3), §11.1, §11.3, FR-A-6.1.

**Why this item matters:** `isOverdue = dueDate < today AND status is not
terminal` (§11.1) is not implemented anywhere. `over` is a frozen integer set
once in seed data and `TODAY_LABEL` is the literal string `'Monday, 6 July'`.
Until this lands, the Detect step of Capture → Remind → Expect → Detect →
Close does not exist in the product.

---

## Build order

**3a — Real dates and overdue derivation.** TC-DATE-001/002,
TC-OVER-001 to 005. Changes the stored shape of `WorkStep`.

**3b — Section derivation.** TC-SECT-001 to 004, TC-SEED-001. Depends on 3a.

---

## Testing the clock

Several cases require controlling "now". Use vitest's fake timers
(`vi.useFakeTimers()` / `vi.setSystemTime()`) rather than adding a clock
parameter to the engine API. The production interface should not grow a
test-only argument.

---

## 3a — Real dates and overdue derivation

### TC-DATE-001 — due dates are dates
| | |
|---|---|
| PRD | §10.3, §10 |
| Type | Unit |
| Priority | Must |
| **Given** | Any step, seed or newly captured |
| **When** | Its `dueDate` is read |
| **Then** | It is a `Date` (or ISO-8601 string), not a display label. `'28 Jun'`, `'Today'` and similar must not appear as stored values anywhere. |
| Why it could break | A display string cannot be compared, sorted or subtracted. Every derivation in this item depends on this landing first. |

### TC-DATE-002 — display labels are derived
| | |
|---|---|
| PRD | §10, FR-A-6.4 |
| Type | Unit |
| Priority | Must |
| **Given** | Today is 20 June in Asia/Kolkata. Steps due 20 June, 19 June and 28 July. |
| **When** | Each is decorated for display |
| **Then** | Labels are `Today`, `19 Jun` and `28 Jul` respectively. The label is computed from `dueDate`, never stored. |
| Why it could break | If any label is stored, it goes stale the moment the date rolls over — which is exactly the current bug. |

### TC-OVER-001 — overdue boundary
| | |
|---|---|
| PRD | §11.1 |
| Type | Unit |
| Priority | Must |
| **Given** | Today is 20 June. Three SCHEDULED steps due 19, 20 and 21 June. |
| **When** | Overdue flags are derived |
| **Then** | 19 June → `isOverdue` true, `daysOverdue` 1. 20 June → **false**, 0. 21 June → false, 0. |
| Why it could break | "Due today" must not read as overdue. An off-by-one here inflates the overdue backlog by a full day's steps every single day, and that figure is on the doctor's dashboard. |

### TC-OVER-002 — terminal steps are never overdue
| | |
|---|---|
| PRD | §11.1 |
| Type | Unit |
| Priority | Must |
| **Given** | Steps due 1 June with statuses COMPLETED, CANCELLED and DECLINED. Today is 20 June. |
| **When** | Overdue flags are derived |
| **Then** | All three have `isOverdue` false and `daysOverdue` 0. |
| Why it could break | The rule has two clauses and the second is easy to omit. Without it, completed work stays on the worklist forever. |

### TC-OVER-003 — overdue is derived, never stored
| | |
|---|---|
| PRD | §11.1, §11.3 |
| Type | Unit |
| Priority | Must |
| **Given** | A SCHEDULED step due yesterday. `daysOverdue` reads 1. |
| **When** | The system clock is advanced seven days and the same step is read again, with no intervening write |
| **Then** | `daysOverdue` reads 8. Assert no mutation occurred — the persisted record is byte-identical before and after. |
| Why it could break | This is the whole item. If the value is stored, the backlog silently stops ageing and Detect does not exist. |

### TC-OVER-004 — day boundaries follow clinic timezone
| | |
|---|---|
| PRD | §10, §10.5 |
| Type | Unit |
| Priority | Must |
| **Given** | Clinic timezone Asia/Kolkata. A SCHEDULED step due 20 June. The clock reads 2026-06-20T20:30:00Z — which is 02:00 on **21 June** in IST. |
| **When** | Overdue flags are derived |
| **Then** | `isOverdue` is true, `daysOverdue` 1. The clinic's calendar day has rolled over even though the UTC date has not. |
| Why it could break | Item 2's `dayStart()` helper uses `Date.UTC`, so today's completion-bound checks are already evaluated in UTC rather than IST. Between 18:30 and 24:00 IST every day, UTC is still on the previous date. This case fixes that too — verify TC-LIFE-004 still passes afterwards. |

### TC-OVER-005 — days overdue counts calendar days
| | |
|---|---|
| PRD | §11.1 |
| Type | Unit |
| Priority | Should |
| **Given** | Today is 20 June, 09:00 IST. A step due 19 June with a stored timestamp of 23:00 IST. |
| **When** | `daysOverdue` is derived |
| **Then** | 1, not 0. The count is whole calendar days between due date and today in clinic time, not elapsed hours divided by 24. |
| Why it could break | Millisecond subtraction plus `Math.floor` gives 0 here, which understates every backlog figure by up to a day. |

---

## 3b — Section derivation

### TC-SECT-001 — section is derived, not stored
| | |
|---|---|
| PRD | FR-A-6.1, §11.3 |
| Type | Unit |
| Priority | Must |
| **Given** | A SCHEDULED step due tomorrow, currently in Due soon |
| **When** | The clock advances two days and the worklist is rebuilt, with no intervening write |
| **Then** | The step now appears in Overdue. The stored record is unchanged. `section` must not exist as a persisted field. |
| Why it could break | Storing the section is the same mistake as storing `over`, one level up. It looks correct until the date rolls over. |

### TC-SECT-002 — due soon window
| | |
|---|---|
| PRD | FR-A-6.1 |
| Type | Unit |
| Priority | Must |
| **Given** | Today is 20 June. SCHEDULED steps due 21 June (day 1), 27 June (day 7) and 28 June (day 8). |
| **When** | The worklist is built |
| **Then** | 21 June and 27 June are in Due soon. 28 June is in **no section** — beyond the 7-day window, and `upcoming` was removed in favour of FR-A-6.1. |
| Why it could break | "Next 7 days" is ambiguous at the far edge. Getting it wrong shifts a day's work in or out of the administrator's view. |

### TC-SECT-003 — unreachable takes precedence over overdue
| | |
|---|---|
| PRD | FR-A-6.1 — **see open question** |
| Type | Unit |
| Priority | Must |
| **Given** | A SCHEDULED step due 10 days ago with `unreachableAttempts` 4, threshold 3 |
| **When** | The worklist is built |
| **Then** | It appears in Unreachable and **not** in Overdue. It appears in exactly one section. |
| Why it could break | Without a precedence rule the step appears twice and every section count double-counts it. |

> **Open question — needs a PRD ruling.**
> FR-A-6.1 lists the five sections but does not state precedence when a step
> qualifies for more than one. The seed fixture implies Unreachable wins
> (w8 and w9 are both overdue *and* unreachable, and both sit in `unreach`),
> so that is the provisional interpretation. Mark the assertion
> `PROVISIONAL` in a comment. Add this to the same escalation as the
> 48-hour reopen boundary.

### TC-SECT-004 — unreachable threshold is configurable
| | |
|---|---|
| PRD | §10.5 |
| Type | Unit |
| Priority | Should |
| **Given** | Steps with 2, 3 and 4 failed attempts |
| **When** | The worklist is built with the default threshold of 3, and again with a clinic threshold of 4 |
| **Then** | At threshold 3: the 3- and 4-attempt steps are Unreachable. At threshold 4: only the 4-attempt step is. |
| Why it could break | The threshold is hardcoded today. §10.5 makes it clinic configuration, and it is one of the §21 questions clinicians will want to answer during review. |

### TC-SEED-001 — seed dates are relative to today
| | |
|---|---|
| PRD | — (demo integrity, not a spec clause) |
| Type | Unit |
| Priority | Must |
| **Given** | Any system date |
| **When** | The seed clinic is loaded and the worklist built |
| **Then** | Every section is non-empty: at least one overdue step, one due today, one due soon, one unreachable, one completed. Seed due dates are defined as offsets from today, never as absolute dates. |
| Why it could break | Seed data currently hardcodes `'28 Jun'` against a `TODAY_LABEL` of `'Monday, 6 July'`. Demo the app in October and everything is months overdue and the Due today section is empty. This case makes the demo correct on any date, permanently. |

---

## Guardrails

Standing set, plus one specific to this item:

| Check | Rule |
|---|---|
| BR-017 | No clinical field introduced while reshaping `WorkStep`. |
| Boundary | `apps/` still imports only the engine interface. |
| Regression | All 55 existing assertions stay green. TC-LIFE-004 in particular — it tests completion bounds and TC-OVER-004 changes the day-boundary helper it relies on. |

---

## What success looks like

Set the system clock forward a week and reload the app. The overdue counts
should have grown, steps should have moved between sections, and nothing
should have been written to storage.

That is Detect, working. It is also the single most convincing thing you can
show a funder without a backend.

---

## Sign-off

| Reviewer | Date | Cases approved |
|---|---|---|
| | | |
