---
name: ddd-doc
description: Generate or update a module's DDD documentation model (*.ddd.yaml) for System Board — draft a new domain from a seed (S1) or scan existing code to score readiness and detect drift (S2). Use when asked to "document a DDD module", "model the domain", "score readiness", "update the system board model", or "check drift".
argument-hint: "[module-name]"
---

# Generate DDD documentation (`*.ddd.yaml`)

You are the **backend** for System Board (`tools/system-board`). The web app is a
read-only renderer; all intelligence lives here. Your job: produce or update a
module's DDD model as YAML, which System Board renders into Overview + component
pages + Graph/Timeline/Hexagon lenses.

**Module:** `$ARGUMENTS`

## Contract (read these first)

- **Schema (source of truth):** `tools/system-board/src/ddd-types.ts` — `DddModule`,
  `DddComponent`, `Readiness`. Match it exactly; the web casts the assembled JSON to it.
- **Two prose layers per component.** `overview` = the simple read (1–2 plain sentences,
  no code symbols, what it is + why it matters) shown on top of the component page;
  `docs` = the technical read (detailed prose, code symbols allowed) shown in a
  collapsible "Технические детали" section. `summary` stays the one-liner for lists.
  Write both honestly; the viewer controls disclosure, not the text.
- **Canonical example (co-located, generated):**
  `apps/api/src/modules/example/example.ddd.yaml`. Mirror its shape (flat
  `components[]` typed by `type`, plus `language`, `ports`, `process`, `externalSystems`).
- **Where the file lives:** co-located in the module's **source directory** —
  `apps/api/src/modules/<dir>/<name>.ddd.yaml` (committed, source of truth). For modules
  with no code yet (S1), create the directory first.
- **DDD module id vs source directory may differ.** The `module:` field is the bounded-context
  id and can differ from the folder, e.g. a context can live in one directory as
  `<dir>/<name>.ddd.yaml` (`module: <name>`). The assembler keys by the
  `module:` field, not the filename, and globs `apps/api/**/*.ddd.yaml` — so the filename is
  free. The `hash` helper names the hashes file after the **directory** (`<dir>.hashes.yaml`).
  A bounded context can also span multiple directories.
- **Never hand-edit** `tools/system-board/src/system-map.generated.json` — it is derived
  and gitignored. It is produced by the assemble step.

## Two modes

Decide which applies before starting:

- **S1 — new module (design → code).** No code yet, or you're modelling intent first.
  Input is a **seed**: a prose description of the business process + the entities the
  user already sees. You *draft* the full domain model, the user refines it by comment,
  then it is handed to a coding agent as the spec. There is no code to scan.
- **S2 — existing / in-progress module (code → docs).** Code exists. You scan it, score
  readiness, draft/refresh `docs`, and detect drift between model and code.

The same `*.ddd.yaml` is the through-line: the model authored in S1 becomes the
as-designed baseline that S2 measures reality against.

## Completeness (MANDATORY) — read the whole module, never sample

Before modelling anything, **read every source file of the module.** Sampling
produces a confident-but-wrong model — the most expensive gaps are invisible from any
single file and only surface when you read the module end-to-end.

1. Enumerate all sources and read each one (not just the obvious ones):
   ```bash
   find apps/api/src/modules/<module> -name '*.ts' -not -name '*.test.ts' -not -name '*.spec.ts'
   ```
   Controllers, services, `*.module.ts` wiring, adapters, `*.definition.ts`, queue/sse/llm
   subdirs — all of them.
2. Read the module's **DB schema** (`packages/db-backend/src/schema/<...>`) and every
   **shared Zod schema / enum** it imports (`packages/shared/src/...`). Tables and enums
   are part of the domain.
3. **Ground every component, relation, and readiness score in a file you actually read.**
   Never infer a component from a filename, a single file, or this skill's example.

**Why this is non-negotiable** (real finding from a past pass): a workflow engine
existed as pure, tested transition functions — but reading the controller showed *no
endpoint called it* and the schema showed its `transitions` table was *never written*.
"Built but unwired" is invisible when sampling; it cost the module ~14 readiness points.
Cross-file truths (unwired code, schema-only tables, dead adapters) are the whole point.

A sampled pass is worse than no pass — it looks trustworthy and isn't. If the module is
large, read it all anyway; do not summarise from a subset.

**First model vs re-run:** the full read above is mandatory when building a module's model
for the first time. On a later re-run against an existing model, the drift gate (step 1
below) narrows you to *changed* files — but if there is no model yet, completeness wins
over the gate. Every readiness score must trace to code you read, never to an assumption.

## S2 workflow — scan & score an existing module

1. **Drift gate.** Run the deterministic hasher and read its report:
   ```bash
   pnpm --filter @repo/system-board hash apps/api/src/modules/<module>
   ```
   It lists `changed / added / removed` source files vs `<module>.hashes.yaml`
   (exit 1 if any drift). A changed hash is a **"re-read this" trigger, not proof the
   docs are wrong** — re-read each listed file and decide whether the model needs editing.
2. **Reconcile.** For each drifted file, read it and update the affected `components[]`
   entries (fields, signatures, relations, `docs`). Add new components for new
   aggregates/commands/events; mark code constructs with no model entry via `drift`.
3. **Score readiness** (see rubric below) → set `readiness: { score, level }` on each
   component and a rollup on the module.
4. **Detect drift / orphans.** An event or command found in code but absent from the
   model → add it with `drift: "…"` (orphan, code-only). A `process` step with no
   aggregate, or an event emitted by no aggregate → note it (model↔process drift).
   Surface production blockers as `hotspots: [...]` on the relevant component.
5. **Write** `apps/api/src/modules/<module>/<module>.ddd.yaml`, then re-pin hashes:
   ```bash
   pnpm --filter @repo/system-board hash apps/api/src/modules/<module> --write
   ```
6. **Assemble** (deterministic, no LLM) and verify:
   ```bash
   pnpm --filter @repo/system-board generate   # globs *.ddd.yaml → system-map.generated.json
   pnpm --filter @repo/system-board typecheck
   ```
   Then open System Board (`pnpm --filter @repo/system-board dev`) → DDD → `<module>`.

## S1 workflow — draft a new module from a seed

1. Take the user's seed (process prose + entities). Ask only for what's missing to
   identify aggregates and the event flow — do not over-question.
2. Draft a complete `<module>.ddd.yaml` per the schema: `context`, `language`
   (ubiquitous terms ↔ code), `components[]` (aggregates with `root`/`invariants`,
   entities, value objects, commands with `signature`/`target`/`produces`, events with
   `emittedBy`/`reactions`, policies with `when`/`then`), `ports`, `process`,
   `externalSystems`. Set `readiness` to `miss`/low until code exists.
3. Write it to the (possibly new) module directory, run `generate`, and let the user
   review in System Board. Iterate on their comments.
4. When the model is final, it **is** the export/spec — hand it to a coding agent
   (e.g. `new-api-module`) as the contract to implement against.

## Readiness rubric

Score each component (and roll up to the module) across these axes; weight by what the
component needs. `level`: `done` ≥ 85, `part` 40–84, `miss` < 40.

| Axis | done | miss |
|------|------|------|
| Domain model | aggregate/VO modelled, invariants enforced in code | no domain types, anemic |
| Tests | behaviour + edge cases covered | none / happy-path only |
| Error handling | failures handled, no unguarded throws on the path | unhandled throw can crash the flow |
| Logging | `Logger` per service, key ops logged | silent |
| Observability | metrics/traces on the path | none |
| API contracts | typed, validated, documented | loose/undocumented |
| Docs | `docs` written and matches code | empty / stale (drift) |
| Security | inputs validated, authz checked | unreviewed |

Be honest and specific: the value is showing the **distance to production**. Put the
top blockers into `hotspots`.

## Generating component prose (sub-agent workflows)

Both prose layers are independent per component — fan them out as sub-agents. Use this
**only** for `overview`/`docs` prose; keep readiness/drift/hotspot judgement on the main
model (those need cross-file reasoning). Order matters: generate `docs` **first**, then
distil `overview` from it.

### Model selection — allocate by judgment, not by read-vs-write

Counter-intuitive but measured: the per-component cost is **~all input** (reading source +
fixed subagent overhead); the output is ~55 words (~100 tokens). So *who writes* is nearly
free; *who reads/judges* is what matters. Allocate accordingly — each workflow reads
`args.model`, so override per run (`Workflow({ scriptPath, args: { model: "haiku" } })`).

| Layer | Reads source? | Judgment | Default model |
|-------|---------------|----------|---------------|
| `docs` (technical) | yes — accuracy-critical | high (comprehension) | **sonnet** |
| `overview` (distil from verified `docs`) | no | low (rephrase trusted input) | **haiku** |
| `proofread` (edit existing `docs`) | re-reads own text | high ("fixing" = editing meaning) | **sonnet** |

**Do NOT use a "Haiku gathers context → Sonnet writes" split for per-component docs.** It
puts the weak model on the judgment step (comprehension) and the strong model on the cheap
step (prose). Worse, a Haiku "relevant-excerpt" digest is **sampling by proxy** — Sonnet
only sees what Haiku decided to surface, silently violating the read-the-whole-module rule;
Sonnet then writes eloquent prose around Haiku's misreads. The token math doesn't reward it
either (fixed overhead dominates, so a pre-digest shaves little). The genuine
Haiku-gather→Sonnet-synthesize pattern fits **module-scale digestion** (many files → one
structured context with a barrier), not single-file component docs. Use `haiku` for `docs`
only for a deliberately cheap *draft* you intend to proofread/replace.

### Layer 1 — technical `docs` (reads source)

1. **List undocumented components** → `/tmp/undoc.json`
   (array of `{module,id,type,name,summary,file,rel}` for every component with no `docs`):
   ```bash
   pnpm --filter @repo/system-board generate
   node -e 'const d=require("./tools/system-board/src/system-map.generated.json");const out=[];
   for(const m of d.dddModules)for(const c of m.components){if(c.docs)continue;
   const rel=["handles","emits","target","produces","emittedBy","reactions","downstream","then","via"]
   .map(k=>c[k]?`${k}=${Array.isArray(c[k])?c[k].join(","):c[k]}`:null).filter(Boolean).join("; ");
   out.push({module:m.module,id:c.id,type:c.type,name:c.name,summary:c.summary||"",file:(c.source||{}).file||null,rel})}
   require("fs").writeFileSync("/tmp/undoc.json",JSON.stringify(out));console.log(out.length,"undocumented")'
   ```
2. **Run the doc-gen workflow.** One agent per component (defaults to **Sonnet**) reads
   `source.file`, writes a concise technical Russian doc to **distinct**
   `/tmp/ddd-docs/<module>/<id>.md`:
   ```
   Workflow({ scriptPath: ".claude/skills/ddd-doc/generate-docs.workflow.js" })
   # cheap draft instead:  args: { model: "haiku" }
   ```
3. **Merge deterministically** (no LLM) — patches `docs:` via yaml's Document API
   (comments preserved), **never overwriting** components that already have `docs`:
   ```bash
   pnpm --filter @repo/system-board apply-docs /tmp/ddd-docs   # field defaults to docs
   pnpm --filter @repo/system-board generate
   ```

### Layer 2 — plain-language `overview` (distils from `docs`, no source re-read)

The `overview` is the simple read. Generate it **after** `docs` and distil it FROM the
technical doc (+ summary/relations) — cheaper than re-reading source and keeps the two
layers consistent.

1. **List components needing overview** → `/tmp/no-overview.json` (carries each component's
   existing `docs` as the distillation source):
   ```bash
   pnpm --filter @repo/system-board generate
   node -e 'const d=require("./tools/system-board/src/system-map.generated.json");const out=[];
   for(const m of d.dddModules)for(const c of m.components){if(c.overview)continue;
   const rel=["handles","emits","target","produces","emittedBy","reactions","downstream","then","via"]
   .map(k=>c[k]?`${k}=${Array.isArray(c[k])?c[k].join(","):c[k]}`:null).filter(Boolean).join("; ");
   out.push({module:m.module,id:c.id,type:c.type,name:c.name,summary:c.summary||"",docs:c.docs||"",rel})}
   require("fs").writeFileSync("/tmp/no-overview.json",JSON.stringify(out));console.log(out.length,"need overview")'
   ```
2. **Run the overview workflow** (writes distinct `/tmp/ddd-overview/<module>/<id>.md`):
   ```
   Workflow({ scriptPath: ".claude/skills/ddd-doc/generate-overview.workflow.js" })
   ```
3. **Merge into the `overview` field** (note the explicit field arg):
   ```bash
   pnpm --filter @repo/system-board apply-docs /tmp/ddd-overview overview
   pnpm --filter @repo/system-board generate
   ```

**Rules:** agents write distinct files, never edit the shared YAML in parallel (race). Pick
the model by judgment (table above), not by read-vs-write. `overview` must carry no code
symbols/jargon; `docs` may. Never clobber authored prose (`apply-docs` skips a set field).

### Proofreading pass (optional, CORRECTS existing docs)

A light copy-edit of the technical `docs` — typos/grammar/punctuation only, no rewriting,
no touching `backticked` symbols. This is the one case where merging **overwrites** an
existing field, so it is opt-in via `--overwrite`. Always **review the git diff** after:
editing is high-judgment, so the workflow defaults to **Sonnet** — a Haiku run regressed
~13% of its edits (broke a term, mangled a case, swapped a Latin `M5` for Cyrillic). Even
on Sonnet, the diff review is mandatory; revert any change that alters meaning by hand.

```bash
pnpm --filter @repo/system-board generate
node -e 'const d=require("./tools/system-board/src/system-map.generated.json");const out=[];
for(const m of d.dddModules)for(const c of m.components){if(!c.docs)continue;out.push({module:m.module,id:c.id,docs:c.docs})}
require("fs").writeFileSync("/tmp/docs-proofread.json",JSON.stringify(out));console.log(out.length,"to proofread")'
```
```
Workflow({ scriptPath: ".claude/skills/ddd-doc/proofread-docs.workflow.js" })
```
```bash
pnpm --filter @repo/system-board apply-docs /tmp/ddd-docs-proofed docs --overwrite
git diff -- '*.ddd.yaml'   # eyeball: should be only light fixes, never meaning changes
pnpm --filter @repo/system-board generate
```

## Conventions

- Follow `tools/system-board/CLAUDE.md`: no TDD gate, no review gate for this tool —
  implement inline, keep `typecheck` + `build` green.
- `*.ddd.yaml` and `*.hashes.yaml` are committed; the assembled map is gitignored.
- Component `id`s are kebab-case and stable (relations reference them); `name`s are the
  code symbol or domain term.
- Keep `docs` as honest markdown prose — the authored layer. The as-built layer
  (`readiness`, `source`, hashes) comes from scanning.

## Forced next step

After writing/updating the model, **always** run `generate` so System Board reflects it,
and report the readiness rollup + any drift/blockers to the user.
