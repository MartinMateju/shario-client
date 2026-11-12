import {
  LOCALE_REGISTRY,
  ROLLOUT_ELIGIBLE_LOCALE_CODES,
  resolveRolloutEligibleLocaleCode,
} from "@/i18n/locales";

export const AI_SETTINGS_LOCALE_OPTIONS = ROLLOUT_ELIGIBLE_LOCALE_CODES.map(
  (code) => ({
    code,
    label: LOCALE_REGISTRY[code].nativeName,
  }),
);

export const resolveAiSettingsLocale = (value) =>
  resolveRolloutEligibleLocaleCode(value);
