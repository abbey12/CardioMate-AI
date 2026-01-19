import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

const LANGUAGE_STORAGE_KEY = "appLanguage";

function getInitialLanguage(): "en" | "fr" {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en" || stored === "fr") return stored;
  const locale = navigator.language?.toLowerCase() || "";
  if (locale.startsWith("fr")) return "fr";
  return "en";
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

document.documentElement.lang = i18n.language.startsWith("fr") ? "fr" : "en";

export function setAppLanguage(language: "en" | "fr"): void {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

export function getStoredLanguage(): "en" | "fr" | null {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en" || stored === "fr") return stored;
  return null;
}

export default i18n;


