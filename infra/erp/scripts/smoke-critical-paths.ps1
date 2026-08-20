param(
  [Parameter(Mandatory = $true)][string]$BaseUrl,
  [Parameter(Mandatory = $true)][string]$ApiKey,
  [Parameter(Mandatory = $true)][string]$ApiSecret,
  [string]$SiteHost = "",
  [string]$BackendContainer = "frappe-backend-1",
  [switch]$RestartBackend
)

$ErrorActionPreference = "Stop"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.Headers.Add("Authorization", "token ${ApiKey}:${ApiSecret}")
$created = [System.Collections.Generic.List[object]]::new()

function Resource-Path([string]$doctype, [string]$name = "") {
  $path = "/api/v1/resource/$([uri]::EscapeDataString($doctype))"
  if ($name) { $path += "/$([uri]::EscapeDataString($name))" }
  return $path
}

function Invoke-Frappe([string]$method, [string]$path, $body = $null) {
  Write-Host "==> $method $path"
  $parameters = @{ Method = $method; Uri = "$BaseUrl$path"; WebSession = $session; TimeoutSec = 60 }
  if ($SiteHost) { $parameters.Headers = @{ Host = $SiteHost } }
  if ($null -ne $body) {
    $parameters.ContentType = "application/json"
    $parameters.Body = $body | ConvertTo-Json -Depth 14 -Compress
  }
  return Invoke-RestMethod @parameters
}

function List-Docs([string]$doctype, [object[]]$filters, [int]$limit = 20) {
  $json = if ($filters.Count -eq 0) {
    "[]"
  } elseif ($filters[0] -is [string]) {
    ConvertTo-Json -InputObject (, $filters) -Depth 8 -Compress
  } else {
    ConvertTo-Json -InputObject $filters -Depth 8 -Compress
  }
  $encoded = [uri]::EscapeDataString($json)
  return (Invoke-Frappe "GET" "$(Resource-Path $doctype)?filters=$encoded&limit_page_length=$limit").data
}

function Create-Doc([string]$doctype, [hashtable]$document) {
  $result = (Invoke-Frappe "POST" (Resource-Path $doctype) $document).data
  $created.Add([pscustomobject]@{ Doctype = $doctype; Name = $result.name; Submitted = $false })
  return $result
}

function Submit-Doc([string]$doctype, [string]$name) {
  $doc = (Invoke-Frappe "GET" (Resource-Path $doctype $name)).data
  $doc.doctype = $doctype
  $result = (Invoke-Frappe "POST" "/api/v1/method/frappe.client.submit" @{ doc = $doc }).message
  ($created | Where-Object { $_.Doctype -eq $doctype -and $_.Name -eq $name }).Submitted = $true
  return $result
}

function Query-Native([string]$doctype, [string]$q) {
  return (Invoke-Frappe "POST" "/api/v1/method/amni_bridge.api.query_native_records" @{ doctype = $doctype; q = $q; page_length = 5 }).message
}

$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$today = (Get-Date).ToString("yyyy-MM-dd")

try {
  $company = (List-Docs "Company" @() 1)[0]
  $customerGroup = (List-Docs "Customer Group" @(@("is_group", "=", 0)) 1)[0]
  $territory = (List-Docs "Territory" @(@("is_group", "=", 0)) 1)[0]
  $supplierGroup = (List-Docs "Supplier Group" @(@("is_group", "=", 0)) 1)[0]
  $itemGroup = (List-Docs "Item Group" @(@("is_group", "=", 0)) 1)[0]
  $receivable = (List-Docs "Account" @(@("company", "=", $company.name), @("account_type", "=", "Receivable"), @("is_group", "=", 0)) 1)[0]
  $payable = (List-Docs "Account" @(@("company", "=", $company.name), @("account_type", "=", "Payable"), @("is_group", "=", 0)) 1)[0]
  $cash = (List-Docs "Account" @(@("company", "=", $company.name), @("account_type", "=", "Cash"), @("is_group", "=", 0)) 1)[0]
  if (-not $company -or -not $customerGroup -or -not $territory -or -not $supplierGroup -or -not $itemGroup -or -not $receivable -or -not $payable -or -not $cash) {
    throw "The clean ERP company is missing required standard master data."
  }

  $customer = Create-Doc "Customer" @{ customer_name = "Gate Customer $suffix"; customer_type = "Company"; customer_group = $customerGroup.name; territory = $territory.name }
  $supplier = Create-Doc "Supplier" @{ supplier_name = "Gate Supplier $suffix"; supplier_group = $supplierGroup.name; supplier_type = "Company" }
  $item = Create-Doc "Item" @{ item_code = "GATE-$suffix"; item_name = "Gate Service $suffix"; item_group = $itemGroup.name; stock_uom = "Nos"; is_stock_item = 0; is_sales_item = 1; is_purchase_item = 1 }

  $salesOrder = Create-Doc "Sales Order" @{ company = $company.name; customer = $customer.name; transaction_date = $today; delivery_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd"); items = @(@{ item_code = $item.name; qty = 2; rate = 125; delivery_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd") }) }
  $salesOrder = Submit-Doc "Sales Order" $salesOrder.name
  $salesInvoice = Create-Doc "Sales Invoice" @{ company = $company.name; customer = $customer.name; posting_date = $today; due_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd"); items = @(@{ item_code = $item.name; qty = 2; rate = 125 }) }
  $salesInvoice = Submit-Doc "Sales Invoice" $salesInvoice.name
  $salesPayment = Create-Doc "Payment Entry" @{ company = $company.name; payment_type = "Receive"; party_type = "Customer"; party = $customer.name; posting_date = $today; paid_from = $receivable.name; paid_to = $cash.name; paid_amount = 250; received_amount = 250; references = @(@{ reference_doctype = "Sales Invoice"; reference_name = $salesInvoice.name; total_amount = $salesInvoice.grand_total; outstanding_amount = $salesInvoice.outstanding_amount; allocated_amount = 250 }) }
  $salesPayment = Submit-Doc "Payment Entry" $salesPayment.name

  $purchaseOrder = Create-Doc "Purchase Order" @{ company = $company.name; supplier = $supplier.name; transaction_date = $today; schedule_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd"); items = @(@{ item_code = $item.name; qty = 3; rate = 60; schedule_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd") }) }
  $purchaseOrder = Submit-Doc "Purchase Order" $purchaseOrder.name
  $purchaseInvoice = Create-Doc "Purchase Invoice" @{ company = $company.name; supplier = $supplier.name; posting_date = $today; due_date = (Get-Date).AddDays(7).ToString("yyyy-MM-dd"); items = @(@{ item_code = $item.name; qty = 3; rate = 60 }) }
  $purchaseInvoice = Submit-Doc "Purchase Invoice" $purchaseInvoice.name
  $purchasePayment = Create-Doc "Payment Entry" @{ company = $company.name; payment_type = "Pay"; party_type = "Supplier"; party = $supplier.name; posting_date = $today; paid_from = $cash.name; paid_to = $payable.name; paid_amount = 180; received_amount = 180; references = @(@{ reference_doctype = "Purchase Invoice"; reference_name = $purchaseInvoice.name; total_amount = $purchaseInvoice.grand_total; outstanding_amount = $purchaseInvoice.outstanding_amount; allocated_amount = 180 }) }
  $purchasePayment = Submit-Doc "Payment Entry" $purchasePayment.name

  $crm = Create-Doc "Amni CRM Record" @{ record_type = "organization"; record_code = "ORG-$suffix"; title = "Gate Organization $suffix"; status = "prospect"; search_text = "ORG-$suffix Gate Organization"; payload = (@{ code = "ORG-$suffix"; name = "Gate Organization $suffix"; status = "prospect" } | ConvertTo-Json -Compress) }
  $domain = Create-Doc "Amni Domain Record" @{ record_key = "equity:shareholder:SH-$suffix"; domain = "equity"; record_type = "shareholder"; record_code = "SH-$suffix"; title = "Gate Shareholder $suffix"; numeric_value = 100; search_text = "SH-$suffix Gate Shareholder"; payload = (@{ code = "SH-$suffix"; name = "Gate Shareholder $suffix"; totalShares = 100 } | ConvertTo-Json -Compress) }

  foreach ($check in @(
    @{ Doctype = "Customer"; Query = $customer.name },
    @{ Doctype = "Supplier"; Query = $supplier.name },
    @{ Doctype = "Item"; Query = $item.name },
    @{ Doctype = "Sales Order"; Query = $salesOrder.name },
    @{ Doctype = "Sales Invoice"; Query = $salesInvoice.name },
    @{ Doctype = "Purchase Order"; Query = $purchaseOrder.name },
    @{ Doctype = "Purchase Invoice"; Query = $purchaseInvoice.name },
    @{ Doctype = "Payment Entry"; Query = $salesPayment.name }
  )) {
    $result = Query-Native $check.Doctype $check.Query
    if ($result.total -lt 1) { throw "Bounded query did not find $($check.Doctype) $($check.Query)." }
  }

  if ($RestartBackend) {
    & docker restart $BackendContainer | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not restart the ERP backend." }
    $deadline = (Get-Date).AddSeconds(90)
    do {
      Start-Sleep -Seconds 2
      try {
        $identity = (Invoke-Frappe "POST" "/api/v1/method/frappe.auth.get_logged_user").message
        $ready = [bool]$identity
      } catch { $ready = $false }
    } until ($ready -or (Get-Date) -gt $deadline)
    if (-not $ready) { throw "Frappe did not recover after backend restart." }
  }

  foreach ($document in @($salesOrder, $salesInvoice, $salesPayment, $purchaseOrder, $purchaseInvoice, $purchasePayment, $crm, $domain)) {
    $persisted = (Invoke-Frappe "GET" (Resource-Path $document.doctype $document.name)).data
    if ($persisted.name -ne $document.name) { throw "$($document.doctype) $($document.name) was not durable." }
  }

  [pscustomobject]@{
    SalesOrder = $salesOrder.name
    SalesInvoice = $salesInvoice.name
    SalesPayment = $salesPayment.name
    PurchaseOrder = $purchaseOrder.name
    PurchaseInvoice = $purchaseInvoice.name
    PurchasePayment = $purchasePayment.name
    CrmRecord = $crm.name
    DomainRecord = $domain.name
    RestartVerified = [bool]$RestartBackend
    Result = "PASS"
  } | ConvertTo-Json -Compress
}
finally {
  $cleanup = $created.ToArray()
  [array]::Reverse($cleanup)
  foreach ($document in $cleanup) {
    try {
      if ($document.Submitted) { Invoke-Frappe "POST" "/api/v1/method/frappe.client.cancel" @{ doctype = $document.Doctype; name = $document.Name } | Out-Null }
      Invoke-Frappe "DELETE" (Resource-Path $document.Doctype $document.Name) | Out-Null
    } catch {
      Write-Warning "Could not remove gate fixture $($document.Doctype) $($document.Name): $($_.Exception.Message)"
    }
  }
}
