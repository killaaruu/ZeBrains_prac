---
name: new-frontend-feature
description: Scaffold a new frontend feature folder in apps/web/ or apps/client-dashboard-web/
argument-hint: "[app-name] [feature-name]"
---

# Create a new web feature

Scaffold a new feature named `$ARGUMENTS` in `apps/<web|client-dashboard-web>/src/features/`.

**Pick the target app first.** Two web apps exist:
- `apps/web` — main app.
- `apps/client-dashboard-web` — client-facing dashboard.

If the feature is shared logic that both apps need, the hooks/stores belong in `@repo/client-core`, not in either app.

**TDD discipline:** Invoke `superpowers:test-driven-development`. This skill provides only the layer-specific structure, conventions, and the forced next step.

## Target structure

```
apps/<target-app>/src/features/$ARGUMENTS/
├── index.tsx                      # Barrel export — public API only
├── components/
│   ├── <component-name>.tsx
│   └── <component-name>.test.tsx
├── hooks/
│   ├── use-<hook-name>.ts
│   └── use-<hook-name>.test.ts
└── types.ts                       # Feature-local types (if needed)
```

## Import rules (STRICTLY ENFORCED — see AGENTS.md)

- ✅ `@repo/client-core`, `@repo/shared`, `@repo/services-client`, `@/shared/`, own internals.
- ❌ Never import from other features or from `app/`.

If two features need shared logic: hoist to `@repo/client-core` (cross-app) or `@/shared/` (this app only).

## Layer conventions

**Hooks** (`hooks/use-<name>.ts`)
- TanStack Query hooks for server state — define in `@repo/client-core` when both web apps need it; otherwise feature-local.
- Zustand stores from `@repo/client-core` for client state shared cross-app; feature-local stores OK for feature-only UI.
- React Hook Form + Zod (shared schemas in `@repo/shared`) for forms.

**Components** (`components/<name>.tsx`)
- Tailwind + shadcn/ui.
- Handle every state explicitly: loading, success, error, empty.
- Accessibility: correct roles, labels, aria attrs.

**Barrel** (`index.tsx`)
- Export only the public API. Internals stay private.

**Routes** (`apps/<target-app>/src/app/`)
- Thin: import from the feature, render. Created via TanStack Router.

## Tests Codex should write (drives the Red phase)

Hook tests — data shape, loading/success/error, mutation triggers correct API call. Mock TanStack Query / API.
Component tests — renders correct elements per state, user interactions trigger expected callbacks, a11y. Mock hooks, not API.

Run package tests: `pnpm --filter @repo/web test` or `pnpm --filter @repo/client-dashboard-web test` (whichever app you scaffolded into).

## Forced next step

Hooks calling endpoints that don't yet exist on the typed client → **invoke `codegen-api`** first, or `new-api-module` if the endpoint itself is missing.
Final blast-radius check: `/verify`.
