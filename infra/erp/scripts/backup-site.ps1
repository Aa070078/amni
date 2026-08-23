param(
  [Parameter(Mandatory = $true)][string]$Site,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [string]$BackendContainer = "frappe-backend-1"
)

$ErrorActionPreference = "Stop"
if ($Site -notmatch '^[a-z0-9][a-z0-9.-]{2,120}$') { throw "Site is not a safe explicit hostname" }
$outputPath = [IO.Path]::GetFullPath((Join-Path $OutputDirectory $Site))
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

& docker exec $BackendContainer bench --site $Site backup --with-files --compress
if ($LASTEXITCODE -ne 0) { throw "ERP backup failed for $Site" }
& docker cp "${BackendContainer}:/home/frappe/frappe-bench/sites/$Site/private/backups/." $outputPath
if ($LASTEXITCODE -ne 0) { throw "Could not copy ERP backup files for $Site" }

$files = Get-ChildItem -LiteralPath $outputPath -File | ForEach-Object {
  [ordered]@{ file = $_.Name; bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
}
if (-not $files) { throw "ERP backup produced no files" }
[ordered]@{ createdAt = (Get-Date).ToUniversalTime().ToString("o"); site = $Site; files = @($files) } |
  ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $outputPath "manifest.json") -Encoding utf8
Write-Host "ERP SITE BACKUP: PASS ($outputPath)"
