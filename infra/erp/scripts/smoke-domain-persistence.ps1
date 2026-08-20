param(
  [string]$BaseUrl = "http://localhost:8080",
  [string]$AdministratorPassword = "admin",
  [string]$ApiKey = "",
  [string]$ApiSecret = "",
  [string]$SiteHost = "",
  [switch]$RestartBackend
)

$ErrorActionPreference = "Stop"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$created = [System.Collections.Generic.List[string]]::new()
if ($ApiKey -and $ApiSecret) { $session.Headers.Add("Authorization", "token ${ApiKey}:${ApiSecret}") }

function Reset-Session {
  $script:session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  if ($ApiKey -and $ApiSecret) { $script:session.Headers.Add("Authorization", "token ${ApiKey}:${ApiSecret}") }
}

function Login {
  if ($ApiKey -and $ApiSecret) { return }
  $parameters = @{ Method = "Post"; Uri = "$BaseUrl/api/method/login"; WebSession = $session; Body = @{ usr = "Administrator"; pwd = $AdministratorPassword } }
  if ($SiteHost) { $parameters.Headers = @{ Host = $SiteHost } }
  Invoke-RestMethod @parameters | Out-Null
}

function Invoke-Frappe([string]$method, [string]$path, $body = $null) {
  Write-Host "==> $method $path"
  $parameters = @{ Method = $method; Uri = "$BaseUrl$path"; WebSession = $session }
  if ($SiteHost) { $parameters.Headers = @{ Host = $SiteHost } }
  if ($null -ne $body) {
    $parameters.ContentType = "application/json"
    $parameters.Body = $body | ConvertTo-Json -Depth 12 -Compress
  }
  return Invoke-RestMethod @parameters
}

function ResourcePath([string]$name = "") {
  $path = "/api/v1/resource/$([uri]::EscapeDataString('Amni Domain Record'))"
  if ($name) { $path += "/$([uri]::EscapeDataString($name))" }
  return $path
}

function Create-Record([string]$domain, [string]$recordType, [string]$recordCode, [hashtable]$payload, [hashtable]$indexes) {
  $key = "${domain}:${recordType}:${recordCode}"
  $document = @{ record_key = $key; domain = $domain; record_type = $recordType; record_code = $recordCode; payload = ($payload | ConvertTo-Json -Depth 10 -Compress) }
  foreach ($entry in $indexes.GetEnumerator()) { $document[$entry.Key] = $entry.Value }
  $result = Invoke-Frappe "POST" (ResourcePath) $document
  $created.Add($result.data.name)
  return $result.data
}

Login
$suffix = ([DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()).Substring(6)

try {
  $shareholder = Create-Record "equity" "shareholder" "SH-$suffix" @{ code = "SH-$suffix"; name = "Persistence Smoke"; totalShares = 100 } @{ title = "Persistence Smoke"; numeric_value = 100; search_text = "SH-$suffix Persistence Smoke" }
  $metric = Create-Record "esg" "metric" "ESG-$suffix" @{ code = "ESG-$suffix"; name = "Renewable energy"; value = 50; unit = "%" } @{ title = "Renewable energy"; category = "environmental"; numeric_value = 50; search_text = "ESG-$suffix Renewable energy" }
  $template = Create-Record "sign" "template" "STMP-$suffix" @{ code = "STMP-$suffix"; name = "NDA smoke"; status = "active" } @{ title = "NDA smoke"; status = "active"; search_text = "STMP-$suffix NDA smoke" }

  $list = (Invoke-Frappe "POST" "/api/v1/method/amni_bridge.api.list_domain_records" @{ domain = "equity"; record_type = "shareholder"; q = "Persistence Smoke"; page_length = 20 }).message
  if ($list.total -lt 1 -or $list.items[0].record_code -ne $shareholder.record_code) { throw "The bounded domain query did not return the created tenant record." }

  if ($RestartBackend) {
    docker restart frappe-backend-1 | Out-Null
    Reset-Session
    $deadline = (Get-Date).AddSeconds(60)
    do {
      Start-Sleep -Seconds 2
      try {
        Login
        $pingParameters = @{ Method = "Get"; Uri = "$BaseUrl/api/method/ping"; WebSession = $session }
        if ($SiteHost) { $pingParameters.Headers = @{ Host = $SiteHost } }
        Invoke-RestMethod @pingParameters | Out-Null
        $ready = $true
      } catch { $ready = $false }
    } until ($ready -or (Get-Date) -gt $deadline)
    if (-not $ready) { throw "Frappe did not recover after backend restart." }
  }

  foreach ($record in @($shareholder, $metric, $template)) {
    $persisted = (Invoke-Frappe "GET" (ResourcePath $record.name)).data
    if ($persisted.name -ne $record.name) { throw "$($record.name) was not durable." }
  }

  [pscustomobject]@{ Equity = $shareholder.name; Esg = $metric.name; Sign = $template.name; RestartVerified = [bool]$RestartBackend; Result = "PASS" } | ConvertTo-Json -Compress
}
finally {
  foreach ($name in $created) {
    try { Invoke-Frappe "DELETE" (ResourcePath $name) | Out-Null }
    catch { Write-Warning "Could not remove smoke fixture $name`: $($_.Exception.Message)" }
  }
}
