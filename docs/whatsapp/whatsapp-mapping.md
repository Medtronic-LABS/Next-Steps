# WhatsApp UI Mapping

Per spec §3. Native WhatsApp controls only — no attempt to reproduce PWA screens
literally.

| Prototype concept | WhatsApp implementation | Rendered by |
| --- | --- | --- |
| Four-item main menu | Interactive **list message** (role-filtered rows) | `MessageRenderer.renderMenu` |
| Search results | Interactive **list message**, one row per matching patient | `MessageRenderer.renderPatientList` |
| Summary tiles (open steps) | Plain text summary block + reply-button actions | `MessageRenderer.renderStepSummary` |
| Four provenance answers | Interactive **list message** (4 rows) | `MessageRenderer.renderProvenancePrompt` |
| Confirm / Change | **Reply buttons** (max 3 per WhatsApp limits: Confirm / Change / Cancel) | `MessageRenderer.renderConfirm` |
| Proactive alert | Approved **utility template** (not built until Phase 5; renderer stubbed) | — |
| Expected arrivals | Summary text + selectable patient list | Deferred to Phase 4 |
| Date selection | Reply buttons: Tomorrow / In 3 days / In 1 week / Choose another date | `MessageRenderer.renderReschedulePresets` |
| Free-text search | Controlled command parser (`menu`, `find <name>`) — no NLP | `webhook` command router |

## Command surface (spec MVP boundary — no NLP beyond this)

- `menu` — re-show the role-aware main menu.
- `find <name>` — search patients by display name substring (synthetic data only).
- All other input must be a button/list reply resolved via an action token; free text
  outside the two commands above gets a "didn't understand, try `menu`" reply.

## Two-tap requirement (spec §2E)

Patient selection (via `find`) happens *before* the two required taps:

1. Select the kind of next step (button/list row → action token).
2. Confirm the defaulted step (reply button → action token, re-validated server-side).

Changing facility/tier/date is an explicit exception path (extra list/button step),
not counted against the two-tap budget.

## Conversation expiry copy (spec §2D)

Exact copy used when an expired action token is resolved:

> That session has ended to protect patient information. Please find the patient again.

## Stale-action copy (spec §18)

> This action is no longer available. Please open the patient again.
