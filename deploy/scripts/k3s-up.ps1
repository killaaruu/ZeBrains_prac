# k3s-up.ps1 — single command to build, load, and deploy TrendScout to the local k3s cluster.
# Prerequisites:
#   - Docker Desktop with WSL2 backend
#   - wsl CLI available
#   - Helm CLI installed
#   - kubectl installed
param(
    [string]$ImageTag = "test",
    [string]$Namespace = "trendscout",
    [string]$UmbrellaChart = "../charts/trendscout",
    [string]$SecretName = "api-secrets",
    [string]$WslDistro = "Ubuntu-24.04"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."

# -- helpers ---------------------------------------------------------------
function wsl-run($cmd) { wsl -d $WslDistro -u root -e bash -c $cmd 2>&1 }
function kubectl-run { $env:KUBECONFIG = "$env:USERPROFILE\.kube\k3s-config"; Invoke-Expression $args }

# -- Step 0: install & start k3s in WSL2 -----------------------------------
Write-Output "=== Step 0: Ensure k3s is running in WSL2 ==="
$k3sRunning = wsl-run "ps aux | grep -v grep | grep -q 'k3s server' && echo 1 || echo 0" | Out-String
if ($k3sRunning.Trim() -eq "0") {
    $k3sBin = wsl-run "which k3s 2>/dev/null || echo missing" | Out-String
    if ($k3sBin.Trim() -eq "missing") {
        Write-Output "  Installing k3s binary in WSL2..."
        wsl-run "curl -sLo /usr/local/bin/k3s https://github.com/k3s-io/k3s/releases/download/v1.32.3%2Bk3s1/k3s && chmod +x /usr/local/bin/k3s"
    }
    # Start k3s as user (not systemd) with nohup+disown so it survives the wsl session
    wsl-run "nohup k3s server --write-kubeconfig-mode 644 < /dev/null > /var/log/k3s.log 2>&1 & disown"
    Write-Output "  Waiting for API server..."
    Start-Sleep 15
    $ready = wsl-run "k3s kubectl wait --for=condition=Ready nodes --all --timeout=30s 2>&1" | Out-String
    if ($LASTEXITCODE -ne 0) {
        Write-Output "  WARNING: k3s may not be fully ready yet, continuing..."
    }
}

# -- Step 1: copy kubeconfig to Windows ------------------------------------
Write-Output "=== Step 1: Set up kubeconfig ==="
$wslIp = (wsl-run "hostname -I" | Out-String).Trim()
$kubeconfig = wsl-run "cat /etc/rancher/k3s/k3s.yaml" | Out-String
$kubeconfig = $kubeconfig.Replace("server: https://127.0.0.1:6443", "server: https://$wslIp`:6443")
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.kube" | Out-Null
Set-Content -Path "$env:USERPROFILE\.kube\k3s-config" -Value $kubeconfig
$env:KUBECONFIG = "$env:USERPROFILE\.kube\k3s-config"
kubectl get nodes
if ($LASTEXITCODE -ne 0) { throw "Cannot connect to k3s cluster" }

# -- Step 2: Build API image ------------------------------------------------
Write-Output "=== Step 2: Build API image ==="
$repo = "ghcr.io/your-org/api"
docker build -t "$repo`:$ImageTag" -f apps/api/Dockerfile .
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

# -- Step 3: Load image into k3s containerd ---------------------------------
Write-Output "=== Step 3: Load image into k3s containerd ==="
$tarball = "$env:TEMP\trendscout-api-$ImageTag.tar"
docker save "$repo`:$ImageTag" -o $tarball
wsl-run "cp /mnt/c/Users/$env:USERNAME/AppData/Local/Temp/trendscout-api-$ImageTag.tar /tmp/trendscout-api.tar"
wsl-run "k3s ctr images import /tmp/trendscout-api.tar 2>&1"
Remove-Item $tarball -Force -ErrorAction SilentlyContinue

# -- Step 4: Create namespace -----------------------------------------------
Write-Output "=== Step 4: Create namespace ==="
kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -

# -- Step 5: Create API secret ----------------------------------------------
Write-Output "=== Step 5: Create API secret ==="
kubectl create secret generic $SecretName --namespace=$Namespace --dry-run=client -o yaml `
    --from-literal=DATABASE_URL=postgresql://app:changeme@trendscout-postgres:5432/app_local `
    --from-literal=REDIS_URL=redis://trendscout-redis:6379/0 `
    --from-literal=OLLAMA_URL=http://trendscout-ollama:11434 `
    --from-literal=SUPABASE_URL=http://placeholder:54321 `
    --from-literal=SUPABASE_ANON_KEY=placeholder-key `
    --from-literal=JWT_SECRET=local-dev-secret |
    kubectl apply -f -

# -- Step 6: Deploy umbrella chart ------------------------------------------
Write-Output "=== Step 6: Deploy umbrella chart ==="
helm upgrade --install trendscout $UmbrellaChart `
    --namespace $Namespace `
    --set api.image.repository=$repo `
    --set api.image.tag=$ImageTag `
    --set api.image.pullPolicy=Never `
    --set worker.image.repository=$repo `
    --set worker.image.tag=$ImageTag `
    --set worker.image.pullPolicy=Never `
    --set ollama.gpu.enabled=false

# -- Step 7: Wait for deployments -------------------------------------------
Write-Output "=== Step 7: Wait for deployments ==="
kubectl wait --for=condition=Available deployment -l app.kubernetes.io/name=api -n $Namespace --timeout=120s 2>$null
kubectl wait --for=condition=Available deployment -l app.kubernetes.io/component=worker -n $Namespace --timeout=120s 2>$null

# -- Step 8: Port-forward API -----------------------------------------------
Write-Output "=== Step 8: Port-forward API ==="
Write-Output "  API available at http://localhost:3000/health"
kubectl port-forward -n $Namespace svc/trendscout-api 3000:3000
