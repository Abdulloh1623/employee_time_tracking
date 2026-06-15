# =====================================================================
#  TimeGate - DEV status (nima ishlab turibdi)
#     pwsh -ExecutionPolicy Bypass -File scripts\dev-status.ps1
# =====================================================================
param(
  [int]$BackendPort = 8088,
  [int]$WebPort = 5173,
  [int]$MetroPort = 8081,
  [int]$DbPort = 5544,
  [string]$DbName = "timegate-dev-db"
)

function Test-Port([int]$p) { [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) }
function Mark([bool]$ok) { if ($ok) { "[OK] ishlayapti" } else { "[off] o'chiq" } }

Write-Host "=== TimeGate holati ===" -ForegroundColor Cyan
Write-Host ("  Backend  :{0}  {1}" -f $BackendPort, (Mark (Test-Port $BackendPort)))
Write-Host ("  Web      :{0}  {1}" -f $WebPort, (Mark (Test-Port $WebPort)))
Write-Host ("  Mobile   :{0}  {1}" -f $MetroPort, (Mark (Test-Port $MetroPort)))

$db = docker ps --filter "name=$DbName" --format "{{.Status}}" 2>$null
Write-Host ("  DB       :{0}  {1}" -f $DbPort, $(if ($db) { "[OK] $db" } else { "[off] o'chiq" }))

# backend sog'lig'i
try {
  $r = Invoke-WebRequest -Uri "http://localhost:$BackendPort/swagger-ui.html" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
  Write-Host ("  Backend HTTP: {0}" -f $r.StatusCode) -ForegroundColor DarkGray
} catch { Write-Host "  Backend HTTP: javob yo'q" -ForegroundColor DarkGray }
