# Writing Docs — Reference Templates

Full formats for each doc type. The **on-disk files are the source of truth** — Read a real
sibling before relying on these templates. Examples cited are real files in this repo.

---

## § ADR — Architecture Decision Record

**Where:** `docs/adr/NNN-short-kebab-summary.md`
**Real examples:** `docs/adr/001-unified-module-resolution.md`,
`docs/adr/002-auto-migrate-on-startup.md`, `docs/adr/003-modular-monolith-over-microservices.md`

**Next number:** `ls docs/adr/` → take the highest `NNN`, add 1, zero-pad to 3 digits.

### Template

```markdown
# ADR-NNN: <Imperative summary of the decision>

**Date:** YYYY-MM-DD
**Status:** Accepted
**Deciders:** @handle[, @handle]

## Context

What forces are at play? The problem, constraints, and relevant current state.
Cite real repo facts: module paths, ports, infra realities (e.g. RU egress, Kong OOM).
Neutral and factual — no decision yet. This is where a future reader rebuilds your mindset.

## Decision

The decision, stated plainly and in active voice ("Standardize on X", "Keep Y").
Then the reasoning: why this option over the alternatives. Use tables to compare options
or to enumerate concrete changes. If the decision is "do nothing / hold current course",
include an explicit **revisit-triggers** table so it stays falsifiable.

## Consequences

### Positive
- What gets better.

### Negative
- What gets worse / the cost accepted. (Be honest — an ADR with no negatives is suspect.)

### Neutral
- Side effects that are neither, but a future reader should know.
```

### Rules & conventions

- **Status lifecycle:** `Proposed` → `Accepted` → `Superseded by ADR-MMM` / `Deprecated`.
  Never delete an ADR; supersede it.
- **Amendments:** if a decision needs correction after implementation, append:
  ```markdown
  ## Amendments
  ### Amendment 1 — YYYY-MM-DD: <title>
  **Problem discovered after initial implementation:** …
  **Resolution:** … (table of file → change)
  ```
  ADR-001 is the worked example (it records a wrong original assumption + the fix).
- **Optional trailing sections** seen in this repo: `## Changes` / `## Files changed`
  (table of `File | Change`) when the ADR accompanied a concrete diff. Include only if real.
- Keep it scannable: short paragraphs, tables over prose for comparisons, real identifiers.

---

## § DDD — Event Storming Narrative

**Where:** `docs/ddd/<context>.event-storming.ddd.md` (e.g. `presale.event-storming.ddd.md`,
`outstaff.event-storming.ddd.md`)
**Language:** Russian (domain language).
**NOT** the same as `*.ddd.yaml` System Board models → those use the `ddd-doc` skill.

### Canonical section order

```markdown
# <Domain Name> — DDD & Event Storming

# Vision
<Назначение системы, цели — bullet list. Что система делает.>
<Каким проектируется: AI-native / event-driven / artifact-centric / versioned / …>

# Core Domain Philosophy
```text
<Ключевая истина домена. Напр.: "Presale — это неопределённость по умолчанию.">
<Что система обязана поддерживать: assumptions, ambiguity, iterative refinement, …>
```

# Core Domain Flow
```text
Lead → Project → Scope → Brief → PRD → Estimate → Decomposition → Feature → …
```

# Bounded Contexts
# 1. <Context Name> Context
<Назначение, ключевые сущности, ответственность.>
# 2. …

# Aggregate Roots
<Список агрегатов и что они инкапсулируют.>

# Domain Model
# <Entity>
<Поля / атрибуты.>
## Domain Rules
- <Инвариант 1>
- <Инвариант 2>
## <Entity> Statuses        ← when the entity is a state machine
<Состояния и переходы.>

# ADR
<Встроенные решения по моделированию: почему агрегат устроен так, а не иначе.>
```

### Notes

- Use fenced ```text blocks for philosophy, flows, and state transitions; lists/tables for
  entity fields and rules.
- Each significant entity gets its own `# <Entity>` heading with an explicit
  `## Domain Rules` / `## <Entity> Rules` subsection — invariants are the point of the doc.
- Status-bearing entities get a `## <Entity> Statuses` block.
- Modelling decisions live in an embedded `# ADR` section (or graduate to a real
  `docs/adr/` entry if they're cross-cutting architecture, not just domain shape).

---

## § PRD — Product Requirements Document

**Where:** `docs/prd/<name>-prd.md` (e.g. `dataos-v2-prd.md`, `client_dashboard-prd.md`)
**Language:** typically Russian for product/user-facing framing; match siblings.

PRDs here vary in shape — **Read the closest existing PRD and mirror it**. Common spine:

```markdown
# <Product / Surface> PRD

## Problem / Context
Who has the problem, why now, what's broken today.

## Goals & Non-Goals
- Goals: measurable outcomes.
- Non-Goals: explicit scope cuts (YAGNI in action).

## Users / Personas
Who uses it and in what role.

## Requirements
Functional requirements, grouped. Number them if they'll be referenced by tasks.

## Flows
Key user/system flows (text or diagrams).

## Success Metrics
How we know it worked.

## Open Questions / Risks
Unresolved decisions, assumptions, dependencies.
```

> For an *implementation* spec/plan (not product requirements), use `superpowers:writing-plans`
> → it lands in `docs/superpowers/specs/` & `docs/superpowers/plans/` with a dated filename.

---

## § Convention files — CLAUDE.md / AGENTS.md

### The layout (verify with `find . -name CLAUDE.md -not -path '*/node_modules/*'`)

- **Root `CLAUDE.md`** — conventions for Claude Code. Highest-traffic agent instructions.
- **Root `AGENTS.md`** — the same Project Conventions, addressed to other agents. **Separate
  file, not a symlink** (sizes differ on disk). Keep shared rules in sync with root CLAUDE.md.
- **Per-package `CLAUDE.md`** — `apps/api`, `apps/web`, `apps/agent-job`, `packages/db-backend`,
  `packages/client-core`, `packages/shared`, `tools/system-board`,
  `apps/api/src/modules/agentos`, … These **override the root for their subtree**
  (e.g. `tools/system-board` opts out of TDD and code review).

### Rules for editing

1. **Narrowest scope wins.** A rule that only applies to one package goes in that package's
   CLAUDE.md, not the root. A repo-wide convention goes in the root — and then mirror it into
   root AGENTS.md.
2. **Surgical edits.** Use `Edit` on the specific section; do not rewrite the whole file.
   Preserve the terse, imperative rule-list voice and existing section headings
   (`## Stack`, `## Core Principles`, `## Architecture`, `## Import Rules`, …).
3. **Root CLAUDE.md ↔ AGENTS.md sync checklist** when changing a shared convention:
   - [ ] Edit the rule in root `CLAUDE.md`.
   - [ ] Apply the equivalent change in root `AGENTS.md`.
   - [ ] If the rule is enforced (CI, Biome, Makefile), update that mechanism too, or note it.
4. **Don't duplicate the repo.** Conventions capture what's non-obvious or enforced — not a
   restatement of code structure or git history.
5. **Keep CLAUDE.md slim.** The root file is loaded into every session's context; prefer a
   one-line rule + pointer to a `docs/` reference over inlining a long explanation
   (mirrors the existing "see `docs/dev-commands.md`" / "see `docs/ops-runbook.md`" pattern).

### Quick check after editing root conventions

```bash
# Confirm the two root files didn't silently diverge on the section you touched
diff <(sed -n '/## Core Principles/,/## /p' CLAUDE.md) \
     <(sed -n '/## Core Principles/,/## /p' AGENTS.md)
```
