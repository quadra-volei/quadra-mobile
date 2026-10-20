---
description: Full implementation workflow for a Quadra screen (4 agents in sequence)
argument-hint: <SCOPE screen ID> <optional description>
---

# Command: /screen

Use this command to implement a Quadra MVP screen. Orchestrates the 4 subagents with human checkpoints.

## Arguments received

$ARGUMENTS

## Prerequisites

Before proceeding, confirm these exist:
- `CLAUDE.md` at root
- `docs/SCOPE.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/COMPONENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/PRODUCT.md`

If any are missing, stop and warn.

## Execution sequence

**Don't skip steps. Don't run in parallel.**

### Step 1 — Spec

Delegate to `screen-spec-writer`:

> Create the technical spec for screen `$ARGUMENTS`. Strictly follow the template in your system prompt. Save to `docs/specs/`.

When done:
- Show the spec path and 3-line summary
- **STOP and ask the human**: "Spec ready at [path]. Confirm with 'ok spec' to pass to guardian, or describe adjustments."

⚠️ Wait for human response. Don't auto-advance.

### Step 2 — Scope audit

On confirmation, delegate to `scope-guardian`:

> Audit the spec at `docs/specs/<file>`. Apply your full 11-item checklist.

If REJECTED:
- Show full output to human
- Return to Step 1 with feedback
- Don't try to "fix it" yourself

If APPROVED:
- Confirm to human
- Ask: "Spec approved. Proceed to implementation?"
- Wait for confirmation.

### Step 3 — Implementation

On confirmation, delegate to `implementer`:

> Implement the screen per the approved spec at `docs/specs/<file>`. Follow anti-hallucination rules. Remember to update COMPONENTS.md for any new reusable component.

When done:
- Show created/modified files
- Show typecheck and lint results
- Confirm COMPONENTS.md was updated if new components were added
- **Don't declare done yet** — tests pending

### Step 4 — Tests

Right after step 3, delegate to `test-writer`:

> Write and run tests for the screen at `docs/specs/<file>`. Cover every acceptance criterion. Don't declare done if any criterion lacks a test.

If test fails due to implementation bug:
- test-writer returns to implementer
- Repeat step 3 with feedback
- Return to step 4

If everything passes:
- Show final output
- Suggest: `git diff` for manual review

### Step 5 — Delivery

Present:

```
✅ Screen implemented and tested: <ID> <title>

Diff summary:
- Files created: <N>
- Files modified: <N>
- New components in catalog: <list>
- Tests added: <N>

Manual next steps:
1. `git diff` and review
2. Open the screen in your dev client and visually verify
3. If approved: `git add . && git commit -m "<suggested message>"`

Suggested commit:
feat(<area>): <screen ID> <title>

Refs: S<N> SCOPE.md
```

## Workflow principles

- **Isolated context per agent.** The implementer doesn't see prior guardian output.
- **Human checkpoints, not bottlenecks.** Pause at critical points (after spec, after approval), not per file.
- **Failures go back, not forward.** Rejected spec → spec-writer. Failed test from bug → implementer.
- **No "try and see".** Any non-trivial issue is a question to the human.
- **Visual review is human-only.** The workflow guarantees correctness of structure and behavior — *looks right* is your call.
