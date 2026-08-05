# Item 8 — HRP and Sick Newborn Journeys: Spec Increment and Test Cases

**Scope:** multi-role catchment-scoped worklists, two-party referrals with
arrival tracking, tracking outcomes, escalation, and the two derived risk
states — for both the high-risk pregnancy and sick newborn journeys.

**Sources:** `HRP_Journey.docx`, `HRP_User_Roles.docx`,
`High_Risk_NB_user_journey.docx`, `High_Risk_Newborn_User_Roles.docx`, plus
the PRD for everything already specified.

**Decisions taken (recorded, not assumed):**

| Question | Decision |
|---|---|
| LMP | Deliberately not collected — clinical data |
| ANC scheduling | Manual. Each next step is entered by whoever decided it |
| "ANC compliance" | Means **planned dates met**, not protocol windows met |
| Referral destination | Any FRU, chosen by the referrer from a configured list |
| Escalation ownership | Next Steps, not the CCE |
| Escalation clock | Programme profile configuration |
| Escalation count | Stored integer; risk states derived |
| Private care | A normal commitment owned by the ANM |
| Referral resolution reporting | Public and private shown separately |
| PMSMA | Fixed-calendar village outreach session |
| CHO and ANM | One role. Both sit at the SHC / Ayushman Arogya Mandir on the same ~5,000 catchment; the CHO heads the team but does not hold a wider scope |
| MPW-M | Out of scope for version 1 |
| Entry | Role and scope arrive from a host application, or from a standalone role picker |
| Daily opening | Assumed, supported by unread badges. Push notification needs a backend and is out of scope |
| Private closure with no follow-up date | Creates a discovery commitment (NS-15), not a new state |
| Sub-centre link | `registeredAtFacilityId`, set implicitly at registration. In production this comes from ABDM's Health Facility Registry; carried locally for the pilot |
| Filter overlap | Permitted. Filters are queries, not buckets — a patient may appear in several |
| Demo clock | A prototype-only offset so "two days later" is one tap, not a system setting |

---

## Deferred, deliberately

- **PHC MO dashboard and insights.** Read-only in both journeys; the four
  data-entry roles are the demo.
- **Protocol-window ANC compliance.** Impossible without gestational age.
  Recorded as a known limitation, not a gap.
- **ASHA home visits in months 8 and 9.** Removed — cannot be scheduled
  without LMP.
- **Extended PMSMA visits.** Doctor-scheduled, so ordinary commitments with
  no new primitive.

---

# Part 1 — Spec increment

## NS-1 Roles

Four data-entry roles: `ANM_CHO`, `PHC_SN`, `DH_SN`, `ASHA`. A fifth,
`PHC_MO`, is read-only and out of scope for this item.

Each role has a **scope**, and every worklist query is scoped before any
filter is applied:

| Role | Scope |
|---|---|
| `ASHA` | Her catchment, ~1,000 population, matched by the ASHA link on the patient |
| `ANM_CHO` | Her sub-centre catchment, ~5,000 |
| `PHC_SN` | Referrals expected at her facility |
| `DH_SN` | Referrals expected at her facility |

Scope is not a filter the user can widen. A role cannot see outside its scope.

## NS-2 Facilities

A `Facility` is deployment configuration: identifier, name, tier, and whether
it is a valid referral destination. The referrer selects from this list.

In production, facility identity comes from ABDM's Health Facility Registry.
Next Steps consumes it; it does not issue facility identifiers. For the pilot
the list is carried locally.

Demo seed: Rampur SHC-AAM, Rampur PHC, Kotwali PHC, District Hospital. A second
PHC exists so the referral dropdown presents a real choice.

Free-text destinations are not permitted — arrival routing requires a
resolvable facility identifier.

## NS-3 Patient registration additions

Registration captures, in addition to existing fields: `villageName`,
`ashaName`, and identifiers per item 5a — ABHA and RCH ID, either sufficient.

Registration also sets `registeredAtFacilityId` implicitly — the sub-centre the
registering ANM belongs to. This, not the village, is what her scope resolves
against. Village is retained for PMSMA session grouping and filtering.

For a newborn: the child RCH ID, linked to the mother's RCH ID, plus
`deliveryDate`. A newborn may be found by searching the mother.

**`deliveryDate` is an event date, not a clinical measurement.** It anchors
follow-up scheduling. This is the stated reason it is acceptable where LMP is
not.

## NS-4 Referral is a two-party commitment

A referral step carries `expectedAtFacilityId` and `direction` (`UPWARD` or
`DOWNWARD`).

It appears on the **arrival worklist** of the expected facility from the day
after it is raised, and remains there until resolved.

## NS-5 Closure attribution

Every closure records `closedByRole` and whether the closer was the expected
party:

- `FACILITY_CONFIRMED` — closed by the facility the referral was sent to
- `REPORTED` — closed by an ANM or ASHA on the basis of tracking

Both are permitted. They are **not** equivalent evidence and must never be
merged in a metric without the distinction being available.

## NS-6 Completion location

A resolved referral records where care happened:

`REFERRED_PUBLIC_FACILITY` · `OTHER_PUBLIC_FACILITY` · `PRIVATE_FACILITY`

Referral resolution is reported as a total with the public and private split
shown separately. Private care is a resolution, not a failure.

## NS-7 Tracking outcomes

Recorded via home visit or phone call. Exactly six leaves:

| Outcome | Effect |
|---|---|
| Completed — referred public facility | Resolves |
| Completed — other public facility | Resolves |
| Completed — private facility | Resolves. Prompts for the private follow-up date at the point of capture; if none is given, NS-15 applies |
| Not completed — plan to go later | Resets the escalation clock; does not resolve |
| Not completed — does not want to go | Ends the track |
| Could not be contacted | Does not resolve; does not reset |

## NS-8 Escalation

A referral pending beyond the profile's escalation window escalates: an alert
to **both** the linked ASHA and the ANM/CHO, and a reminder to the patient or
family.

`escalationCount` is a stored integer, incremented on each escalation. A
tracking outcome of "plan to go later" resets the clock but **not** the count.

Escalation does not route higher on repeat. The second escalation instead
makes the patient eligible for the at-risk state.

Clocks are profile configuration. HRP: escalate after 2 days, reminder next
day, at-risk after a further 2. Sick newborn: escalate after 1 day, reminder
same day, at-risk after a further 1.

## NS-9 Derived risk states

Both are **derived on read, never stored** — following §11.1's precedent.

**At risk of drop out:** an open referral with `escalationCount >= 2`.

The distinction, in the field expert's words: at risk of drop out means she
**has not said no but may need more support to seek care** — track
aggressively. Lost to follow means she declined or could not be reached.

**Lost to follow:** the most recent tracking outcome is "does not want to go"
or "could not be contacted", and the commitment remains open.

## NS-10 PMSMA sessions

PMSMA is a village outreach session on a fixed calendar date — the 9th of the
month — not an offset from anything. Scheduling a woman for PMSMA attaches
her to that village's session date. Several women share one session.

## NS-11 Worklist filters

One worklist, scoped per NS-1, with eight named filters:

`ALL_REGISTERED` · `REFERRAL_PENDING` · `ANC_DUE` · `PMSMA_DUE` ·
`TRACKING_NEEDED` · `PRIVATE_CARE_DUE` · `AT_RISK_OF_DROP_OUT` ·
`LOST_TO_FOLLOW`

Scope is applied before the filter, always.

**Filters may overlap.** They are queries answering different questions, not
buckets partitioning work — a patient escalated twice and then unreachable is
legitimately both at risk of drop out and lost to follow-up. Consequently the
filter counts do not sum to `ALL_REGISTERED`. This differs from FR-A-6.1's
worklist *sections*, which must remain mutually exclusive because their counts
partition the day's work.

## NS-16 Demo clock

A prototype-only offset, applied at the single point where the engine
determines the current time. Default zero. Exposed in the UI only in prototype
mode, so a demonstration can advance a day without touching system settings.

It must not appear in any production path, and it must not interfere with the
fake-timer approach the existing suite uses.

## NS-13 Entry: embedded or standalone

Next Steps is designed to mount inside a host application. Role and scope are
therefore **inputs**, not something the product decides.

**Embedded.** The host supplies role and scope as parameters —
`?role=anm&scope=SHC-RAMPUR`, `?role=phc-sn&facility=FAC-PHC-001`. The app
opens directly into that role. No picker is shown.

**Standalone.** With no parameters, a role picker is the entry screen. It is
not a login — there is no authentication in this version, and the screen must
not imply otherwise. Selecting a role sets the same parameters the host would
have supplied.

A role switcher is available in the header in both modes, so a demonstration
can move between viewpoints without returning to the picker.

**The selection changes scope, never the dataset.** All roles read one shared
store. A referral raised by an ANM must be visible to the nurse at the
receiving facility. If switching role resets or partitions the data, the
product does not work.

When authentication arrives, this screen becomes the real login and role comes
from the token rather than a parameter. Nothing else changes.

## NS-14 Unread badges

Both journeys assume the receiving nurse and the ASHA open their worklists
daily. That assumption is supported by an unread count on the worklist entry
point and on each filter that has new or newly-escalated items, cleared when
the filter is opened.

This is an **in-app badge**. A push notification delivered while the app is
closed requires a backend service and is out of scope for this version. The
distinction matters when describing the feature — "notification" can mean
either.

## NS-15 Private closure without a follow-up date

Recording "completed — private facility" prompts for the follow-up date the
private provider advised, **at the point of capture**. The ASHA is with the
family when she records it, which is when they are most likely to have the
paper.

If a date is given, an ordinary follow-up commitment is created and NS-15 ends
there.

If no date is given, Next Steps creates a **discovery commitment** — a
follow-up call owned by the ANM/CHO, resolvable by the ASHA, due within the
programme's tracking window (2 days for HRP, tighter for newborn per NS-8).

The reason this is a commitment rather than a flag: without it the woman is in
no worklist at all. Her referral is closed, so she is not pending. She was not
declined or unreachable, so she is not lost to follow-up. No private commitment
exists, so she is not in private care. A private visit would become an exit
from the system — the exact failure the product exists to prevent. As a
commitment it inherits reminders, overdue derivation and escalation with no new
machinery.

## NS-12 The clinical boundary, restated

`HRP` and `SICK_NEWBORN` are **routing labels**, not diagnoses. They mean
*this person needs an accelerated schedule and a referral*. Next Steps stores
no reason, no threshold, no measurement, and no danger-sign detail.

---

# Part 2 — Test cases

## Build order

**8a** roles, facilities, scoping · **8b** referral and arrival ·
**8c** tracking, escalation, derived states · **8d** worklist filters ·
**8e** newborn variant

---

## 8a — Roles, facilities, scoping

### TC-ROLE-001 — scope is applied before any filter
| | |
|---|---|
| Spec | NS-1, NS-11 |
| Priority | Must |
| **Given** | Two sub-centre catchments, each with registered patients, and an ANM assigned to the first |
| **When** | She requests the unfiltered worklist |
| **Then** | Only her catchment's patients appear. Applying any of the eight filters never widens the result beyond her scope. |
| Why it could break | If scope is a filter rather than a precondition, a UI change or a query parameter could expose another catchment's patients. That is a privacy failure, not a display bug. |

### TC-ROLE-002 — an ASHA sees only her linked patients
| | |
|---|---|
| Spec | NS-1, NS-3 |
| Priority | Must |
| **Given** | Patients registered with `ashaName` values for two different ASHAs, in one sub-centre |
| **When** | Each ASHA requests her worklist |
| **Then** | Each sees only patients linked to her. The ANM sees both. |
| Why it could break | The ASHA link is also the escalation routing key (NS-8). If it is wrong, escalations reach the wrong person and nobody is accountable. |

### TC-ROLE-003 — referral destinations come from configured facilities
| | |
|---|---|
| Spec | NS-2 |
| Priority | Must |
| **Given** | A configured facility list |
| **When** | A referral is raised |
| **Then** | `expectedAtFacilityId` resolves to a configured facility. A destination that is not in the list is rejected. Free text is rejected. |
| Why it could break | An unresolvable destination means the referral appears on nobody's arrival worklist — silently untracked, which is precisely the failure the product exists to prevent. |

### TC-ROLE-004 — registration captures village and ASHA link
| | |
|---|---|
| Spec | NS-3 |
| Priority | Must |
| **Given** | A new registration |
| **When** | The patient is read |
| **Then** | `villageName` and `ashaName` are present. Identifiers are a list per item 5a, holding ABHA or RCH ID or both. |
| Why it could break | Village drives PMSMA session assignment; the ASHA link drives escalation. Both are load-bearing, neither is obviously so. |

### TC-ROLE-005 — role and scope arrive as parameters
| | |
|---|---|
| Spec | NS-13 |
| Priority | Must |
| **Given** | The app opened with `role=anm` and a sub-centre scope, and separately with `role=phc-sn` and a facility |
| **When** | Each is loaded |
| **Then** | The app opens directly into that role with that scope. No picker is shown. An unrecognised role or scope falls back to the picker rather than to a default role. |
| Why it could break | This is the embedding interface, not a demo convenience — a host application supplies role and scope this way. Silently defaulting to some role on a bad parameter would put a user in a scope they were never granted. |

### TC-ROLE-006 — the picker is the standalone entry
| | |
|---|---|
| Spec | NS-13 |
| Priority | Must |
| **Given** | The app opened with no parameters |
| **When** | It loads |
| **Then** | The role picker is shown, offering exactly the four roles in scope for version 1. Selecting one sets the same parameters a host would have supplied, and the selection survives a reload. |
| Why it could break | Losing the selection on reload drops the user back to the picker mid-task. It also must not present itself as authentication — there is none. |

### TC-ROLE-007 — switching role changes scope, never the data
| | |
|---|---|
| Spec | NS-13 |
| Priority | Must |
| **Given** | A referral raised by an ANM to a PHC |
| **When** | The role switches to the PHC staff nurse, and back |
| **Then** | The same referral is visible to both, as a raised commitment and as an expected arrival respectively. It is one record. Switching role does not reset, clear or partition the store. |
| Why it could break | Item 6's profile switch shares one origin's storage, and mixing profiles produced wrong sections. The same trap here would be fatal — the whole product is one commitment seen by several cadres. |

---

## 8b — Referral and arrival

### TC-REF-001 — a referral carries destination and direction
| | |
|---|---|
| Spec | NS-4 |
| Priority | Must |
| **Given** | An ANM referring a high-risk patient to a PHC |
| **When** | The step is read |
| **Then** | It is a `SPECIALIST_REFERRAL` carrying `expectedAtFacilityId` and `direction: UPWARD`. A referral back to a sub-centre carries `DOWNWARD`. |
| Why it could break | Direction is not cosmetic — a downward referral creates a commitment at the receiving sub-centre, and the two appear in different worklists. |

### TC-REF-002 — the referral appears on the destination's arrival worklist
| | |
|---|---|
| Spec | NS-4 |
| Priority | Must |
| **Given** | A referral raised today to a PHC |
| **When** | The PHC nurse requests her arrival worklist tomorrow |
| **Then** | The referral is present, status pending. On day 3 it is present with overdue status. It remains until resolved. |
| Why it could break | This is the mechanism the whole journey rests on. A referral that never appears at the destination is a paper slip with extra steps. |

### TC-REF-003 — facility closure is recorded as confirmed
| | |
|---|---|
| Spec | NS-5 |
| Priority | Must |
| **Given** | A referral expected at a PHC |
| **When** | The PHC nurse closes it |
| **Then** | `closedByRole` is `PHC_SN` and attribution is `FACILITY_CONFIRMED`. |
| Why it could break | Without attribution, a confirmed arrival and a phone call are indistinguishable in the data. |

### TC-REF-004 — ANM or ASHA closure is recorded as reported
| | |
|---|---|
| Spec | NS-5 |
| Priority | Must |
| **Given** | A referral expected at a PHC, not closed by the PHC |
| **When** | The ANM closes it on the basis of tracking |
| **Then** | The closure is accepted, `closedByRole` is `ANM_CHO`, attribution is `REPORTED`, and it is distinguishable from `FACILITY_CONFIRMED` in any aggregate. |
| Why it could break | Both are permitted, and proxy closure is expected to be common. If the metric merges them, "referral completion" overstates what is actually known. |

### TC-REF-005 — closing a referral may open the next one
| | |
|---|---|
| Spec | NS-4 |
| Priority | Must |
| **Given** | A referral closed at a PHC, with an onward referral to a district hospital |
| **When** | Both steps are read |
| **Then** | Two distinct steps. The first is COMPLETED. The second is open, expected at the DH, `direction: UPWARD`, and appears on the DH's arrival worklist. Closing the first did not modify it into the second. |
| Why it could break | Reusing one step for a multi-hop referral destroys the history and makes hop-level analysis impossible. |

### TC-REF-006 — completion location is recorded
| | |
|---|---|
| Spec | NS-6 |
| Priority | Must |
| **Given** | Three referrals resolved at the referred facility, another public facility, and a private facility |
| **When** | Referral resolution is reported |
| **Then** | A total, with the public and private figures available separately. Private care counts as resolved, not as a failure. |
| Why it could break | One combined number answers neither the programme manager's question about pathway capacity nor the clinician's question about whether she was seen. |

---

## 8c — Tracking, escalation, derived states

### TC-TRK-001 — exactly six tracking outcomes
| | |
|---|---|
| Spec | NS-7 |
| Priority | Must |
| **Given** | The tracking outcome taxonomy |
| **When** | Enumerated |
| **Then** | Exactly six, matching NS-7. No outcome carries a clinical reason or a danger-sign detail. |
| Why it could break | A free-text tracking note is the most natural place for clinical content to enter the system by accident. |

### TC-TRK-002 — private completion resolves and alerts
| | |
|---|---|
| Spec | NS-7, NS-6 |
| Priority | Must |
| **Given** | An open referral expected at a DH, escalated once |
| **When** | An ASHA records "completed — private facility" |
| **Then** | The referral resolves with location `PRIVATE_FACILITY`. It leaves the DH arrival worklist. The ANM receives an alert to schedule private-provider follow-up. |
| Why it could break | The journey is explicit that the DH worklist clears once private care is captured. Leaving it open would have a facility chasing a woman who has already been seen. |

### TC-TRK-003 — "plan to go later" resets the clock, not the count
| | |
|---|---|
| Spec | NS-7, NS-8 |
| Priority | Must |
| **Given** | A referral escalated once, `escalationCount` 1 |
| **When** | "Plan to go later" is recorded, and the clock advances by less than the escalation window |
| **Then** | No second escalation fires. The referral stays open. `escalationCount` remains 1. Advancing past the window from the tracking action fires the second escalation and the count becomes 2. |
| Why it could break | Resetting the count as well as the clock would make the at-risk state unreachable — a patient could be tracked indefinitely without ever being flagged. |

### TC-TRK-004 — escalation notifies both ASHA and ANM
| | |
|---|---|
| Spec | NS-8 |
| Priority | Must |
| **Given** | A referral pending past the profile escalation window, for a patient linked to a known ASHA |
| **When** | Escalation fires |
| **Then** | Alerts are raised for that specific linked ASHA **and** the ANM. A reminder is scheduled for the patient. `escalationCount` becomes 1. |
| Why it could break | An escalation to a role rather than a named person is a notification nobody owns. |

### TC-TRK-005 — at-risk and lost-to-follow are derived
| | |
|---|---|
| Spec | NS-9 |
| Priority | Must |
| **Given** | An open referral with `escalationCount` 2 |
| **When** | It is read, then the clock advances a week with no write |
| **Then** | At-risk is true both times. It is computed from the stored count, not persisted as a status. Separately, an open commitment whose latest tracking outcome is "does not want to go" or "could not be contacted" reads as lost-to-follow. |
| Why it could break | Same failure as the stored `over` field in item 3 — a stored flag stops reflecting reality the moment anything changes around it. |

### TC-TRK-006 — the newborn clock is tighter, with the same code
| | |
|---|---|
| Spec | NS-8 |
| Priority | Must |
| **Given** | Two identical pending referrals, one under the HRP profile and one under the newborn profile |
| **When** | The clock advances one day |
| **Then** | The newborn referral has escalated; the HRP referral has not. After two days both have. No branch on use case appears in the escalation logic — only the profile value differs. |
| Why it could break | Hardcoding two clocks means a district cannot tune either, and a third use case needs a third branch. |

### TC-TRK-007 — private closure with a date creates an ordinary commitment
| | |
|---|---|
| Spec | NS-15 |
| Priority | Must |
| **Given** | An open referral expected at a district hospital |
| **When** | An ASHA records "completed — private facility" and supplies the follow-up date the provider advised |
| **Then** | The referral resolves with location `PRIVATE_FACILITY` and leaves the DH arrival worklist. One follow-up commitment exists, due on that date, and appears in the private-care filter. **No discovery commitment is created.** |
| Why it could break | Creating a discovery task when the date is already known would put noise on the ANM's list for something already answered. |

### TC-TRK-008 — private closure without a date creates a discovery commitment
| | |
|---|---|
| Spec | NS-15 |
| Priority | Must |
| **Given** | The same open referral |
| **When** | An ASHA records "completed — private facility" and no follow-up date is available |
| **Then** | The referral resolves and leaves the DH worklist. A discovery commitment is created — owned by `ANM_CHO`, resolvable by `ASHA`, due within the profile tracking window. The patient appears on the ANM's worklist. She is **not** absent from every filter. |
| Why it could break | This is the case where the product could itself cause a high-risk woman to leave the system. With the referral closed she is not pending, not lost to follow-up, and has no private commitment — so without this she appears nowhere. Assert her presence in at least one filter, not merely that a record exists. |

---

## 8d — Worklist filters

### TC-WL-001 — eight filters over one scoped worklist
| | |
|---|---|
| Spec | NS-11 |
| Priority | Must |
| **Given** | A seeded catchment with patients in every relevant state |
| **When** | Each of the eight filters is applied |
| **Then** | Each returns exactly the patients matching its definition. `ALL_REGISTERED` is the unfiltered scope. Every filtered result is a subset of it. |
| Why it could break | If a filter returns anything outside `ALL_REGISTERED`, scoping has been bypassed somewhere. |

### TC-WL-002 — PMSMA attaches to a village session date
| | |
|---|---|
| Spec | NS-10 |
| Priority | Should |
| **Given** | Three patients in one village, and a PMSMA session on the 9th of next month |
| **When** | Each is scheduled for PMSMA |
| **Then** | All three carry the same session date. The date is the configured session day, not an offset from the scheduling action. |
| Why it could break | Treating PMSMA as an offset gives each woman a different date, which is meaningless for a monthly village outreach session. |

### TC-WL-003 — unread badges per filter
| | |
|---|---|
| Spec | NS-14 |
| Priority | Should |
| **Given** | A facility nurse with two newly-arrived referrals, and an ASHA with one newly-escalated item |
| **When** | Each opens the app |
| **Then** | The worklist entry point carries an unread count, and each affected filter carries its own count. Opening a filter clears its count and does not clear the others. |
| Why it could break | Both journeys assume daily opening. The badge is what makes that assumption plausible rather than hopeful. A single global count would not tell the nurse which list changed. |

---

## 8e — Newborn variant

### TC-NB-001 — a newborn is found through the mother
| | |
|---|---|
| Spec | NS-3 |
| Priority | Must |
| **Given** | A mother with an RCH ID, and a newborn whose child RCH ID is linked to it |
| **When** | The newborn is searched by the mother's name |
| **Then** | The newborn is found. The link between child and mother identifiers is resolvable in both directions. |
| Why it could break | A newborn has no independent identity in the first days. Without the maternal link, the sick-newborn journey cannot start. |

### TC-NB-002 — delivery date anchors follow-up
| | |
|---|---|
| Spec | NS-3 |
| Priority | Must |
| **Given** | A newborn with a known delivery date, discharged from an SNCU with follow-up after 7 days |
| **When** | The follow-up commitment is read |
| **Then** | Its due date is 7 days from discharge. Delivery date is stored as an event date. **No clinical field accompanies it** — no birth weight, no gestational age at birth, no condition. |
| Why it could break | Delivery date is acceptable where LMP is not, precisely because it is an event rather than a measurement. Anything stored alongside it that *is* a measurement collapses that argument. |

---

## Guardrails

| Check | Rule |
|---|---|
| NS-12 / BR-017 | `HRP` and `SICK_NEWBORN` are routing labels. No reason, threshold, measurement or danger-sign detail is stored anywhere, including in tracking notes |
| BR-019 | No aggregate ranks or compares named practitioners or facilities. The CCE exposes practitioner rankings; Next Steps must not surface them |
| §3.3 | Care-journey language. "Referral pending", not "ASHA failed to mobilise" |
| NS-1 | Scope precedes filter in every query path |
| NS-5 | No aggregate merges `FACILITY_CONFIRMED` with `REPORTED` without the split available |
| Regression | All 144 existing assertions stay green |

The BR-019 row is newly load-bearing. The CCE offers
`/v1/insights/practitioners/ranking`; wiring it into Next Steps would violate
the product's own rule. Available from the platform is not the same as
permitted in this product.

---

## Known limitations to state, not hide

**ANC compliance measures planned dates met, not GOI protocol windows met.**
Without gestational age, Next Steps cannot know whether ANC 2 fell in weeks
14–26. It knows whether the date the ANM planned was honoured. That is a
weaker but honest claim, and it should be worded that way wherever the figure
appears.

---

## Sign-off

| Reviewer | Date | Cases approved |
|---|---|---|
| | | |
