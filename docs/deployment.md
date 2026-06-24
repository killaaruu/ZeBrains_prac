# Deployment

TrendScout does **not** run the API in a cloud cluster. The API and the report
worker run **locally on a GPU machine** because they need a local Ollama for LLM
inference. The web frontend lives on Vercel and reaches the local API through a
**stable ngrok domain**.

## Architecture

```
                          Internet
  ┌──────────────────────────┐
  │  Vercel                   │   https://trendscout-stage.vercel.app
  │  trendscout-stage (Vite)  │   (env: VITE_API_URL = ngrok domain)
  └────────────┬──────────────┘
               │ HTTPS (VITE_API_URL)
               ▼
  ┌──────────────────────────┐
  │  ngrok (reserved domain)  │   https://your-app.ngrok-free.dev
  │  stable, never changes    │   ── forwards to localhost:3111
  └────────────┬──────────────┘
               │
        ╔══════▼═══════════════════════════════════════════╗
        ║  GPU host (developer machine) — `make demo`        ║
        ║                                                    ║
        ║   apps/api/dist/main.js     (API, port 3111)       ║
        ║   apps/api/dist/worker.js   (report worker)        ║
        ║        │            │                              ║
        ║        ▼            ▼            ▼                  ║
        ║   Postgres      Redis        Ollama (LLM)          ║
        ║   :54399        :63799       :11434                ║
        ║   (docker compose: trendscout-demo)                ║
        ╚════════════════════════════════════════════════════╝
```

- **Frontend:** Vercel project `trendscout-stage`, public URL
  `https://trendscout-stage.vercel.app`, built with Vite. The root `vercel.json`
  sets `rootDirectory` to `apps/web`.
- **Tunnel:** an ngrok **reserved free static domain**
  `https://your-app.ngrok-free.dev` forwards to the local API on
  port `3111`. The domain is permanent (reserved in the ngrok dashboard), so it
  never changes across restarts. The ngrok authtoken is stored once via
  `ngrok config add-authtoken <token>` — it lives in the user's ngrok config, not
  in the repo.
- **API runtime:** `make demo` on the GPU host runs Postgres + Redis (docker
  compose project `trendscout-demo`, fixed ports `54399` / `63799`), applies
  Drizzle migrations, starts the API (`apps/api/dist/main.js`, port `3111`) and
  the report worker (`apps/api/dist/worker.js`), then starts ngrok on the static
  domain. Stop everything with `make demo-stop`.

## Prerequisites

- **Docker** (for the demo Postgres + Redis containers)
- **Node.js 24 LTS** and **pnpm** (`pnpm install` at the repo root)
- **Ollama** running locally with the pool models pulled:
  - `qwen2.5:7b` (primary)
  - `gemma4:12b-it-qat` (fallback)
  ```bash
  ollama pull qwen2.5:7b
  ollama pull gemma4:12b-it-qat
  ```
- **ngrok** installed, with the authtoken configured once:
  ```bash
  ngrok config add-authtoken <token>
  ```

## One-time setup

1. **Demo config / secrets.** Copy the committed example and fill in the secrets:
   ```bash
   cp .demo.env.example .demo.env
   ```
   `.demo.env` is gitignored. Fill in the secret values (the rest have sane
   defaults):
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` — a **real**
     Supabase project (the Vercel login and the API JWKS verification must match).
   - `TAVILY_API_KEY` — web-search key used by the report worker.

   Real Supabase login is used for the demo (`LOCAL_DEV_AUTH_ENABLED=false`).
2. **ngrok authtoken** — `ngrok config add-authtoken <token>` (once per machine).
3. **Vercel project env vars** (set once, in the `trendscout-stage` project):
   - `VITE_API_URL` = the ngrok domain
     (`https://your-app.ngrok-free.dev`).
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — the same Supabase
     project as the API.

   `VITE_API_URL` **must not be marked "Sensitive"** — `vercel build` reads it at
   build time, and a Sensitive var bakes an empty value into the bundle. Create it
   with:
   ```bash
   vercel env add VITE_API_URL production --no-sensitive
   ```

## Bring the API online

On the GPU host, from the repo root:

```bash
make demo        # Postgres + Redis + migrations + API + worker + ngrok
make demo-stop   # tear it all back down
```

`make demo` prints the public ngrok URL. Confirm it is up:

```bash
curl https://your-app.ngrok-free.dev/health
```

It should return JSON (not the ngrok interstitial HTML — the web client sends the
skip header automatically; see Troubleshooting).

## Deploy the web app

Two paths, both using the project's Vercel env vars — **never hardcode the API URL
in a workflow**:

### a) Push to `staging` (automated)

Pushing to the `staging` branch triggers `.github/workflows/deploy-staging.yml`,
which runs `vercel pull` / `vercel build` / `vercel deploy` using the project's env
vars. Nothing about the API URL is passed in — it comes from `VITE_API_URL` on the
Vercel project.

### b) Manual (Vercel CLI)

```bash
npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN
npx vercel build --prod --token=$VERCEL_TOKEN
npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
```

Vercel auth / project identifiers:

| Key | Value |
|---|---|
| `VERCEL_TOKEN` | secret (GitHub secret / local env) |
| `VERCEL_ORG_ID` | `team_xxx` (your Vercel org id) |
| `VERCEL_PROJECT_ID` | `prj_xxx` (your Vercel project id) |

The real `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` live in `.vercel/project.json`
(gitignored) — read them from there, don't hardcode them in tracked docs.

## Where `VITE_API_URL` lives

`VITE_API_URL` is a **Vercel project Environment Variable** — the single source of
truth for the API URL. **Rule:** it only changes if the ngrok domain changes.
Because the ngrok domain is a reserved static domain, it does **not** change on
restart, so `VITE_API_URL` is set once and never touched again. No more "redeploy
with new tunnel URL" churn.

For changing API-side env vars, use the existing `deploy-env-var` skill.

## CORS

CORS is configured in `apps/api/src/bootstrap.ts`. It allows:

- `https://trendscout-stage.vercel.app` (production frontend)
- `^https://trendscout-stage-[a-z0-9-]+\.vercel\.app$` (preview subdomains)
- `http://localhost:5173`, `http://localhost:3000` (local dev)

`allowedHeaders` includes `ngrok-skip-browser-warning`. The web client
(`apps/web/src/shared/lib/api-client.ts`) sends `ngrok-skip-browser-warning: true`
on every request so ngrok serves the API response directly instead of its
interstitial warning page.

## Troubleshooting

- **Frontend can't reach the API.** Check that `make demo` is running on the GPU
  host and that ngrok is up — `curl https://your-app.ngrok-free.dev/health`
  should return JSON.
- **CORS errors in the browser.** The requesting origin is not in the allowlist in
  `apps/api/src/bootstrap.ts`. Add it (or fix the preview-subdomain RegExp) and
  rebuild the API.
- **ngrok interstitial HTML instead of JSON.** The `ngrok-skip-browser-warning`
  header is missing. The web client sends it automatically; if you hit the URL
  manually, add `-H "ngrok-skip-browser-warning: true"`.
- **`VITE_API_URL` is empty in the build.** The Vercel var was marked "Sensitive",
  so `vercel build` baked an empty value. Recreate it as non-sensitive:
  ```bash
  vercel env add VITE_API_URL production --no-sensitive --force
  ```
  then redeploy.

## Security TODO

Rotate the **Supabase service-role key** (`SUPABASE_SECRET_KEY`) and the **Tavily
API key** (`TAVILY_API_KEY`) after delivery — they were committed to the working
tree historically and should be considered exposed.
