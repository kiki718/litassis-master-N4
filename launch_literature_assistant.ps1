param(
  [int]$Port = 5179
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Python = (Get-Command python -ErrorAction SilentlyContinue).Source

if (-not $Python) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("Python was not found. Please install Python 3.11 or later.", "Literature Assistant", "OK", "Error") | Out-Null
  exit 1
}

$ServerFile = Join-Path $ProjectDir "server.py"
if (-not (Test-Path $ServerFile)) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show("server.py was not found. Please check the project folder.", "Literature Assistant", "OK", "Error") | Out-Null
  exit 1
}

$Url = "http://127.0.0.1:$Port/index.html"
$Existing = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" } | Select-Object -First 1

if (-not $Existing) {
  $LogDir = Join-Path $ProjectDir "logs"
  if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
  }

  $OutLog = Join-Path $LogDir "desktop-launch.out.log"
  $ErrLog = Join-Path $LogDir "desktop-launch.err.log"

  Start-Process `
    -FilePath $Python `
    -ArgumentList @("server.py", "--port", $Port.ToString()) `
    -WorkingDirectory $ProjectDir `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog `
    -WindowStyle Hidden

  $Ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $Response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/api/status" -TimeoutSec 1
      if ($Response.StatusCode -eq 200) {
        $Ready = $true
        break
      }
    } catch {
      $Ready = $false
    }
  }

  if (-not $Ready) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show("The service did not start in time. Please check logs\desktop-launch.err.log.", "Literature Assistant", "OK", "Warning") | Out-Null
    exit 1
  }
}

Start-Process $Url
