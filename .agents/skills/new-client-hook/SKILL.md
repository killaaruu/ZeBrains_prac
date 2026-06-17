---
name: new-client-hook
description: Add a TanStack Query hook (and optional Zustand store) to packages/client-core
argument-hint: "[entity-name]"
---

# Add a new client-core hook

Add a TanStack Query hook (and optional Zustand store) for `$ARGUMENTS` in `packages/client-core/src/`.

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only the layer-specific structure, conventions, and the forced next step.

This is a shared layer — changes here affect every consumer (`apps/web`, `apps/client-dashboard-web`).

## Target structure

```
packages/client-core/src/hooks/
├── use-$ARGUMENTS.ts            # Query key factory + useQuery / useMutation
└── use-$ARGUMENTS.test.ts

packages/client-core/src/stores/   (only if UI state is needed)
├── use-$ARGUMENTS-store.ts
└── use-$ARGUMENTS-store.test.ts

packages/client-core/src/index.ts  # Barrel — must be updated
```

## Layer conventions

**HTTP**
- Always `http` from `@repo/shared/lib/api-client`. Never `new axios()`.

**Query key factory** (mandatory pattern)
```ts
export const $argumentsKeys = {
  all: ['$arguments'] as const,
  lists: () => [...$argumentsKeys.all, 'list'] as const,
  list: (filters?: object) => [...$argumentsKeys.lists(), filters] as const,
  details: () => [...$argumentsKeys.all, 'detail'] as const,
  detail: (id: string) => [...$argumentsKeys.details(), id] as const,
};
```

**Hooks**
- `useQuery` for reads, `useMutation` for writes.
- Mutations invalidate the correct factory keys (`lists()` after create/update/delete; `detail(id)` after update on that id).

**Store** (Zustand, only if needed)
- Minimal shape — selectedId, filters, UI toggles. No server data here.

**Barrel** (`src/index.ts`)
- Export hook(s) and store(s). Forgetting this is the #1 consumer breakage.

## Forbidden in client-core

- New axios instances — always use `http` from `@repo/shared/lib/api-client`.
- App-specific imports (anything from `apps/*`) — `client-core` is consumed by both web apps and must stay app-agnostic.

## Tests Codex should write (drives the Red phase)

Hook test — data shape, loading/success/error, query key factory key shapes, mutation payload, mutation invalidates the right keys. Mock HTTP, not TanStack internals.
Store test (if created) — initial state, each action's state delta, no shared mutable refs.

Run package tests: `pnpm --filter @repo/client-core test`

## Forced next step

If this hook calls an endpoint just added to the API → confirm `codegen-api` has run.
Mandatory blast-radius check (changes ripple to every consumer): `turbo typecheck`.
