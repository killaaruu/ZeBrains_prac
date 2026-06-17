# TrendScout — План реализации и рабочий процесс

Практический runbook: что и в каком порядке делать, как работать с GitHub,
ветками и worktree, как прогонять проверки и деплой. Источник истины по
архитектуре — `docs/superpowers/specs/2026-06-17-trendscout-design.md`.
Конвенции для агентов — `AGENTS.md` (он же ссылается на `CLAUDE.md`).

---

## 0. Что строим (коротко)

Веб-сервис: пользователь вводит тему → мультиагентный пайплайн на **LangGraph.js**
(внутри NestJS-воркера) собирает данные через **Tavily**, гоняет их через пул
open-source LLM на **Ollama** (с fallback), и выдаёт **структурированный JSON-отчёт**
с рабочими ссылками, разбивкой Мир/РФ и оценкой устойчивости 1–10. Мультипользовательский,
с изоляцией данных, статусом в реальном времени, деплой на **k3s (WSL2)** одной командой.

---

## 1. Однократная подготовка окружения

| Шаг | Команда / действие | Статус |
|---|---|---|
| Зависимости | `pnpm install` | ✅ сделано |
| `.env` файлы | `apps/api/.env`, `apps/web/.env`, `packages/db-backend/.env` | ✅ заполнены (кроме опц. `SUPABASE_JWT_SECRET`) |
| Локальная инфра | `make local` (Postgres + Redis в Docker, миграции, api+web) | по необходимости |
| Ollama | установить + `ollama pull qwen2.5:7b` и `ollama pull gemma4:12b-it-qat` | для M4 |
| WSL k3s | дистрибутив `Ubuntu-24.04` (уже есть) + systemd + k3s | для M6 |
| kubectl / helm | уже установлены на Windows | ✅ |

### Ollama (модели под 6 ГБ VRAM)
```bash
ollama pull qwen2.5:7b            # ~4.7 ГБ — основная, влезает в VRAM
ollama pull gemma4:12b-it-qat     # ~7 ГБ — резервная (грузится при сбое)
ollama list                       # проверить
```
Пул задаётся в `apps/api/.env` → `LLM_MODEL_POOL=qwen2.5:7b,gemma4:12b-it-qat`.

### WSL2 + k3s (для M6)
```powershell
# 1. включить systemd в Ubuntu-24.04
wsl -d Ubuntu-24.04
#   внутри:
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
exit
wsl --shutdown                     # перезапуск дистрибутива

# 2. поставить k3s (внутри Ubuntu-24.04)
wsl -d Ubuntu-24.04
curl -sfL https://get.k3s.io | sh -
sudo k3s kubectl get nodes         # нода должна быть Ready
```
GPU: RTX 3060 виден в WSL2 через CUDA-on-WSL драйвер; Ollama-под получит его через
NVIDIA device plugin (закладывается в issue #22). Порты пробрасывать через
`kubectl port-forward` (issue #23). Это **отдельный** от Docker Desktop дистрибутив —
конфликта нет.

---

## 2. Дорожная карта (24 issue, порядок зависимостей)

Слои идут последовательно; **внутри** слоя задачи в основном параллельны.

```
M1  #1                     env/config              ← начать здесь
M2  #2 → #3                таблица reports → миграция; общая Zod-схема отчёта
M3  #4, #5, #6             reports API · BullMQ-продюсер · изоляция по JWT     (нужны #2,#3)
M4  #7 → #8 → {#10,#11,#12,#13} → #9 → #14,#15      агентный граф              (нужен M3)
M5  #16 → #17 → {#18,#19,#20,#21}                   фронтенд                   (нужны M3, частично M4)
M6  #22 → #23 → #24        Helm Ollama/Redis/PG · umbrella k3s · README        (нужно всё)
```

Что отдаёт каждый слой:
- **M1** — переменные окружения (Ollama, Tavily, пул).
- **M2** — таблица `reports` + миграция, Zod-контракт отчёта в `packages/shared`.
- **M3** — REST (`POST/GET /reports`), очередь BullMQ, изоляция «A не видит B».
- **M4** — воркер, провайдер Ollama с fallback, ноды графа (Tavily, валидация ссылок,
  честность, оценка), сборка графа, защита от инъекций, тайминги.
- **M5** — auth, форма темы, история, realtime-статус, рендер отчёта с кликабельными ссылками.
- **M6** — Helm-чарты, umbrella + деплой одной командой на WSL k3s, README с диаграммой.

Полный текст и acceptance каждой задачи: `gh issue view <N>`.

---

## 3. Цикл работы над одной issue (главное правило: одна issue = одна ветка = один PR)

```bash
# 1. свежий main
git fetch origin && git checkout main && git pull

# 2. ветка под задачу (см. нейминг ниже)
git checkout -b feat/reports-table        # пример для #2

# 3. TDD: сперва падающий тест → минимальный код → рефактор
#    (для новых слоёв — копировать паттерн домена example)

# 4. гейт ПЕРЕД push (обязательно, по порядку)
make format        # если переформатировал — отдельный commit style(...)
make check         # должно быть зелёным

# 5. push + PR, закрывающий issue
git push -u origin feat/reports-table
gh pr create --fill --base main            # в теле: "Closes #2"
gh pr checks --watch                       # дождаться зелёного CI

# 6. merge
gh pr merge --merge --delete-branch
```

### Нейминг веток
`<type>/<кратко>` — `feat/reports-api`, `feat/agent-graph`, `fix/link-validation`,
`docs/readme`, `chore/...`. type как в conventional commits.

### Коммиты — conventional
`type(scope): description` → `feat(reports): add reports drizzle table`,
`test(agent): cover model fallback`, `style(api): apply biome format`.

---

## 4. Работа с GitHub

| Действие | Команда |
|---|---|
| Список задач | `gh issue list` |
| Открыть задачу | `gh issue view <N>` |
| Создать PR | `gh pr create --fill` (в тело добавить `Closes #N`) |
| Статус CI | `gh pr checks --watch` |
| Смержить | `gh pr merge --merge --delete-branch` |
| Свои PR | `gh pr list` / `gh pr status` |

- **`Closes #N`** в теле PR → issue закроется автоматически при merge.
- Метки уже заведены: `backend`, `frontend`, `agents`, `infra`, `security`, `docs`.
- CI гоняет тот же `make check` — что пропустил локально, упадёт в PR
  (частый виновник — незакоммиченный снапшот миграции Drizzle).

---

## 5. Несколько задач параллельно — git worktree

Worktree = отдельная рабочая папка на свою ветку, **без** переключения веток в
основной папке. Репо worktree-safe: `make local` берёт свободные порты на каждый
worktree (env под `.local-env/`), так что можно поднимать несколько окружений.

```bash
# создать worktree под фронтенд, не трогая основную папку
git worktree add ../ts-frontend  -b feat/frontend-dashboard
# и под бэкенд-агентов параллельно
git worktree add ../ts-agents    -b feat/agent-graph

# в каждой папке — своя сессия Codex / свой make local
cd ../ts-frontend && pnpm install && make local
```

Управление:
```bash
git worktree list                 # показать все
git worktree remove ../ts-frontend
```

### Стратегия по слоям
- **M1–M3** делать последовательно в основной папке — это общий фундамент
  (таблица, контракт, API), на который опирается всё остальное. Параллелить рано.
- После того как готовы контракт (#3) и API (#4–6) — можно развести:
  - worktree **agents** (`feat/agent-graph`) → M4 (#7–15)
  - worktree **frontend** (`feat/frontend-*`) → M5 (#16–21)
  Они почти не пересекаются по файлам (agents в `apps/api`, фронт в `apps/web`).
- **M6** — снова в одной папке, в конце, когда всё сошлось.

Правило: один worktree — одна ветка — одна логическая задача. Не запускай две
сессии Codex в одной папке (конфликт рабочего дерева).

---

## 6. Гейт проверки (перед каждым push)

```bash
make format     # Biome --write; правки — отдельным commit style(...)
make check      # format + typecheck + test + build — должно быть зелёным
```
Если `make check` падает — чини локально и повтори. Не пушить «красное».

> Заметка: при `pnpm install` были проигнорированы build-скрипты
> `better-sqlite3`, `protobufjs`. Если что-то в `tools/system-board` или тестах
> упрётся в это — выполни `pnpm approve-builds` и выбери нужные.

---

## 7. Работа через Codex

В сессии Codex (запускается из обычного терминала, не из Git Bash):
```
# проверка контекста
Прочитай AGENTS.md, CLAUDE.md и docs/superpowers/specs/2026-06-17-trendscout-design.md.
Перескажи архитектуру, пул моделей под 6 ГБ и порядок M1→M6. Ничего не меняй.

# реализация
/impl-issue 1      # дальше 2 → 3 → ... по порядку
/verify            # прогнать гейт
/brainstorm <тема> # если нужен дизайн новой штуки до кода
```
Codex делает ровно то, что в `AGENTS.md`/промпте — если «забыл» про TDD или гейт,
напомни «следуй AGENTS.md» или зови задачу через `/impl-issue`.

---

## 8. Definition of Done (критерии приёмки из ТЗ)

- [ ] Деплой на k3s **одной командой** (`make k3s-up`)
- [ ] Изоляция: пользователь A не видит отчёты B
- [ ] История запросов, можно переоткрыть
- [ ] Статусы в реальном времени: Очередь → Думает → Готово / Ошибка
- [ ] Отчёт: название + примеры (Мир + РФ) + оценка 1–10 с аргументами + рабочие кликабельные ссылки
- [ ] Честность: «Не найдено» вместо выдумок
- [ ] JSON-формат отчёта виден в логах
- [ ] Fallback модели незаметен пользователю
- [ ] Защита от промпт-инъекций
- [ ] Отчёт < 2 мин (с оговоркой про 6 ГБ — см. спека §7)
- [ ] README: архитектура + схема компонентов + инструкция по k3s

---

## 9. Шпаргалка по файлам

| Что | Где |
|---|---|
| Архитектурная спека | `docs/superpowers/specs/2026-06-17-trendscout-design.md` |
| Конвенции для агентов | `AGENTS.md` → `CLAUDE.md` |
| Команды/таргеты | `Makefile` (`make help`), `docs/dev-commands.md` |
| Этот runbook | `IMPLEMENTATION-PLAN.md` |
| Env | `apps/api/.env`, `apps/web/.env`, `packages/db-backend/.env` |
| Референс-домен (копировать) | `apps/web/src/features/example`, бэкенд-модули в `apps/api/src/modules` |
