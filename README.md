# TimeGate — QR Davomat va Ish Haqi Boshqaruv Tizimi

QR-kod asosida xodimlar davomati va ish haqini boshqaruvchi tizim. Monorepo: **Java (Spring Boot) backend + React (Vite) admin veb + (keyinroq) React Native mobil**.

QR-based Attendance & Payroll Management System. Monorepo: Spring Boot backend + React admin web + (later) React Native mobile.

---

## 📁 Tuzilma / Structure

```
timegate/
├─ backend/      # Spring Boot REST API (Java 17, PostgreSQL, JWT, Flyway, Swagger)
├─ web/          # React + Vite + TypeScript admin panel
├─ mobile/       # React Native + Expo (keyingi bosqich / next phase)
├─ docker-compose.yml   # PostgreSQL + Adminer
└─ .env.example
```

## 🧱 Texnologiyalar / Tech stack

| Qatlam | Texnologiya |
|--------|-------------|
| Backend | Java 17, Spring Boot 3.3, Spring Security (JWT), Spring Data JPA, Flyway, springdoc-openapi |
| Ma'lumotlar bazasi | PostgreSQL 16 |
| Frontend | React 18, Vite 5, TypeScript, React Router, Axios |
| Mobil (keyin) | React Native + Expo |

## ✅ Talablar / Prerequisites

- **JDK 17** (backend uchun — Spring Boot 3.3 LTS)
- **Node.js 18+** (frontend uchun)
- **Docker** (PostgreSQL uchun; yoki o'zingizning Postgres'ingiz)

---

## 🚀 Ishga tushirish / Quick start

### 1) Ma'lumotlar bazasi / Database
```bash
cd timegate
docker compose up -d db
# Adminer UI (ixtiyoriy): http://localhost:8081  (server: db, user/pass: timegate)
```

### 2) Backend (port 8080)
```bash
cd backend
# Windows:
mvnw.cmd spring-boot:run
# Linux/macOS:
./mvnw spring-boot:run
```
Flyway avtomatik ravishda sxema (V1) va namuna ma'lumotlarni (V2) yuklaydi.
- API: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/swagger-ui.html`

> JAVA_HOME JDK 17 ga ishora qilishi kerak. Maven Wrapper (`mvnw`) Maven'ni avtomatik yuklaydi.

### 3) Frontend (port 5173)
```bash
cd web
npm install
npm run dev
# Brauzer: http://localhost:5173
```

### 🔑 Demo hisoblar / Demo accounts
| Login | Parol | Rol |
|-------|-------|-----|
| `admin` | `admin123` | super_admin |
| `hr` | `hr12345` | hr_manager |

> ⚠️ Ishlab chiqarishda (production) bu parollarni albatta o'zgartiring.

---

## 🔌 Asosiy endpoint'lar / Key endpoints

| Metod | Yo'l | Tavsif |
|-------|------|--------|
| POST | `/api/v1/auth/login` | Tizimga kirish (JWT) |
| POST | `/api/v1/auth/refresh` | Tokenni yangilash |
| GET | `/api/v1/auth/me` | Joriy foydalanuvchi |
| GET/POST | `/api/v1/employees` | Xodimlar ro'yxati / qo'shish |
| GET/PUT/DELETE | `/api/v1/employees/{id}` | Ko'rish / yangilash / faolsizlantirish |
| GET/POST | `/api/v1/departments` | Bo'limlar |
| GET/POST | `/api/v1/positions` | Lavozimlar |
| GET/POST | `/api/v1/shifts` | Smenalar |
| POST | `/api/v1/attendance/scan` | QR skan (check-in/out) |
| GET | `/api/v1/attendance` | Davomat (sana oralig'i) |
| GET/POST | `/api/v1/payroll/periods` | Ish haqi davrlari |
| POST | `/api/v1/payroll/periods/{id}/calculate` | Davrni hisoblash |
| POST | `/api/v1/payroll/periods/{id}/close` | Davrni yopish (qulflash) |
| GET | `/api/v1/payrolls?periodId=` | Davr ish haqi ro'yxati |
| GET | `/api/v1/payrolls/{id}` | Payslip (tuzatmalar bilan) |
| POST | `/api/v1/payrolls/{id}/adjustments` | Qo'lda bonus/jarima |
| GET/POST | `/api/v1/leave-requests` | Ta'til so'rovlari |
| POST | `/api/v1/leave-requests/{id}/decision` | Tasdiqlash/rad etish |
| GET | `/api/v1/employees/{id}/leave-balances` | Ta'til balansi |
| GET | `/api/v1/notifications` | Bildirishnomalar (mening) |
| POST | `/api/v1/notifications/{id}/read` | O'qilgan deb belgilash |
| GET | `/api/v1/reports/attendance?format=json\|xlsx\|pdf` | Davomat hisoboti |
| GET | `/api/v1/reports/payroll?periodId=&format=xlsx\|pdf` | Ish haqi vedomosti |

To'liq spetsifikatsiya: ildizdagi `openapi.yaml` va Swagger UI.

### QR skan namunasi / Scan example
```bash
curl -X POST http://localhost:8080/api/v1/attendance/scan \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qrToken":"TGV-emp001","deviceId":"kiosk-001"}'
```

---

## 🏗️ Arxitektura qarorlari / Architecture notes

- **Xavfsizlik:** JWT Bearer (access + refresh), `BCrypt` parol xeshlash, rollarga asoslangan ruxsatlar (`@PreAuthorize` + `permission` authority).
- **Sxema egasi Flyway:** JPA `ddl-auto=none`; barcha jadvallar `db/migration` ichidagi migratsiyalardan yaratiladi. ER/DDL hujjatdagi sxemaga mos (Postgres ENUM'lar JPA qulayligi uchun `VARCHAR` ga moslangan).
- **Davomat mantig'i:** `attendance_events` — har bir xom QR skan; `attendance` — kunlik yig'ma (kelish/ketish, kechikish, overtime). Takroriy skan (60s ichida) rad etiladi.
- **CORS:** `http://localhost:5173` ga ruxsat (sozlanadi).

## 🧪 Testlar / Tests

**Backend** (JUnit 5 + Spring Boot Test + Testcontainers):
```bash
cd backend
./mvnw test      # unit testlar (tez): ExporterTest
./mvnw verify    # unit + integratsion (real PostgreSQL): BackendIT
```
- `*Test` — surefire (unit), `*IT` — failsafe (integration).
- Integratsion testlar real PostgreSQL bilan ishlaydi: CI'da Testcontainers avtomatik konteyner ko'taradi; lokalda `TG_IT_DB_URL` env orqali tashqi DB ko'rsatish mumkin.
- Qamrov: auth/JWT, RBAC (401), xodimlar, QR skan (+409 duplicate), ish haqi dvigateli (+idempotent qayta hisoblash), ta'til workflow (+balans).

**Frontend** (Vitest):
```bash
cd web
npm test         # src/utils/format.test.ts
```

## 🐳 To'liq stekni Docker'da ishga tushirish / Run full stack

```bash
docker compose -f docker-compose.full.yml up --build
# Web:  http://localhost:8088   ·   API: http://localhost:8088/api/v1
```
nginx SPA'ni xizmat qiladi va `/api` ni backend'ga proksi qiladi (bir manba — CORS shart emas).

## 🔄 CI/CD (GitHub Actions)

`.github/workflows/ci.yml` har push/PR'da uchta ishni bajaradi:
1. **backend-tests** — JDK 17, `./mvnw verify` (Testcontainers Docker socket orqali)
2. **frontend-tests** — Node 20, `npm ci && npm test && npm run build`
3. **docker-build** — backend va web Docker image'larini quradi (Dockerfile validatsiyasi)

## 🛣️ Keyingi bosqichlar / Next steps

- [x] Ish haqi moduli (hisoblash dvigateli, payslip, bonus/jarima) ✅
- [x] Ta'til so'rovlari workflow'i (so'rov → tasdiqlash → balans) ✅
- [x] Hisobot va eksport (Excel/PDF) ✅
- [x] Bildirishnomalar (in-app; SMS/Telegram ulanishga tayyor) ✅
- [x] Avtomatik testlar va CI/CD (JUnit + Testcontainers, Vitest, GitHub Actions, Docker) ✅
- [ ] Mobil ilova (React Native + Expo) — QR skaner

### Ish haqi moduli haqida / About the payroll module
- **Modellar:** `hourly` (soat × stavka), `fixed_monthly` (oylik), `per_shift` (smena × stavka), `mixed` (oylik + overtime).
- **Avto qoidalar (`payroll_rules`):** 0 kechikish → bonus; har bir kechikish daqiqasi → jarima. `fixed/percent/per_minute` summalar.
- **Qo'lda tuzatmalar:** bonus/jarima/ushlanma/avans — payslip ichida qo'shiladi.
- **Idempotent qayta hisoblash:** avto tuzatmalar yangilanadi, qo'lda kiritilganlari saqlanadi.
- **Davrni yopish:** yozuvlar `approved` holatiga o'tib qulflanadi; keyingi o'zgartirish `409`.

---

© 2026 TimeGate. Diplom loyihasi / Diploma project.
