---
name: new-api-module
description: Scaffold a new NestJS API domain module in apps/api/src/modules/ — controller, service, DTOs, and module wiring, built with TDD. Use when adding a new REST resource or backend domain, exposing an entity via the API, or when the user asks to "add an API module/endpoint", "create a NestJS controller/service", "build the backend for X", or "new CRUD resource". Part of the endpoint chain (→ sync-api-contract → new-client-hook).
---

# Create a new NestJS API module

Scaffold a new domain module in `apps/api/src/modules/`. Take the module name from the user's request (or the upstream chain step that invoked this skill); below, `<module>` is that name (kebab/lowercase for files and tags) and `<Module>` its PascalCase form (for class names).

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only the layer-specific structure, conventions, and the forced next step.

## Target structure

```
apps/api/src/modules/<module>/
├── <module>.module.ts
├── <module>.controller.ts
├── <module>.controller.spec.ts
├── <module>.service.ts
├── <module>.service.spec.ts
└── dto/
    ├── create-<module>.dto.ts
    └── update-<module>.dto.ts
```

## Layer conventions

**Service** (`<module>.service.ts`)
- `private readonly logger = new Logger(<Module>Service.name)` — log key ops, debug flow, warn recoverable, error failures (per `CLAUDE.md`).
- Drizzle direct via `@repo/db-backend`. No Supabase SDK on backend.
- Constructor params typed as interfaces require `@Inject(SYMBOL_TOKEN)` — interfaces emit `Object` in DI metadata.
- Never `import type` for injectables (DI metadata is stripped).

**Controller** (`<module>.controller.ts`)
- `@ApiTags('<module>')` + `@ApiBearerAuth()` + `@ApiOperation({ summary })` on every endpoint.
- `@UseGuards(AuthGuard)` on protected routes.
- Standard CRUD: `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id`.

**DTOs** (`dto/`)
- `class-validator` decorators for validation, `@ApiProperty` for Swagger.
- Reference shared Zod schemas from `@repo/shared` if they exist.

**Module** (`<module>.module.ts`)
- Register controller + service. Add module to `apps/api/src/app.module.ts`.

## Tests Claude should write (drives the Red phase)

Service spec — CRUD behavior, validation, errors (not found, duplicate, unauthorized), edge cases (empty results, invalid IDs). Mock Drizzle.
Controller spec — status codes, response shapes, auth guard rejects unauthorized, bad DTOs rejected. Mock the service.

Run package tests: `make test PKG=@repo/api`

## Forced next step

Upstream precondition: the `@repo/shared` Zod contract this module validates against should already exist — if not, invoke **`new-shared-schema`** before scaffolding here.

Endpoints changed → **invoke `sync-api-contract` skill** to sync the API↔client contract via `@repo/shared` and typecheck consumers.
If a frontend will consume this → then **invoke `new-client-hook`** for the entity (which forwards to `new-frontend-feature` when a new UI surface is needed).
