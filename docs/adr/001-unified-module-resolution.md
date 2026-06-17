# ADR-001: Unified Module Resolution — `bundler` + Extensionless Imports

**Date:** 2026-02-25
**Status:** Accepted (amended 2026-02-25 — see Amendments)
**Deciders:** @maxmrtnv

## Context

The monorepo had inconsistent module resolution settings:

- `packages/shared` and `packages/db-backend` used `"moduleResolution": "nodenext"` with `.ts` import extensions and `allowImportingTsExtensions: true`
- `apps/api` used `"moduleResolution": "nodenext"` with `.js` import extensions and `rewriteRelativeImportExtensions: true`
- `apps/web` already used `"moduleResolution": "bundler"` (Next.js default)
- The shared base tsconfig (`@repo/config/typescript/base.json`) already specified `"module": "ESNext"` and `"moduleResolution": "bundler"`

This created three different import conventions across the codebase (`.ts`, `.js`, extensionless), making cross-package refactoring error-prone and confusing for both humans and AI coding agents.

## Decision

Standardize on `"moduleResolution": "bundler"` with **extensionless relative imports** across the entire monorepo.

### Why `bundler` over `nodenext`

None of the apps benefit from Node.js native TypeScript execution:

| App | Build tool that handles module resolution |
|-----|------------------------------------------|
| `apps/api` (NestJS) | webpack (via NestJS CLI) bundles TS before execution |
| `apps/web` (Next.js) | Turbopack handles module resolution |
| `apps/mobile` (Expo) | Metro bundler handles module resolution |
| `apps/desktop` (Electron) | Vite handles module resolution |

Since every app uses a bundler, `"moduleResolution": "bundler"` accurately reflects the runtime environment and allows extensionless imports — the convention most familiar to TypeScript developers and AI coding agents.

### Why extensionless imports

- **Convention alignment:** Extensionless is the most common TypeScript import style and the default for every major framework template (Next.js, NestJS, Expo, Vite)
- **AI agent compatibility:** LLM-based coding tools overwhelmingly generate extensionless imports; forcing `.js` or `.ts` extensions causes constant friction
- **Simplicity:** One convention instead of three; no need to remember which extension style each package uses

### What was kept

- `@/*` path alias in `apps/web` — Next.js `create-next-app` default, works with `bundler` resolution
- `emitDecoratorMetadata` + `experimentalDecorators` in `apps/api` — required for NestJS DI
- `composite: true` in all packages — required for Turborepo project references

## Changes

### tsconfig updates

| Package | Change |
|---------|--------|
| `packages/shared` | Removed `module`, `moduleResolution`, `allowImportingTsExtensions` (inherits from base) |
| `packages/db-backend` | Same as shared |
| `apps/api` | Changed to `module: "ESNext"`, `moduleResolution: "bundler"`; removed `rewriteRelativeImportExtensions` |
| `apps/web` | Removed `noEmit` (conflicts with `emitDeclarationOnly`; Next.js re-adds it automatically) |

### Import cleanup

| Package | Before | After | Files affected |
|---------|--------|-------|----------------|
| `packages/shared` | `./foo.ts` | `./foo` | 5 |
| `packages/db-backend` | `./foo.ts` | `./foo` | 3 |
| `apps/api` | `./foo.js` | `./foo` | 13 |

## Consequences

### Positive

- Single import convention across the entire monorepo
- Base tsconfig settings are no longer overridden in leaf packages
- AI coding agents produce correct imports without extra prompting
- Fewer tsconfig options to maintain per package

### Negative

- If a package ever needs to run directly via `node --experimental-strip-types` (Node.js native TS), it would need `nodenext` resolution and `.ts` extensions — but this is unlikely given every app has a build step

### Neutral

- Next.js automatically re-adds `noEmit: true` to `apps/web/tsconfig.json` on every build — this is expected Next.js behavior and does not cause issues

---

## Amendments

### Amendment 1 — 2026-02-25: NestJS API webpack build + `"type": "module"` removal

**Problem discovered after initial implementation:**

The original ADR stated `"type": "module"` was required in `apps/api/package.json` and assumed "SWC compiles TS before execution." Both assumptions were incorrect:

1. `"moduleResolution": "bundler"` requires `"module": "ESNext"`, which emits ESM syntax (`import`/`export`) in compiled output. With `"type": "module"`, Node.js runs that output as ESM and enforces the ES spec — **explicit `.js` extensions required** on all relative imports. Extensionless imports break at runtime.

2. SWC alone (like tsc) still emits individual `.js` files. It does not bundle, so it does not solve the extension resolution problem.

3. `packages/db-backend` and other workspace packages export their raw `.ts` source (`"main": "./src/index.ts"`). This is intentional for bundler-based consumers, but webpack's default externals config marks all `node_modules` (including pnpm-symlinked workspace packages) as external — meaning Node.js would attempt to load the `.ts` source at runtime and hit the same extension resolution failure.

**Resolution:**

| File | Change |
|------|--------|
| `apps/api/package.json` | Removed `"type": "module"` — not needed; webpack outputs a CJS bundle |
| `apps/api/nest-cli.json` | Added `"webpack": true` + `"webpackConfigPath"` — NestJS CLI bundles all modules into a single CJS file via webpack + ts-loader |
| `apps/api/webpack.config.js` | New — wraps NestJS default webpack options; overrides `externals` with `webpack-node-externals({ allowlist: [/^@repo\//] })` so workspace packages are compiled and bundled by ts-loader rather than left for Node.js to resolve at runtime |

**Why this satisfies the original goals:**

- Extensionless imports in source files are preserved — webpack/ts-loader handles resolution, not Node.js
- `"moduleResolution": "bundler"` is preserved in tsconfig — type-checking is unaffected
- Workspace packages continue to export `.ts` source — all other consumers (Next.js, Expo, Vite) still work unchanged
- The API runtime is a single CJS bundle with no internal Node.js module resolution at all
