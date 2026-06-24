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
   curl https://electable-suitable-hungry.ngrok-free.dev/health
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
