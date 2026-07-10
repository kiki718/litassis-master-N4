$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $Desktop "Literature Assistant.lnk"
$TargetPath = Join-Path $ProjectDir "start_literature_assistant.bat"
$IconPath = Join-Path $ProjectDir "literature_assistant.ico"

$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $ProjectDir
$Shortcut.Description = "Start Literature Assistant"
if (Test-Path $IconPath) {
  $Shortcut.IconLocation = $IconPath
} else {
  $Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,167"
}
$Shortcut.Save()

Write-Host "Created desktop shortcut: $ShortcutPath"
