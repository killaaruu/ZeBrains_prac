---
name: new-api-endpoint
description: Add a single route to an EXISTING NestJS module in apps/api/src/modules/ — one controller route + service method + shared Zod contract + spec, built with TDD. Use when adding an endpoint to a module that already exists (the most common backend task), extending a resource with a new action, or when the user asks to "add a route/endpoint to X", "expose a new action on the X controller", or "add a GET/POST/PATCH to the existing X module". NOT for a brand-new module (use new-api-module). Part of the endpoint chain (→ sync-api-contract → new-client-hook).
---

# Add a route to an existing NestJS module

Add one endpoint — to a module that **already exists** in
`apps/api/src/modules/`. One controller route + one service method + the shared Zod
contract + a failing-first spec.

**Use `new-api-module` instead** if the domain has no module yet. This skill never
creates a module, never registers a new module in `app.module.ts`, and never adds a whole
CRUD surface — it grafts a single route onto existing wiring.

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only
the layer-specific structure, conventions, and the forced next step.

## Before you start — locate the seam

```bash
ls apps/api/src/modules/<module>/        # find the existing controller + service
```

You are editing existing files, not scaffolding new ones:

- `<module>.controller.ts` — add the route handler
- `<module>.service.ts` — add the method holding the logic
- `<module>.service.test.ts` — add the failing spec first (note: `.test.ts`, not `.spec.ts`)

No `*.dto.ts` files exist in this repo and none should be created — request/response shapes
live as Zod schemas in `@repo/shared` (see `docs/adr/004-api-contract-via-shared.md`).

## Layer conventions (mirror the existing module)

**Contract first** — the request/response shape is a Zod schema in `@repo/shared`.
- Reuse an existing schema if the shape already exists there.
- If the shape is **new**, invoke the `new-shared-schema` skill (it carries the TDD
  discipline + naming conventions) — do not hand-write a DTO class.

**Service method** (`<module>.service.ts`)
- Add the method next to the siblings; keep the existing constructor/DI untouched.
- Reads/writes go through Drizzle via the injected `db` (`@Inject("DRIZZLE_DB")`,
  `@repo/db-backend`). **No Supabase SDK for DB on the backend.**
- Type the input with the shared type (`import type { CreateX } from "@repo/shared"`),
  the return with the shared response type.
- `throw new NotFoundException(...)` etc. for domain errors — let Nest map them.
- Log key ops via the module's existing `Logger`.

**Controller route** (`<module>.controller.ts`)
- Add the decorated handler alongside the others: `@Get(":id")` / `@Post()` /
  `@Patch(":id")` / `@Put(...)` / `@Delete(":id")` matching `$ARGUMENTS`.
- Validate the body with the shared schema via the repo's pipe:
  `@Body(new ZodValidationPipe(createXSchema)) body: unknown`
  (`apps/api/src/common/pipes/zod-validation.pipe.ts`), then pass it on — the service
  param type carries the real shape.
- `@ApiOperation({ summary })` on the route; the class already has `@ApiTags` /
  `@ApiBearerAuth`. Reuse the controller's existing guard (`@UseGuards(...)`) — don't
  invent new auth.
- `@HttpCode(204)` for no-content mutations, matching sibling routes.

**DI guardrails** (only if you touch wiring — usually you don't)
- Constructor params typed as interfaces need `@Inject(TOKEN)` — interfaces emit `Object`
  in DI metadata.
- Never `import type` for injectable classes — the metadata is stripped and DI breaks.

## Tests Claude should write (drives the Red phase)

Service spec (`<module>.service.test.ts`) — the new method's happy path, the not-found /
validation / unauthorized branches, and edge cases (empty result, bad id). Mock Drizzle the
same way the existing specs in the file do (thenable chainable mock).

Run package tests:

```bash
make test PKG=@repo/api
```

For full HTTP→service→DB coverage of the new route, invoke the `e2e-test` skill
(supertest spec in `apps/api/test/`) — optional but recommended for non-trivial flows.

## Forced next step

Upstream precondition: if this route needs a new or changed request/response shape, author it
with **`new-shared-schema`** first — the service validates against that `@repo/shared` contract.

Endpoint added → **invoke `sync-api-contract`** to confirm the `@repo/shared` Zod contract
exists and typecheck every consumer (API + client).
If a frontend will consume this route → then **invoke `new-client-hook`** for the entity
(which forwards to `new-frontend-feature` when a new UI surface is needed).
Otherwise the chain ends → run the `verify` skill for the full pipeline.
