param(
  [Parameter(Mandatory = $true)][string]$DatabaseBackup,
  [string]$PublicFilesBackup,
  [string]$PrivateFilesBackup,
  [string]$BackendContainer = "frappe-backend-1",
  [Parameter(Mandatory = $true)][string]$DbRootPassword,
  [Parameter(Mandatory = $true)][string]$AdministratorPassword
)

$ErrorActionPreference = "Stop"
$databasePath = (Resolve-Path -LiteralPath $DatabaseBackup).Path
$publicPath = if ($PublicFilesBackup) { (Resolve-Path -LiteralPath $PublicFilesBackup).Path } else { $null }
$privatePath = if ($PrivateFilesBackup) { (Resolve-Path -LiteralPath $PrivateFilesBackup).Path } else { $null }
$suffix = [Guid]::NewGuid().ToString("N").Substring(0, 10)
$site = "restore-$suffix.localhost"
$remoteRoot = "/tmp/amni-restore-$suffix"
$created = $false

function Run-Docker([string[]]$arguments) {
  & docker @arguments
  if ($LASTEXITCODE -ne 0) { throw "docker $($arguments -join ' ') failed" }
}

try {
  Run-Docker @("exec", $BackendContainer, "mkdir", "-p", $remoteRoot)
  Run-Docker @("cp", $databasePath, "${BackendContainer}:$remoteRoot/database.sql.gz")
  if ($publicPath) { Run-Docker @("cp", $publicPath, "${BackendContainer}:$remoteRoot/public-files.tar") }
  if ($privatePath) { Run-Docker @("cp", $privatePath, "${BackendContainer}:$remoteRoot/private-files.tar") }

  Run-Docker @("exec", $BackendContainer, "bench", "new-site", $site, "--mariadb-user-host-login-scope=%", "--db-root-password=$DbRootPassword", "--admin-password=$AdministratorPassword")
  $created = $true
  $restore = @("exec", $BackendContainer, "bench", "--site", $site, "restore", "$remoteRoot/database.sql.gz", "--db-root-password=$DbRootPassword")
  if ($publicPath) { $restore += @("--with-public-files", "$remoteRoot/public-files.tar") }
  if ($privatePath) { $restore += @("--with-private-files", "$remoteRoot/private-files.tar") }
  Run-Docker $restore
  Run-Docker @("exec", $BackendContainer, "bench", "--site", $site, "migrate")
  $apps = & docker exec $BackendContainer bench --site $site list-apps
  if ($LASTEXITCODE -ne 0 -or -not ($apps -match "(?m)^erpnext\s")) { throw "Restored site is missing ERPNext" }
  Write-Host "ERP RESTORE DRILL: PASS ($site)"
} finally {
  if ($created) {
    & docker exec $BackendContainer bench drop-site $site "--db-root-password=$DbRootPassword" --no-backup --force 2>$null
  }
  & docker exec $BackendContainer rm -rf $remoteRoot 2>$null
}
