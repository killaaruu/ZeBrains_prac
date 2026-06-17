# Web — Vite + React SPA

## Stack

Vite 6, React 19.2, TanStack Router, Tailwind CSS 4, shadcn/ui, TanStack Query, Zustand

## Architecture

Standard Vite React SPA with feature-sliced architecture.

### Feature-Sliced Structure

- `src/features/{domain}/` — components, hooks, index.ts barrel
- `src/app/routes/` — TanStack Router file-based routes (thin wiring)
- `src/shared/` — app-level generic UI, hooks, lib, shadcn/ui components

## Routing

- TanStack Router with file-based route generation
- Uses `createBrowserHistory` (default for web)
- Route files in `src/app/routes/`
- Auto-generated route tree: `src/app/routeTree.gen.ts`

## Styling

- Tailwind CSS 4 — CSS-based config, native cascade layers
- shadcn/ui with `rsc: false`
- System fonts

## State

- Server state: TanStack Query hooks from `@repo/client-core`
- Client state: Zustand stores from `@repo/client-core`

## Environment Variables

- Env vars must be prefixed with `VITE_` to be exposed to the browser
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_URL`

## TDD Workflow (Mandatory)

Red, Green, Refactor. Tests live next to the code.

| Unit              | Test                                           |
| ----------------- | ---------------------------------------------- |
| **Feature hooks** | Data fetching, mutations, error/loading states |
| **Components**    | Rendering, user interactions, conditional UI   |
| **Form logic**    | Validation, submission, error display          |
| **Utils**         | Pure function input/output                     |

## Commands

All commands go through the root `Makefile` (`make help`). Quick set: `make web` (dev), `make test PKG=@repo/web`, `make typecheck PKG=@repo/web`, `make build PKG=@repo/web`. Web-only scripts without a make target (run via pnpm): `pnpm --filter @repo/web {test:watch,preview}`. Full protocol: `/verify` skill or `docs/dev-commands.md`.
