param(
  [string]$Site = "market-gate.localhost",
  [string]$BackendContainer = "frappe-backend-1",
  [string]$DbRootPassword = "admin",
  [string]$AdministratorPassword = "admin",
  [switch]$KeepSite
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
if ($Site -notmatch '^[a-z0-9][a-z0-9-]{2,40}\.localhost$') {
  throw "Release-gate site must be an explicit isolated *.localhost hostname."
}
$baseUrl = "http://localhost:8080"
$siteCreated = $false

function Run-Docker([string[]]$arguments, [int]$timeoutSeconds = 900) {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try { $output = & docker @arguments 2>&1 } finally { $ErrorActionPreference = $previousPreference }
  if ($LASTEXITCODE -ne 0) { throw "docker $($arguments -join ' ') failed: $($output -join [Environment]::NewLine)" }
  return $output
}

function Test-Gate-Site {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try { & docker exec $BackendContainer test -f "/home/frappe/frappe-bench/sites/$Site/site_config.json" 2>$null } finally { $ErrorActionPreference = $previousPreference }
  return $LASTEXITCODE -eq 0
}

function Drop-Gate-Site {
  Write-Host "==> Dropping isolated release-gate site $Site"
  Run-Docker @("exec", $BackendContainer, "bench", "drop-site", $Site, "--db-root-password=$DbRootPassword", "--no-backup", "--force") | Out-Null
}

try {
  if (Test-Gate-Site) { Drop-Gate-Site }

  Write-Host "==> Creating clean ERPNext release-gate site $Site"
  Run-Docker @(
    "exec", $BackendContainer, "bench", "new-site", $Site,
    "--mariadb-user-host-login-scope=%",
    "--db-root-password=$DbRootPassword",
    "--admin-password=$AdministratorPassword",
    "--install-app", "erpnext",
    "--install-app", "hrms",
    "--install-app", "amni_bridge"
  ) | Out-Null
  $siteCreated = $true

  Run-Docker @("exec", $BackendContainer, "bench", "--site", $Site, "execute", "amni_bridge.api.configure_company", "--kwargs", "{'company_name':'Amni Release Gate','abbreviation':'ARG','country':'United States','currency':'USD'}") | Out-Null
  $apps = Run-Docker @("exec", $BackendContainer, "bench", "--site", $Site, "list-apps")
  foreach ($required in @("frappe", "erpnext", "hrms", "amni_bridge")) {
    if (-not ($apps -match "(?m)^$required\s")) { throw "Clean site is missing required app $required." }
  }

  Write-Host "==> Provisioning restricted integration credentials"
  $credentialOutput = Run-Docker @("exec", $BackendContainer, "bench", "--site", $Site, "execute", "amni_bridge.api.provision_service_account", "--kwargs", "{'email':'release-gate@amni.local'}")
  $credentials = $null
  $credentialLines = @($credentialOutput)
  [array]::Reverse($credentialLines)
  foreach ($line in $credentialLines) {
    $text = [string]$line
    $start = $text.IndexOf("{")
    $end = $text.LastIndexOf("}")
    if ($start -lt 0 -or $end -le $start) { continue }
    try {
      $candidate = $text.Substring($start, $end - $start + 1) | ConvertFrom-Json
      if ($candidate.api_key -and $candidate.api_secret) { $credentials = $candidate; break }
    } catch { }
  }
  if (-not $credentials) { throw "Provisioning did not return restricted service credentials." }

  $ready = $false
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    try {
      $ping = Invoke-RestMethod -Uri "$baseUrl/api/method/ping" -Headers @{ Host = $Site } -TimeoutSec 10
      if ($ping.message -eq "pong") { $ready = $true; break }
    } catch { Start-Sleep -Seconds 2 }
  }
  if (-not $ready) { throw "Clean site did not become reachable at $baseUrl." }

  & (Join-Path $PSScriptRoot "smoke-critical-paths.ps1") -BaseUrl $baseUrl -SiteHost $Site -ApiKey $credentials.api_key -ApiSecret $credentials.api_secret -BackendContainer $BackendContainer -RestartBackend
  if ($LASTEXITCODE -ne 0) { throw "Critical sales/purchasing gate failed." }
  & (Join-Path $PSScriptRoot "smoke-accounting-invoicing.ps1") -BaseUrl $baseUrl -SiteHost $Site -ApiKey $credentials.api_key -ApiSecret $credentials.api_secret
  if ($LASTEXITCODE -ne 0) { throw "Accounting/invoicing gate failed." }
  & (Join-Path $PSScriptRoot "smoke-domain-persistence.ps1") -BaseUrl $baseUrl -SiteHost $Site -ApiKey $credentials.api_key -ApiSecret $credentials.api_secret
  if ($LASTEXITCODE -ne 0) { throw "Domain persistence gate failed." }

  Write-Host "==> REAL ERP RELEASE GATE: PASS"
}
finally {
  $credentials = $null
  $credentialOutput = $null
  if ($siteCreated -and -not $KeepSite) { Drop-Gate-Site }
}
