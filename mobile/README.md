# TimeGate Mobile (React Native + Expo)

Xodimlar/kiosk uchun mobil ilova: **Login**, **QR skaner** (kelish/ketish), **Davomat**, **Profil**.
Backend bilan bir xil `/api/v1` (JWT Bearer).

## Telefonda ishga tushirish (Expo Go orqali — emulyator shart emas!)

1. Telefoningizga **Expo Go** ilovasini o'rnating (App Store / Play Market, bepul).
2. Telefon va kompyuter **bir xil Wi-Fi** tarmog'ida bo'lsin.
3. Backend ishlab tursin (`SERVER_PORT=8088`) va **kompyuterning LAN IP'sida** ochiq bo'lsin.
4. `mobile/src/config.ts` dagi `API_BASE_URL` ni kompyuteringiz Wi-Fi IPv4 manziliga sozlang
   (Windows: `ipconfig` → "Wi-Fi ... IPv4 Address"). Hozir: `http://10.40.1.105:8088/api/v1`.
5. Terminalда:
   ```bash
   cd timegate/mobile
   npm install
   npx expo start
   ```
6. Terminalда chiqgan **QR kodni Expo Go** bilan skanerlang (Android: Expo Go ichidagi skaner; iOS: Kamera ilovasi).
   Ilova telefoningizда ochiladi.
7. `admin` / `admin123` bilan kiring → **QR Skaner** tabida xodim QR kodini (yoki `TGV-emp002` ni qo'lda) skanerlang.

## Eslatmalar
- **Windows Firewall** 8088-portga kiruvchi ulanishni bloklashi mumkin — birinchi marta ruxsat bering
  (yoki: `New-NetFirewallRule -DisplayName "TimeGate 8088" -Direction Inbound -LocalPort 8088 -Protocol TCP -Action Allow`).
- Agar telefon ulanmasa: `npx expo start --tunnel` (sekinroq, lekin tarmoq cheklovlarini chetlab o'tadi).
- `localhost` mobil qurilmaда ISHLAMAYDI — har doim kompyuterning LAN IP'sini ishlating.

## Texnologiya
- Expo SDK 54, React Native 0.81, React 19, TypeScript
- `expo-camera` (QR skaner), `@react-navigation` v7 (stack + bottom tabs), `axios`, `AsyncStorage`

## Tuzilma
```
mobile/
  App.tsx                      # root: providers + navigation
  src/config.ts                # API_BASE_URL (LAN IP shu yerda)
  src/api/{client,auth,attendance}.ts
  src/auth/AuthContext.tsx
  src/navigation/RootNavigator.tsx
  src/screens/{Login,Scan,Attendance,Profile}Screen.tsx
```
