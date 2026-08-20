param(
  [Parameter(Mandatory = $true)][uri[]]$Urls,
  [int]$RequestsPerUrl = 100,
  [int]$Concurrency = 10,
  [int]$P95LimitMs = 1500,
  [double]$ErrorRateLimit = 0.01
)

$ErrorActionPreference = "Stop"
if ($RequestsPerUrl -lt 1 -or $Concurrency -lt 1 -or $Concurrency -gt 100) { throw "Invalid load parameters" }
$handler = [Net.Http.SocketsHttpHandler]::new()
$handler.MaxConnectionsPerServer = $Concurrency
$client = [Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds(30)
$results = [System.Collections.Concurrent.ConcurrentBag[object]]::new()
$gate = [Threading.SemaphoreSlim]::new($Concurrency)
$tasks = foreach ($url in $Urls) {
  for ($i = 0; $i -lt $RequestsPerUrl; $i++) {
    $gate.Wait()
    $client.GetAsync($url).ContinueWith({
      param($task)
      $watch = $task.AsyncState.Watch
      try {
        $response = $task.GetAwaiter().GetResult()
        $task.AsyncState.Results.Add([pscustomobject]@{ ok = $response.IsSuccessStatusCode; ms = $watch.ElapsedMilliseconds; url = $task.AsyncState.Url })
      } catch {
        $task.AsyncState.Results.Add([pscustomobject]@{ ok = $false; ms = $watch.ElapsedMilliseconds; url = $task.AsyncState.Url })
      } finally { $task.AsyncState.Gate.Release() | Out-Null }
    }, @{ Watch = [Diagnostics.Stopwatch]::StartNew(); Results = $results; Url = $url.ToString(); Gate = $gate })
  }
}
[Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]$tasks)
$ordered = @($results | Sort-Object ms)
$p95Index = [Math]::Max(0, [Math]::Ceiling($ordered.Count * 0.95) - 1)
$p95 = $ordered[$p95Index].ms
$errors = @($ordered | Where-Object { -not $_.ok }).Count
$errorRate = $errors / $ordered.Count
[ordered]@{ requests = $ordered.Count; concurrency = $Concurrency; errors = $errors; errorRate = $errorRate; p95Ms = $p95; pass = ($p95 -le $P95LimitMs -and $errorRate -le $ErrorRateLimit) } | ConvertTo-Json
if ($p95 -gt $P95LimitMs -or $errorRate -gt $ErrorRateLimit) { exit 1 }
