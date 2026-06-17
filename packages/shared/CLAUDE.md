# packages/shared

**Single source of truth for data shapes.** Zod schemas, types, constants, and pure utility functions. Used by ALL apps (backend, desktop, web, mobile). Every API endpoint, form validation, and database query MUST reference shared Zod schemas.

## Important

Changes here affect everything. After modifying this package, run:

```bash
make test PKG=@repo/shared && make typecheck
```

## Contents

- `src/schemas/` — Zod schemas (validation + type inference)
- `src/types/` — TypeScript interfaces, API contracts
- `src/constants/` — Enums, status codes, role names
- `src/utils/` — Pure utility functions (no side effects)

## TDD (Mandatory)

Test-first, Red → Green → Refactor — see root `CLAUDE.md`. Test files live next to the code: `foo.ts` → `foo.test.ts`.
