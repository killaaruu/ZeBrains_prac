#!/usr/bin/env pwsh
# ==============================================================================
# start-demo.ps1 - one command to bring up the customer demo stack.
#
#   Postgres + Redis (docker)  ->  migrations  ->  API + report worker  ->  ngrok
#
# The API/worker run locally (Ollama needs the GPU) and are exposed to the Vercel
# frontend through a STABLE ngrok domain, so VITE_API_URL never has to change.
# Config + secrets are read from `.demo.env` (copy from .demo.env.example).
#
# Usage:  pwsh -File scripts/start-demo.ps1 [-Build]
#   -Build   force a fresh `nest build` of the API before starting.
# Stop with: make demo-stop   (or pwsh -File scripts/stop-demo.ps1)
#
# ASCII-only on purpose: Windows PowerShell 5.1 reads .ps1 as the system codepage
# when there is no BOM, so non-ASCII characters would break parsing.
# ==============================================================================
[CmdletBinding()]
param([switch]$Build)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$StateDir = Join-Path $RepoRoot "demo-state"
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
$ComposeProject = "trendscout-demo"

function Write-Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# --- 1. Load .demo.env --------------------------------------------------------
$envFile = Join-Path $RepoRoot ".demo.env"
if (-not (Test-Path $envFile)) {
  throw "Missing .demo.env. Copy .demo.env.example to .demo.env and fill in the secrets."
}
$cfg = @{}
foreach ($line in Get-Content $envFile) {
  $t = $line.Trim()
  if (-not $t -or $t.StartsWith("#")) { continue }
  $i = $t.IndexOf("=")
  if ($i -lt 1) { continue }
  $cfg[$t.Substring(0, $i).Trim()] = $t.Substring($i + 1).Trim()
}
$apiPort = if ($cfg.API_PORT) { $cfg.API_PORT } else { "3111" }
$pgPort = if ($cfg.POSTGRES_PORT) { $cfg.POSTGRES_PORT } else { "54399" }
$redisPort = if ($cfg.REDIS_PORT) { $cfg.REDIS_PORT } else { "63799" }
$domain = $cfg.NGROK_DOMAIN
if (-not $domain) { throw "NGROK_DOMAIN is not set in .demo.env" }

# --- 2. Locate ngrok ----------------------------------------------------------
$ngrok = Join-Path $RepoRoot ".tools/ngrok.exe"
if (-not (Test-Path $ngrok)) {
  $onPath = Get-Command ngrok -ErrorAction SilentlyContinue
  if ($onPath) {
    $ngrok = $onPath.Source
  } else {
    Write-Step "Downloading ngrok"
    New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot ".tools") | Out-Null
    $zip = Join-Path $env:TEMP "ngrok.zip"
    Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile $zip
    Expand-Archive -Force $zip (Join-Path $RepoRoot ".tools")
  }
}
if ($cfg.NGROK_AUTHTOKEN) { & $ngrok config add-authtoken $cfg.NGROK_AUTHTOKEN | Out-Null }

# --- 3. Infra: Postgres + Redis ----------------------------------------------
Write-Step "Starting Postgres + Redis (docker)"
$env:POSTGRES_PORT = $pgPort
$env:REDIS_PORT = $redisPort
docker compose -f docker-compose.local.yml -p $ComposeProject up -d --wait postgres redis
if ($LASTEXITCODE -ne 0) { throw "docker compose failed" }

# --- 4. Apply migrations ------------------------------------------------------
Write-Step "Applying database migrations"
$env:DATABASE_URL = $cfg.DATABASE_URL
pnpm --filter "@repo/db-backend" migrate
if ($LASTEXITCODE -ne 0) { throw "migrations failed" }

# --- 5. Build the API --------------------------------------------------------
# Always rebuild: keying off dist/main.js existence would silently serve a stale
# build after a source change. nest build is idempotent and only ~15s.
Write-Step "Building the API"
pnpm --filter "@repo/api" build
if ($LASTEXITCODE -ne 0) { throw "API build failed" }

# --- 6. Export the runtime env for API + worker ------------------------------
$env:NODE_ENV = "production"
$env:API_SKIP_MIGRATIONS = "true"   # already migrated above
$env:PORT = $apiPort
$env:REDIS_URL = $cfg.REDIS_URL
$env:LLM_BASE_URL = $cfg.LLM_BASE_URL
$env:LLM_API_KEY = $cfg.LLM_API_KEY
$env:LLM_MODEL = $cfg.LLM_MODEL
$env:LLM_NODE_TIMEOUT_SCALE = $cfg.LLM_NODE_TIMEOUT_SCALE
$env:TAVILY_API_KEY = $cfg.TAVILY_API_KEY
$env:SUPABASE_URL = $cfg.SUPABASE_URL
$env:SUPABASE_PUBLISHABLE_KEY = $cfg.SUPABASE_PUBLISHABLE_KEY
$env:SUPABASE_SECRET_KEY = $cfg.SUPABASE_SECRET_KEY

# --- 7. Start API + worker + ngrok -------------------------------------------
Write-Step "Starting API, worker and ngrok"
$api = Start-Process node -ArgumentList "apps/api/dist/main.js" -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $StateDir "api.log") -RedirectStandardError (Join-Path $StateDir "api.err.log")
$worker = Start-Process node -ArgumentList "apps/api/dist/worker.js" -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $StateDir "worker.log") -RedirectStandardError (Join-Path $StateDir "worker.err.log")
$tunnel = Start-Process $ngrok -ArgumentList @("http", $apiPort, "--domain=$domain", "--log=stdout") -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $StateDir "ngrok.log") -RedirectStandardError (Join-Path $StateDir "ngrok.err.log")

@{ api = $api.Id; worker = $worker.Id; ngrok = $tunnel.Id; composeProject = $ComposeProject } |
  ConvertTo-Json | Set-Content (Join-Path $StateDir "pids.json")

# --- 8. Health checks ---------------------------------------------------------
function Wait-Http($url, $timeoutSec, $headers = @{}) {
  for ($i = 0; $i -lt $timeoutSec; $i++) {
    try {
      $r = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 5
      if ($r.StatusCode -eq 200) { return $true }
    } catch { Start-Sleep -Seconds 1 }
  }
  return $false
}

$publicUrl = "https://$domain"

# If any readiness check fails, reap the processes we just started so they don't
# orphan and hold port $apiPort / the ngrok domain, blocking the next run.
try {
  Write-Step "Waiting for the API"
  if (-not (Wait-Http "http://127.0.0.1:$apiPort/health" 40)) {
    throw "API did not become healthy - see demo-state/api.err.log"
  }
  Write-Host "API healthy on http://127.0.0.1:$apiPort" -ForegroundColor Green

  if ($worker.HasExited) {
    throw "Report worker exited on startup - see demo-state/worker.err.log"
  }
  Write-Host "Report worker is running" -ForegroundColor Green

  Write-Step "Waiting for the ngrok tunnel"
  if (-not (Wait-Http "$publicUrl/health" 30 @{ "ngrok-skip-browser-warning" = "true" })) {
    throw "Tunnel did not come up - check the authtoken/domain and demo-state/ngrok.err.log"
  }
} catch {
  Write-Host "Startup failed: $($_.Exception.Message)" -ForegroundColor Red
  foreach ($proc in @($api, $worker, $tunnel)) {
    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  }
  Remove-Item (Join-Path $StateDir "pids.json") -Force -ErrorAction SilentlyContinue
  throw
}

Write-Host ""
Write-Host "------------------------------------------------------------" -ForegroundColor Green
Write-Host " Demo is UP" -ForegroundColor Green
Write-Host "   API (public):  $publicUrl" -ForegroundColor Green
Write-Host "   Frontend:      https://trendscout-stage.vercel.app" -ForegroundColor Green
Write-Host "   Logs:          demo-state/*.log" -ForegroundColor Green
Write-Host "   Stop with:     make demo-stop" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor Green
Write-Host ""
