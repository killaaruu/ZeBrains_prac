---
name: ship-to-staging
description: Full ship pipeline for current feature branch — code review, format, typecheck, tests, PR creation, dev merge-conflict resolution, CI monitoring, then merge into staging and verify deploy. Use when the user asks to "ship", "ship to staging", "release this branch", "merge to staging", or wants the full end-to-end shipping workflow run for a feature branch. Always confirms the operation list with the user before starting.
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

# Ship to Staging

End-to-end pipeline that takes the current feature branch from "code written" to "deployed on staging". Each step is a separate bash script with emoji output. Claude orchestrates: confirms ops with user, runs scripts, monitors output, makes flexible decisions only when something fails or needs judgment.

## When to use

Trigger phrases: "ship it", "ship to staging", "ship this branch", "merge to staging", "release the branch", "run the full pipeline", "/ship".

## Operations

The full pipeline (numbered, **all enabled by default**):

1. 🔍 Code review (`/pr-review` or `code-reviewer` subagent on current diff vs `dev`)
2. 🎨 Format (`turbo format`)
3. 🧠 Typecheck (`turbo typecheck`)
4. 🧪 Tests (`turbo test`)
5. 📬 Create PR to `dev` (skip if PR already exists)
6. 🪢 Resolve merge conflicts with `dev` (rebase or merge — flex decision)
7. ⏳ Monitor CI on the PR until green (`gh pr checks --watch`)
8. ⬇️ Pull latest `staging`
9. 🔀 Merge feature branch into `staging`
10. ⬆️ Push updated `staging`
11. 🚀 Verify staging deploy (ArgoCD sync + `kubectl rollout status` + `/health`)

## Workflow

### Step 1 — Confirm operations with user

Before doing ANYTHING, present the numbered list above and ask which to skip. Phrase it so all are enabled by default:

```
I'll run the full ship pipeline. All 11 ops enabled by default —
reply with numbers to skip (e.g. "skip 1, 6") or "go" to run everything.

  1. 🔍 Code review
  2. 🎨 Format
  3. 🧠 Typecheck
  4. 🧪 Tests
  5. 📬 Create PR (→ dev)
  6. 🪢 Resolve conflicts with dev
  7. ⏳ Monitor CI until green
  8. ⬇️ Pull latest staging
  9. 🔀 Merge branch into staging
 10. ⬆️ Push staging
 11. 🚀 Verify staging deploy
```

Wait for confirmation. Use AskUserQuestion if available; otherwise inline.

### Step 2 — Pre-flight check

Run `scripts/00-preflight.py`:
- Confirm we're not on `main`/`dev`/`staging`
- Confirm working tree is clean (uncommitted files block the pipeline)
- Print current branch + ahead/behind vs `origin/dev`
- Fetch all remotes

If working tree is dirty → STOP and ask user to commit/stash. Do not auto-stash.

### Step 3 — Run each enabled op sequentially

Use TodoWrite to track each op as a todo item. Mark each in_progress → completed as you go.

For each op, run the matching script under `scripts/`. Stream output. After each run:
- ✅ exit 0 → mark done, move on
- ❌ non-zero → see "Failure handling" below

### Step 4 — Failure handling (flex decisions)

This is where Claude makes judgment calls. Default is to **try to fix automatically**, then report what was done.

| Op | Failure mode | Fix strategy |
|---|---|---|
| 🎨 Format | Biome found issues | Already auto-fixed by `turbo format`; just re-stage + amend or new commit |
| 🧠 Typecheck | TS errors | Read errors, fix the smallest set of files needed, re-run. If errors are in unrelated package, surface to user instead of fixing. |
| 🧪 Tests | Failing tests | Use `superpowers:systematic-debugging` skill — read failure, diagnose, fix. If failure is flaky/infra (DB, network), retry once before fixing. |
| 🔍 Code review | High-severity findings | Surface to user with file:line; do NOT auto-apply review suggestions without confirmation. |
| 📬 Create PR | PR already exists | Skip silently — print PR URL. |
| 🪢 Conflicts | `git merge origin/dev` conflicts | Try `git rebase origin/dev` first; if conflicts in lockfiles (`pnpm-lock.yaml`) → take ours and re-run `pnpm install`. For source conflicts → STOP, surface to user with file list. |
| ⏳ CI monitor | A check fails | Read failed job logs via `gh run view --log-failed`, classify: code bug → fix; infra flake → retry with `gh run rerun`; unrelated → surface. |
| 🚀 Deploy verify | Pod still on old image after timeout | Check ArgoCD app status, kubectl events, surface diagnostics. Do NOT auto-rollback. |

After fixing, **always re-run the failing op** (and any earlier ops invalidated by the fix — e.g., a code fix invalidates typecheck).

### Step 5 — Post-flight summary

When all ops complete, print:
- ✅/❌ per op with timing
- PR URL
- Staging deploy status + image tag
- Any unresolved warnings

## Scripts

All scripts live in `scripts/` and are self-contained — Claude shells out to them. Each prints emoji-prefixed status lines.

- `00-preflight.py` — branch/state checks
- `01-code-review.py` — diff dump for code review
- `02-format.py` — `turbo format`
- `03-typecheck.py` — `turbo typecheck`
- `04-test.py` — `turbo test`
- `05-create-pr.py` — `gh pr create` to dev (idempotent)
- `06-resolve-dev.py` — rebase/merge `origin/dev`
- `07-monitor-ci.py` — `gh pr checks --watch`
- `08-pull-staging.py` — fetch + checkout staging + pull
- `09-merge-to-staging.py` — merge feature branch
- `10-push-staging.py` — push staging
- `11-verify-deploy.py` — ArgoCD + kubectl + health check

Run with `python3 .claude/skills/ship-to-staging/scripts/<name>.py [args]`.

## Notes

- **Never** force-push `staging` or `main`. If `09-merge` fails non-trivially, stop and ask.
- **Never** add `Co-Authored-By:` trailers (CLAUDE.md rule — Vercel Hobby blocks these).
- **Never** skip git hooks (`--no-verify`).
- The pipeline targets `dev` for the PR, then merges the **feature branch** (not the PR squash) into `staging`. This matches the project's branch model where `dev` accumulates work and `staging` is what's deployed.
- For monitoring CI longer than a few minutes, use `/loop 5m gh pr checks` rather than blocking the conversation.

## Related skills

- `superpowers:systematic-debugging` — for test/typecheck failure diagnosis
- `superpowers:verification-before-completion` — never claim success without evidence
- `pr-review` — what op 1 invokes
- `verify` — alternative entry to ops 2-4
