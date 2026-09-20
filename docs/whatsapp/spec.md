


WhatsApp Channel — Firebase Implementation Specification

Objective

Build a production-structured WhatsApp channel over the Firebase backend.

The WhatsApp bot must reproduce the six workflows in the existing prototype using only the synthetic users:

* Anita
* Priya
* Lakshmi Devi

The implementation should use the existing prototype/design as the product source of truth and translate its interactions into native WhatsApp interactions.

The implementation must not recreate the entire PWA inside WhatsApp.

⸻

1. MVP Boundary

Included

* Role-aware menu
* Find patient and view open steps
* Stage and confirm a referral
* Today’s work and overdue drill-down
* Closure with conditional provenance
* One-tap on-site closure by the receiving facility
* Proactive overdue alert
* Expected-arrivals list and arrival confirmation
* Audit record for every relevant state change
* CCE event for every relevant state change
* Synthetic data only

Excluded initially

* Real patient data
* Natural-language AI interpretation beyond simple commands such as:
    * menu
    * find Lakshmi
* Voice
* OCR
* Register capture
* Patient-facing messages
* Government programme-system integration
* Full multilingual implementation
* Production authentication/privacy approval
* Recreating the entire PWA in WhatsApp

The decision-gate screen belongs to the user-testing prototype/evaluation and should not be implemented as part of the health-worker WhatsApp application.

⸻

2. Product Decisions

A. Arrived != Completed

Maintain separate states/events:

ARRIVED
COMPLETED

Example:

Arrived:
Lakshmi reached CHC Teonthar.
Completed:
The recommended care was actually delivered.

Priya’s identity and facility can establish provenance for either event.

Arrival alone must not automatically close the coordination obligation.

If the existing Firebase domain model currently only supports:

OPEN
DONE

introduce an independent arrival/attendance confirmation event rather than incorrectly changing the step to DONE.

⸻

B. Call Outcome

When the worker selects Call, WhatsApp should initiate the phone call.

The WhatsApp bot must not assume that the patient was reached.

When the worker returns, present:

Were you able to reach Lakshmi?
[Spoke to patient]
[No answer]
[Wrong/unavailable number]

Persist the outcome in the step audit trail.

⸻

C. Rescheduling

Initially provide:

Tomorrow
In 3 days
In 1 week
Choose another date

Do not implement unrestricted date entry initially.

A WhatsApp Flow can be introduced later for Choose another date.

⸻

D. Conversation Expiry

Selected patient/step state should be short-lived.

Recommended:

15–30 minutes

After expiry:

That session has ended to protect patient information.
Please find the patient again.

Firebase remains authoritative.

WhatsApp conversation state must never become the source of truth for patient or task state.

⸻

E. Two-Tap Requirement

The “two taps” requirement means:

1. Select the kind of next step.
2. Confirm the defaulted step.

Patient selection happens before those two interactions.

Changing facility, tier, date, etc. is an exception path and may require additional interactions.

⸻

3. WhatsApp UI Mapping

The prototype must be translated into native WhatsApp controls.

Prototype WhatsApp implementation
Four-item main menu List message or buttons + More
Search results Selectable list
Summary tiles Text summary + actions
Four provenance answers List message / WhatsApp Flow
Confirm / Change Reply buttons
Proactive alert Approved utility template
Expected arrivals Summary + selectable patient list
Date selection Presets initially
Free-text search Controlled command/search

Do not attempt to reproduce browser UI components literally.

Preserve the same:

* content
* data
* business rules
* workflow
* actions
* state transitions

while adapting the presentation to WhatsApp.

⸻

4. Firebase Architecture

Use Firebase as the backend.

Recommended architecture:

                    WhatsApp User
                         |
                         v
                WhatsApp Cloud API
                         |
                         v
              Firebase HTTPS Function
                  /whatsapp/webhook
                         |
                         v
                WhatsApp Adapter
                         |
             +-----------+-----------+
             |                       |
             v                       v
      Conversation State       Firebase Domain
        / Session Layer        / Business Logic
                                     |
                       +-------------+-------------+
                       |             |             |
                       v             v             v
                   Firestore     Audit Log      CCE Outbox
                                                     |
                                                     v
                                                CCE Service

Firebase Components

Firebase Cloud Functions

Responsible for:

* WhatsApp webhook
* webhook verification
* WhatsApp message processing
* WhatsApp API calls
* conversation orchestration
* proactive message dispatch
* message-status processing
* scheduled jobs where required

Cloud Firestore

Responsible for:

* users
* roles
* facilities
* patients
* care steps
* conversations
* audit records
* CCE outbox
* message records
* configuration
* synthetic fixtures

Firebase/Google Secret Manager

Store:

* WhatsApp access token
* WhatsApp phone number ID
* WABA ID
* Meta app secret
* webhook verification token
* other external credentials

Never commit credentials to Git.

⸻

5. Architectural Boundary

The WhatsApp adapter owns only:

* WhatsApp webhook processing
* Sender-number resolution
* Short-lived conversation state
* WhatsApp message rendering
* List rendering
* Button rendering
* Mapping response tokens to backend commands
* Proactive WhatsApp message dispatch
* Delivery/read/failure status logging

The adapter must NOT own:

* Role permissions
* Clinical guardrails
* Step lifecycle rules
* Closure provenance logic
* Downgrade determination
* Authoritative patient state
* Authoritative task state
* CCE event construction
* CCE retry semantics

These belong in Firebase domain services.

⸻

6. Firebase Domain Layer

Do not put business logic directly inside the WhatsApp webhook.

Create reusable domain services such as:

UserService
PatientService
CareStepService
WorklistService
ReferralService
ClosureService
ArrivalService
RescheduleService
ContactOutcomeService
AuditService
CCEOutboxService
ConversationService

The WhatsApp adapter calls these services.

Example:

WhatsApp
   |
   v
WhatsAppAdapter
   |
   v
ClosureService.closeStep()
   |
   +--> validateRole()
   +--> validateStepState()
   +--> determineProvenance()
   +--> determineDowngrade()
   +--> updateStep()
   +--> createAuditRecord()
   +--> createCCEEvent()

This allows the same business logic to eventually be reused by:

* PWA
* WhatsApp
* APIs
* administrative tools
* other channels

⸻

7. Firestore Data Model

Use a clear domain model.

Recommended structure:

users/{userId}
patients/{patientId}
facilities/{facilityId}
careSteps/{stepId}
conversations/{conversationId}
conversations/{conversationId}/messages/{messageId}
auditEvents/{eventId}
cceOutbox/{eventId}
whatsappMessages/{messageId}

Example user:

{
  "id": "ANITA",
  "name": "Anita",
  "role": "ANM",
  "facilityId": "RAMPUR_SUBCENTRE",
  "phoneNumber": "...",
  "status": "ACTIVE"
}

Example patient:

{
  "id": "LAKSHMI_DEVI",
  "displayName": "Lakshmi Devi",
  "synthetic": true
}

Example conversation:

{
  "whatsappSenderId": "...",
  "userId": "ANITA",
  "workflow": "PATIENT_STEPS",
  "patientId": "LAKSHMI_DEVI",
  "stepId": "...",
  "currentState": "STEP_SELECTED",
  "lastAction": "...",
  "nonce": "...",
  "expiresAt": "...",
  "lastInboundMessageId": "..."
}

⸻

8. Conversation State

Conversation state is short-lived orchestration state.

It must contain:

* WhatsApp sender ID
* Firebase user ID
* current workflow
* selected patient ID
* selected step ID
* current state
* last valid action
* expiry timestamp
* version/nonce
* last inbound WhatsApp message ID

Do not put sensitive patient information into WhatsApp action tokens.

⸻

9. Action Tokens

Every button/list interaction must use an opaque action token.

Example:

action_8f29c1...

Do not encode:

patient_name
clinical_information
business_rules
permissions

inside the action token.

The server resolves the token against the Firebase conversation state.

The backend must revalidate:

* user
* role
* patient
* step
* current state
* authorization
* expiry

before performing the action.

⸻

10. Required Firebase Operations

Implement reusable domain operations corresponding to:

resolveUser()
searchPatients()
getOpenSteps()
stageStep()
getWorklistSummary()
getOverdueSteps()
closeStep()
rescheduleStep()
recordContactOutcome()
getExpectedArrivals()
recordArrival()
recordAuditEvent()
createCCEEvent()

These should be domain services rather than HTTP endpoints where the WhatsApp adapter runs inside Firebase Functions.

If external HTTP APIs are required, expose them separately.

⸻

11. Identity

For the synthetic MVP, map WhatsApp numbers to seeded Firebase users.

Example:

Anita
ANM
Rampur Sub-centre
Priya
Staff Nurse
CHC Teonthar

Unknown numbers must receive:

You are not registered for this service.

They must receive no patient information.

For the MVP, number-to-user mapping is sufficient.

Before real patient data is introduced, design:

* admin-controlled enrolment
* role/facility assignment
* first-use verification
* number-change verification
* lost-phone deactivation
* shared-phone policy
* worker offboarding
* periodic access review
* optional PIN/step-up authentication

⸻

12. Synthetic Data

Create deterministic synthetic fixtures for:

Anita
Priya
Lakshmi Devi
Rampur Sub-centre
CHC Teonthar

Freeze these fixtures so that automated tests can reproduce exactly the same workflows.

Never use real patient information for the MVP.

⸻

13. Audit Architecture

Every relevant state transition must generate an immutable audit event.

Example:

{
  "eventType": "STEP_CLOSED",
  "stepId": "...",
  "patientId": "...",
  "actorUserId": "ANITA",
  "actorRole": "ANM",
  "facilityId": "...",
  "provenance": "...",
  "downgraded": false,
  "timestamp": "...",
  "channel": "WHATSAPP"
}

Audit events must be created transactionally with the corresponding domain state change where possible.

⸻

14. CCE Outbox

Do not send CCE events directly from the WhatsApp webhook.

Use an outbox pattern:

Domain transaction
       |
       +--> Firebase state update
       |
       +--> Audit event
       |
       +--> CCE outbox event
                    |
                    v
              Background worker
                    |
                    v
                CCE system

The outbox must support:

PENDING
PROCESSING
SENT
FAILED

Failed events must remain available for retry.

CCE events must be idempotent.

The same state transition must not produce duplicate CCE events.

⸻

15. WhatsApp Webhook

Implement:

GET /whatsapp/webhook
POST /whatsapp/webhook

GET:

* Meta verification challenge

POST:

* inbound messages
* button responses
* list responses
* message status updates

Validate webhook authenticity/signatures.

Use the WhatsApp message ID as the idempotency key.

Duplicate messages must not execute domain operations twice.

⸻

16. Proactive Messages

Prepare the following templates:

care_step_overdue_v1
expected_arrivals_summary_v1
work_due_today_v1

Example:

A patient in your care needs attention.
{{patient_display}}
{{step_label}}
Due: {{due_date}}
Status: {{overdue_duration}}
[Call]
[Completed]
[Reschedule]

Keep proactive patient information minimal.

Do not include:

* diagnosis
* detailed clinical history
* unnecessary identifiers

Template approval/classification requirements must be handled through Meta’s WhatsApp Business Platform.

⸻

17. Proactive Alert Architecture

Use a Firebase scheduled function:

Cloud Scheduler
      |
      v
Firebase Scheduled Function
      |
      v
Find overdue steps
      |
      v
Check worker eligibility
      |
      v
Create outbound notification
      |
      v
WhatsApp Cloud API

Do not send duplicate alerts.

Persist:

alertId
stepId
recipient
template
sentAt
deliveryStatus

⸻

18. Reliability

Design for:

Duplicate webhook

Same WhatsApp message ID must be processed once.

Delayed message

Validate the conversation state before executing.

Out-of-order message

Reject or safely handle stale state.

Stale button

Return:

This action is no longer available.
Please open the patient again.

Step already closed

Do not apply the operation twice.

Expired conversation

Require the worker to search for the patient again.

Worker changed

Resolve the current sender identity again.

WhatsApp delivery failure

Persist the failure status for observability/retry logic.

⸻

19. Testing

Create automated tests for:

* webhook signature validation
* webhook payload validation
* duplicate messages
* conversation expiry
* stale actions
* RBAC
* Anita permissions
* Priya permissions
* unauthorized users
* staging referral
* closure provenance
* downgrade determination
* arrival
* completion
* rescheduling
* contact outcome
* expected arrivals
* CCE event creation
* CCE idempotency
* CCE failure/retry
* proactive alerts
* no patient data leakage

⸻

20. Golden Conversation Tests

Store the complete Anita/Lakshmi and Priya/Lakshmi workflows as machine-readable fixtures.

Example:

fixtures/
  conversations/
    anita_lakshmi_referral.json
    anita_lakshmi_closure.json
    priya_lakshmi_arrival.json
    overdue_alert.json

Each fixture should validate:

Inbound WhatsApp message
        |
        v
Expected outbound message
        |
        v
Expected available actions
        |
        v
Expected Firebase state
        |
        v
Expected audit event
        |
        v
Expected CCE outbox event

Every change should replay the golden conversations.

⸻

21. Repository Discovery

Before implementing anything:

1. Inspect the complete repository.
2. Identify:
    * Firebase configuration
    * Cloud Functions
    * Firestore schema
    * authentication
    * existing domain models
    * existing services
    * existing APIs
    * existing PWA workflows
3. Identify where business logic currently lives.
4. Do not duplicate existing business logic.
5. Reuse existing Firebase services where possible.
6. Identify missing domain operations.
7. Produce a workflow-to-service matrix before implementation.

Create:

docs/whatsapp/
    architecture.md
    workflow-matrix.md
    firestore-model.md
    whatsapp-mapping.md

⸻

22. Git Workflow

First:

git checkout <base-branch>
git pull
git checkout -b feature/whatsapp-channel

Do not modify the main branch directly.

Use logical commits such as:

feat: add whatsapp webhook adapter
feat: add whatsapp conversation state
feat: add firebase referral domain services
feat: add whatsapp patient workflow
feat: add referral closure workflow
feat: add expected arrivals workflow
feat: add proactive overdue alerts
test: add golden whatsapp conversations
docs: add whatsapp architecture

⸻

23. Implementation Sequence

Phase 0 — Discovery

Inspect repository and existing Firebase implementation.

Deliver:

Workflow → Firebase service → Firestore data → missing functionality

matrix.

Do not start by writing the WhatsApp adapter.

⸻

Phase 1 — WhatsApp Infrastructure

Implement:

* Meta webhook
* verification
* signature validation
* sender resolution
* Firebase secret configuration
* inbound message persistence
* outbound message abstraction

Exit criteria:

Anita sends "Hi"
        ↓
Firebase receives webhook
        ↓
Anita is resolved
        ↓
Role-aware menu is returned

⸻

Phase 2 — Core Workflows

Implement:

* find patient
* view open steps
* stage referral
* confirm referral
* today’s work
* overdue drill-down

⸻

Phase 3 — Closure

Implement:

* closure
* provenance
* downgrade
* rescheduling
* call outcome

⸻

Phase 4 — Priya

Implement:

* expected arrivals
* arrival confirmation
* on-site completion
* shared underlying care step

Both Anita and Priya must operate against the same authoritative Firebase state.

⸻

Phase 5 — Proactive Messaging

Implement:

* overdue detection
* approved templates
* scheduled Firebase function
* outbound delivery
* retry/status tracking

⸻

Phase 6 — Production Hardening

Implement:

* security
* idempotency
* stale-action handling
* observability
* automated tests
* golden conversation tests
* deployment documentation

⸻

24. Definition of Done

The implementation is complete when:

* A WhatsApp user can interact with the bot end-to-end.
* Anita can execute her complete workflow.
* Priya can execute her complete workflow.
* Both operate against the same Firebase domain state.
* Lakshmi Devi exists as synthetic data.
* Role-based permissions are enforced server-side.
* Arrival and completion are separate concepts.
* Closure provenance is correctly recorded.
* Downgrade is correctly determined.
* Rescheduling works.
* Contact outcomes are persisted.
* Expected arrivals work.
* Proactive overdue alerts work.
* Audit records are generated.
* CCE events are generated exactly once.
* CCE failures are retryable.
* Duplicate WhatsApp messages are idempotent.
* Expired sessions cannot expose stale patient data.
* Unknown numbers cannot access patient information.
* WhatsApp credentials are stored securely.
* No secrets are committed to Git.
* Golden conversation tests pass.
* README and deployment documentation are complete.

⸻

25. First Task for Claude Code

Do not implement the chatbot immediately.

First perform the repository discovery.

Return:

1. Repository architecture
2. Existing Firebase services
3. Existing Firestore collections/models
4. Existing authentication/RBAC
5. Existing patient/step domain logic
6. Existing audit implementation
7. Existing CCE implementation
8. Existing scheduled/background functions
9. Existing APIs
10. Workflow → Firebase service mapping
11. Missing backend/domain functionality
12. Proposed WhatsApp adapter architecture
13. Required Firestore additions
14. Required Firebase Functions
15. Required Meta/WhatsApp configuration
16. Implementation risks

Then wait for approval before making architectural changes.

The goal is to build a thin WhatsApp channel over Firebase, not a second application containing duplicated business logic.

One important correction to the original architecture

With Firebase, I would not make Firestore itself the place where all business rules live. Use:

WhatsApp
   ↓
Cloud Functions
   ↓
Domain Services
   ↓
Firestore

rather than:

WhatsApp
   ↓
Firestore directly

That distinction matters for RBAC, provenance, state transitions, idempotency, audit events, and CCE consistency.

For this MVP, the clean target is therefore:

Meta WhatsApp Cloud API → Firebase Cloud Functions → Firebase Domain Services → Firestore + CCE Outbox → CCE, with WhatsApp functioning purely as another channel into the same authoritative application state.