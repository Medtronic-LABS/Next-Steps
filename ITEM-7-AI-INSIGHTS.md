# Item 7 — AI Insights: Spec Increment and Test Cases

**Scope:** natural-language questions over coordination metrics, answered from
the §13 functions built in item 4.

**Why a spec increment:** the concept note describes an Insights Engine
("conversational insights for programme leaders") but no PRD clause specifies
it. There is nothing normative to write tests against, so this document
defines the behaviour first, with clause IDs the tests can cite.

---

# Part 1 — Spec increment

## AI-1 The model never produces a number

The pipeline is:

```
question → [model] → structured intent
                          ↓
         intent → [§13 functions] → computed metrics
                          ↓
   question + computed metrics → [model] → narration
```

The first model call returns an intent, not an answer. The second receives the
computed figures and narrates them. **Every numeral in the final response must
appear in the computed metrics.** A model that invents a statistic fails a
test, not a review.

This is the whole design. It is why an LLM can be trusted in a health-programme
reporting surface at all.

## AI-2 Supported intents

Version 1 supports exactly the metrics §13 defines and item 4 implemented:

| Intent | Backed by |
|---|---|
| `COMPLETION_RATE` | §13 completion rate |
| `ON_TIME_RATE` | §13 on-time completion |
| `MEDIAN_DAYS_TO_COMPLETION` | §13 median days |
| `OVERDUE_BACKLOG` | §13 overdue buckets |
| `PATIENTS_NEEDING_ATTENTION` | §13 patients needing attention |
| `UNREACHABLE_PATIENTS` | §13 unreachable patients |
| `UPCOMING_LOAD` | §13 upcoming load |
| `REFERRAL_COMPLETION` | §13 referral completion by specialty |
| `UNSUPPORTED` | everything else |

Each intent may carry `periodDays` (7, 30 or 90) and `category`. A comparison
intent may carry two periods.

**`UNSUPPORTED` is a first-class outcome, not a failure.** Guessing at an
unsupported question is worse than declining it.

## AI-3 Refusal rules

The engine declines, without attempting an answer:

- **Clinical questions.** "Does this patient have pre-eclampsia?" "What should
  we prescribe?" Clinical decision support is a different regulatory category
  and BR-017 forbids it outright.
- **Patient-level questions.** "Tell me about Sunita Rao." Insights answers at
  aggregate level only.
- **Out-of-domain questions.** Anything not about coordination state.
- **Questions the data cannot answer.** No village-level filtering exists yet;
  asking for it returns `UNSUPPORTED`, not an approximation.

## AI-4 Aggregates only leave the device

The request sent to the model contains **computed aggregate figures only**.
No patient name, mobile number, identifier, or per-patient row is included in
any payload sent to a model provider.

This is a DPDP position, not a preference. It must be asserted, not assumed.

## AI-5 Care-journey language

Per §3.3, responses describe the patient's care, never a person's performance.

- Allowed: "38 next steps are overdue beyond 30 days."
- Forbidden: "Priya only completed 40% of her worklist."

The model will drift toward performance framing, because that is how metrics
are usually discussed. It must be instructed against it and tested for it.

## AI-6 Grounding

Every response carries, in a structured field the UI can render: the metric
name, the period, the numerator and denominator where applicable, and the
§13 clause. A figure with no traceable source is a defect.

## AI-7 Graceful failure

If the model is unreachable, slow, or returns unparseable output, the engine
returns a clear failure. It never falls back to a generated answer, and it
never blocks any other part of the app.

## AI-8 The model call is injectable

The engine takes a model client as a dependency so tests can substitute a stub.
No test in this item makes a network call.

---

# Part 2 — Test cases

## Build order

**7a — intent extraction.** TC-AI-001 to 005.
**7b — execution and grounding.** TC-AI-006 to 008.
**7c — guardrails.** TC-AI-009 to 013.

Guardrails last so they are written against a working pipeline, but none of
them is optional.

---

## 7a — Intent extraction

### TC-AI-001 — a simple metric question
| | |
|---|---|
| Spec | AI-2 |
| Type | Unit |
| Priority | Must |
| **Given** | A stubbed model returning the documented intent shape |
| **When** | "What's our completion rate this month?" is submitted |
| **Then** | Intent is `COMPLETION_RATE` with `periodDays: 30`. No metric is computed during extraction — this stage produces intent only. |
| Why it could break | If extraction and computation are entangled, the model gains a path to influence the number. They must be separate stages. |

### TC-AI-002 — a count question
| | |
|---|---|
| Spec | AI-2 |
| Type | Unit |
| Priority | Must |
| **Given** | A stubbed model |
| **When** | "How many patients need attention?" is submitted |
| **Then** | Intent is `PATIENTS_NEEDING_ATTENTION` with no period — §13 defines it as a snapshot, not period-bound. |
| Why it could break | Attaching a period to a snapshot metric silently changes its meaning, and the error is invisible in the output. |

### TC-AI-003 — a category-scoped question
| | |
|---|---|
| Spec | AI-2 |
| Type | Unit |
| Priority | Must |
| **Given** | A stubbed model |
| **When** | "How are referrals doing?" is submitted |
| **Then** | Intent is `COMPLETION_RATE` with `category: SPECIALIST_REFERRAL`. |
| Why it could break | Category scoping is where a vague question most often becomes a wrong answer. |

### TC-AI-004 — a comparison question
| | |
|---|---|
| Spec | AI-2 |
| Type | Unit |
| Priority | Should |
| **Given** | A stubbed model |
| **When** | "Is completion better than last month?" is submitted |
| **Then** | Intent carries two distinct periods. Both are computed independently by the same §13 function. |
| Why it could break | Comparison is the most natural thing a programme leader asks and the easiest place for a model to editorialise rather than compute. |

### TC-AI-005 — an unsupported question returns UNSUPPORTED
| | |
|---|---|
| Spec | AI-2, AI-3 |
| Type | Unit |
| Priority | Must |
| **Given** | A stubbed model |
| **When** | "Which villages have the worst completion?" is submitted — no geography exists in the data model |
| **Then** | Intent is `UNSUPPORTED`. No metric is computed. No approximation is offered. |
| Why it could break | Answering a question the data cannot support, using a metric that looks close enough, is the failure mode that destroys trust in every other figure. |

---

## 7b — Execution and grounding

### TC-AI-006 — execution matches the function called directly
| | |
|---|---|
| Spec | AI-1 |
| Type | Unit |
| Priority | Must |
| **Given** | A fixture with a known completion rate, and intent `COMPLETION_RATE, periodDays: 30` |
| **When** | The intent is executed |
| **Then** | The value is **identical** to calling the §13 completion-rate function directly on the same fixture. Assert equality against the function, not against a literal. |
| Why it could break | If insights recomputes rather than calling the existing function, the two can diverge — and the dashboard and the chat answer would disagree. |

### TC-AI-007 — every response carries provenance
| | |
|---|---|
| Spec | AI-6 |
| Type | Unit |
| Priority | Must |
| **Given** | Any successfully executed intent |
| **When** | The response is assembled |
| **Then** | It carries metric name, period, numerator and denominator where applicable, and the §13 clause reference. |
| Why it could break | A programme leader will be asked where a number came from. "The AI said so" is not an answer that survives a review meeting. |

### TC-AI-008 — no numeral appears that was not computed
| | |
|---|---|
| Spec | AI-1 |
| Type | Unit |
| Priority | Must |
| **Given** | Computed metrics of 50% (2 of 4), and a stubbed model whose narration inserts an extra figure — "up from 45% last month" |
| **When** | The response is validated |
| **Then** | Validation **fails**. Every numeral in the narration must appear in the computed metric set. The uncomputed figure is rejected, not rendered. |
| Why it could break | This is the load-bearing case of the entire item. Without it, "the model never produces a number" is an intention rather than a property. A plausible invented statistic in a health programme report is the worst thing this feature can do. |

---

## 7c — Guardrails

### TC-AI-009 — clinical questions are refused
| | |
|---|---|
| Spec | AI-3, BR-017 |
| Type | Unit |
| Priority | Must |
| **Given** | Questions including "Does this patient have pre-eclampsia?", "What should we prescribe?", "Is her anaemia severe?" |
| **When** | Each is submitted |
| **Then** | Each is refused. No metric is computed. No clinical content appears in any response. |
| Why it could break | Clinical decision support is a different regulatory category entirely. This is the boundary the product's adoptability rests on, and an AI surface is where it will be crossed by accident. |

### TC-AI-010 — no patient-level data reaches the model
| | |
|---|---|
| Spec | AI-4 |
| Type | Unit |
| Priority | Must |
| **Given** | A clinic with named patients and mobile numbers, and any supported question |
| **When** | The payload sent to the model client is captured |
| **Then** | It contains no patient name, mobile number, patient identifier, or per-patient row. Aggregates only. Assert against the captured payload, not the response. |
| Why it could break | DPDP. Sending patient rows to a third-party provider is a compliance failure that no amount of good output excuses — and it is invisible in the response, so only a payload assertion catches it. |

### TC-AI-011 — no staff-performance framing
| | |
|---|---|
| Spec | AI-5, §3.3 |
| Type | Unit |
| Priority | Must |
| **Given** | A stubbed model returning "Priya only completed 40% of her worklist" |
| **When** | The response is validated |
| **Then** | Validation fails or the framing is rewritten. No response attributes a metric to a named person or frames it as individual performance. |
| Why it could break | §3.3 is explicit that Next Steps is not a staff-evaluation tool. How clinics receive the product depends on holding that line, and a model will drift across it naturally. |

### TC-AI-012 — an unanswerable question invents nothing
| | |
|---|---|
| Spec | AI-3 |
| Type | Unit |
| Priority | Must |
| **Given** | Intent `UNSUPPORTED` |
| **When** | A response is produced |
| **Then** | It states plainly that the question cannot be answered from available data, and says what *is* available. It contains no figures. |
| Why it could break | The pressure to be helpful is exactly what produces a confident wrong answer. |

### TC-AI-013 — model failure degrades gracefully
| | |
|---|---|
| Spec | AI-7 |
| Type | Unit |
| Priority | Must |
| **Given** | A model client that throws, times out, and separately returns unparseable output |
| **When** | A question is submitted in each case |
| **Then** | A clear failure is returned in all three. No fabricated answer. No error propagates to the rest of the app — the dashboard and worklist stay usable. |
| Why it could break | Same principle as TC-OUT-005: an unavailable external service must never degrade the clinic-facing product. |

---

## Guardrails on every run

| Check | Rule |
|---|---|
| BR-017 | No clinical inference in any response |
| BR-018 | Every figure derives from coordination state via a §13 function |
| BR-019 | No aggregate keyed on a named specialist |
| §3.3 | No staff-performance framing |
| AI-4 | No patient-level data in any outbound payload |
| Regression | All 128 existing assertions stay green |

---

## Practical notes

**The key.** For the prototype, put the model key in a git-ignored env file and
run from `localhost`. It cannot be deployed that way — a key in browser
JavaScript is public. Deployment needs a small proxy function, which is a
separate decision.

**No test makes a network call.** AI-8 requires an injectable model client;
every case above uses a stub. The suite must stay fast and offline.

**Two model calls, not one.** Intent extraction and narration are separate.
Combining them gives the model a path to influence the number, which
TC-AI-008 exists to prevent.

---

## Sign-off

| Reviewer | Date | Cases approved |
|---|---|---|
| | | |
