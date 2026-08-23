param(
    [string]$FrappeDockerRoot = "",
    [string]$FrappeBranch = "v16.31.0",
    [string]$ErpnextBranch = "v16.32.1",
    [string]$HrmsBranch = "v16.16.0",
    [string]$ImageTag = "v16.31.0"
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
if (-not $FrappeDockerRoot) {
    $FrappeDockerRoot = Join-Path $repoRoot "infra/erp/.runtime/frappe_docker"
}
$FrappeDockerRoot = (Resolve-Path -LiteralPath $FrappeDockerRoot).Path
$containerfile = Join-Path $FrappeDockerRoot "images/custom/Containerfile"
if (-not (Test-Path -LiteralPath $containerfile)) {
    throw "Pinned frappe_docker checkout is missing. Run infra/erp/scripts/bootstrap.ps1 first."
}

$apps = @(
    @{ url = "https://github.com/frappe/erpnext.git"; branch = $ErpnextBranch },
    @{ url = "https://github.com/frappe/hrms.git"; branch = $HrmsBranch }
) | ConvertTo-Json -Compress
$appsBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($apps))
$baseImage = "amni/erpnext-base:$ImageTag"
$finalImage = "amni/erpnext:$ImageTag"

Write-Host "==> Building pinned Frappe + ERPNext + HRMS image"
& docker build `
    --build-arg "FRAPPE_BRANCH=$FrappeBranch" `
    --build-arg "APPS_JSON_BASE64=$appsBase64" `
    --tag $baseImage `
    --file $containerfile `
    $FrappeDockerRoot
if ($LASTEXITCODE -ne 0) { throw "Base ERP image build failed." }

Write-Host "==> Adding the local Amni bridge app"
& docker build `
    --build-arg "BASE_IMAGE=$baseImage" `
    --tag $finalImage `
    --file (Join-Path $repoRoot "infra/erp/images/Containerfile") `
    $repoRoot
if ($LASTEXITCODE -ne 0) { throw "Amni ERP image build failed." }

Write-Host "==> Built $finalImage"
