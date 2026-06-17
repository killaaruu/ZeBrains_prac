---
name: new-shared-schema
description: Add a new Zod schema to packages/shared
---

# Add a new shared Zod schema

Create a new Zod schema in `packages/shared/src/schemas/`. Take the schema name from the user's request (or the upstream chain step that invoked this skill); below, `<schema>` is that name (camelCase) and `<Schema>` its PascalCase form.

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only the layer-specific structure, conventions, and the forced next step.

`@repo/shared` is consumed by every app and package — changes here have monorepo-wide blast radius.

## Target files

```
packages/shared/src/schemas/<schema>.ts
packages/shared/src/schemas/<schema>.test.ts
packages/shared/src/schemas/index.ts   # re-export (create if missing)
packages/shared/src/index.ts           # ensure schemas barrel is re-exported
```

## Conventions

```ts
import { z } from "zod";

export const <schema>Schema = z.object({
  // fields driven by tests
});
export type <Schema> = z.infer<typeof <schema>Schema>;

export const create<Schema>Schema = <schema>Schema.omit({
  id: true, createdAt: true, updatedAt: true,
});
export type Create<Schema> = z.infer<typeof create<Schema>Schema>;

export const update<Schema>Schema = create<Schema>Schema.partial();
export type Update<Schema> = z.infer<typeof update<Schema>Schema>;
```

- Schema names: `camelCaseSchema`. Type names: `PascalCase`.
- Derive types via `z.infer<>` — never hand-write the interface.
- Create / Update variants via `.omit()` + `.partial()`.
- Add `z.transform()` only when normalization is genuinely needed.

## Tests Claude should write (drives the Red phase)

Valid data passes. Each required field missing → error. Wrong types → error. Edge cases (empty strings, negatives, malformed formats). Create variant omits id/timestamps. Update variant marks all fields optional.

Run package tests: `make test PKG=@repo/shared`

## Forced next step

- This schema is the contract for a **new API module** → **invoke `new-api-module`** next (the controller/service validate against it).
- This schema is the contract for a **new route on an existing module** → **invoke `new-api-endpoint`** next.
- **Standalone schema change** (no new API surface) → chain ends here; **run `/verify`** (not just package tests). Schemas leak into API validation, client hooks, and forms — typecheck must pass monorepo-wide.
