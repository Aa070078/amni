# Installs the apps already baked into the immutable Amni ERP image on one or
# more sites and configures the shared HRMS SSO secret. This script never
# mutates application code inside a running container.

param(
    [string]$ComposeProject = "frappe",
    [string]$Sites = "",
    [string]$FrappeDockerRoot = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$erpRoot = Join-Path $repoRoot "infra/erp"
if (-not $FrappeDockerRoot) {
    $FrappeDockerRoot = Join-Path $erpRoot ".runtime/frappe_docker"
}
$FrappeDockerRoot = (Resolve-Path -LiteralPath $FrappeDockerRoot).Path
$envFile = Join-Path $erpRoot ".env"

function Get-EnvValue([string]$key, [string]$fallback) {
    if (Test-Path -LiteralPath $envFile) {
        $line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
        if ($line) { return ($line -split "=", 2)[1].Trim().Trim('"') }
    }
    return $fallback
}

$secret = Get-EnvValue "AMNI_SSO_SECRET" ""
if ($secret.Length -lt 32 -or $secret.StartsWith("change-me")) {
    throw "AMNI_SSO_SECRET must be replaced with at least 32 random characters in infra/erp/.env."
}

$composeFiles = @(
    (Join-Path $FrappeDockerRoot "compose.yaml"),
    (Join-Path $FrappeDockerRoot "overrides/compose.mariadb.yaml"),
    (Join-Path $FrappeDockerRoot "overrides/compose.redis.yaml"),
    (Join-Path $FrappeDockerRoot "overrides/compose.noproxy.yaml")
)
$composeArgs = @("compose", "-p", $ComposeProject, "--env-file", $envFile)
foreach ($composeFile in $composeFiles) { $composeArgs += @("-f", $composeFile) }

Write-Host "==> Configuring the bench SSO secret"
& docker @composeArgs exec -T backend bench set-config -g amni_sso_secret $secret
if ($LASTEXITCODE -ne 0) { throw "Could not configure the SSO secret." }

foreach ($site in ($Sites -split ",")) {
    $site = $site.Trim()
    if (-not $site) { continue }
    Write-Host "==> Ensuring ERPNext, HRMS, and Amni Bridge are installed on $site"
    $installed = (& docker @composeArgs exec -T backend bench --site $site list-apps) -join "`n"
    foreach ($app in @("erpnext", "hrms", "amni_bridge")) {
        if ($installed -notmatch "(?m)^$app\s") {
            & docker @composeArgs exec -T backend bench --site $site install-app $app
            if ($LASTEXITCODE -ne 0) { throw "Could not install $app on $site." }
        }
    }
}

Write-Host "==> ERP apps and SSO configuration verified"
