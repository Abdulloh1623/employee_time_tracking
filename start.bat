@echo off
REM TimeGate'ni ishga tushirish (DB + backend + web + mobile). Ikki marta bosing.
setlocal
set "SCRIPT=%~dp0scripts\dev-start.ps1"
where pwsh >nul 2>nul
if %errorlevel%==0 (
  pwsh -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT%" %*
) else (
  powershell -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT%" %*
)
echo.
pause
