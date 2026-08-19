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
$created = [System.Collections.Generic.List[object]]::new()
if ($ApiKey -and $ApiSecret) { $session.Headers.Add("Authorization", "token ${ApiKey}:${ApiSecret}") }

function Login {
  if ($ApiKey -and $ApiSecret) { return }
  $parameters = @{ Method = "Post"; Uri = "$BaseUrl/api/method/login"; WebSession = $session; Body = @{ usr = "Administrator"; pwd = $AdministratorPassword } }
  if ($SiteHost) { $parameters.Headers = @{ Host = $SiteHost } }
  Invoke-RestMethod @parameters | Out-Null
}

function ResourcePath([string]$doctype, [string]$name = "") {
  $path = "/api/v1/resource/$([uri]::EscapeDataString($doctype))"
  if ($name) { $path += "/$([uri]::EscapeDataString($name))" }
  return $path
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

function List-Docs([string]$doctype, [object[]]$filters, [int]$limit = 20) {
  $jsonFilters = if ($filters.Count -eq 0) {
    "[]"
  } elseif ($filters[0] -is [string]) {
    ConvertTo-Json -InputObject (, $filters) -Depth 6 -Compress
  } else {
    ConvertTo-Json -InputObject $filters -Depth 6 -Compress
  }
  $encoded = [uri]::EscapeDataString($jsonFilters)
  return (Invoke-Frappe "GET" "$(ResourcePath $doctype)?filters=$encoded&limit_page_length=$limit").data
}

function Create-Doc([string]$doctype, [hashtable]$document) {
  $result = Invoke-Frappe "POST" (ResourcePath $doctype) $document
  $created.Add([pscustomobject]@{ Doctype = $doctype; Name = $result.data.name; Submitted = $false })
  return $result.data
}

function Delete-Doc([string]$doctype, [string]$name) {
  Invoke-Frappe "DELETE" (ResourcePath $doctype $name) | Out-Null
}

Login
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

try {
  $company = (List-Docs "Company" @() 1)[0].name
  if (-not $company) { throw "The integration site has no Company." }

  $groupAccount = (List-Docs "Account" @(@("company", "=", $company), @("is_group", "=", 1), @("root_type", "=", "Asset")) 1)[0]
  $cashAccount = (List-Docs "Account" @(@("company", "=", $company), @("is_group", "=", 0), @("account_type", "=", "Cash")) 1)[0]
  $expenseAccount = (List-Docs "Account" @(@("company", "=", $company), @("is_group", "=", 0), @("root_type", "=", "Expense")) 1)[0]
  $costCenter = (List-Docs "Cost Center" @(@("company", "=", $company), @("is_group", "=", 0)) 1)[0]
  $customerGroup = (List-Docs "Customer Group" @(@("is_group", "=", 0)) 1)[0]
  $territory = (List-Docs "Territory" @(@("is_group", "=", 0)) 1)[0]
  $itemGroup = (List-Docs "Item Group" @(@("is_group", "=", 0)) 1)[0]
  if (-not $groupAccount -or -not $cashAccount -or -not $expenseAccount -or -not $costCenter -or -not $customerGroup -or -not $territory -or -not $itemGroup) { throw "The integration company is missing standard accounting or master-data fixtures." }

  $account = Create-Doc "Account" @{ account_name = "Amni Smoke $suffix"; company = $company; root_type = "Asset"; parent_account = $groupAccount.name; is_group = 0 }
  $customer = Create-Doc "Customer" @{ customer_name = "Amni Smoke Customer $suffix"; customer_type = "Company"; customer_group = $customerGroup.name; territory = $territory.name }
  $item = Create-Doc "Item" @{ item_code = "AMNI-SMOKE-$suffix"; item_name = "Amni Smoke Service"; item_group = $itemGroup.name; stock_uom = "Nos"; is_stock_item = 0 }

  $journal = Create-Doc "Journal Entry" @{ company = $company; posting_date = (Get-Date).ToString("yyyy-MM-dd"); user_remark = "Amni accounting persistence smoke"; accounts = @(@{ account = $expenseAccount.name; debit_in_account_currency = 25; credit_in_account_currency = 0; cost_center = $costCenter.name }, @{ account = $cashAccount.name; debit_in_account_currency = 0; credit_in_account_currency = 25; cost_center = $costCenter.name }) }

  $invoice = Create-Doc "Sales Invoice" @{ company = $company; customer = $customer.name; posting_date = (Get-Date).ToString("yyyy-MM-dd"); due_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd"); items = @(@{ item_code = $item.name; qty = 2; rate = 100 }) }
  $invoice.doctype = "Sales Invoice"
  $invoice = (Invoke-Frappe "POST" "/api/v1/method/frappe.client.submit" @{ doc = $invoice }).message
  ($created | Where-Object { $_.Doctype -eq "Sales Invoice" -and $_.Name -eq $invoice.name }).Submitted = $true

  $credit = Create-Doc "Sales Invoice" @{ company = $company; customer = $customer.name; posting_date = (Get-Date).ToString("yyyy-MM-dd"); is_return = 1; return_against = $invoice.name; remarks = "Amni credit-note persistence smoke"; items = @(@{ item_code = $item.name; qty = -1; rate = 100 }) }
  $template = Create-Doc "Sales Invoice" @{ company = $company; customer = $customer.name; posting_date = (Get-Date).ToString("yyyy-MM-dd"); due_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd"); remarks = "Amni recurring template smoke"; items = @(@{ item_code = $item.name; qty = 1; rate = 75 }) }
  $repeat = Create-Doc "Auto Repeat" @{ reference_doctype = "Sales Invoice"; reference_document = $template.name; subject = "Amni recurring smoke $suffix"; start_date = (Get-Date).ToString("yyyy-MM-dd"); frequency = "Monthly"; repeat_on_day = 1; submit_on_creation = 1; disabled = 0 }

  $balances = (Invoke-Frappe "POST" "/api/v1/method/amni_bridge.api.get_account_balances").message
  if ($null -eq $balances.items) { throw "The account-balance bridge method did not return its typed items envelope." }

  if ($RestartBackend) {
    docker restart frappe-backend-1 | Out-Null
    $deadline = (Get-Date).AddSeconds(60)
    do {
      Start-Sleep -Seconds 2
      try { Login; $ready = $true } catch { $ready = $false }
    } until ($ready -or (Get-Date) -gt $deadline)
    if (-not $ready) { throw "Frappe did not recover after backend restart." }
  }

  foreach ($document in @($account, $journal, $credit, $template, $repeat)) {
    $persisted = (Invoke-Frappe "GET" (ResourcePath $document.doctype $document.name)).data
    if ($persisted.name -ne $document.name) { throw "$($document.doctype) $($document.name) was not durable." }
  }

  [pscustomobject]@{ Company = $company; Account = $account.name; JournalEntry = $journal.name; CreditNote = $credit.name; AutoRepeat = $repeat.name; RestartVerified = [bool]$RestartBackend; Result = "PASS" } | ConvertTo-Json -Compress
}
finally {
  $cleanup = $created.ToArray()
  [array]::Reverse($cleanup)
  foreach ($document in $cleanup) {
    try {
      if ($document.Submitted) { Invoke-Frappe "POST" "/api/v1/method/frappe.client.cancel" @{ doctype = $document.Doctype; name = $document.Name } | Out-Null }
      Delete-Doc $document.Doctype $document.Name
    } catch {
      Write-Warning "Could not remove smoke fixture $($document.Doctype) $($document.Name): $($_.Exception.Message)"
    }
  }
}
