param(
  [int]$Port = 3000,
  [string]$SerialBaseUrl = "http://localhost:3000/api/serial",
  [string]$AuthToken
)

$connections = netstat -ano | Select-String ":$Port\s+.*LISTENING" | ForEach-Object {
  ($_ -split '\s+')[-1]
}

if (-not $connections) {
  Write-Output "No processes listening on port $Port."
  exit 0
}

$uniquePids = $connections | Sort-Object -Unique

foreach ($targetPid in $uniquePids) {
  try {
    Write-Output "Stopping process with PID $targetPid on port $Port..."
    Stop-Process -Id $targetPid -Force -ErrorAction Stop
  } catch {
    Write-Warning ("Failed to stop PID {0}: {1}" -f $targetPid, $_)
  }
}

Write-Output "Finished processing port $Port."

function Invoke-SerialEndpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Path
  )
  $url = "$SerialBaseUrl/$Path"
  $headers = @{}
  if ($AuthToken) {
    $headers['Authorization'] = "Bearer $AuthToken"
  }
  try {
    Write-Output "Calling serial endpoint $url"
    Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ErrorAction Stop | Out-Null
    Write-Output "Serial $Path succeeded."
  } catch {
    Write-Warning ("Serial endpoint {0} failed: {1}" -f $url, $_)
  }
}

Invoke-SerialEndpoint -Path 'disconnect'
Start-Sleep -Seconds 2
Invoke-SerialEndpoint -Path 'connect'
