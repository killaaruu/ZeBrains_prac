---
name: github-issues
description: Use when a GitHub issue link or number appears in the conversation (github.com/.../issues/N, #N, "issue 42"), or when asked to create / add / update / edit / close / delete / list / comment on a task or issue, or to change a task's status / move it on the board (start, in progress, in review, done). In this repo "task" ALWAYS means a GitHub issue; status lives on the "Mad OS" Projects v2 board. Tasks are managed with the `gh` CLI.
---

# GitHub Issues are the task system

**In this repo, "task" == GitHub issue.** There is no separate tracker. Every
"create/update/close/list/delete a task" request maps to a `gh issue …` command against
`MrtnvM/mad-os`. Use the **`gh` CLI**, not the GitHub MCP tools — `gh` inherits the repo +
auth from the working directory.

## Reading an issue

Read every issue through the bundled helper:

```bash
./scripts/read-issue.py N
```

It emits one JSON object and sets a `kind` field that tells you what you actually got:

- `{"kind":"issue", number, title, state, labels, body, comments}` — a real issue, proceed.
- `{"kind":"pr", number, title, state, body}` — N is a **PR**, not an issue; switch to the
  PR flow (`gh pr view N`, review/continue) instead of blind-implementing.
- non-zero exit + `Not found` — N is neither in this repo.

## Two behaviors this skill fixes

### 1. A dropped issue link/number means "implement it" — do NOT stop to ask

When the user sends **only** an issue reference (a `…/issues/N` URL, `#N`, or "issue N")
with no other instruction, that bare reference **is** the instruction: *read it and start
implementing it.* Do not reply "what would you like me to do?" — read the issue first,
then act on it.

```
Resolve N + repo from the link
        │
        ▼
./scripts/read-issue.py N                 ◄── read body + discussion (see "Reading an issue")
        │
        ├─ kind=pr ────────────────────► gh pr view N ; treat as PR (review/continue), don't blind-implement
        ├─ state CLOSED ───────────────► surface that, confirm before implementing
        └─ state OPEN ─────────────────► classify and enter the normal dev flow ▼
```

After reading an **open** issue, run this loop. Each step moves the board **and** leaves a
comment, so the issue itself is a complete audit trail (don't bypass planning/TDD):

1. **Start.** `./scripts/set-status.py N "In progress"` the moment you begin.
2. **Classify & plan:**
   - Labelled `bug` / a defect → **Flow C**: `superpowers:systematic-debugging` → failing
     test reproducing it → fix.
   - Labelled `enhancement` / new behavior → **Flow A**: `explore-codebase` if unfamiliar →
     `superpowers:brainstorming` → `writing-plans` → `executing-plans`.
3. **Post the plan as a comment** once the plan is finalized — *before* writing code (see
   Comment trail). This is the human's chance to course-correct on intent, cheaply.
4. **Branch off latest `dev`, in a worktree (default).** New feature work for an issue
   goes in an **isolated worktree branched from the up-to-date integration branch** — don't
   implement on the checkout you're sitting on. By default:
   ```bash
   git fetch origin dev                      # pull latest dev (the integration base)
   git worktree add .claude/worktrees/issue-N-<slug> -b feat/<slug> origin/dev
   ```
   Then switch the session into it (use the native `EnterWorktree` tool with the
   `path` of the worktree you just created — it gives harness tracking + exit-time
   cleanup; see `superpowers:using-git-worktrees`). Name branches `feat/…` / `fix/…`.
   PRs target `dev`, not `main` (`gh pr create --base dev`) — this repo's `dev` is the
   integration branch.
   - **Why off `dev`, not `main`:** `dev` is the PR base here, so the native worktree
     default (which branches from the repo's *default* branch, `main`) would diverge —
     branch from `origin/dev` explicitly as shown.
   - **Skip the worktree only** when the user already gave you an isolated workspace, asked
     to work in place, or the task is a trivial one-file edit — otherwise default to the
     worktree.
5. **Implement** (TDD), inside the worktree.
6. **Open the PR** with `Closes #N` in the body → `./scripts/set-status.py N "In Review"` → **post
   the status comment** (what was built + how to verify).
7. **On merge:** `./scripts/set-status.py N "Done"`.

Only ask a clarifying question when the issue itself is genuinely underspecified, closed,
or actually a PR — not because "it was just a link."

### 2. Task CRUD verbs map to `gh issue` subcommands

| User says | Command |
|---|---|
| create / add a task | `gh issue create --title "…" --body "…" --label <bug\|enhancement\|documentation>` → then `./scripts/set-status.py <N> "Todo"` |
| update / edit task N | `gh issue edit N --title/--body/--add-label/--remove-label/--milestone` |
| assign task N | `gh issue edit N --add-assignee @me` |
| comment / log progress on N | `gh issue comment N --body "…"` |
| close / finish task N | `gh issue close N --reason completed` (or `not planned`) |
| reopen task N | `gh issue reopen N` |
| **delete** task N | `gh issue delete N` (irreversible — confirm first) |
| list / show tasks | `gh issue list` · `--label bug` · `--assignee @me` · `--state all` |
| read task N | `./scripts/read-issue.py N` (see "Reading an issue" — never the bare `gh issue view`) |

Body language: Russian for user-facing issue titles/bodies (per CLAUDE.md), English for
code/labels.

## Status workflow (the "Mad OS" board)

Status lives on the **GitHub Projects v2 board "Mad OS"** (project #1, owner `MrtnvM`) —
NOT on labels and NOT on open/closed alone. A GitHub issue is only open/closed natively;
the board's `Status` single-select field (`Backlog · Todo · In progress · In Review · Done`)
is what represents progress. Drive it with the bundled helper:

```bash
./scripts/set-status.py <issue-or-pr-number> "<Backlog|Todo|In progress|In Review|Done>"
```

(Exact casing matters: `In progress` has a lowercase p, `In Review` a capital R.) The helper
adds the item to the board if it isn't there yet and needs `gh` authed with the `project`
scope (`gh auth refresh -s project`).

**Lifecycle — at each transition move the status AND leave a comment, in real time (don't
batch to the end):**

| Moment | Status | Comment to post |
|---|---|---|
| Issue created | `Todo` | — |
| You start implementing | `In progress` | — |
| Plan finalized (before coding) | `In progress` | **🤖 Implementation plan** |
| PR opened (body has `Closes #N`) | `In Review` | **🤖 In Review** (what's built + how to verify) |
| PR merged | `Done` | optional close-out note |

`Backlog` is for not-yet-ready ideas; promote to `Todo` when it's ready to pick up. When a PR
merges, the linked issue auto-closes via `Closes #N`, but the board does **not** always move
to Done on its own — set it explicitly.

## Comment trail

Comment at the same two moments every time, so the issue tells the whole story on its own.
Sign comments with a `🤖` prefix so humans can tell agent notes from human ones. Use a
heredoc (or `--body-file`) for multi-line bodies.

**Plan comment** — posted once the plan is finalized, *before* coding:

```bash
gh issue comment N --body "$(cat <<'EOF'
## 🤖 Implementation plan

**Approach:** <1–2 lines on the strategy>

- [ ] <step 1>
- [ ] <step 2>

**Files:** <paths you expect to touch>
**Tests:** <what will prove it works>
EOF
)"
```

**Status comment** — posted when the PR opens (GitHub already cross-links the PR via
`Closes #N`, so this comment's job is the *summary*, not the link):

```bash
gh issue comment N --body "🤖 **In Review** — PR #<pr-number>

**Done:** <what was actually implemented>
**Verify:** <how to check it — which tests / manual steps>"
```

**Idempotency:** if you re-run and the plan changed, edit your previous note instead of
stacking duplicates: `gh issue comment N --edit-last --body "…"`. Keep comments concise —
they're a signpost, not a copy of the whole plan or the diff.

## Common mistakes

- **Asking "what do you want?" after a bare issue link.** The link is the task. Read it, then implement.
- **Using GitHub MCP tools instead of `gh`.** The user wants the `gh` CLI; it already has repo + auth context.
- **Silent work — no plan/PR comment.** The issue should tell the whole story. Post the plan before coding and the status when the PR opens; don't make a human read the diff to know what happened.
- **Spamming duplicate comments on re-runs.** Revise with `gh issue comment N --edit-last`, don't stack near-identical notes.
- **Reading with the bare `gh issue view N` or `--comments`.** Both fail with the Projects-classic `projectCards` deprecation error. Read with `./scripts/read-issue.py N` instead.
- **Blind-implementing a `/issues/N` URL that is really a PR.** `./scripts/read-issue.py N` reports `kind=pr` for these (it checks `gh pr view` first) — switch to the PR flow, don't implement.
- **`gh issue delete` to "close" a task.** Delete is irreversible; "finish/close a task" = `gh issue close`. Only `delete` when the user literally says delete, and confirm.
- **Representing status with labels or open/closed.** Progress is the board's `Status` field — use `./scripts/set-status.py`, not a `status:*` label or relying on closed == done.
- **Batching status moves to the end.** Move to `In progress` when you start, `In Review` at PR, `Done` at merge — in real time, not all at once.
- **Implementing on the current checkout / branching off stale `main`.** New feature work defaults to a fresh worktree branched from `origin/dev` (`git fetch origin dev` first) — see step 4. Don't code on the branch you're sitting on, and don't branch from `main` (PR base here is `dev`).
