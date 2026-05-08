# AI-Assisted Development Workflow

A complete reference for how AI assistance is used in this project. The goal is deliberate, reviewable development — every change is preceded by a clear plan that the developer explicitly approves before any code is written.

---

## Guiding Principles

- **Plan before code.** No code is generated until the developer has read and approved a written plan. This is a hard requirement, not a suggestion.
- **One approval gate.** The AI proposes; the developer decides. The AI never unilaterally proceeds to implementation.
- **Docs are the spec.** The plan must reference the relevant `docs/` files and explain how the implementation conforms to them. If no doc exists for the area being changed, the plan must note that gap explicitly.
- **Minimal scope.** The plan describes only what is needed to satisfy the request. No speculative refactoring, no preemptive abstractions, no features beyond what was asked.
- **Reversibility matters.** The plan must call out any action that is hard to reverse (database migrations, destructive file changes, dependency removals) and explain how it will be handled safely.

---

## The Workflow

### Step 1 — Read the relevant docs

Before proposing anything, the AI reads every file in `docs/` that is relevant to the request. If the request touches UI, `docs/ui.md` is read in full. If it touches auth, `docs/auth.md` is read in full. This step is silent — the AI does not ask whether to read them.

### Step 2 — Propose a plan

The AI responds with a written plan structured as follows:

```
## Plan: <short title>

**What this changes**
A one-paragraph description of the feature or fix and why it is being made.

**Architecture**
How this fits into the existing app structure: which files are touched, which
are created, and why. Include any data model decisions, API contract changes,
or state management choices.

**Implementation steps**
1. <First discrete step — specific enough to verify when done>
2. <Second step>
...

**Risks and irreversible actions**
Any action that is destructive, hard to undo, or could break existing behavior.
Explain the mitigation for each.
```

The AI stops here and waits. No code is written yet.

### Step 3 — Developer reviews and approves

The developer reads the plan and responds with one of:

- **Approved** — proceed with the implementation as written.
- **Approved with changes** — followed by specific modifications. The AI updates the plan to reflect the changes and confirms before writing code.
- **Rejected** — followed by feedback. The AI revises the plan from Step 2.

The AI does not interpret silence, partial agreement, or enthusiasm as approval. It waits for an explicit go-ahead.

### Step 4 — Implement

Once approved, the AI implements exactly what the plan describes — no more, no less. If it discovers during implementation that the plan is wrong or incomplete, it stops and surfaces the issue rather than making a judgment call silently.

### Step 5 — Verify

After implementation the AI:

1. Confirms each step in the plan is complete.
2. Notes any step that was skipped and why.
3. Identifies anything that should be manually tested before considering the work done.

---

## What the Plan Is Not

- Not a to-do list for the AI to execute in isolation. It is a proposal the developer controls.
- Not a contract that must be followed when circumstances change. If the plan needs to change mid-implementation, the AI surfaces this immediately.
- Not a substitute for reading the docs. The plan is downstream of the docs, not a replacement for them.

---

## Exceptions

The plan-first requirement applies to all code changes. It does not apply to:

- **Read-only investigation** — searching the codebase, reading files, explaining existing behavior.
- **Trivial one-liners explicitly requested** — e.g., "rename this variable to X" when the location is already specified.
- **Undoing the last change** — reverting a file to its prior state at the developer's request.

When in doubt, propose a plan.
