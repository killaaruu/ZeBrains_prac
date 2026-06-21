# ==============================================================================
# Product Template — single entry point for all repo commands.
#
#   make            → list every target (same as `make help`)
#   make <target>   → run it; each target prints a status line
#
# Aggregate tasks run through turborepo; per-package tasks through `pnpm --filter`.
# Scope test / typecheck / build to one workspace with PKG=<name>:
#     make test PKG=@repo/api
# Each target is documented by the `## ...` comment after it (consumed by `make help`).
# ==============================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help

# Optional workspace filter for test / typecheck / build (empty = all packages).
PKG ?=
FILTER := $(if $(PKG),--filter=$(PKG),)

# Custom command to run against the prepared local env (see the `local-run` target).
CMD ?=

.PHONY: help install dev local local-light local-e2e local-run web \
        check gate typecheck test build format format-check \
        db-generate db-migrate db-studio

# ----- Help -------------------------------------------------------------------

help: ## 📖  List all available targets
	@printf "\n🛠️   \033[1mProduct Template make targets\033[0m\n\n"
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@printf "\n💡  Scope a task to one package: \033[36mmake test PKG=@repo/api\033[0m\n\n"

# ----- Setup ------------------------------------------------------------------

install: ## 📦  Install all workspace dependencies (pnpm)
	@printf "📦  Installing workspace dependencies...\n"
	pnpm install
	@printf "✅  Dependencies installed.\n"

# ----- Dev --------------------------------------------------------------------

local: ## 🧰  Start the worktree-safe local env (Postgres + Redis + migrations + apps)
	@printf "🧰  Booting the worktree-safe local environment...\n"
	pnpm local:dev

local-light: ## 💡  Light local env: api + web vs cloud config (apps/api/.env), redis only
	@printf "💡  Booting the light local environment (cloud config, redis only)...\n"
	pnpm local:light

dev: ## 🚀  Start all apps in dev mode (pnpm turbo)
	@printf "🚀  Starting all apps in dev mode...\n"
	pnpm dev

web: ## 🌐  Start only the web app
	@printf "🌐  Starting the web app...\n"
	pnpm turbo dev --filter @repo/web

local-e2e: ## 🧪  Run the API e2e suite on the prepared local environment
	@printf "🧪  Running API e2e on the prepared local environment...\n"
	pnpm local:e2e

local-run: ## ▶️   Run CMD against the prepared local env: make local-run CMD="..."
	@if [ -z '$(CMD)' ]; then \
		printf "❌  Set CMD, e.g. make local-run CMD=\"pnpm --filter @repo/api test:e2e\"\n"; \
		exit 1; \
	fi
	@printf "▶️   Running on the prepared local env: %s\n" '$(CMD)'
	pnpm local e2e -- $(CMD)

# ----- Validate ---------------------------------------------------------------

check: ## ✅  Full validation pipeline (format + typecheck + test + build)
	@printf "✅  Running full validation (format + typecheck + test + build)...\n"
	pnpm turbo check
	@printf "🎉  All checks passed.\n"

gate: ## 🚦  Pre-push gate — format, then full validation
	@printf "🚦  Pre-push gate: formatting, then validating...\n"
	pnpm turbo format
	pnpm turbo check
	@printf "🎉  Pre-push gate green — safe to push.\n"

typecheck: ## 🔎  Type-check all packages (or PKG=<name>)
	@printf "🔎  Type-checking %s...\n" "$(if $(PKG),$(PKG),all packages)"
	pnpm turbo typecheck $(FILTER)
	@printf "✅  Types OK.\n"

test: ## 🧪  Run tests for all packages (or PKG=<name>)
	@printf "🧪  Running tests for %s...\n" "$(if $(PKG),$(PKG),all packages)"
	pnpm turbo test $(FILTER)
	@printf "✅  Tests passed.\n"

build: ## 🏗️   Build all packages (or PKG=<name>)
	@printf "🏗️   Building %s...\n" "$(if $(PKG),$(PKG),all packages)"
	pnpm turbo build $(FILTER)
	@printf "✅  Build complete.\n"

format: ## 🎨  Format + lint with auto-fix (Biome via pnpm turbo)
	@printf "🎨  Formatting and auto-fixing lint...\n"
	pnpm turbo format
	@printf "✅  Code formatted.\n"

format-check: ## 🎯  Format + lint, check only (no writes)
	@printf "🎯  Checking formatting and lint...\n"
	pnpm turbo format:check
	@printf "✅  Formatting clean.\n"

# ----- Database (Drizzle ORM) -------------------------------------------------

helm-test: ## 🎯  Validate Helm charts (lint + template smoke test)
	@printf "🎯  Validating Helm charts...\n"
	pwsh -File .tests/helm-charts.test.ps1
	@printf "✅  Helm charts valid.\n"

db-generate: ## 🧱  Generate a Drizzle migration from schema changes
	@printf "🧱  Generating Drizzle migration from schema changes...\n"
	DATABASE_URL=$${DATABASE_URL:-postgresql://placeholder:5432/placeholder} \
		pnpm --filter @repo/db-backend generate
	@printf "✅  Migration generated under packages/db-backend/src/migrations.\n"

db-migrate: ## ⬆️   Apply Drizzle migrations (needs DATABASE_URL; auto-set by local:dev)
	@printf "⬆️   Applying Drizzle migrations...\n"
	pnpm --filter @repo/db-backend migrate
	@printf "✅  Migrations applied.\n"

db-studio: ## 🔬  Open Drizzle Studio
	@printf "🔬  Opening Drizzle Studio...\n"
	pnpm --filter @repo/db-backend studio
