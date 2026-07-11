@echo off
setlocal
cd /d "%~dp0"

set "MINERU_DOWNLOADER=%~dp0.mineru-venv\Scripts\mineru-models-download.exe"

if not exist "%MINERU_DOWNLOADER%" (
  echo MinerU model downloader was not found.
  echo Expected: "%MINERU_DOWNLOADER%"
  echo Please install MinerU first, then run this script again.
  pause
  exit /b 1
)

echo Downloading MinerU models before starting the app...
echo Source: modelscope
echo Model type: pipeline
echo.

"%MINERU_DOWNLOADER%" -s modelscope -m pipeline

if errorlevel 1 (
  echo.
  echo MinerU model download failed.
  pause
  exit /b 1
)

echo.
echo MinerU model download finished.
pause
endlocal
