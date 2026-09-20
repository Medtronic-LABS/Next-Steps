# WhatsApp Flows

Three Flows are implemented, each an **optional upgrade** over an existing
buttons/list screen — every one falls back automatically unless a real
published Flow id is configured, so nothing here is required to run the bot.

| Flow | JSON asset | Replaces | Env var |
| --- | --- | --- | --- |
| Closure provenance | `closure-provenance.flow.json` | `renderProvenancePrompt` (4-item list) | `FLOW_CLOSURE_PROVENANCE_ID` |
| Select item | `select-item.flow.json` | patient search / worklist / expected-arrivals lists | `FLOW_SELECT_ITEM_ID` |
| Menu | `menu.flow.json` | the buttons + More main menu | `FLOW_MENU_ID` |

⸻

## What's built

- `adapter/WhatsAppClient.ts` — `kind: 'flow'` outbound message type,
  builds the `interactive.flow` Graph API payload (shared by all three).
- `webhook/inbound.ts` — parses a completed Flow's `nfm_reply` into
  `kind: 'flow_reply'` with the parsed `response_json` as `flowResponse`.
  Malformed JSON is dropped, never thrown (spec §19).
- `adapter/MessageRenderer.ts` → `renderClosureProvenanceFlow()`,
  `renderPatientListFlow()` / `renderWorklistFlow()` /
  `renderExpectedArrivalsFlow()` (all three share `select-item.flow.json`'s
  `Dropdown` screen), `renderMenuFlow()` (own `RadioButtonsGroup` screen).
- `workflows/closureWorkflow.ts`, `findPatientWorkflow.ts`,
  `worklistWorkflow.ts`, `arrivalWorkflow.ts`, `menuWorkflow.ts` — each
  checks its own env var and sends the Flow if set, the original
  buttons/list/text screen otherwise. Same fallback pattern as
  `WhatsAppClient`'s real/mock split and `CCEClient`'s.
- `workflows/router.ts` — `dispatchFixedCommand()` is the single place that
  maps a fixed command id (`CMD.WORKLIST`, `CMD.ALERTS`, etc.) to its
  handler; both a button/list tap *and* the menu Flow's `kind: 'menu'`
  response route through it, so there's exactly one dispatch table, not two
  parallel ones. No opaque conversation action token is involved for any
  Flow response (spec §9 tokens are a button/list-specific mechanism); each
  Flow's own screen fields are the correlated state, discriminated by
  response shape (`response.kind`) rather than `flowName`, since Meta
  reports `name` as a fixed `"flow"` constant regardless of which Flow was
  submitted.

## Why no action token

Every other interactive reply in this codebase resolves an opaque token
issued by `ConversationService.issueActionToken()` against server-side
conversation state (spec §9: never encode patient/clinical data in the
token itself). A Flow doesn't fit that model — its `nfm_reply` carries
whatever fields the Flow's own screens output, decided by the Flow JSON,
not by us at send time in the same way a button/list row id is. The Flow
JSON's `data` schema (`step_id`, `patient_id`) is populated from
`flow_action_payload.data` when we open the Flow (`renderClosureProvenanceFlow`),
and the screen's `Footer` action echoes those same values back out on
submit — so the round trip is self-contained without needing the
conversation's `pendingActions` map at all.

⸻

## Publishing the Flow (one-time, per Meta app)

Flows must be created via Meta's API or Flow Builder UI — there's no way
to just deploy the JSON file as code and have it work.

1. Create the Flow:

   ```bash
   curl -X POST "https://graph.facebook.com/v21.0/<waba-id>/flows" \
     -H "Authorization: Bearer <access-token>" \
     -H "Content-Type: application/json" \
     -d '{ "name": "closure_provenance", "categories": ["OTHER"] }'
   # -> { "id": "<flow-id>" }
   ```

2. Upload the JSON asset:

   ```bash
   curl -X POST "https://graph.facebook.com/v21.0/<flow-id>/assets" \
     -H "Authorization: Bearer <access-token>" \
     -F "name=flow.json" \
     -F "asset_type=FLOW_JSON" \
     -F "file=@functions/src/flows/closure-provenance.flow.json;type=application/json"
   ```

3. Validate + publish (Meta reviews the JSON schema server-side on
   publish, no App Review needed for a utility Flow used with your own
   tester numbers — same tier as the rest of this test setup):

   ```bash
   curl -X POST "https://graph.facebook.com/v21.0/<flow-id>/publish" \
     -H "Authorization: Bearer <access-token>"
   ```

4. Set the id:

   ```bash
   firebase functions:secrets:set FLOW_CLOSURE_PROVENANCE_ID
   # paste <flow-id> when prompted
   ```

   Note: unlike `WHATSAPP_ACCESS_TOKEN` etc., this isn't bound via
   `defineSecret` in `config/secrets.ts` yet (it doesn't exist as a Secret
   Manager secret until you actually run the command above — `defineSecret`
   requires the secret to already exist at deploy time, which would break
   `firebase deploy` before this Flow is published). Once you've created
   it, add it to `whatsappWebhook`'s `secrets` array in
   `webhook/whatsappWebhook.ts` the same way the other four are declared,
   and redeploy.

5. `firebase deploy --only functions:whatsappWebhook`

⸻

## Not done

- **No test/emulator coverage of a real Flow round trip** — Meta's Flow
  submission can't be simulated by the `ConversationReplay` golden-test
  harness (it drives button/list taps, not Flow screen data). The
  `flow_reply` parsing and routing logic has unit coverage
  (`inbound.test.ts`, `router.test.ts`); all three JSON schemas were
  authored from Meta's documented Flow JSON format but have not been
  validated against a real published Flow, since doing so requires the
  publish step above for each one.
- The reschedule "Choose another date" gap
  (`renderRescheduleChooseAnotherUnavailable`) is a fourth obvious
  candidate (a native `DatePicker` screen), not built.
