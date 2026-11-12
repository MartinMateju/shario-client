"use client";

import { useLayoutEffect } from "react";
import { useLocale } from "next-intl";
import { useDispatch, useSelector } from "react-redux";

import { getLegacyLanguageForLocale } from "@/i18n/locales";
import {
  selectCurrentLanguage,
  updateLanguage,
} from "@/lib/features/language/languageSlice";
import { saveLanguageToCookie } from "@/utils/cookieUtils";

/**
 * Keeps the remaining CZ/EN Redux consumers aligned with the canonical route.
 * Locales without a legacy catalog intentionally use English.
 */
export default function LegacyLocaleSync() {
  const locale = useLocale();
  const dispatch = useDispatch();
  const legacyLanguage = useSelector(selectCurrentLanguage);
  const targetLanguage = getLegacyLanguageForLocale(locale);

  useLayoutEffect(() => {
    if (legacyLanguage !== targetLanguage) {
      dispatch(updateLanguage(targetLanguage));
    }

    saveLanguageToCookie(targetLanguage);
  }, [dispatch, legacyLanguage, targetLanguage]);

  return null;
}
