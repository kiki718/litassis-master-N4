$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $ProjectDir ".env"

$Key = Read-Host "Paste DEEPSEEK_API_KEY"
if (-not $Key) {
  Write-Host "No key entered. Nothing changed."
  exit 1
}

$BaseUrl = Read-Host "DeepSeek base URL [https://api.deepseek.com/chat/completions]"
if (-not $BaseUrl) {
  $BaseUrl = "https://api.deepseek.com/chat/completions"
}

$Lines = @()
if (Test-Path $EnvFile) {
  $Lines = Get-Content $EnvFile | Where-Object {
    $_ -notmatch '^DEEPSEEK_API_KEY=' -and $_ -notmatch '^DEEPSEEK_BASE_URL='
  }
}

$Lines += "DEEPSEEK_API_KEY=$Key"
$Lines += "DEEPSEEK_BASE_URL=$BaseUrl"
$Lines | Set-Content -Path $EnvFile -Encoding UTF8

Write-Host "Saved DeepSeek settings to .env"
Write-Host "Please restart Literature Assistant for the new key to take effect."
