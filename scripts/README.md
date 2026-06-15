# TimeGate — ishga tushirish skriptlari

Butun tizimni (DB + Backend + Web + Mobile) **bitta buyruq** bilan ishga tushirish.

## Tez ishga tushirish

**Eng oson:** ildizdagi **`start.bat`** ni ikki marta bosing. To'xtatish — **`stop.bat`**.

Yoki terminalда (loyiha ildizi `timegate/`):

```powershell
pwsh -ExecutionPolicy Bypass -File scripts\dev-start.ps1      # hammasini ishga tushiradi
pwsh -ExecutionPolicy Bypass -File scripts\dev-stop.ps1       # hammasini to'xtatadi
pwsh -ExecutionPolicy Bypass -File scripts\dev-status.ps1     # holatni ko'rsatadi
```

Skript avtomatik:
- Postgres'ni Docker'да ko'taradi (`timegate-dev-db`, port **5544**)
- Backend (Spring Boot, **8088**), Web (Vite, **5173**), Mobile (Expo, **8081**) ni alohida oynalarда ishga tushiradi
- **LAN IP'ni o'zi aniqlaydi** va `mobile/src/config.ts` (API_BASE_URL) ni yangilaydi — telefon shu IP orqali ulanadi
- Portlar band bo'lsa, o'sha xizmatni qayta ishga tushirmaydi (xavfsiz qayta ishga tushirish)

## Kirish
- **Web:** http://localhost:5173 — `admin` / `admin123`
- **Mobile (Expo Go):** `exp://<LAN-IP>:8081` (skript chiqishida ko'rsatiladi)
  - `admin` / `admin123` → to'liq boshqaruv
  - `checker` / `checker123` → faqat QR skaner

## Parametrlar (ixtiyoriy)
```powershell
# Portlarni o'zgartirish, mobil/webсiz ishga tushirish, LAN IP'ni qo'lda berish:
pwsh -File scripts\dev-start.ps1 -BackendPort 9090 -NoMobile
pwsh -File scripts\dev-start.ps1 -LanIp 192.168.1.50
pwsh -File scripts\dev-stop.ps1 -RemoveDb        # DB konteynerini butunlay o'chirish
```

## Talablar
- **Docker Desktop** (Postgres uchun) — ochiq bo'lishi kerak
- **JDK 17** (`JAVA_HOME` yoki `C:\Program Files\Java\jdk-17`)
- **Node.js** (web/mobile uchun)
- Birinchi ishga tushirishда `node_modules` bo'lmasa, skript `npm install` ni o'zi bajaradi

## Telefon ulanmasa (Network Error)
Windows Firewall portlarni bloklashi mumkin. **Admin** PowerShell'да bir marta:
```powershell
New-NetFirewallRule -DisplayName "TimeGate" -Direction Inbound -LocalPort 8081,8088 -Protocol TCP -Action Allow
```
Telefon va kompyuter **bir xil Wi-Fi**'da bo'lishi shart.
