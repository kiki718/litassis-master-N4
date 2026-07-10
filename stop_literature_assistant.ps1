param(
  [int]$Port = 5179
)

$Connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if (-not $Connections) {
  Write-Host "Literature Assistant is not running on port $Port."
  exit 0
}

$Connections | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
  $Process = Get-Process -Id $_ -ErrorAction SilentlyContinue
  if ($Process -and $Process.ProcessName -like "python*") {
    Stop-Process -Id $Process.Id -Force
    Write-Host "Stopped Literature Assistant. Process ID: $($Process.Id)"
  } else {
    Write-Host "Port $Port is owned by a non-Python process. Process ID: $_"
  }
}
