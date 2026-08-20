param(
  [Parameter(Mandatory = $true)][string]$EnvFile,
  [string]$ComposeFile = (Join-Path $PSScriptRoot "../compose.prod.yaml")
)

$ErrorActionPreference = "Stop"
$envPath = (Resolve-Path -LiteralPath $EnvFile).Path
$composePath = (Resolve-Path -LiteralPath $ComposeFile).Path
$values = @{}

foreach ($line in Get-Content -LiteralPath $envPath) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
  $separator = $trimmed.IndexOf("=")
  if ($separator -lt 1) { throw "Malformed environment line: $trimmed" }
  $values[$trimmed.Substring(0, $separator)] = $trimmed.Substring($separator + 1)
}

$required = @(
  "APP_VERSION", "AMNI_API_IMAGE", "AMNI_WORKER_IMAGE", "AMNI_WEB_IMAGE",
  "PLATFORM_HOST", "PLATFORM_DOMAIN", "TLS_EMAIL", "POSTGRES_USER", "POSTGRES_PASSWORD",
  "POSTGRES_DB", "REDIS_PASSWORD", "ACCESS_TOKEN_SECRET", "ENCRYPTION_KEY", "HRMS_SSO_SECRET",
  "MAIL_PROVIDER", "MAIL_FROM", "PROVISIONING_DRIVER", "ERPNEXT_CLUSTER_MODE", "ERPNEXT_SSH_HOST",
  "ERP_SSH_KEY_FILE", "ERP_SSH_KNOWN_HOSTS_FILE", "BENCH_DB_ROOT_PASSWORD", "BENCH_ADMIN_PASSWORD"
)

foreach ($name in $required) {
  $value = [string]$values[$name]
  if (-not $value) { throw "Missing required production value: $name" }
  if ($value -match "CHANGE_ME|example\.com|ghcr\.io/example") { throw "$name still contains a template value" }
}

foreach ($name in @("POSTGRES_PASSWORD", "REDIS_PASSWORD", "ACCESS_TOKEN_SECRET", "ENCRYPTION_KEY", "HRMS_SSO_SECRET", "BENCH_DB_ROOT_PASSWORD", "BENCH_ADMIN_PASSWORD")) {
  if ([string]$values[$name] -match "^(admin|amni|password|secret)$") { throw "$name uses an unsafe default" }
}
foreach ($name in @("POSTGRES_PASSWORD", "REDIS_PASSWORD")) {
  if ([string]$values[$name] -notmatch "^[A-Za-z0-9_-]{24,}$") { throw "$name must be at least 24 URL-safe characters" }
}
foreach ($name in @("ACCESS_TOKEN_SECRET", "HRMS_SSO_SECRET")) {
  if ([string]$values[$name].Length -lt 32) { throw "$name must contain at least 32 characters" }
}
if ([string]$values["ENCRYPTION_KEY"] -notmatch "^(?:[a-fA-F0-9]{64}|.{32})$") {
  throw "ENCRYPTION_KEY must be exactly 32 characters or 64 hexadecimal characters"
}
if ([string]$values["PLATFORM_HOST"] -match "localhost|127\.0\.0\.1") { throw "PLATFORM_HOST must be a public production hostname" }
if ($values["MAIL_PROVIDER"] -ne "smtp") { throw "Production mail must use the smtp provider" }
if ($values["ERPNEXT_CLUSTER_MODE"] -ne "ssh") { throw "Production ERP provisioning must use the SSH boundary" }

foreach ($name in @("ERP_SSH_KEY_FILE", "ERP_SSH_KNOWN_HOSTS_FILE")) {
  if (-not (Test-Path -LiteralPath $values[$name] -PathType Leaf)) { throw "$name does not point to a readable file" }
}
foreach ($name in @("AMNI_API_IMAGE", "AMNI_WORKER_IMAGE", "AMNI_WEB_IMAGE")) {
  $image = [string]$values[$name]
  if ($image.EndsWith(":latest") -or $image -notmatch "(?:@sha256:[a-f0-9]{64}|:[A-Za-z0-9][A-Za-z0-9._-]+)$") {
    throw "$name must use an explicit immutable release tag or digest"
  }
}

& docker compose --env-file $envPath -f $composePath config --quiet
if ($LASTEXITCODE -ne 0) { throw "Production Compose configuration is invalid" }

Write-Host "PRODUCTION PREFLIGHT: PASS"
