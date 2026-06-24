# Dev-команды и справка «когда что запускать»

Справка по командам, вынесенная из корневого `CLAUDE.md`, чтобы не раздувать
always-on контекст. Канонический флоу верификации — скилл `/verify`; этот файл —
человекочитаемая опора под него.

## Тестовый раннер

Vitest на всех слоях (api, web, client-core, shared, db-backend и т.д.). Тест-файлы лежат рядом с кодом: `foo.ts` → `foo.test.ts`.

## Команды

Все команды идут через `Makefile` (единая точка входа). `make help` — список целей.

```bash
# Full validation pipeline
make check

# Worktree-safe local environment
make local
make local-e2e

# Customer demo (local API + worker behind the stable ngrok domain)
make demo        # bring up the customer demo (Postgres + Redis + migrations + API + worker + ngrok)
make demo-stop   # tear down the customer demo

# Individual commands
make typecheck
make test
make build

# Format + lint fix
make format

# Format + lint check
make format-check

# Per-package (PKG=<workspace>)
make test PKG=@repo/api
make typecheck PKG=@repo/api
make test PKG=@repo/shared
make typecheck PKG=@repo/shared
make test PKG=@repo/client-core
make typecheck PKG=@repo/client-core
make typecheck PKG=@repo/services-client

# After Zod schema change in packages/shared
make test PKG=@repo/shared && make typecheck

# After Drizzle schema change (backend)
make db-generate
make db-migrate

# After API endpoint change
make build PKG=@repo/api && make typecheck PKG=@repo/api

# Client API usage
# There is no OpenAPI client generation pipeline in this repo.
# Frontend/client-core code uses the hand-written Axios wrappers and shared Zod/types.
```

## Когда что запускать

- Изменены файлы в `packages/shared/` → запусти `make typecheck` (влияет на всё)
- Изменены файлы в `packages/client-core/` → его тесты + typecheck web
- Изменены файлы в `packages/services-client/` → его тесты + typecheck web
- Изменены файлы в `packages/db-backend/` → тесты API + сгенерируй миграцию (`make db-generate`), если менялась схема
- Изменены файлы в `apps/api/` → тесты API + typecheck + пересборка для codegen
- Перед коммитом → запусти `make check`

## Dev-окружение

Дефолтный путь локального старта — `make local` для worktree-разработки. Он поднимает Postgres и Redis через `docker-compose.local.yml`, подбирает свободные порты под текущий worktree, применяет миграции, стартует API/web через pnpm и пишет сгенерированные env/state в `.local-env/`.

Используй `make local-e2e` для e2e-проверки API, которой нужна локальная инфраструктура. Для кастомных e2e-раннеров используй `make local-run CMD="<command>"`, чтобы переиспользовать то же подготовленное окружение. Не собирай вручную процессы Postgres/Redis/API/web, если только сам скрипт local-env не является объектом отладки.

Для UI-работы стартуй dev-сервер через `make local` и проверяй в браузере перед тем, как сообщать о завершении.
