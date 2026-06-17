---
name: new-api-module
description: Scaffold a new NestJS API domain module in apps/api/src/modules/
argument-hint: "[module-name]"
---

# Create a new NestJS API module

Scaffold a new domain module named `$ARGUMENTS` in `apps/api/src/modules/`.

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only the layer-specific structure, conventions, and the forced next step.

## Target structure

```
apps/api/src/modules/$ARGUMENTS/
├── $ARGUMENTS.module.ts
├── $ARGUMENTS.controller.ts
├── $ARGUMENTS.controller.spec.ts
├── $ARGUMENTS.service.ts
├── $ARGUMENTS.service.spec.ts
└── dto/
    ├── create-$ARGUMENTS.dto.ts
    └── update-$ARGUMENTS.dto.ts
```

## Layer conventions

**Service** (`$ARGUMENTS.service.ts`)
- `private readonly logger = new Logger($ARGUMENTSService.name)` — log key ops, debug flow, warn recoverable, error failures (per `AGENTS.md`).
- Drizzle direct via `@repo/db-backend`. No Supabase SDK on backend.
- Constructor params typed as interfaces require `@Inject(SYMBOL_TOKEN)` — interfaces emit `Object` in DI metadata.
- Never `import type` for injectables (DI metadata is stripped).

**Controller** (`$ARGUMENTS.controller.ts`)
- `@ApiTags('$ARGUMENTS')` + `@ApiBearerAuth()` + `@ApiOperation({ summary })` on every endpoint.
- `@UseGuards(AuthGuard)` on protected routes.
- Standard CRUD: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`.

**DTOs** (`dto/`)
- `class-validator` decorators for validation, `@ApiProperty` for Swagger.
- Reference shared Zod schemas from `@repo/shared` if they exist.

**Module** (`$ARGUMENTS.module.ts`)
- Register controller + service. Add module to `apps/api/src/app.module.ts`.

## Tests Codex should write (drives the Red phase)

Service spec — CRUD behavior, validation, errors (not found, duplicate, unauthorized), edge cases (empty results, invalid IDs). Mock Drizzle.
Controller spec — status codes, response shapes, auth guard rejects unauthorized, bad DTOs rejected. Mock the service.

Run package tests: `pnpm --filter @repo/api test`

## Forced next step

Endpoints changed → **invoke `codegen-api` skill** to regenerate the typed client.
If a frontend will consume this → then **invoke `new-client-hook`** for the entity.
