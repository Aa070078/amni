param(
  [Parameter(Mandatory = $true)][uri]$PlatformUrl,
  [uri]$ErpUrl,
  [string]$ErpSiteHost,
  [int]$TimeoutSeconds = 10
)

$ErrorActionPreference = "Stop"
$checks = [System.Collections.Generic.List[object]]::new()

function Check-Endpoint([string]$name, [uri]$uri, [hashtable]$headers = @{}) {
  $started = Get-Date
  try {
    $response = Invoke-WebRequest -Uri $uri -Headers $headers -TimeoutSec $TimeoutSeconds -SkipHttpErrorCheck
    $latency = [int]((Get-Date) - $started).TotalMilliseconds
    $ok = $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
    $checks.Add([ordered]@{ name = $name; ok = $ok; status = $response.StatusCode; latencyMs = $latency })
  } catch {
    $checks.Add([ordered]@{ name = $name; ok = $false; error = $_.Exception.Message })
  }
}

Check-Endpoint "platform-live" ([uri]::new($PlatformUrl, "/api/v1/healthz/live"))
Check-Endpoint "platform-ready" ([uri]::new($PlatformUrl, "/api/v1/healthz/ready"))
Check-Endpoint "platform-web" $PlatformUrl
if ($ErpUrl -and $ErpSiteHost) { Check-Endpoint "erp-ping" ([uri]::new($ErpUrl, "/api/method/ping")) @{ Host = $ErpSiteHost } }

$ok = @($checks | Where-Object { -not $_.ok }).Count -eq 0
[ordered]@{ timestamp = (Get-Date).ToUniversalTime().ToString("o"); ok = $ok; checks = $checks } | ConvertTo-Json -Depth 5
if (-not $ok) { exit 1 }
