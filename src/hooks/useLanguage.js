"use client";

import { useSelector } from "react-redux";

import { normalizeLegacyLanguage } from "@/i18n/locales";
import { usePathname, useRouter } from "@/i18n/navigation";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";

/**
 * Compatibility hook for the remaining CZ/EN consumers. Locale changes are
 * canonical URL changes; the shared locale bridge updates Redux and its
 * deprecated cookie from that route.
 * @returns {Object} Object containing current language and function to update it
 */
export const useLanguage = () => {
  const language = useSelector(selectCurrentLanguage);
  const pathname = usePathname();
  const router = useRouter();

  const setLanguage = (newLanguage) => {
    const legacyLanguage = normalizeLegacyLanguage(newLanguage, null);

    if (!legacyLanguage) return;

    router.replace(pathname || "/", {
      locale: legacyLanguage === "CZ" ? "cs" : "en",
      scroll: false,
    });
  };

  const toggleLanguage = () => {
    setLanguage(language === "CZ" ? "EN" : "CZ");
  };

  return {
    language,
    setLanguage,
    toggleLanguage,
  };
};
