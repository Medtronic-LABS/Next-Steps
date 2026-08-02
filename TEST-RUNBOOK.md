# Claude Code Test Runbook

Copy-paste prompts, in order. One session per step. Verify between each.

**Prerequisite:** `TIER-0-TEST-CASES.md`, `CLAUDE.md`, `PRD.txt` and
`GOLDEN-TEST-SUITE.md` are committed in the repo root. Item 1 is committed and
`SIMULATED_LATENCY_MS` is back to `0`.

---

## The rule that makes this work

**Tests and fixes never happen in the same session.**

Asked to "write tests and fix the bugs", the cheapest path to green is editing
the assertion. Claude Code won't do that maliciously — it'll do it because
passing tests is what you asked for. Splitting the sessions removes the
temptation structurally rather than relying on instruction-following.

Sessions 1 and 2 write tests and are forbidden from touching source.
Session 4 fixes source and is forbidden from touching tests.
Between them sits a human gate. That gate is you.

---

## Session 1 — Scaffold and prove the harness

Green tests first. If you start with failures and the harness is misconfigured,
you cannot tell "failing because the defect is real" from "failing because
setup is broken".

> Read CLAUDE.md and TIER-0-TEST-CASES.md.
>
> Set up Vitest in `packages/core`. You are authorised to add `vitest` as a dev
> dependency. Add a `test` script to the core workspace and a root-level
> `npm test` that runs it.
>
> Then implement only these cases, all marked READY:
> TC-CAT-001, TC-CAT-002, TC-ORDER-001, TC-ORDER-002, TC-FILTER-001,
> TC-SEARCH-002, TC-GUARD-002.
>
> Rules:
> - Test names carry the case ID and PRD clause, e.g.
>   `describe('TC-ORDER-001 — BR-014 overdue ordering')`
> - Assert exactly what the `Then` column says. Do not soften an assertion to
>   make it pass.
> - Instantiate the engine directly per test so each starts from a clean store.
>   Do not use the shared singleton.
> - Engine methods are async — await them.
> - Do not modify any file outside the test files and package config. If a test
>   fails, report it. Do not fix it.
>
> Skip TC-SEARCH-001 — its assertion is unresolved pending a PRD reading.
>
> Run `npm test` and report the output verbatim.

**Verify in your own terminal:**

```
npm test
git diff --stat
```

Expected: 7 passing. `git diff --stat` should show only test files, `package.json`
and lockfiles — no changes to `engine.ts`, `inMemoryEngine.ts`, `logic.ts`,
`catalog.ts` or either `App.tsx`.

If a READY test fails, stop and report it. Either my assertion is wrong or
there's a defect I didn't anticipate. Both are worth knowing now.

```
git add -A && git commit -m "Vitest harness + 7 passing Tier 0 tests"
```

---

## Session 2 — The failing tests

> Read TIER-0-TEST-CASES.md.
>
> Implement the five cases marked EXPECTED FAIL:
> TC-ORDER-003, TC-SECTION-001, TC-MASK-001, TC-LIFE-001, TC-LIFE-003.
>
> These document real defects. They are supposed to fail.
>
> - Do not modify any source file. Do not fix the defects.
> - Do not use `.skip`, `.todo`, `.fails`, or try/catch to suppress a failure.
> - Do not weaken an assertion so it passes.
> - TC-LIFE-001 cannot be expressed against the current signature, because
>   `cancelStep` takes no reason argument. Write the test against the signature
>   BR-013 requires and let it fail to compile or fail at runtime. Report which.
>
> Run `npm test` and report exactly which tests fail and with what message.

**Verify:**

```
npm test
git diff --stat
```

Expected: 7 passing, 5 failing. Source files untouched again.

If any of the five passes, something is wrong — either the test was weakened or
the defect isn't what I described. Send me the test body before going further.

```
git add -A && git commit -m "Tier 0 tests: 7 passing, 5 documenting known defects"
```

Committing red feels wrong. It isn't. Those five failures are now a
machine-checkable specification for the next item of work.

---

## Session 3 — Human gate (no Claude Code)

Two of the five are not Claude Code's decisions to make.

**TC-SECTION-001 — the `upcoming` section.** The build has a worklist section
that FR-A-6.1 does not define. Either the PRD absorbs it or the code drops it.
Ask whoever owns the PRD. Until answered, this test stays red as a marker.

**TC-SEARCH-001 — mobile digit threshold.** Read FR-A-2.2 directly and write
the exact assertion. Don't let it be inferred from the current behaviour.

Record both decisions in `TIER-0-TEST-CASES.md` and commit.

---

## Session 4 — Fixes, one at a time

Only now does source get touched. One defect per session. Not all four at once.

### 4a — Unreachable ordering

> TC-ORDER-003 is failing. Read the case in TIER-0-TEST-CASES.md and FR-A-6.3
> in PRD.txt.
>
> FR-A-6.3 specifies a different comparator for the Unreachable section than
> for the others: most failed attempts first. The current implementation
> applies one comparator to every section.
>
> Fix the source so TC-ORDER-003 passes.
>
> - Do not modify any test file.
> - Do not change the ordering of any other section — TC-ORDER-001 and
>   TC-ORDER-002 must still pass.
>
> Run `npm test` and report the full output.

### 4b — Masked mobile

> TC-MASK-001 is failing. `maskMobile` hardcodes a `98` prefix, so every number
> renders as though it began 98.
>
> Fix it to preserve the patient's own leading two digits and trailing three,
> per FR-A-2.3. Do not modify any test file.
>
> Run `npm test` and report the output.

### 4c and 4d — cancel reason and transition validation

**Do not run these as standalone fixes.** TC-LIFE-001 needs a signature change
on `cancelStep`, and TC-LIFE-003 needs a transition table plus history. Both
are inside the scope of build item 2 (Visit, Reminder, History, completedDate).
Fixing them piecemeal now means doing the work twice.

Leave them red until item 2. When item 2 lands, these two turning green is how
you know it did the right thing rather than merely something plausible.

**After each fix:**

```
npm test
git diff --stat
git add -A && git commit -m "Fix: unreachable section ordering (TC-ORDER-003, FR-A-6.3)"
```

`git diff --stat` must show no test files. If it does, the fix changed the
specification instead of the code. Revert and rerun the session.

---

## Guardrails on every run

Add these to CI, or run them by hand each round:

```
grep -rn "localStorage\|InMemoryCoordinationEngine" apps/ --include="*.tsx" --include="*.ts"
```
No output. (TC-GUARD-002, engine boundary.)

```
grep -rniE "diagnos|prescri|symptom|vitals|hba1c|glucose|dosage|allerg" packages/ apps/ --include="*.ts" --include="*.tsx"
```
Matches only in comments or PRD text — never a field name, form input or
column. (TC-GUARD-001, BR-017.)

```
npm run typecheck && npm test
```

---

## Warning signs

Stop and check if you see any of these:

| Signal | What it means |
|---|---|
| A test file changes during a fix session | The specification was edited to match the code |
| A previously red test goes green with no source change | The assertion was weakened |
| `.skip` or `.todo` appears anywhere | A failure was suppressed rather than fixed |
| Everything passes on the first run of session 2 | The five defects weren't reproduced |
| A fix session touches more than two source files | Scope crept — review the diff line by line |

---

## Where this leads

After sessions 1–4 you should have 9 passing, 3 red (`TC-SECTION-001` pending a
decision, `TC-LIFE-001` and `TC-LIFE-003` pending item 2), and a traceability
chain from PRD clause to test name to commit message.

The remaining Tier 0 cases unlock as the build items land:

| Cases | Unlocked by |
|---|---|
| TC-VISIT-001/002, TC-LIFE-002/004, TC-HIST-001 | Item 2 — data model |
| TC-OVER-001/002/003 | Item 3 — real dates |
| TC-METRIC-001 through 006 | Item 4 — live insights |

Write each batch before the item, not after. That's the whole point.
