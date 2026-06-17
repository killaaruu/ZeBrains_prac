---
name: deploy-env-var
description: Use when adding, changing, or removing an environment variable for the deployed API (apps/api) — covers updating env validation + .env.example in this repo AND the gitops values/secrets that actually deploy it, plus redeploy verification. Triggers on "add an env var", "set a new secret in prod/staging", "wire a config value to the API", "deploy a new environment variable".
---

# Deploy Env Var

Use this skill when adding, changing, or removing an environment variable for the deployed API. Editing only `.env` / `.env.example` in this repo is NOT enough — the value must also land in the gitops repo and the running pod must be verified after redeploy.

## Decision: classify the variable first

Answer three questions before touching any file:

1. **Which app(s) consume it?** — `apps/api` (NestJS) or a web app (Vite — `VITE_` prefix, browser-only, deployed via Vercel). A non-API runtime (e.g. a worker) injects env through its own deployment manifest in the gitops repo rather than `env.validation.ts`.
2. **Secret or non-secret?** — secrets (API keys, tokens, passwords) go into SOPS-encrypted manifests; non-secrets go into plain `values-*.yaml` or the Helm chart `values.yaml`.
3. **Env-agnostic (same value in all envs) or per-env?** — env-agnostic non-secrets can live in `deploy/charts/<app>-api/values.yaml`; per-env values live in `values-staging.yaml` / `values-prod.yaml` in the gitops repo.

### Files-to-touch table

| App | Secret? | Env-agnostic? | Files to touch |
|---|---|---|---|
| `apps/api` | No | Yes | `apps/api/src/config/env.validation.ts`, `apps/api/.env.example`, `deploy/charts/<app>-api/values.yaml` (`env:`) |
| `apps/api` | No | Per-env | `apps/api/src/config/env.validation.ts`, `apps/api/.env.example`, **gitops repo** `values-{env}.yaml` (`env:`) |
| `apps/api` | Yes | Per-env | `apps/api/src/config/env.validation.ts`, `apps/api/.env.example`, **gitops repo** `secrets-{env}.enc.yaml` (`stringData:` via SOPS) |
| Other runtime (e.g. worker) | No | Per-env | **gitops repo** overlay `deployment.yaml` `env:` block |
| Other runtime (e.g. worker) | Yes | Per-env | **gitops repo** overlay `deployment.yaml` env block → reference a K8s Secret, or add to the overlay's secret patch |
| Web apps | No | Per-env | Vercel env vars (UI or `vercel env add`); `VITE_` prefix required; no gitops repo needed |

## Workflow

### Step 1 — Update this repo

**For `apps/api`:**

- Add the var to `apps/api/src/config/env.validation.ts` (Zod/class-validator schema).
- Add a placeholder entry to `apps/api/.env.example`.
- If env-agnostic non-secret: add to `deploy/charts/<app>-api/values.yaml` under `env:`.

**For a non-API runtime (e.g. a worker):**

- No `env.validation.ts`; add the var directly to that runtime's overlay deployment.yaml in the gitops repo (Step 2). Secrets are injected via a K8s Secret reference (`envFrom`/`secretRef`).

### Step 2 — Update the gitops repo (deploy config, branch `main`)

Clone or pull the gitops repo, then edit the appropriate files:

**Non-secret per-env (API):**

```bash
./scripts/add-nonsecret-env.py \
  --env staging \
  --key MY_VAR \
  --value "my-value" \
  --gitops-dir /path/to/gitops-repo
```

Repeat for `--env prod`.

File edited: the API's `values/<app>-api/values-{env}.yaml`, under the `env:` map.

**Secret (API or other runtime):**

```bash
# Export the value into an env var; never pass on the command line
export DEPLOY_SECRET_VALUE="the-actual-secret"
./scripts/set-secret-env.py \
  --env staging \
  --key MY_SECRET_KEY \
  --gitops-dir /path/to/gitops-repo
unset DEPLOY_SECRET_VALUE
```

This opens `sops` non-interactively on `secrets-{env}.enc.yaml` and writes the encrypted value. Repeat for prod.

**Non-secret per-env (non-API runtime):**

Edit that runtime's overlay `deployment.yaml` manually under `env:` in the container spec, then commit.

### Step 3 — Commit and open a PR to the gitops repo

```bash
cd /path/to/gitops-repo
git add values/<app>-api/values-staging.yaml  # or whichever files changed
git commit -m "feat(<app>-api): add MY_VAR env var [staging]"
gh pr create --base main \
  --title "feat(<app>-api): add MY_VAR env var" \
  --body "Adds MY_VAR to staging + prod. Non-secret / secret."
```

### Step 4 — Commit this repo's changes and push

Back in this repo:

```bash
git add apps/api/src/config/env.validation.ts apps/api/.env.example
# if env-agnostic: git add deploy/charts/<app>-api/values.yaml
git commit -m "feat(api): add MY_VAR env var"
```

Run `make gate` (format → check) before pushing.

### Step 5 — After ArgoCD sync: VERIFY the running pod

ArgoCD's "sync complete" UI/CI step can report green while the pod is still running the previous config. Always verify:

```bash
./scripts/verify-env.py --env staging --app <app>-api --key MY_VAR
```

Or manually:

```bash
kubectl --context <cluster> -n <namespace>-staging \
  get deploy <app>-api \
  -o jsonpath='{.spec.template.spec.containers[0].env[*].name}' | tr ' ' '\n' | grep MY_VAR
```

Do not report the task complete until this check passes.

## Safety Rules

- **Never print or log secret values** — use `sops` in-place edit; DEPLOY_SECRET_VALUE is scrubbed after use.
- Edit encrypted files only with `sops <file>`. The `.sops.yaml` in the gitops repo auto-selects the age recipient (key at `~/.config/sops/age/keys.txt`).
- For SOPS access issues: check that the age private key is present and matches the recipient in `.sops.yaml`.
- Always verify the pod after deploy — the ArgoCD sync indicator is not a reliable proxy for "pod restarted with new config".
- Env-agnostic values belong in `deploy/charts/<app>-api/values.yaml` only when the value is truly identical in all envs (e.g., a base URL for a shared external service). When in doubt, use per-env files.
