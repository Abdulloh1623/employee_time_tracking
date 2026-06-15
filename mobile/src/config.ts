// Backend API base URL.
//
// In development (Expo Go) the phone talks to the computer that is running Metro.
// We AUTO-DETECT that computer's LAN IP from the Metro bundle URL, so you normally
// do NOT need to edit anything here. Just make sure that:
//   1) the phone and the computer are on the SAME Wi-Fi network, and
//   2) the backend is running on the same computer (port 8088).
//
// Only if auto-detection fails (for example a standalone production build) the
// FALLBACK_HOST below is used; set it to your computer's Wi-Fi IPv4 if needed
// (find it on Windows with `ipconfig` -> "Wi-Fi ... IPv4 Address").
import { NativeModules } from "react-native";

const BACKEND_PORT = 8088;
const FALLBACK_HOST = "192.168.100.135";

function detectHost(): string {
  // Metro serves the bundle from e.g. "http://192.168.1.50:8081/index.bundle?..."
  const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
  if (scriptURL) {
    const m = scriptURL.match(/^https?:\/\/([^/:]+)/);
    if (m && m[1] && m[1] !== "localhost" && m[1] !== "127.0.0.1") {
      return m[1];
    }
  }
  return FALLBACK_HOST;
}

export const API_BASE_URL = `http://${detectHost()}:${BACKEND_PORT}/api/v1`;

export const APP_NAME = "TimeGate";

