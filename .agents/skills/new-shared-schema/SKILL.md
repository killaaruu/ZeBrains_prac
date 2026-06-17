---
name: new-shared-schema
description: Add a new Zod schema to packages/shared
argument-hint: "[schema-name]"
---

# Add a new shared Zod schema

Create a new Zod schema named `$ARGUMENTS` in `packages/shared/src/schemas/`.

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only the layer-specific structure, conventions, and the forced next step.

`@repo/shared` is consumed by every app and package — changes here have monorepo-wide blast radius.

## Target files

```
packages/shared/src/schemas/$ARGUMENTS.ts
packages/shared/src/schemas/$ARGUMENTS.test.ts
packages/shared/src/schemas/index.ts   # re-export (create if missing)
packages/shared/src/index.ts           # ensure schemas barrel is re-exported
```

## Conventions

```ts
import { z } from "zod";

export const $argumentsSchema = z.object({
  // fields driven by tests
});
export type $Arguments = z.infer<typeof $argumentsSchema>;

export const create$ArgumentsSchema = $argumentsSchema.omit({
  id: true, createdAt: true, updatedAt: true,
});
export type Create$Arguments = z.infer<typeof create$ArgumentsSchema>;

export const update$ArgumentsSchema = create$ArgumentsSchema.partial();
export type Update$Arguments = z.infer<typeof update$ArgumentsSchema>;
```

- Schema names: `camelCaseSchema`. Type names: `PascalCase`.
- Derive types via `z.infer<>` — never hand-write the interface.
- Create / Update variants via `.omit()` + `.partial()`.
- Add `z.transform()` only when normalization is genuinely needed.

## Tests Codex should write (drives the Red phase)

Valid data passes. Each required field missing → error. Wrong types → error. Edge cases (empty strings, negatives, malformed formats). Create variant omits id/timestamps. Update variant marks all fields optional.

Run package tests: `pnpm --filter @repo/shared test`

## Forced next step

`@repo/shared` change → **run `/verify`** (not just package tests). Schemas leak into API DTOs, client hooks, and forms — typecheck must pass monorepo-wide.
