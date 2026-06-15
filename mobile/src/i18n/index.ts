import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uz from "./locales/uz";
import ru from "./locales/ru";
import en from "./locales/en";

const LANG_KEY = "tg_lang";

export const LANGS: { code: string; label: string }[] = [
  { code: "uz", label: "O'zbekcha" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
];

i18n.use(initReactI18next).init({
  resources: {
    uz: { translation: uz },
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: "uz",
  fallbackLng: "uz",
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  compatibilityJSON: "v3",
});

// Restore the persisted language (async).
AsyncStorage.getItem(LANG_KEY).then((v) => {
  if (v && v !== i18n.language) i18n.changeLanguage(v);
});

export async function setLanguage(lng: string): Promise<void> {
  await AsyncStorage.setItem(LANG_KEY, lng);
  await i18n.changeLanguage(lng);
}

export default i18n;
