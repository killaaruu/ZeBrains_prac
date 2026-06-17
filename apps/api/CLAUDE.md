# Backend — NestJS API

## Stack

NestJS 11, REST + Swagger, Drizzle ORM (Postgres), Zod validation, JWT auth

## Architecture

- **Modules + services, no extra layers.** The service IS the use case. No repository pattern, no use case classes.
- Services call Drizzle directly
- Each domain module: `controller.ts`, `service.ts`, `module.ts`, `dto/`

## Conventions

- All controllers must have `@ApiTags()` and `@ApiBearerAuth()` decorators
- All endpoints must have `@ApiOperation({ summary: "..." })` decorator
- Use `@UseGuards(AuthGuard)` for protected endpoints
- DTOs use class-validator decorators + Swagger decorators
- Shared Zod schemas from `@repo/shared` for input validation
- Access user via `@Request() req` → `req.user.id`
- **Never use `import type` for classes injected via NestJS DI** (services, guards, config, etc.) — use regular `import`. `import type` is stripped at compile time, which breaks `emitDecoratorMetadata` and causes "can't resolve dependencies" errors. Biome's `useImportType` rule is disabled for `apps/api/` in the root `biome.json` override to prevent auto-conversion.

## Auth

- JWT tokens issued by Supabase Auth (ES256 asymmetric signing)
- Backend validates JWTs via `@nestjs/jwt` using JWKS public keys from Supabase
- Auth flow in `src/auth/auth.guard.ts`: HMAC secret → JWKS/ES256 → service token
- `JwksService` (`src/auth/jwks.service.ts`) fetches and caches JWKS keys from `SUPABASE_URL`
- Required env vars: `SUPABASE_URL` (for JWKS), optionally `SUPABASE_JWT_SECRET` (legacy HMAC)

## Database

- Drizzle ORM with direct Postgres connection
- Schema defined in `@repo/db-backend/schema`
- Connection string via `DATABASE_URL` env var

## TDD Workflow (Mandatory)

Test-first, Red → Green → Refactor — see the root `CLAUDE.md` Core Principles and `superpowers:test-driven-development`. API-specific note: test files live next to the code (`foo.ts` → `foo.test.ts`); one behavior per test.

## Logging

- Use NestJS `Logger` class in all services and guards: `private readonly logger = new Logger(MyService.name);`
- Log levels: `logger.log()` for key operations (auth success, user resolved), `logger.debug()` for detailed flow (token details, intermediate steps), `logger.warn()` for recoverable issues (missing config, fallback paths), `logger.error()` for failures
- **Every service must have structured logging** — include relevant context (IDs, method, URL) in log messages
- Debug logging is enabled in dev via `bootstrap.ts` logger config: `["log", "error", "warn", "debug", "verbose"]`
- **When debugging auth issues**, check API console for `[AuthGuard]`, `[JwksService]`, `[AuthService]` log prefixes — they trace the full auth verification chain

## Commands

See `/verify` skill or `docs/dev-commands.md`. Quick set: `pnpm --filter @repo/api {dev,test,typecheck,build}`.
