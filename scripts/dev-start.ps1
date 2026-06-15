# =====================================================================
#  TimeGate - DEV launcher
#  DB (Docker) + Backend (Spring Boot) + Web (Vite) + Mobile (Expo)
#  ni bitta buyruq bilan ishga tushiradi. LAN IP'ni o'zi aniqlaydi va
#  mobil config (src/config.ts) ni yangilaydi.
#
#  Ishlatish:
#     pwsh -ExecutionPolicy Bypass -File scripts\dev-start.ps1
#  yoki ildizdagi start.bat ni ikki marta bosing.
# =====================================================================
[CmdletBinding()]
param(
  [int]$DbPort = 5544,
  [int]$BackendPort = 8088,
  [int]$WebPort = 5173,
  [int]$MetroPort = 8081,
  [string]$LanIp = "",          # bo'sh = avtomatik aniqlash
  [switch]$NoMobile,            # mobil (Expo) ni ishga tushirmaslik
  [switch]$NoWeb                # web (Vite) ni ishga tushirmaslik
)

$ErrorActionPreference = "Stop"
$Root      = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "backend"
$WebDir     = Join-Path $Root "web"
$MobileDir  = Join-Path $Root "mobile"
$DbName     = "timegate-dev-db"

$psExe = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }

# ---- JDK 17 ----
$JdkHome = $env:JAVA_HOME
if (-not $JdkHome -or -not (Test-Path (Join-Path $JdkHome "bin\java.exe"))) {
  $JdkHome = "C:\Program Files\Java\jdk-17"
}
if (-not (Test-Path (Join-Path $JdkHome "bin\java.exe"))) {
  Write-Host "XATO: JDK 17 topilmadi. JAVA_HOME ni o'rnating yoki C:\Program Files\Java\jdk-17 ga joylashtiring." -ForegroundColor Red
  exit 1
}

# ---- Maven (yuklab olingan, yoki wrapper) ----
$Maven = if (Test-Path "D:\Projects\DiplomIshi\tools\apache-maven-3.9.9\bin\mvn.cmd") {
  "D:\Projects\DiplomIshi\tools\apache-maven-3.9.9\bin\mvn.cmd"
} elseif (Test-Path (Join-Path $BackendDir "mvnw.cmd")) {
  Join-Path $BackendDir "mvnw.cmd"
} else { "mvn" }

# ---- LAN IP avtomatik aniqlash (telefon shu IP orqali ulanadi) ----
function Get-LanIp {
  $p = Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.IPv4Connectivity -eq 'Internet' } | Select-Object -First 1
  if ($p) {
    $ip = (Get-NetIPAddress -InterfaceIndex $p.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
    if ($ip) { return $ip }
  }
  $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Wireless|WLAN' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1).IPAddress
  if ($ip) { return $ip }
  $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { ($_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*') -and $_.IPAddress -notlike '192.168.56.*' -and $_.IPAddress -notlike '26.*' } | Select-Object -First 1).IPAddress
  if ($ip) { return $ip }
  return '127.0.0.1'
}
if (-not $LanIp) { $LanIp = Get-LanIp }
Write-Host "LAN IP (mobil uchun): $LanIp" -ForegroundColor Cyan

# ---- Mobil config (API_BASE_URL) ni yangilash ----
$cfg = Join-Path $MobileDir "src\config.ts"
if (Test-Path $cfg) {
  $api = "http://${LanIp}:${BackendPort}/api/v1"
  (Get-Content $cfg -Raw) -replace 'API_BASE_URL = "http://[^"]*"', "API_BASE_URL = ""$api""" | Set-Content $cfg -Encoding utf8
  Write-Host "mobile/src/config.ts -> $api" -ForegroundColor DarkGray
}

# ---- Docker DB ----
Write-Host "`n[1/4] Postgres (Docker, :$DbPort)..." -ForegroundColor Yellow
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "      Docker ishlamayapti - Docker Desktop ishga tushirilmoqda..." -ForegroundColor DarkYellow
  $dd = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (Test-Path $dd) { Start-Process $dd } else { Write-Host "      (Docker Desktop.exe topilmadi - qo'lda oching)" -ForegroundColor DarkGray }
  $up = $false
  for ($i = 0; $i -lt 60; $i++) { Start-Sleep -Seconds 3; docker info 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { $up = $true; break } }
  if (-not $up) {
    Write-Host "XATO: Docker ishga tushmadi. Docker Desktop ni qo'lda oching va qaytadan urinib ko'ring." -ForegroundColor Red
    exit 1
  }
  Write-Host "      Docker tayyor." -ForegroundColor DarkGray
}
$exists = docker ps -a --filter "name=$DbName" --format "{{.Names}}"
if ($exists) {
  docker start $DbName | Out-Null
} else {
  docker run -d --name $DbName -p "${DbPort}:5432" -e POSTGRES_DB=timegate -e POSTGRES_USER=timegate -e POSTGRES_PASSWORD=timegate postgres:16-alpine | Out-Null
}
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  $r = docker exec $DbName pg_isready -U timegate 2>&1
  if ($r -match "accepting connections") { $ready = $true; break }
}
Write-Host ("      DB tayyor: {0}" -f $ready) -ForegroundColor DarkGray

# ---- env (yangi oynalar shu env'ni meros qilib oladi) ----
$env:JAVA_HOME   = $JdkHome
$env:DB_URL      = "jdbc:postgresql://localhost:$DbPort/timegate"
$env:DB_USER     = "timegate"
$env:DB_PASSWORD = "timegate"
$env:SERVER_PORT = "$BackendPort"
$env:CORS_ORIGINS = "http://localhost:$WebPort"
$env:VITE_API_TARGET = "http://localhost:$BackendPort"
$env:REACT_NATIVE_PACKAGER_HOSTNAME = $LanIp

function Start-Win([string]$title, [string]$dir, [string]$cmd) {
  $full = "`$host.UI.RawUI.WindowTitle='$title'; Write-Host '=== $title ===' -ForegroundColor Cyan; $cmd"
  Start-Process $psExe -ArgumentList "-NoExit", "-Command", $full -WorkingDirectory $dir | Out-Null
}
function Test-Port([int]$p) { [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue) }

# ---- Backend ----
Write-Host "[2/4] Backend (Spring Boot, :$BackendPort)..." -ForegroundColor Yellow
if (Test-Port $BackendPort) {
  Write-Host "      (allaqachon ishlayapti -> o'tkazib yuborildi)" -ForegroundColor DarkGray
} else {
  Start-Win "TimeGate Backend :$BackendPort" $BackendDir "& '$Maven' -f '$BackendDir\pom.xml' spring-boot:run"
}

# ---- Web ----
if (-not $NoWeb) {
  Write-Host "[3/4] Web (Vite, :$WebPort)..." -ForegroundColor Yellow
  if (Test-Port $WebPort) {
    Write-Host "      (allaqachon ishlayapti -> o'tkazib yuborildi)" -ForegroundColor DarkGray
  } elseif (-not (Test-Path (Join-Path $WebDir "node_modules"))) {
    Write-Host "      (web: node_modules yo'q -> npm install)" -ForegroundColor DarkGray
    Start-Win "TimeGate Web :$WebPort" $WebDir "npm install; npm run dev"
  } else {
    Start-Win "TimeGate Web :$WebPort" $WebDir "npm run dev"
  }
}

# ---- Mobile ----
if (-not $NoMobile) {
  Write-Host "[4/4] Mobile (Expo, :$MetroPort)..." -ForegroundColor Yellow
  if (Test-Port $MetroPort) {
    Write-Host "      (allaqachon ishlayapti -> o'tkazib yuborildi)" -ForegroundColor DarkGray
  } elseif (-not (Test-Path (Join-Path $MobileDir "node_modules"))) {
    Write-Host "      (mobile: node_modules yo'q -> npm install)" -ForegroundColor DarkGray
    Start-Win "TimeGate Mobile :$MetroPort" $MobileDir "npm install --legacy-peer-deps; npx expo start --lan"
  } else {
    Start-Win "TimeGate Mobile :$MetroPort" $MobileDir "npx expo start --lan"
  }
}

Write-Host "`n=====================================================" -ForegroundColor Green
Write-Host " TimeGate ishga tushdi!" -ForegroundColor Green
Write-Host "  Web      : http://localhost:$WebPort   (admin / admin123)" -ForegroundColor Green
Write-Host "  Backend  : http://localhost:$BackendPort/swagger-ui.html" -ForegroundColor Green
if (-not $NoMobile) {
  Write-Host "  Mobile   : Expo Go -> exp://${LanIp}:$MetroPort" -ForegroundColor Green
  Write-Host "             (checker / checker123  yoki  admin / admin123)" -ForegroundColor Green
}
Write-Host "  DB       : Postgres @ localhost:$DbPort (Docker: $DbName)" -ForegroundColor Green
Write-Host "-----------------------------------------------------" -ForegroundColor DarkGray
Write-Host " To'xtatish: scripts\dev-stop.ps1  (yoki stop.bat)" -ForegroundColor DarkGray
Write-Host " Telefon ulanmasa: Windows Firewall'da $MetroPort va $BackendPort portlariga ruxsat bering (admin):" -ForegroundColor DarkGray
Write-Host "   New-NetFirewallRule -DisplayName 'TimeGate' -Direction Inbound -LocalPort $MetroPort,$BackendPort -Protocol TCP -Action Allow" -ForegroundColor DarkGray
Write-Host "=====================================================" -ForegroundColor Green
