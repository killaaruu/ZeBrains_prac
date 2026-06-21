# k3s-up.ps1 — single command to build, load, and deploy TrendScout to the local k3s cluster.
# Prerequisites:
#   - Docker Desktop with WSL2 integration enabled
#   - k3s running in a dedicated WSL2 distro (must be the default docker context)
#   - Helm CLI installed
#   - kubectl installed + KUBECONFIG pointing at the k3s cluster
param(
    [string]$ImageTag = "latest",
    [string]$Namespace = "trendscout",
    [string]$UmbrellaChart = "../charts/trendscout",
    [string]$SecretName = "api-secrets"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."

Write-Output "=== Step 1: Build API image ==="
$image = "ghcr.io/your-org/api:$ImageTag"
docker build -t $image -f apps/api/Dockerfile .
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

Write-Output "=== Step 2: Save image and import into k3s (WSL2) ==="
$tarball = "$env:TEMP\api-image-$ImageTag.tar"
docker save $image -o $tarball
# Import into k3s containerd via WSL2
wsl -d docker-desktop k3s ctr images import $tarball 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Output "  Attempting direct k3s import via WSL default distro..."
    wsl k3s ctr images import $tarball 2>$null
}
Remove-Item $tarball -Force -ErrorAction SilentlyContinue

Write-Output "=== Step 3: Create namespace (if missing) ==="
kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -

Write-Output "=== Step 4: Create/update API secret (using env vars from .env) ==="
$envFile = "$root\..\apps\api\.env"
if (Test-Path $envFile) {
    $secretData = @{}
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)=(.+)$') {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            $secretData[$key] = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($value))
        }
    }
    $secretYaml = @"
apiVersion: v1
kind: Secret
metadata:
  name: $SecretName
  namespace: $Namespace
type: Opaque
data:
$(($secretData.Keys | ForEach-Object { "  $_: $($secretData[$_])" }) -join "`n")
"@
    Write-Output "  Creating secret from apps/api/.env..."
    $secretYaml | kubectl apply -n $Namespace -f -
} else {
    Write-Output "  WARNING: No .env file found at $envFile — using placeholder secret"
    kubectl create secret generic $SecretName --namespace=$Namespace --dry-run=client -o yaml `
        --from-literal=DATABASE_URL=postgresql://app:changeme@trendscout-postgres:5432/app_local `
        --from-literal=REDIS_URL=redis://trendscout-redis:6379/0 `
        --from-literal=OLLAMA_URL=http://trendscout-ollama:11434 `
        --from-literal=SUPABASE_URL=http://placeholder:54321 `
        --from-literal=SUPABASE_ANON_KEY=placeholder-key `
        --from-literal=JWT_SECRET=local-dev-secret |
        kubectl apply -f -
}

Write-Output "=== Step 5: Deploy umbrella chart ==="
helm upgrade --install trendscout $UmbrellaChart `
    --namespace $Namespace `
    --set api.image.repository=ghcr.io/your-org/api `
    --set api.image.tag=$ImageTag `
    --set api.image.pullPolicy=Never `
    --set worker.image.repository=ghcr.io/your-org/api `
    --set worker.image.tag=$ImageTag `
    --set worker.image.pullPolicy=Never

Write-Output "=== Step 6: Wait for deployments ==="
kubectl wait --for=condition=Available deployment -l app.kubernetes.io/component=api -n $Namespace --timeout=120s
kubectl wait --for=condition=Available deployment -l app.kubernetes.io/component=worker -n $Namespace --timeout=120s

Write-Output "=== Step 7: Port-forward API ==="
Write-Output "  API will be available at http://localhost:3000"
kubectl port-forward -n $Namespace svc/trendscout-api 3000:3000
