#!/usr/bin/env pwsh
# ==============================================================================
# stop-demo.ps1 - tear down the demo stack started by start-demo.ps1.
#   Stops the API + worker + ngrok processes and the Postgres/Redis containers.
#
# Processes are matched by their COMMAND LINE (the exact scripts the demo runs),
# not by a possibly-stale PID from demo-state/pids.json - so a recycled PID can
# never take down an unrelated process, and orphaned API/worker nodes left behind
# by a crashed start are still reaped.
#
# ASCII-only: Windows PowerShell 5.1 reads .ps1 as the system codepage when there
# is no BOM, so non-ASCII characters would break parsing.
# ==============================================================================
$ErrorActionPreference = "SilentlyContinue"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$ComposeProject = "trendscout-demo"
$pidsFile = Join-Path $RepoRoot "demo-state/pids.json"
if (Test-Path $pidsFile) {
  $pids = Get-Content $pidsFile -Raw | ConvertFrom-Json
  if ($pids.composeProject) { $ComposeProject = $pids.composeProject }
}

# Read the ngrok domain so we only stop OUR tunnel, not an unrelated ngrok.
$domain = $null
$envFile = Join-Path $RepoRoot ".demo.env"
if (Test-Path $envFile) {
  foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*NGROK_DOMAIN\s*=\s*(.+?)\s*$') { $domain = $Matches[1].Trim() }
  }
}

function Stop-ByCommandLine($namePattern, $cmdPattern, $label) {
  $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like $namePattern -and $_.CommandLine -and $_.CommandLine -match $cmdPattern }
  foreach ($p in $procs) {
    Write-Host "Stopping $label (pid $($p.ProcessId))"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
  }
}

# Our two node entrypoints are unambiguous; match their dist paths.
Stop-ByCommandLine "node.exe" "apps[\\/]api[\\/]dist[\\/]main\.js" "API"
Stop-ByCommandLine "node.exe" "apps[\\/]api[\\/]dist[\\/]worker\.js" "worker"
# ngrok: prefer the configured domain; fall back to any `ngrok ... http` invocation.
$ngrokPattern = if ($domain) { [regex]::Escape($domain) } else { "http" }
Stop-ByCommandLine "ngrok.exe" $ngrokPattern "ngrok"

Write-Host "Stopping Postgres + Redis ($ComposeProject)"
docker compose -f docker-compose.local.yml -p $ComposeProject down

Remove-Item $pidsFile -Force -ErrorAction SilentlyContinue
Write-Host "Demo stopped."
