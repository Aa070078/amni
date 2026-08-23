param(
  [Parameter(Mandatory = $true)][string]$EnvFile,
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [string]$ComposeFile = (Join-Path $PSScriptRoot "../compose.prod.yaml"),
  [string]$Project = "amni-production"
)

$ErrorActionPreference = "Stop"
$envPath = (Resolve-Path -LiteralPath $EnvFile).Path
$composePath = (Resolve-Path -LiteralPath $ComposeFile).Path
$backupPath = (Resolve-Path -LiteralPath $BackupFile).Path
if ([IO.Path]::GetExtension($backupPath) -ne ".dump") { throw "Restore drill accepts only an explicit .dump backup" }
$suffix = [Guid]::NewGuid().ToString("N").Substring(0, 10)
$database = "amni_restore_$suffix"
$containerFile = "/tmp/$database.dump"
$compose = @("compose", "--env-file", $envPath, "-f", $composePath, "-p", $Project)
$created = $false

try {
  & docker @compose cp $backupPath "postgres:$containerFile"
  if ($LASTEXITCODE -ne 0) { throw "Could not stage the backup inside Postgres" }
  & docker @compose exec -T postgres createdb --username "`$POSTGRES_USER" $database
  if ($LASTEXITCODE -ne 0) { throw "Could not create isolated restore database" }
  $created = $true
  & docker @compose exec -T postgres pg_restore --exit-on-error --no-owner --no-privileges --username "`$POSTGRES_USER" --dbname $database $containerFile
  if ($LASTEXITCODE -ne 0) { throw "pg_restore failed" }
  $migrationCount = & docker @compose exec -T postgres psql --username "`$POSTGRES_USER" --dbname $database --tuples-only --no-align --command 'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;'
  if ($LASTEXITCODE -ne 0 -or [int]$migrationCount -lt 1) { throw "Restored database has no completed Prisma migrations" }
  Write-Host "PLATFORM RESTORE DRILL: PASS ($migrationCount migrations)"
} finally {
  if ($created) { & docker @compose exec -T postgres dropdb --force --if-exists --username "`$POSTGRES_USER" $database 2>$null }
  & docker @compose exec -T postgres rm -f $containerFile 2>$null
}
