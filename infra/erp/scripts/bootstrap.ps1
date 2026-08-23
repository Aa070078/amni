param(
    [string]$ComposeProject = "frappe",
    [string]$Site = "localhost",
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$erpRoot = Join-Path $repoRoot "infra/erp"
$runtimeRoot = Join-Path $erpRoot ".runtime/frappe_docker"
$envFile = Join-Path $erpRoot ".env"
$pinnedCommit = "616ffd417797031f760e7a6c9669923a5febed66"

if (-not (Test-Path -LiteralPath (Join-Path $runtimeRoot ".git"))) {
    New-Item -ItemType Directory -Force -Path (Split-Path $runtimeRoot) | Out-Null
    Write-Host "==> Fetching pinned frappe_docker ($pinnedCommit)"
    & git clone --filter=blob:none --no-checkout https://github.com/frappe/frappe_docker.git $runtimeRoot
    if ($LASTEXITCODE -ne 0) { throw "Could not clone frappe_docker." }
    & git -C $runtimeRoot checkout --detach $pinnedCommit
    if ($LASTEXITCODE -ne 0) { throw "Could not check out pinned frappe_docker commit." }
}

$actualCommit = (& git -C $runtimeRoot rev-parse HEAD).Trim()
if ($actualCommit -ne $pinnedCommit) {
    throw "frappe_docker is at $actualCommit; expected $pinnedCommit. Remove infra/erp/.runtime/frappe_docker and rerun."
}

if (-not (Test-Path -LiteralPath $envFile)) {
    Copy-Item -LiteralPath (Join-Path $erpRoot ".env.example") -Destination $envFile
    Write-Host "==> Created infra/erp/.env from the development template"
}

if (-not $SkipBuild) {
    & (Join-Path $PSScriptRoot "build-image.ps1") -FrappeDockerRoot $runtimeRoot
    if ($LASTEXITCODE -ne 0) { throw "ERP image build failed." }
}

$composeFiles = @(
    (Join-Path $runtimeRoot "compose.yaml"),
    (Join-Path $runtimeRoot "overrides/compose.mariadb.yaml"),
    (Join-Path $runtimeRoot "overrides/compose.redis.yaml"),
    (Join-Path $runtimeRoot "overrides/compose.noproxy.yaml")
)
$composeArgs = @("compose", "-p", $ComposeProject, "--env-file", $envFile)
foreach ($composeFile in $composeFiles) {
    if (-not (Test-Path -LiteralPath $composeFile)) { throw "Missing compose file: $composeFile" }
    $composeArgs += @("-f", $composeFile)
}

Write-Host "==> Starting the real ERPNext integration cluster"
& docker @composeArgs up -d
if ($LASTEXITCODE -ne 0) { throw "ERP cluster failed to start." }

Write-Host "==> Waiting for the backend"
$ready = $false
for ($attempt = 1; $attempt -le 36; $attempt++) {
    & docker @composeArgs exec -T backend bench version *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 5
}
if (-not $ready) { throw "ERPNext backend did not become ready within three minutes." }

& docker @composeArgs exec -T backend test -f "/home/frappe/frappe-bench/sites/$Site/site_config.json"
if ($LASTEXITCODE -ne 0) {
    Write-Host "==> Creating integration site $Site"
    & docker @composeArgs exec -T backend bench new-site $Site `
        --mariadb-user-host-login-scope=% `
        --db-root-password admin `
        --admin-password admin `
        --install-app erpnext `
        --install-app hrms `
        --install-app amni_bridge
    if ($LASTEXITCODE -ne 0) { throw "ERPNext site creation failed." }
}

& (Join-Path $PSScriptRoot "install-hrms.ps1") -ComposeProject $ComposeProject -Sites $Site -FrappeDockerRoot $runtimeRoot
if ($LASTEXITCODE -ne 0) { throw "ERP site configuration failed." }

$pingReady = $false
for ($attempt = 1; $attempt -le 24; $attempt++) {
    try {
        $ping = Invoke-RestMethod -Uri "http://localhost:8080/api/method/ping" -Headers @{ Host = $Site } -TimeoutSec 10
        if ($ping.message -eq "pong") { $pingReady = $true; break }
    }
    catch {
        Start-Sleep -Seconds 5
    }
}
if (-not $pingReady) { throw "ERPNext HTTP endpoint did not become ready within two minutes." }
Write-Host "==> Real ERPNext is ready at http://$Site`:8080 (Administrator / admin for local development only)"
