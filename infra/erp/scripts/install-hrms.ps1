# Installs Frappe HR (hrms) + the Amni SSO/theme bridge into the frappe_docker
# bench and enables them on sites. Run once per cluster (and again after an
# ERPNext image rebuild). Idempotent.
#
# Usage (from repo root, after `infra/erp/.env` is filled):
#   powershell -File infra/erp/scripts/install-hrms.ps1
#   powershell -File infra/erp/scripts/install-hrms.ps1 -Sites myco.localhost,demo-co.amni.dev

param(
    [string]$ComposeProject = "frappe",
    [string]$Sites = ""
)

$ErrorActionPreference = "Stop"

function Get-EnvValue([string]$key, [string]$fallback) {
    if (Test-Path "infra/erp/.env") {
        $line = Get-Content "infra/erp/.env" | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
        if ($line) { return ($line -split "=", 2)[1].Trim().Trim('"') }
    }
    return $fallback
}

$hrmsBranch = Get-EnvValue "HRMS_BRANCH" "version-16"
$secret = Get-EnvValue "AMNI_SSO_SECRET" "change-me-to-a-long-random-string-of-at-least-32-chars"

Write-Host "==> Installing apps into bench '$ComposeProject' (hrms branch: $hrmsBranch)"
docker compose -p $ComposeProject exec backend bench get-app "https://github.com/frappe/hrms" --branch $hrmsBranch
docker compose -p $ComposeProject exec backend bench get-app /home/frappe/frappe-bench/apps_remote/amni_bridge 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "==> Copying amni_bridge app into the bench container"
    docker compose -p $ComposeProject cp "infra/erp/apps/amni_bridge" "backend:/home/frappe/frappe-bench/apps_remote/amni_bridge"
    docker compose -p $ComposeProject exec backend bench get-app /home/frappe/frappe-bench/apps_remote/amni_bridge
}

Write-Host "==> Sharing AMNI_SSO_SECRET with the bench (common_site_config.json)"
docker compose -p $ComposeProject exec backend bash -c "cd /home/frappe/frappe-bench && python -c \"import json,os; p='sites/common_site_config.json'; d=json.load(open(p)) if os.path.exists(p) else {}; d['amni_sso_secret']='$secret'; json.dump(d, open(p,'w'), indent=4, sort_keys=True)\""

if ($Sites) {
    foreach ($site in ($Sites -split ",")) {
        $site = $site.Trim()
        if ($site) {
            Write-Host "==> Installing hrms + amni_bridge on site: $site"
            docker compose -p $ComposeProject exec backend bench --site $site install-app hrms amni_bridge
        }
    }
} else {
    Write-Host "==> No -Sites given. Install on each existing site with:"
    Write-Host "    docker compose -p $ComposeProject exec backend bench --site <site> install-app hrms amni_bridge"
    Write-Host "    (New sites provisioned via the Amni worker install these automatically.)"
}

Write-Host "==> Done."
