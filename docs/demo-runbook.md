# Demo runbook

Short pre-demo checklist for showing the customer. Full detail: `docs/deployment.md`.

1. **Ollama is running** with both pool models pulled:
   ```bash
   ollama list   # expect qwen2.5:7b and gemma4:12b-it-qat
   ```
2. **Bring the stack up:**
   ```bash
   make demo
   ```
   (Postgres + Redis + migrations + API + worker + ngrok.)
3. **Confirm the tunnel** — hit the public URL `make demo` prints:
   ```bash
   curl https://your-app.ngrok-free.dev/health
   ```
   It must return JSON (not ngrok interstitial HTML).
4. **Run the live flow:**
   - Open <https://trendscout-stage.vercel.app>
   - Log in (real Supabase credentials)
   - Create a report
   - Watch it progress to `done` — roughly **a minute** on this GPU.
5. **Tear down** when finished:
   ```bash
   make demo-stop
   ```

## Tech showcase (optional — to demo the stack itself)

All public, served through the stable ngrok domain — open them in the browser
during the demo to show what's under the hood:

| Show | URL |
|---|---|
| **Swagger / OpenAPI** — every API endpoint | `https://your-app.ngrok-free.dev/api/docs` |
| **Bull Board** — the BullMQ report-generation queue (job status, retries) | `https://your-app.ngrok-free.dev/queues` |
| **Health check** | `https://your-app.ngrok-free.dev/health` |
| **Metrics** — process memory / uptime | `https://your-app.ngrok-free.dev/health/metrics` |

Good moment to open **Bull Board** (`/queues`) while a report is still
`thinking` — the customer sees the job being processed live. The report itself
(trend → global/RU market → sustainability score → cited sources) demonstrates
the Ollama (local GPU LLM) + Tavily (web search) + LangGraph pipeline.

> Note: the **Settings** pages are template demo forms (no backend persistence);
> the **Example CRUD** vertical is hidden from the production sidebar.
