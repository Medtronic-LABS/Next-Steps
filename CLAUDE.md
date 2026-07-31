# Next Steps — Working Context

Post-consultation care coordination, built on the OpenPHC Care Coordination
Engine (CCE). Two React PWAs (`apps/admin`, `apps/doctor`) over a shared,
framework-free coordination layer (`packages/core`).

## Source of truth

`PRD.txt` in the repo root is the specification. It uses stable requirement
IDs: FR-A-x (admin), FR-D-x (doctor), FR-S-x (shared), BR-x (business rules),
NFR-x (non-functional), AC-x (acceptance criteria).

Cite the clause ID in code comments and test names. Example:
`describe('BR-014: worklist ordering', ...)`.

If a request appears to contradict the PRD, say so and ask. Do not silently
reconcile.

## Hard guardrails — never violate

**BR-017: no clinical data anywhere.** No diagnosis, clinical notes,
prescriptions, lab results, vitals, or medical history fields in any entity,
form, message, or database column. This is a regulatory boundary, not a
preference. If a feature seems to need clinical context, stop and ask.

**BR-019: never rank, score, or compare named individual specialists.**
Referral aggregation is by specialty only.

**Section 3.3: care-journey language.** Copy and labels use "follow-through",
"completion", "care gaps", "patients needing attention". The subject of every
metric is the patient's care, never a person's performance. This is not a
clinic-performance or staff-evaluation tool.

**BR-018: dashboard metrics derive exclusively from Next Step coordination
state.** Never from clinical data.

## Architecture rules

- `packages/core` is framework-free. No React, no DOM, no browser APIs
  outside the engine implementation itself.
- The apps talk to the `CoordinationEngine` interface and nothing else.
  Never import a concrete engine, `localStorage`, or `seed.ts` from
  `apps/`. This boundary is the product's central architectural claim.
- Presentation concerns (hex colours, CSS widths, icon paths) belong in the
  UI layer, not in engine return types.
- Colours come from `packages/core/src/styles/design.css` tokens. Do not
  hardcode hex values in components.
- Overdue is derived, never stored (Section 11.1).

## Current state

This build uses `inMemoryEngine.ts` — an in-memory store persisted to
localStorage — in place of a real CCE. Known simplifications are listed in
PRD Section 22.1. The CCE adapter may run in stub mode (Section 17).

## Working agreement

- Do one task at a time. Do not bundle unrelated changes.
- Run `npm run typecheck` after changes and report the result.
- Do not add dependencies without asking first.
- Do not create files unless necessary. Prefer editing existing ones.
- When behaviour is specified in the PRD, write the test before the code.
