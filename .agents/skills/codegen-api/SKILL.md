---
name: codegen-api
description: Verify API changes in a repo that uses hand-written Axios clients and shared Zod/types instead of OpenAPI client generation
---

# Verify API endpoint changes

This repo does not currently have an OpenAPI client generation pipeline or a `codegen:api` script. API consumers use hand-written Axios wrappers plus shared Zod schemas/types. After endpoint changes, verify the API and update any affected client-core hooks manually.

This is required after any change to:
- API endpoints (new routes, changed request/response shapes)
- DTOs in `apps/api/src/modules/*/dto/`
- Swagger decorators (`@ApiProperty`, `@ApiResponse`, etc.)

## Steps

### 1. Build the API

```bash
pnpm --filter @repo/api build
```

This compiles the NestJS app and catches route/module/Swagger compilation issues.

### 2. Run API typecheck

```bash
pnpm --filter @repo/api typecheck
```

This catches contract and DI type errors inside the API package.

### 3. Update consumers manually when needed

If the endpoint is consumed by frontend code, update the relevant `packages/client-core/src/hooks/*` hook and tests. Use shared schemas/types from `@repo/shared` where possible.

### 4. Verify no breaking changes

```bash
turbo typecheck
```

This runs typecheck across all packages. Breaking changes in the API (renamed fields, removed endpoints, type changes) will surface here as type errors in the consumers.

Fix any type errors before committing.

## When to run

- After `/new-api-module` Phase 3 is complete
- After modifying existing endpoint DTOs or response shapes
- After adding or removing Swagger decorators that change the spec output

## Troubleshooting

- **Build fails:** Fix compilation errors in `apps/api/` first
- **Missing client types:** Add or update shared schemas/types in `packages/shared`, then update the hand-written client-core hooks
- **Typecheck fails after endpoint changes:** Update consumers — do not suppress type errors
