param(
  [ValidateSet("auto", "modelscope", "huggingface")]
  [string]$Source = "modelscope",

  [ValidateSet("pipeline", "vlm", "all")]
  [string]$ModelType = "pipeline"
)

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MinerUDownloader = Join-Path $ProjectDir ".mineru-venv\Scripts\mineru-models-download.exe"

if (-not (Test-Path $MinerUDownloader)) {
  Write-Host "MinerU model downloader was not found."
  Write-Host "Expected: $MinerUDownloader"
  Write-Host "Please install MinerU first, then run this script again."
  exit 1
}

$LogDir = Join-Path $ProjectDir "logs"
if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$OutLog = Join-Path $LogDir "mineru-models-download.out.log"
$ErrLog = Join-Path $LogDir "mineru-models-download.err.log"

Write-Host "Downloading MinerU models before starting the app..."
Write-Host "Source: $Source"
Write-Host "Model type: $ModelType"
Write-Host "Logs:"
Write-Host "  $OutLog"
Write-Host "  $ErrLog"
Write-Host ""

$TempOut = Join-Path ([System.IO.Path]::GetTempPath()) ("mineru-models-download-{0}.out.tmp" -f $PID)
$TempErr = Join-Path ([System.IO.Path]::GetTempPath()) ("mineru-models-download-{0}.err.tmp" -f $PID)

$Process = Start-Process `
  -FilePath $MinerUDownloader `
  -ArgumentList @("-s", $Source, "-m", $ModelType) `
  -WorkingDirectory $ProjectDir `
  -RedirectStandardOutput $TempOut `
  -RedirectStandardError $TempErr `
  -NoNewWindow `
  -Wait `
  -PassThru

$ExitCode = $Process.ExitCode

if (Test-Path $TempOut) {
  $OutText = Get-Content -Raw -Encoding UTF8 $TempOut
  if ($OutText) {
    Add-Content -Encoding UTF8 -Path $OutLog -Value $OutText
    Write-Host $OutText
  }
  Remove-Item -LiteralPath $TempOut -Force
}

if (Test-Path $TempErr) {
  $ErrText = Get-Content -Raw -Encoding UTF8 $TempErr
  if ($ErrText) {
    Add-Content -Encoding UTF8 -Path $ErrLog -Value $ErrText
    Write-Host $ErrText
  }
  Remove-Item -LiteralPath $TempErr -Force
}

if ($ExitCode -ne 0) {
  Write-Host "MinerU model download failed. Check logs\mineru-models-download.err.log."
  exit $ExitCode
}

Write-Host "MinerU model download finished."
