param(
  [Parameter(Mandatory = $true)][string]$EnvFile,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [string]$ComposeFile = (Join-Path $PSScriptRoot "../compose.prod.yaml"),
  [string]$Project = "amni-production"
)

$ErrorActionPreference = "Stop"
$envPath = (Resolve-Path -LiteralPath $EnvFile).Path
$composePath = (Resolve-Path -LiteralPath $ComposeFile).Path
$outputPath = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$containerFile = "/tmp/amni-platform-$stamp.dump"
$localFile = Join-Path $outputPath "amni-platform-$stamp.dump"
$compose = @("compose", "--env-file", $envPath, "-f", $composePath, "-p", $Project)

try {
  & docker @compose exec -T postgres sh -c "pg_dump --format=custom --compress=9 --file='$containerFile' --username=`"`$POSTGRES_USER`" `"`$POSTGRES_DB`""
  if ($LASTEXITCODE -ne 0) { throw "Platform pg_dump failed" }
  & docker @compose cp "postgres:$containerFile" $localFile
  if ($LASTEXITCODE -ne 0) { throw "Could not copy the platform backup" }
} finally {
  & docker @compose exec -T postgres rm -f $containerFile 2>$null
}

$file = Get-Item -LiteralPath $localFile
if ($file.Length -lt 1024) { throw "Platform backup is unexpectedly small" }
$manifest = [ordered]@{
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  kind = "postgres-custom"
  file = $file.Name
  bytes = $file.Length
  sha256 = (Get-FileHash -LiteralPath $localFile -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath "$localFile.manifest.json" -Encoding utf8
Write-Host "PLATFORM BACKUP: PASS ($localFile)"
