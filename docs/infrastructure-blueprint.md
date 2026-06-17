# Технологический блюпринт (reusable infrastructure reference)


## 0. TL;DR — что копировать в новый проект

| Слой | Решение | Почему именно так |
|------|---------|-------------------|
| Монорепо | **Turborepo + pnpm workspaces** (`apps/*`, `packages/*`, `tools/*`) | Кеш задач, единый граф зависимостей, общий код без публикации в npm |
| Язык/тулинг | TypeScript strict + **Biome** (вместо ESLint+Prettier) | Один инструмент, быстрее CI, меньше зависимостей |
| Контракт API | **Zod-схемы в `packages/shared`** — единый источник правды | Один тип для валидации на бэке, формы на фронте и типизации ответов. Без OpenAPI-кодогена |
| БД | **Drizzle ORM напрямую к Postgres** | Типобезопасность + контроль миграций. Supabase SDK — только Auth/Storage/Realtime |
| Состояние клиента | **TanStack Query (server) + Zustand (UI)**, хуки вынесены в `packages/client-core` | Переиспользуемые хуки между web/portal/desktop |
| Очереди | **BullMQ + Redis** с port/adapter паттерном | Тестируемость, изоляция бизнес-логики от инфры |
| Деплой API | Docker → реестр → **GitOps (ArgoCD) бампит тег** | CI не имеет прямого доступа к кластеру; откат = git revert |
| Деплой фронта | **Vercel** (отдельные проекты prod/staging) | Превью-деплои, не нагружает кластер |
| Секреты | **SOPS-encrypted в gitops-репо** + GH repo secrets | Секреты в git, но зашифрованы; единый источник |
| Локалка | CLI-оркестратор в `tools/local-env` | Воспроизводимая среда, авто-порты для worktree |

---

## 1. Монорепо и сборка

### 1.1 Структура
```
apps/
  api/                  # NestJS REST backend
  web/                  # Vite + React SPA (основное приложение)
packages/
  shared/               # Zod-схемы, типы, константы, утилиты — единый контракт
  client-core/          # TanStack Query хуки + Zustand сторы (платформо-независимые)
  services-client/      # Интерфейсы + обёртки Supabase (Auth/Realtime/Storage)
  db-backend/           # Drizzle-схема + миграции
  config/               # Общие tsconfig (base.json, nestjs.json) + vitest base
tools/
  local-env/            # CLI-оркестратор локальной среды
```

### 1.2 Менеджер пакетов и воркспейсы
- **pnpm@10.x** (зафиксирована точная версия в `package.json` → `packageManager`).
- `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - apps/*
    - packages/*
    - tools/*
  nodeLinker: hoisted
  ```
- **`pnpm.onlyBuiltDependencies`** — список нативных пакетов (`@nestjs/core`, `@swc/core`, `better-sqlite3`, `esbuild`, `sharp`…), которым разрешён постинсталл-билд. Защищает от неконтролируемого ребилда нативных бинарников.

> ⚠️ Гочи `hoisted` линкера: при отставании ветки от базовой появляются дубликаты `react`/`supabase`, ломающие локальный typecheck/тесты. Лечится `merge base + reinstall`.

### 1.3 Turborepo pipeline (`turbo.json`)
| Задача | dependsOn | Кеш | Назначение |
|--------|-----------|-----|-----------|
| `build` | `^build` | ✓ | Выходы: `dist/**`, `out/**`, `.next/**` |
| `typecheck` | `^build` | ✓ | `tsc --noEmit` |
| `test` | `^build` | ✓ | Vitest; inputs трекаются (`src/**`, `vitest.config.*`, `.env.test`) |
| `format` / `format:check` | — | ✗ | Biome |
| `check` | `format:check`, `typecheck`, `test`, `build` | ✗ | **Композитный gate перед пушем** |
| `dev` | — | ✗ | Persistent watch |

Передаваемые в билд env: `VITE_*`, `NODE_ENV`.

### 1.4 TypeScript-стратегия
- Корневой `tsconfig.json` — `strict: true`, `target: ES2022`, `moduleResolution: bundler`, project references на все apps/packages.
- Общая база `packages/config/typescript/base.json`: добавляет `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`, `declaration` + `declarationMap` + `sourceMap`.
- NestJS-оверрайд (`nestjs.json`): `emitDecoratorMetadata`, `experimentalDecorators`, `module: CommonJS`.
- Пакеты экспортируют `.ts` из `main` и используют `composite: true` + `emitDeclarationOnly`.

### 1.5 Biome (`biome.json`)
- Formatter: 2 пробела, ширина 100, двойные кавычки, точки с запятой всегда.
- Linter: `recommended` + поддержка Tailwind-директив в CSS.
- VCS-интеграция: уважает `.gitignore`, игнорит сгенерированный `routeTree.gen.ts`.
- **Оверрайды (важно для переноса):**
  - тесты — выкл `noExplicitAny`, `noNonNullAssertion`;
  - `apps/api/**` (и любые другие NestJS-приложения) — **выкл `useImportType`** (NestJS DI ломается на `import type`, т.к. декораторная метадата стирается).

### 1.6 Тестирование (Vitest)
- Бэкенд (`apps/api`): **`unplugin-swc`** для компиляции TS — без него не работает `emitDecoratorMetadata`. Pool: threads, без изоляции, 1 worker (детерминизм DI-тестов). Setup отключает NestJS-логгер.
- Web: окружение `jsdom`, testing-library matchers, полифилл `ResizeObserver` (для Radix), `dedupe` react/react-dom/tanstack/zustand.
- Общая база `packages/config/vitest/base.ts`: `globals`, `environment: node`, `passWithNoTests`.
- **DI compilation test** (`apps/api/src/app.module.test.ts`) — отдельный тест, который поднимает весь модульный граф и ловит ошибки DI-проводки.

---

## 2. Backend (apps/api) — NestJS

- **NestJS 11**, порт 3111 (dev), 3000 (K8s). Swagger на `/api/docs`, Bull Board на `/queues`.
- **Структура модуля:** `src/modules/{domain}/` → `{domain}.controller.ts`, `.module.ts`, `.service.ts`, `dto/`.
- **Service/Selector, без Repository:** сервис = use case. Никаких отдельных use-case классов.
- **Логирование:** `private readonly logger = new Logger(ClassName.name)` в каждом сервисе/гарде/контроллере. Уровни: `log` (ключевые операции), `debug`, `warn`, `error`. Всегда с контекстом (id, метод, url).

### 2.1 База данных — Drizzle
- **Drizzle ORM** напрямую к Postgres через драйвер `postgres`. **Не Supabase SDK для запросов.**
- Схема и миграции — в `packages/db-backend` (одна схема-файл на домен, `src/schema/{domain}/`).
- Workflow изменения схемы:
  ```
  edit schema → pnpm --filter @repo/db-backend generate
              → review SQL в src/migrations/
              → pnpm --filter @repo/db-backend migrate
              → pnpm --filter @repo/api test
  ```
- Миграции прогоняются на старте приложения (`runMigrations()` в `bootstrap.ts`) до `app.listen()`. В образе путь задаётся `MIGRATIONS_DIR`.

### 2.2 Аутентификация (переносимый паттерн)
`AuthGuard` с тройной стратегией проверки JWT:
1. **HMAC HS256** по `SUPABASE_JWT_SECRET` (legacy).
2. **JWKS ES256** — асимметричные ключи с `SUPABASE_URL/.well-known/jwks.json` (кешируются `JwksService`).

Гарды вешаются глобально через `APP_GUARD`. После верификации `AuthService.resolveUser(sub)` ищет пользователя в БД.

### 2.3 Очереди (BullMQ)
- **BullMQ + Redis** (ioredis). Bull Board для визуализации.
- **Port/adapter паттерн:** процессор зависит от интерфейса (`WebhookProcessorService` ← `WebhookProcessingDbAdapter`), а не от Drizzle напрямую → тестируется моками.
- Pub/Sub-подписка **лочит** соединение ioredis → для realtime-событий нужен **отдельный** инстанс, не тот, что обслуживает команды.

### 2.4 Supabase SDK на бэке — только не-DB
- Storage signed-URL (генерация токена загрузки), Auth admin, Realtime publish.
- Интерфейсы (`IStorageService`) + адаптеры (`Supabase*`) → подмена в тестах.

### 2.5 NestJS DI — правила (грабли)
- **Никогда `import type` для инжектируемых классов** — метадата стирается.
- Интерфейсные параметры конструктора требуют `@Inject(SYMBOL_TOKEN)` (интерфейс эмитит `Object`).
- Vitest требует SWC для `emitDecoratorMetadata`.

---

## 3. Frontend (apps/web)

- **React 19 + Vite 6**, **TanStack Router** (file-based, `routeTree.gen.ts` генерится).
- **Tailwind CSS 4** (нативные cascade layers, без PostCSS-цепочки) + **shadcn/ui** на Radix-примитивах, иконки lucide, тосты sonner.
- **Состояние:**
  - server → **TanStack Query 5** (хуки из `@repo/client-core`, фабрики query-ключей, инвалидация по ключам);
  - UI → **Zustand 5** (только локальное состояние, не серверное);
  - формы → **React Hook Form + Zod** (схемы из `@repo/shared`).
- **Feature-folder convention:**
  ```
  features/{domain}/{components,hooks,index.ts}   # index.ts = публичный API
  shared/{components,hooks,lib}                    # генерик уровня приложения
  ```
  Правила импортов: фичи **не импортят друг друга**; общий код → `@repo/client-core` (если нужен нескольким приложениям) или `@/shared` (если только этому).
- **API-клиент:** рукописные axios-обёртки (`shared/lib/api-client`), base URL из `VITE_API_URL`. Интерсепторы: снимают `Content-Type` для `FormData`, нормализуют ошибки. **OpenAPI-кодогена нет** — контракт держится Zod-схемами из `@repo/shared`.

---

## 4. Контракт фронт ↔ бэк (ключевой переносимый паттерн)

`packages/shared` — единый источник правды:
```ts
// packages/shared/src/schemas/<domain>/request.schema.ts
export const initUploadSchema = z.object({
  fileName: z.string().min(1).max(512),
  mimeType: z.string().min(1).max(255),
  sizeBytes: z.number().int().nonnegative(),
});
export type InitUploadDto = z.infer<typeof initUploadSchema>;
```
- **Бэкенд:** `schema.safeParse(body)` в контроллере перед бизнес-логикой.
- **Фронт:** та же схема в React Hook Form + типизация ответов TanStack Query.
- Один источник → нет рассинхрона типов, нет генератора в пайплайне.

> ⚠️ Gotcha со structured-output LLM: Anthropic отвергает `minimum`/`maximum` в Zod-схемах при structured outputs — не использовать min/max в схемах, которые уходят в LLM как JSON Schema.

---

## 5. Деплой и CI/CD

### 5.1 Раскладка
| Компонент | Где хостится | Триггер |
|-----------|--------------|---------|
| API | Kubernetes (ArgoCD) | push в `main`/`staging` |
| Web | Vercel (отдельные проекты prod/staging) | push в `main`/`staging` |

### 5.2 GitHub Actions
- `ci.yml` — на не-main ветках и PR: единственный gate **`pnpm turbo check`** (format + typecheck + test + build). Concurrency cancels.
- `deploy-prod.yml` / `deploy-staging.yml` — три параллельных job:
  - **build-api** на self-hosted runner (обход IPv6/DNS-проблем с docker.io): билд Docker → push в реестр контейнеров, кеш `type=registry`.
  - **deploy-api** на `ubuntu-latest`: чекаут внешнего gitops-репо, `yq` бампит `.image.tag` → commit → ArgoCD синкается.
  - **vercel-*** — `vercel pull → build --prod → deploy --prebuilt --prod`, скип если SHA уже задеплоен.
- Reusable Mattermost-нотификации по итогу.

> ⚠️ Gotcha: «Wait for ArgoCD sync» в GHA не всегда реально ждёт — проверяй `kubectl get deploy ... -o jsonpath=image` после деплоя.
> ⚠️ RU-egress блокирует GHA Actions Cache — `setup-node`/`cache` держать на `ubuntu-latest`, на self-hosted только push образа.

### 5.3 Docker (API) — multi-stage
```
deps (node:24-alpine)  → pnpm install по lockfile
build (deps)           → turbo build --filter=@repo/api; pnpm deploy --prod
production (node:24-alpine) → non-root user, миграции в /app/migrations, EXPOSE 3000
```

### 5.4 GitOps / ArgoCD (переносимая модель)
- Helm-чарт API лежит в репо (`deploy/charts/<app>-api`): `deployment`, `migration-job` (ArgoCD **PreSync hook**), `service`, `ingress`, `pdb`, RBAC.
- Env-специфичные values и **SOPS-зашифрованные секреты** — в **отдельном gitops-репо**.
- **CI не катит в кластер руками** — только бампит тег → ArgoCD автосинк. Откат = git revert тега.
- Probes: startupProbe 30×5s → потом liveness/readiness. SecurityContext: non-root, read-only rootfs, drop all caps.

### 5.5 Секреты
- **Прод/staging:** SOPS-encrypted YAML в gitops-репо, применяются `sops -d … | kubectl apply -f -`.
- **GitHub Actions:** repo secrets (`YC_SA_KEY_JSON`, `VERCEL_*`, `ARGOCD_*`, `TURBO_TOKEN/TEAM`…).
- **Локалка:** `.env` из `.env.example` (gitignored).
- **Реестр:** pull через `docker-registry` Secret из SA с ролью puller; push через CI-SA JSON-ключ.

---

## 6. Локальная разработка

- `tools/local-env` — CLI-оркестратор (`tsx src/cli.ts`): поднимает Postgres + Redis (docker-compose.local.yml), выбирает свободные порты под текущий worktree, накатывает миграции, стартует API/web, пишет состояние в `.local-env/`.
- Команды:
  ```bash
  pnpm local:dev    # полная локальная среда
  pnpm local:e2e    # e2e с локальной инфрой
  turbo dev         # watch всех пакетов (кроме agent-job)
  turbo check       # gate перед пушем
  ```
- docker-compose.local.yml: `postgres:16-alpine` + `redis:7-alpine` (AOF, maxmemory+LRU, healthchecks).

---

## 7. Git-воркфлоу и гейты качества

- Фиче-ветки, не коммитить в `main`. PR обычно в `dev` (интеграционная ветка).
- Conventional commits (`type(scope): description`).
- **Не добавлять `Co-Authored-By`** (Vercel Hobby считает соавтора коллаборатором → блок деплоя приватного репо).
- `git add <конкретные-файлы>`, не `-A`.
- **Pre-push gate (обязателен):** `pnpm format` → (если переформатировал — отдельный `style:` коммит) → `turbo check` зелёный → `git push`.
- TDD non-negotiable: Red → Green → Refactor; тест-файл рядом (`foo.ts` → `foo.test.ts`).

---

## 8. Стек одним списком (для копипасты в новый проект)

```
Язык:        TypeScript 5.x strict
Runtime:     Node.js 24 LTS
Пакеты:      pnpm 10.x (workspaces, hoisted)
Монорепо:    Turborepo 2.x
Линт/формат: Biome 2.x
Тесты:       Vitest 4.x (+ unplugin-swc для NestJS)
Backend:     NestJS 11
ORM:         Drizzle 0.44 (postgres-js драйвер)
БД:          PostgreSQL 16
Очереди:     BullMQ 5 + Redis 7 (ioredis)
Frontend:    React 19 + Vite 6
Роутинг:     TanStack Router
Состояние:   TanStack Query 5 (server) + Zustand 5 (UI)
Формы:       React Hook Form + Zod
UI:          Tailwind CSS 4 + shadcn/ui (Radix)
Контракт:    Zod-схемы в packages/shared (без OpenAPI codegen)
Auth/Storage/Realtime: Supabase SDK (на клиенте; на бэке только не-DB)
Деплой API:  Docker → реестр → ArgoCD (GitOps)
Деплой web:  Vercel
Секреты:     SOPS в gitops-репо + GH repo secrets
Ошибки:      Rollbar
```
