import Cookies from "js-cookie";

import { normalizeLegacyLanguage } from "@/i18n/locales";

export const LANGUAGE_COOKIE_NAME = "shario_language";

/**
 * Check if we're running on the client side
 * @returns {boolean}
 */
const isClient = () => typeof window !== "undefined";

/**
 * Get language from cookie
 * @returns {string} Language code (CZ or EN)
 */
export const getLanguageFromCookie = () => {
  if (!isClient()) return "CZ"; // Server-side default

  try {
    const savedLanguage = Cookies.get(LANGUAGE_COOKIE_NAME);
    return normalizeLegacyLanguage(savedLanguage);
  } catch (error) {
    console.warn("Error reading language from cookie:", error);
    return "CZ";
  }
};

/**
 * Save language to cookie
 * @param {string} language - Language code (CZ or EN)
 */
export const saveLanguageToCookie = (language) => {
  if (!isClient()) return;

  if (!language) {
    console.warn("Invalid language code:", language);
    return;
  }

  const legacyLanguage = normalizeLegacyLanguage(language, null);

  if (!legacyLanguage) {
    console.warn("Invalid language code:", language);
    return;
  }

  try {
    Cookies.set(LANGUAGE_COOKIE_NAME, legacyLanguage, {
      expires: 365, // Cookie expires in 1 year
      sameSite: "lax", // Security setting
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
    });
  } catch (error) {
    console.error("Error saving language to cookie:", error);
  }
};

/**
 * Remove language cookie
 */
export const removeLanguageCookie = () => {
  if (!isClient()) return;

  try {
    Cookies.remove(LANGUAGE_COOKIE_NAME);
  } catch (error) {
    console.error("Error removing language cookie:", error);
  }
};
