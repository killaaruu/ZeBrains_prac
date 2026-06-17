# packages/client-core — Shared Client Hooks & Stores

TanStack Query hooks and Zustand stores shared across the web apps
(`apps/web`, `apps/client-dashboard-web`) and `packages/file-vault-ui`.

## Hook Patterns

- Use query key factories: `export const entityKeys = { all: ["entities"] as const, detail: (id: string) => ["entities", id] as const }`
- Invalidate via query key factories on mutations
- Hooks must be platform-agnostic (no DOM or RN imports)

## Store Patterns

- Use Zustand `create<T>()` for store creators
- Keep stores minimal — server state belongs in TanStack Query
- Stores are for UI/client state only

## TDD (Mandatory)

Test-first, Red → Green → Refactor — see root `CLAUDE.md`. Test files live next to the code: `foo.ts` → `foo.test.ts`.

## React is a peer dep

`react` and `@tanstack/react-query` are peer dependencies so each consumer resolves a single React copy. Consumers pin their own 19.x (web → 19.2.3, client-dashboard-web → ^19.2); declaring React as a direct dependency here would risk duplicate copies.
