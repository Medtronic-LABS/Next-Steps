OpenPHC Next Steps on WhatsApp
Prototype Requirements Addendum
Purpose
The prototype currently under development should demonstrate the future experience of using WhatsApp as the frontline interaction channel for Next Steps/CCE, without requiring either WABA or the production Next Steps/CCE integrations yet.

For this prototype:

WhatsApp-like UI → prototype service layer → Firebase

The experience should be fully functional and stateful, rather than a clickable mock.

The objective is to let partners/users experience what the product could genuinely feel like: create/find a patient, create and act on Next Steps, receive alerts, coordinate between facilities, and see the patient’s journey change as actions occur.

Important architecture principle
WhatsApp is a channel, not the system of record.

For the prototype Firebase will stand in for the Next Steps backend. Later, the same interaction layer should be capable of calling the production Next Steps APIs and WABA should replace the simulated WhatsApp interface.

Please therefore avoid tightly coupling the UI directly to Firebase. Use a clean service/API abstraction for operations such as:

searchPatients()
createPatient()
getPatientJourney()
createNextStep()
getWorklist()
completeNextStep()
rescheduleNextStep()
getExpectedArrivals()

All state-changing actions must persist.

1. Demo roles
For now support only two frontline roles:

ANM — originating/community-level user.

CHC Staff Nurse — receiving-facility user.

The experience and available actions should differ by role where appropriate.

Both users should operate on the same underlying data.

If the ANM creates a referral to the CHC, the CHC Staff Nurse should subsequently see that woman in Expected Arrivals.

If the CHC Staff Nurse marks her as arrived/completed, the ANM should see the referral as completed when she next views the patient.

This cross-user consistency is an important part of the demo.

2. Patient roster and patient creation
The patient roster belongs conceptually to the Next Steps backend. For the prototype it will live in Firebase.

Patients can enter the roster through multiple future routes:

programme import / OCR / system integration / Admin / lightweight WhatsApp registration

We are only implementing some of these now.

Search first
Before creating a patient, always search the existing roster.

Support:

Name — including partial/fuzzy matching
Phone number
Programme ID

If possible matches exist, show them first.

For example:

Possible matches

Lakshmi Devi · 28 · Rampur
****2814

Lakshmi Devi · 31 · Rampur
****7732

None of these — create new patient

Do not automatically create a duplicate.

Lightweight registration
If no existing patient is appropriate, allow Add new patient.

For the RCH demonstration, use the supplied registration form as the reference interaction:

Required

Full name
Mobile number
Village
Optional

ABHA / RCH ID
RCH configuration

Pregnancy status: Normal / High risk
Village should resolve the linked ASHA/facility from configuration rather than requiring the worker to enter these manually.

Keep the underlying model condition-neutral
The core Person object should not contain hard-coded pregnancy fields.

Think of:

Person

plus configurable:

ProgrammeContext / JourneyContext

For the RCH demonstration that context can contain:

pregnancyStatus = NORMAL | HIGH_RISK

Another programme should be able to define different attributes without requiring changes to the core patient model.

3. WhatsApp reminder consent
Include the consent interaction shown in the supplied registration design:

WhatsApp reminders

May we send you reminders on WhatsApp about your next steps?

Yes, consented | No

Persist at minimum:

whatsappReminderConsent
consentTimestamp

Ideally also record who captured it.

This should belong to the person’s contact/consent information rather than being an RCH-specific attribute.

For the prototype, no real patient WhatsApp messages need to be sent.

We only need to demonstrate that consent is captured and available for future reminder workflows.

4. Patient journey
Opening a patient should show a compact journey containing:

basic identity;
programme/risk tag where applicable;
open Next Steps;
overdue Next Steps;
completed Next Steps;
referrals;
next due action.
For example:

Lakshmi Devi · 28

High risk · Rampur

🔴 Referral → CHC
2 days overdue

⚪ Follow-up
Due 24 Sep

✓ Lab
Completed 12 Sep

Add next step

The journey must always be generated from the current persisted state.

5. Create a Next Step
Next Steps themselves must remain condition-neutral.

The basic object should continue to capture:

Who
What needs to happen
Where
When
Risk/routing context where applicable

The available categories/defaults can come from programme configuration.

Do not hard-code the coordination engine around ANC.

For the demonstration we can use familiar examples such as:

Referral
Lab
Imaging
Follow-up
Review

But the same mechanism must work for hypertension, diabetes, cancer or another programme.

Buttons/defaults should be used aggressively to minimize entry.

6. Persistent state and journey updates
This is a critical requirement.

The prototype must not behave like a scripted conversation.

If the user performs an action, the underlying state must change.

Support at least:

Complete
Reschedule
Unable to contact
Declined
Cancel
Arrived
Add Next Step

Example:

ANM sees:

Lakshmi Devi
Referral → CHC
🔴 2 days overdue

She marks it completed.

The backend record changes.

If she searches Lakshmi again:

✓ Referral → CHC
Completed 20 Sep

It must no longer appear in her overdue worklist.

All subsequent views must derive from the updated state.

7. Referral closure and provenance
Preserve the existing Next Steps closure logic.

At intended facility
If the authenticated CHC Staff Nurse marks a referral intended for that CHC as Arrived/Completed, don’t ask unnecessary provenance questions.

One tap should be sufficient:

Arrived

→

✓ Referral confirmed

Closure elsewhere
If someone outside the intended facility closes the referral, ask:

Where did care happen?

with appropriate options such as:

Referred facility
Other public facility
Private provider
Lower-level facility

Persist closure provenance.

8. Expected Arrivals — CHC Staff Nurse
Add an Expected Arrivals experience for the CHC Staff Nurse.

For example:

Expected today

6 patients

Lakshmi Devi
Referral from Rampur
Due today

Arrived | Not arrived

Selecting Arrived should update the same Next Step created by the ANM.

The ANM should subsequently see:

✓ Referral completed at CHC
20 Sep

This is an important demo of distributed confirmation through CCE, even though CCE itself is simulated in the prototype.

9. Worklist
Both roles should have a role-appropriate worklist.

For example:

Today’s work

🔴 3 overdue
🟠 4 due today
⚪ 7 due this week

Allow drill-down using buttons.

The CHC Staff Nurse should additionally have Expected Arrivals.

10. Proactive alerts
Simulate incoming WhatsApp alerts.

When the user opens the demo, at least one realistic alert should appear as though OpenPHC has proactively messaged them.

Example for ANM:

🔔 A patient needs attention

Lakshmi Devi
Referral → CHC
3 days overdue

View | Call | Completed

This should be driven by persisted demo data, rather than merely being decorative text.

The alert should disappear/resolve appropriately after the underlying issue is resolved.

11. Fake OCR / register import
Include this as an experimental preview, not as though it is a proven production capability.

A user can choose something such as:

Import register

and upload/select a sample register image.

For the first version it is acceptable for extraction to be simulated.

Show an experience such as:

Register processed

18 rows found
15 matched to existing patients
2 possible matches
1 possible new patient

Review 3

The objective is to demonstrate the proposed interaction model:

existing paper work → extraction → matching → human review of exceptions → roster/Next Steps

rather than prove OCR accuracy.

Please label this appropriately in the demo so that we don’t imply that the OCR technology has already been validated.

12. Simulated CCE event/audit trail
Maintain a simple event log in Firebase.

Examples:

PATIENT_CREATED

NEXT_STEP_CREATED

NEXT_STEP_RESCHEDULED

NEXT_STEP_COMPLETED

REFERRAL_ARRIVED

ALERT_CREATED

ALERT_RESOLVED

PATIENT_MATCH_CONFIRMED

These events can stand in for the future CCE integration.

They should include appropriate IDs, user, facility and timestamp.

This does not need to be prominent in the frontline UI.

13. Next Steps Admin
Do not build a new dashboard.

The existing Next Steps Admin remains the intended administrative/supervisory experience.

The conceptual split is:

WhatsApp → frontline work

Next Steps Admin → supervision, performance and analytics

Eventually the Admin dashboard should reflect the same underlying state changes made through WhatsApp: completion rate, overdue %, ageing, category, etc.

For this Firebase prototype, only do the minimum required to support/demo this connection. Do not spend prototype effort recreating Admin functionality.

14. Reset Demo
Add an easy Reset Demo function.

It should restore:

synthetic patients;
open/completed steps;
referrals;
overdue items;
expected arrivals;
alerts;
consent states;
demo users
to a known starting state.

This is important because we will repeatedly demonstrate the same scenarios to partners.

Keep Reset Demo outside the simulated frontline WhatsApp experience if possible.

15. WhatsApp fidelity
The interaction should feel very close to WhatsApp.

Use familiar patterns:

message bubbles;
incoming/outgoing messages;
timestamps;
reply buttons;
lists;
forms/Flows-like experiences;
realistic incoming alerts;
typing/loading behavior where useful.
However, don’t spend disproportionate effort creating a pixel-perfect clone.

The important fidelity is interaction fidelity:

Could I imagine doing exactly this from ordinary WhatsApp?

16. Buttons first
For this prototype, favor buttons, lists and structured flows.

Do not make success dependent on sophisticated natural-language interpretation.

We can support a handful of obvious text inputs later, such as:

Find Lakshmi

What’s overdue?

But structured interaction should provide the reliable path through every core workflow.

17. Condition-neutrality is an acceptance criterion
Although RCH/pregnancy will provide the primary synthetic scenario, the prototype must not fundamentally be an RCH application.

A Next Step should not care whether the underlying journey is:

ANC
PNC
hypertension
diabetes
cancer
TB
or another programme.

Programme configuration may determine:

labels;
categories;
defaults;
risk attributes;
routing;
escalation rules.
But the core operations remain:

Find person → create obligation → track → remind → detect → escalate → confirm/complete

Test this explicitly
Once the RCH demo works, create a small synthetic hypertension cohort.

Without changing core application code, we should be able to demonstrate:

Find Ramesh

Add follow-up

Referral → CHC

What’s overdue?

Completed

If this works, we have demonstrated that the prototype is genuinely a WhatsApp interaction layer for CCE, rather than an ANC chatbot.

18. Prototype acceptance scenario
I would use one end-to-end scenario as the developer’s final test.

1. ANM logs in.

She receives an overdue referral alert for Lakshmi.

2. ANM searches for another woman.

Possible duplicates are shown before creation.

3. ANM registers a new woman.

Minimum information + RCH status + WhatsApp reminder consent.

4. ANM creates a referral to CHC.

The Next Step persists.

5. Switch to CHC Staff Nurse.

The newly referred woman appears under Expected Arrivals.

6. Staff Nurse marks her Arrived.

The referral is closed with CHC provenance.

7. Switch back to ANM.

The patient journey now shows the referral as completed at CHC.

8. Open worklist.

The completed referral is no longer overdue.

9. Trigger fake register OCR.

Some patients match automatically; ambiguous/new records require review.

10. Show the event log.

The actions above have produced persistent coordination events.

11. Reset Demo.

The complete starting scenario is restored.

If the build can do that convincingly, I think you’ll have something substantially more useful than a prototype that merely looks like WhatsApp. It will demonstrate the actual product proposition: two different health-system actors coordinating care through a familiar channel, against one persistent shared state.