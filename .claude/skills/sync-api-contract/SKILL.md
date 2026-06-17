---
name: sync-api-contract
description: Use when an API endpoint, DTO, request/response shape, or shared Zod schema changed and the client needs the updated contract — syncs and verifies the API↔client type contract
---

# Sync the API↔client contract

**There is NO code generation in this repo.** Do not reach for `openapi-typescript`,
`orval`, `swagger-typescript-api`, or `openapi-generator` — none are installed and there
is no `codegen:api` script. (See `docs/adr/004-api-contract-via-shared.md` for why.)

The API↔client contract is a **single source of truth**: Zod schemas in `@repo/shared`,
imported by BOTH sides. Nothing is generated, so the contract cannot drift.

```
packages/shared/src/schemas/<domain>/*.schema.ts
        │   export const createOfferSchema = z.object({ ... })
        │   export type   CreateOffer      = z.infer<typeof createOfferSchema>
        │
        ├──────────────► apps/api            import { createOfferSchema } from "@repo/shared"
        │   (backend)                        createOfferSchema.safeParse(body)   ← runtime validation
        │
        └──────────────► packages/client-core  import type { CreateOffer } from "@repo/shared"
            (frontend)                          ← compile-time types in hooks
```

`apps/api` has **no `*.dto.ts` files** — controllers take `@Body() body: Record<string, unknown>`
and the service validates with the shared Zod schema's `.safeParse()`. The client never
redeclares the type; it imports it from `@repo/shared`.

## When to run

- After `/new-api-module` adds or changes an endpoint
- After changing a request/response shape that crosses the API↔client boundary
- After `new-drizzle-table` produces an entity that flows to clients
- Before wiring a `new-client-hook` against a new/changed endpoint

## Steps

### 1. Update the shared Zod schema (the single source of truth)

The contract lives in `packages/shared/src/schemas/`. If the shape is **new**, invoke the
`new-shared-schema` skill (it carries the TDD discipline + conventions). If it **exists**,
edit the schema there. Both the API and the client read this one definition.

### 2. Run the shared package tests

```bash
make test PKG=@repo/shared
```

### 3. Typecheck across all consumers

```bash
make typecheck
```

Breaking changes (renamed fields, removed properties, narrowed types) surface here as type
errors in **both** `apps/api` and `packages/client-core`, because both import the same
module. Fix the consumers — never suppress the errors.

### 4. (If endpoints changed) rebuild the API

```bash
make build PKG=@repo/api && make typecheck PKG=@repo/api
```

## Common mistakes

- **Reaching for an OpenAPI generator.** Not used here — the shared package *is* the contract
  mechanism. See `docs/adr/004-api-contract-via-shared.md`.
- **Redeclaring the DTO on the client** instead of `import type { XxxDto } from "@repo/shared"` —
  this is exactly the drift the shared-schema approach prevents.
- **Editing a schema without running `make typecheck`** — `@repo/shared` has monorepo-wide
  blast radius; skipping typecheck lets a breaking change reach consumers silently.

## Note on Swagger

`@nestjs/swagger` generates an OpenAPI spec at `/api/docs` from hand-written `@ApiResponse`
decorators — it is **documentation only**, not the source of truth, and can drift from the
Zod schemas. Deriving Swagger from Zod is tracked as a separate improvement (not part of this
contract step).

## Forced next step

- A frontend will consume the endpoint → **invoke `new-client-hook`** for the entity.
- Otherwise the chain ends here → run the `verify` skill for the full pipeline.
