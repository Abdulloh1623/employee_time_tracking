import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

const KEY = "tg_biometric";
let enabled = false;

export async function loadBiometric(): Promise<void> {
  enabled = (await AsyncStorage.getItem(KEY)) === "1";
}
export function isBiometricEnabled(): boolean {
  return enabled;
}
export async function setBiometricEnabled(v: boolean): Promise<void> {
  enabled = v;
  await AsyncStorage.setItem(KEY, v ? "1" : "0");
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const hw = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hw && enrolled;
  } catch {
    return false;
  }
}

export async function authenticate(prompt: string): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      disableDeviceFallback: false,
    });
    return res.success;
  } catch {
    return false;
  }
}
