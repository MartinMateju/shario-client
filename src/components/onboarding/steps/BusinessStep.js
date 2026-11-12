"use client";

import { useLocale, useTranslations } from "next-intl";

import { FormField, Select } from "@/components/ui/form/FormField";
import { getCountryOptions, getTimeZoneOptions } from "@/config/regions";
import {
  getCurrencyOptions,
  STUDIO_COMMERCE_CURRENCIES,
} from "@/config/currencies";
import styles from "../onboarding.module.css";

export function BusinessStep({ errors = {}, form, setField }) {
  const locale = useLocale();
  const t = useTranslations("Onboarding");
  const currencyOptions = getCurrencyOptions(
    STUDIO_COMMERCE_CURRENCIES,
    locale,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3 [@media(max-height:800px)]:gap-3">
      <FormField
        className={styles.field}
        error={errors.country}
        label={t("business.country")}
        name="country"
      >
        <Select
          className={styles.control}
          value={form.country}
          onChange={(event) => setField("country", event.target.value)}
          autoComplete="country-name"
          required
        >
          <option value="" disabled>
            —
          </option>
          {getCountryOptions(locale, form.country).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        className={styles.field}
        error={errors.currency}
        label={t("business.currency")}
        name="currency"
      >
        <Select
          className={styles.control}
          value={form.currency}
          onChange={(event) => setField("currency", event.target.value)}
          required
        >
          {currencyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        className={`${styles.field} sm:col-span-2 2xl:col-span-1`}
        error={errors.timezone}
        label={t("business.timezone")}
        name="timezone"
      >
        <Select
          className={styles.control}
          value={form.timezone}
          onChange={(event) => setField("timezone", event.target.value)}
          required
        >
          {getTimeZoneOptions(form.timezone).map((timezone) => (
            <option key={timezone}>{timezone}</option>
          ))}
        </Select>
      </FormField>
    </div>
  );
}
