# =====================================================================
#  TimeGate - DEV stop
#  Backend / Web / Mobile jarayonlarini va Postgres konteynerini to'xtatadi.
#     pwsh -ExecutionPolicy Bypass -File scripts\dev-stop.ps1
#  yoki ildizdagi stop.bat ni ikki marta bosing.
# =====================================================================
[CmdletBinding()]
param(
  [int]$BackendPort = 8088,
  [int]$WebPort = 5173,
  [int]$MetroPort = 8081,
  [string]$DbName = "timegate-dev-db",
  [switch]$RemoveDb   # konteynerni butunlay o'chirish (ma'lumotlar yo'qoladi)
)

function Stop-Port([int]$port, [string]$label) {
  $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($conns) {
    $conns.OwningProcess | Select-Object -Unique | ForEach-Object {
      try { Stop-Process -Id $_ -Force -ErrorAction Stop; Write-Host "  $label (:$port) to'xtatildi (PID $_)" -ForegroundColor DarkGray }
      catch {}
    }
  } else { Write-Host "  $label (:$port) ishlamayapti" -ForegroundColor DarkGray }
}

Write-Host "TimeGate to'xtatilmoqda..." -ForegroundColor Yellow
Stop-Port $BackendPort "Backend"
Stop-Port $WebPort "Web"
Stop-Port $MetroPort "Mobile/Metro"

# qoldiq node/java (timegate) jarayonlari
Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "timegate" -or $_.CommandLine -match "expo start" } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }
Get-CimInstance Win32_Process -Filter "Name='java.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "timegate" } |
  ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }

# Postgres konteyneri
if ($RemoveDb) {
  docker rm -f $DbName 2>$null | Out-Null
  Write-Host "  DB konteyner ($DbName) o'chirildi" -ForegroundColor DarkGray
} else {
  docker stop $DbName 2>$null | Out-Null
  Write-Host "  DB konteyner ($DbName) to'xtatildi (ma'lumotlar saqlandi)" -ForegroundColor DarkGray
}

Write-Host "Tayyor. Hammasi to'xtatildi." -ForegroundColor Green
Write-Host "(Eslatma: ochiq qolgan backend/web/mobil oynalarini qo'lda yopishingiz mumkin.)" -ForegroundColor DarkGray
