# Item 9 — PHC MO Maternal Dashboard: Spec Increment and Test Cases

**Scope:** Tier 1 only — dashboard items computable from existing data, no new
modelling. Tier 2 (recommended-tier lookup, investigation subtypes) and
trimester-wise progress are deferred pending the decisions noted in the
conversation record.

---

## NS-18 Dashboard views (PHC MO, ~30,000 scope)

Six figures, all HRP-scoped, all derived on read (§11.1 precedent):

| # | Figure | Definition |
|---|---|---|
| i | HRP % | HRP-flagged patients ÷ total registered pregnant women in scope |
| ii | Referrals | HRPs with at least one pending (open) referral |
| iii | ANC | HRPs with at least one overdue `FOLLOW_UP_VISIT` step (ANC visit label) |
| iv | PMSMA | HRPs with an overdue PMSMA-labelled `OTHER` step |
| v | At risk of drop-out | HRPs meeting NS-9's existing at-risk derivation (escalationCount >= 2) |
| vi | Lost to follow-up | HRPs whose most recent tracking outcome is "does not want to go" **only**. "Could not be contacted" is explicitly excluded — that case remains part of at-risk/escalation, per NS-9, and must not double-count here. |

SC/HWC and village-level filtering are out of scope for this item — deferred,
to be added as a scope-drilldown extension of NS-1.

## NS-19 Dashboard insights (PHC MO)

Five figures:

| # | Insight | Definition |
|---|---|---|
| i | HRP referral closure status | Per NS-6: total resolved, split `REFERRED_PUBLIC_FACILITY` / `OTHER_PUBLIC_FACILITY` / `PRIVATE_FACILITY`, against total raised |
| ii | HRP ANC compliance rate | Planned ANC visits completed ÷ planned ANC visits due, HRP-scoped. Per the existing decision: this measures **planned dates met**, not GOI protocol windows — no gestational age is available to compute the latter |
| iii | HRP PMSMA attendance rate | Scheduled PMSMA sessions attended ÷ scheduled, HRP-scoped |
| iv | HRP tracking success rate | Tracking outcomes resolving positively (any "completed" outcome per NS-7) ÷ total tracking outcomes recorded, HRP-scoped |
| — | (vi, vii in the source list are Tier 2 — deferred) |

---

## Fixtures

Reuse `F-METRICS`-style construction from item 4, HRP-flagged, with:

- A mix of HRP and non-HRP patients, to prove item (i) and every subsequent
  figure filters correctly
- At least one patient with an open referral, one with none
- At least one overdue ANC step, one on-time
- At least one overdue PMSMA step, one on-time
- One patient with escalationCount >= 2 (at-risk)
- One patient whose latest tracking outcome is "does not want to go"
  (lost-to-follow), and separately one whose latest is "could not be
  contacted" (must NOT appear in lost-to-follow)
- Referrals resolved at each of the three completion locations

---

## Test cases

### TC-DASH-101 — HRP percentage
| | |
|---|---|
| Spec | NS-18(i) |
| Priority | Must |
| **Given** | 10 registered pregnant women in scope, 3 flagged HRP |
| **When** | HRP % is computed |
| **Then** | 30% (3 of 10). Non-HRP patients never appear in the numerator. |

### TC-DASH-102 — referrals pending
| | |
|---|---|
| Spec | NS-18(ii) |
| Priority | Must |
| **Given** | 3 HRPs: one with an open referral, one with a resolved referral only, one with none |
| **When** | Referrals-pending is computed |
| **Then** | 1. A resolved-only referral does not count as pending. |

### TC-DASH-103 — ANC overdue
| | |
|---|---|
| Spec | NS-18(iii) |
| Priority | Must |
| **Given** | HRPs with an ANC-visit step overdue, due-today, and not-yet-due |
| **When** | ANC-overdue is computed |
| **Then** | Only the overdue one counts. Uses the same overdue derivation as §11.1 — must agree with the worklist's own overdue flag on the same step, not a separate calculation. |

### TC-DASH-104 — PMSMA overdue
| | |
|---|---|
| Spec | NS-18(iv) |
| Priority | Must |
| **Given** | HRPs with a PMSMA-labelled step overdue and not overdue |
| **When** | PMSMA-overdue is computed |
| **Then** | Only the overdue one counts. |

### TC-DASH-105 — at-risk of drop-out reuses NS-9
| | |
|---|---|
| Spec | NS-18(v) |
| Priority | Must |
| **Given** | An HRP with escalationCount = 2, another with escalationCount = 1 |
| **When** | At-risk-of-drop-out is computed for the dashboard |
| **Then** | Only the first counts. Assert this calls the same derivation NS-9 already defines — not a reimplementation with its own threshold. |

### TC-DASH-106 — lost to follow-up excludes unreachable
| | |
|---|---|
| Spec | NS-18(vi) |
| Priority | Must |
| **Given** | HRP A's latest tracking outcome is "does not want to go"; HRP B's latest is "could not be contacted" |
| **When** | Lost-to-follow-up is computed |
| **Then** | Only A counts. B does not appear here — confirm B still appears in at-risk/escalation figures, so B is not silently dropped from every view, only from this one. |
| Why it matters | This is a redefinition of what "lost to follow" means for *this dashboard specifically*, distinct from NS-9's broader derived state used elsewhere. Naming collision risk — implementation must not overwrite NS-9's original definition, only add this dashboard-scoped variant. |

### TC-DASH-107 — referral closure status by location
| | |
|---|---|
| Spec | NS-19(i) |
| Priority | Must |
| **Given** | HRP referrals resolved at all three completion locations, plus some still open |
| **When** | Referral closure status is computed |
| **Then** | Total resolved and the three-way split match NS-6 exactly. Open referrals are excluded from the resolved total but visible as a separate "pending" count. |

### TC-DASH-108 — ANC compliance is planned-dates, not protocol-windows
| | |
|---|---|
| Spec | NS-19(ii) |
| Priority | Must |
| **Given** | HRP ANC steps, some completed on/before their planned due date, some late, some still open |
| **When** | ANC compliance rate is computed |
| **Then** | Denominator is ANC steps due in the period; numerator is those completed. **No gestational-age or LMP-derived calculation appears anywhere in this function.** The UI label must state "planned date met" — never "protocol window met." |
| Why it matters | This is the guardrail against silently reintroducing the LMP question through the back door of a metric label. |

### TC-DASH-109 — PMSMA attendance rate
| | |
|---|---|
| Spec | NS-19(iii) |
| Priority | Should |
| **Given** | HRPs scheduled for PMSMA, some attended (completed), some not |
| **When** | Attendance rate is computed |
| **Then** | Attended ÷ scheduled, HRP-scoped only — non-HRP PMSMA attendance must not appear in this figure. |

### TC-DASH-110 — tracking success rate
| | |
|---|---|
| Spec | NS-19(iv) |
| Priority | Should |
| **Given** | HRP tracking outcomes: some "completed" (any of the three NS-7 completion sub-types), some "plan to go later," some "does not want to go," some "could not be contacted" |
| **When** | Tracking success rate is computed |
| **Then** | Numerator is every "completed" sub-type only. Denominator is all recorded tracking outcomes, HRP-scoped. |

---

## Guardrails

| Check | Rule |
|---|---|
| BR-017/AP-7 | No figure here reads or derives from a clinical field. Confirm no test fixture in this batch introduces LMP, EDD, or gestational age. |
| AP-4 | No new category. Every figure aggregates the existing five. |
| BR-019 | No figure names or ranks an individual facility or practitioner — NS-19(i)'s split is by completion-location type only. |
| Regression | All previously-passing assertions stay green. |

---

## Deferred — not in this batch

- **Item vii** (closure at a lower facility than recommended) — needs a
  recommended-minimum-tier rule per category/priority, added to the programme
  profile. Small, but new modelling; separate item.
- **Items viii/ix** (lab, USG completion) — needs an investigation subtype
  field scoped within `LAB_INVESTIGATION`. Separate item.
- **Trimester-wise ANC/PMSMA progress** — blocked on the LMP/EDD policy
  decision (option A/B/C discussed). Not started pending that decision.
- **SC/HWC and village-level filters** — deferred scope-drilldown extension.

---

## Sign-off

| Reviewer | Date | Cases approved |
|---|---|---|
| | | |
