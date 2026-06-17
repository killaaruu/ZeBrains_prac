---
name: writing-docs
description: Author durable project documentation in this monorepo — ADRs (docs/adr/), DDD event-storming narratives (docs/ddd/), PRDs (docs/prd/), and updates to the CLAUDE.md / AGENTS.md convention files. Use when asked to "write an ADR", "record an architecture decision", "create a DDD / event storming doc", "model the domain", "write a PRD", "update CLAUDE.md", "update AGENTS.md", "document a convention", or to add any long-lived reference doc under docs/. NOT for design specs / implementation plans (use superpowers:writing-plans) or machine-readable *.ddd.yaml System Board models (use ddd-doc).
---

# Writing Docs

## Purpose

Produce documentation that matches this repo's established formats and lives in the right
place, so docs stay consistent and discoverable. This skill is a **router + format guide**:
identify the doc type, follow its template, place it correctly.

## Step 0 — Route to the right doc type (and the right tool)

| You're asked to… | Doc type | Lives in | Use |
|---|---|---|---|
| Record a chosen/rejected architecture decision + its trade-offs | **ADR** | `docs/adr/NNN-kebab-title.md` | this skill → `REFERENCE.md` § ADR |
| Map a domain: events, aggregates, bounded contexts, flows (human narrative) | **DDD event storming** | `docs/ddd/<context>.event-storming.ddd.md` | this skill → `REFERENCE.md` § DDD |
| Define what to build for a product surface (requirements, scope, success) | **PRD** | `docs/prd/<name>-prd.md` | this skill → `REFERENCE.md` § PRD |
| Change conventions/rules agents must follow | **CLAUDE.md / AGENTS.md** | root + per-package | this skill → `REFERENCE.md` § Convention files |
| Operational how-to (deploy, secrets, recovery) | Runbook/guide | `docs/ops-runbook.md`, `docs/guides/` | edit in place, match surrounding style |

**Route AWAY from this skill when:**
- **Design spec or implementation plan** for a feature you're about to build → `superpowers:writing-plans` (lands in `docs/superpowers/{plans,specs}/`). Those are working documents; this skill is for durable reference docs.
- **Machine-readable domain model** (`*.ddd.yaml` scored/drift-checked for System Board) → the `ddd-doc` skill. The `docs/ddd/*.event-storming.ddd.md` here is the *human narrative*, a different artifact.

If after routing the request isn't a documentation task at all, stop and say so.

## Universal rules (apply to every doc)

1. **Language.** Code, comments, commit messages, and infra/architecture docs → **English**.
   User-facing content and **domain/event-storming narratives → Russian** (the domain is
   spoken in Russian here; see existing `docs/ddd/*` and `docs/prd/*`). When unsure, match
   the language of the sibling files in the target directory.
2. **Location & naming.** Put the file where the table above says; copy the naming pattern
   of existing siblings exactly (`ls` the target dir first). Never invent a new top-level
   docs folder without asking.
3. **Match the local format.** Before writing, **Read at least one existing doc of the same
   type** and mirror its heading structure, tone, and table conventions. The templates in
   `REFERENCE.md` are derived from the real files but the on-disk files are the source of truth.
4. **Reference the repo concretely.** Cite real paths (`apps/api/src/modules/...`), real
   commands (`make <target>` — never raw `turbo`/`pnpm`), real module/port names. Generic
   advice that could apply to any project is a smell.
5. **Don't commit unless asked.** Create/edit the file; let the user commit (per Git Workflow
   in CLAUDE.md). If you do commit on request, use `docs(scope): …` conventional-commit type.

## ADR (Architecture Decision Record) — quick form

- **Numbering:** sequential, zero-padded. `ls docs/adr/` → next number after the highest.
- **Filename:** `NNN-short-kebab-summary.md`.
- **Required sections, in order:** title `# ADR-NNN: …`, then `**Date:** / **Status:** /
  **Deciders:**`, then `## Context`, `## Decision`, `## Consequences` with
  `### Positive` / `### Negative` / `### Neutral` subsections.
- **Status values:** `Proposed` → `Accepted` → `Superseded by ADR-MMM` (or `Deprecated`).
- **Changing a past decision:** do NOT rewrite history. Either append an `## Amendments`
  section (see ADR-001) or write a new ADR that supersedes the old one and flip the old
  Status. A "do-nothing / hold the line" decision is a valid ADR (see ADR-003) — make its
  *revisit triggers* explicit so it doesn't rot into dogma.
- Full template + worked example: `REFERENCE.md` § ADR.

## DDD event storming — quick form

- One file per bounded-context group: `docs/ddd/<context>.event-storming.ddd.md`, written
  in Russian domain language.
- Canonical section order: **Vision → Core Domain Philosophy → Core Domain Flow →
  Bounded Contexts → Aggregate Roots → Domain Model** (entity-by-entity with explicit
  **Domain Rules**) → embedded **ADR** notes where a modelling decision was made.
- Use fenced ```text blocks for flows and philosophy; tables/lists for entity fields & rules.
- Full template + the entity block shape: `REFERENCE.md` § DDD.

## CLAUDE.md / AGENTS.md — quick form

- **Two separate files at the repo root**, both holding "Project Conventions", plus a
  **per-package CLAUDE.md hierarchy** (`apps/*/CLAUDE.md`, `packages/*/CLAUDE.md`,
  `tools/system-board/CLAUDE.md`, some module-level ones). They are NOT symlinks.
- **Root CLAUDE.md = instructions for Claude Code; root AGENTS.md = the same conventions for
  other agents.** When you change a *shared convention* at the root, update BOTH so they don't
  drift. Package-local CLAUDE.md files override the root for that package (e.g. system-board
  opts out of TDD) — keep package overrides in the package file, not the root.
- Edit surgically (use `Edit`, not a full rewrite); keep the terse rule-list voice; put the
  rule in the narrowest file that needs it. Details & checklist: `REFERENCE.md` § Convention files.

## Workflow

1. Route (Step 0). If it's not this skill's job, hand off and stop.
2. `ls` the target directory; `Read` one sibling of the same type.
3. Open `REFERENCE.md` to the matching section for the full template.
4. Draft the doc grounded in real repo paths/commands; place & name it correctly.
5. Report what you created and where; ask before committing.
