---
name: new-client-hook
description: Add a shared TanStack Query hook — query-key factory plus useQuery/useMutation, and an optional Zustand store — to packages/client-core, consumed by every web app. Use when wiring the client to a new or changed API endpoint, adding server-state data fetching, or when the user asks to "add a client hook", "create a useX query/mutation", "fetch X from the API on the client", or "add a TanStack Query hook". Final step of the endpoint chain.
---

# Add a new client-core hook

Add a TanStack Query hook (and optional Zustand store) in `packages/client-core/src/`. Take the entity name from the user's request (or the upstream chain step that invoked this skill); below, `<entity>` stands for that name.

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only the layer-specific structure, conventions, and the forced next step.

This is a shared layer — changes here affect every consumer (`apps/web`, `apps/client-dashboard-web`).

## Target structure

```
packages/client-core/src/hooks/
├── use-<entity>.ts            # Query key factory + useQuery / useMutation
└── use-<entity>.test.ts

packages/client-core/src/stores/   (only if UI state is needed)
├── use-<entity>-store.ts
└── use-<entity>-store.test.ts

packages/client-core/src/index.ts  # Barrel — must be updated
```

## Layer conventions

**HTTP**
- Always `http` from `@repo/shared/lib/api-client`. Never `new axios()`.

**Query key factory** (mandatory pattern)
```ts
export const <entity>Keys = {
  all: ['<entity>'] as const,
  lists: () => [...<entity>Keys.all, 'list'] as const,
  list: (filters?: object) => [...<entity>Keys.lists(), filters] as const,
  details: () => [...<entity>Keys.all, 'detail'] as const,
  detail: (id: string) => [...<entity>Keys.details(), id] as const,
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

## Tests Claude should write (drives the Red phase)

Hook test — data shape, loading/success/error, query key factory key shapes, mutation payload, mutation invalidates the right keys. Mock HTTP, not TanStack internals.
Store test (if created) — initial state, each action's state delta, no shared mutable refs.

Run package tests: `make test PKG=@repo/client-core`

## Forced next step

If this hook calls an endpoint just added to the API → confirm the shared Zod contract exists in `@repo/shared` (invoke `sync-api-contract` to sync/typecheck).
If a new UI surface will consume this hook → **invoke `new-frontend-feature`** to scaffold it.
Chain terminal: **invoke the `verify` skill** for the full pipeline.
