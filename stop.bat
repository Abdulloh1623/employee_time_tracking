@echo off
REM TimeGate'ni to'xtatish. Ikki marta bosing.
setlocal
set "SCRIPT=%~dp0scripts\dev-stop.ps1"
where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT%" %*
) else (
  powershell -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT%" %*
)
echo.
pause
