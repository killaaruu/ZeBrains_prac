#!/bin/bash
# PostCompact hook: re-inject critical instructions after context compaction
# Boris Cherny recommends this to prevent instructions getting lost in long sessions

cat <<'REMINDER'
CRITICAL REMINDERS (re-injected after context compaction):
1. TDD is NON-NEGOTIABLE: Write failing test FIRST, then minimal code to pass, then refactor
2. IMPORT RULES: Features never import from other features or app/ routes
4. BEFORE COMMIT: Run turbo check
5. AFTER SCHEMA CHANGE: Run pnpm --filter @repo/db-backend generate && migrate
6. PACKAGE MANAGER: pnpm only (never npm or yarn)
REMINDER
