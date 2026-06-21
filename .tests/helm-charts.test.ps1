# Test script for Helm charts (run from repo root)
# Failing test: charts have no templates yet — helm template will fail

$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\.."
$umbrella = Join-Path $root "deploy\charts\trendscout"

Write-Output "=== Test 1: helm lint - umbrella chart ==="
$lint = helm lint $umbrella 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "FAIL: umbrella chart lint"
    Write-Output $lint
    exit 1
}
Write-Output "PASS"

Write-Output "=== Test 2: helm lint - redis subchart ==="
$lint = helm lint (Join-Path $umbrella "charts\redis") 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "FAIL: redis subchart lint"
    Write-Output $lint
    exit 1
}
Write-Output "PASS"

Write-Output "=== Test 3: helm lint - postgres subchart ==="
$lint = helm lint (Join-Path $umbrella "charts\postgres") 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "FAIL: postgres subchart lint"
    Write-Output $lint
    exit 1
}
Write-Output "PASS"

Write-Output "=== Test 4: helm lint - ollama subchart ==="
$lint = helm lint (Join-Path $umbrella "charts\ollama") 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "FAIL: ollama subchart lint"
    Write-Output $lint
    exit 1
}
Write-Output "PASS"

Write-Output "=== Test 5: helm lint - api subchart ==="
$lint = helm lint (Join-Path $umbrella "charts\api") 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "FAIL: api subchart lint"
    Write-Output $lint
    exit 1
}
Write-Output "PASS"

Write-Output "=== Test 6: helm lint - worker subchart ==="
$lint = helm lint (Join-Path $umbrella "charts\worker") 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Output "FAIL: worker subchart lint"
    Write-Output $lint
    exit 1
}
Write-Output "PASS"

Write-Output "=== Test 7: helm template - umbrella generates all resources ==="
$rawOutput = helm template trendscout $umbrella 2>&1
$output = $rawOutput -join "`n"
if ($LASTEXITCODE -ne 0) {
    Write-Output "FAIL: umbrella template rendering"
    Write-Output $output
    exit 1
}

# Check expected resource kinds
$expected = @(
    @{Kind="Service"; Name="trendscout-redis"}
    @{Kind="Deployment"; Name="trendscout-redis"}
    @{Kind="Service"; Name="trendscout-postgres"}
    @{Kind="StatefulSet"; Name="trendscout-postgres"}
    @{Kind="Service"; Name="trendscout-ollama"}
    @{Kind="Deployment"; Name="trendscout-ollama"}
    @{Kind="Job"; Name=".*ollama-model-pull"}  # helm prefix + suffix
    @{Kind="Deployment"; Name="trendscout-api"}
    @{Kind="Service"; Name="trendscout-api"}
    @{Kind="Deployment"; Name="trendscout-worker"}
    @{Kind="Job"; Name="trendscout-api-migrate-"}  # migration Job from api subchart (name includes tag)
)

foreach ($item in $expected) {
    $pattern = "(?s)kind: $($item.Kind).*?name: $($item.Name)"
    if ($output -notmatch $pattern) {
        Write-Output "FAIL: missing $($item.Kind)/$($item.Name)"
        exit 1
    }
    Write-Output "  Found $($item.Kind): $($item.Name)"
}
Write-Output "PASS: all expected resources present"

Write-Output "=== All helm chart tests passed ==="
