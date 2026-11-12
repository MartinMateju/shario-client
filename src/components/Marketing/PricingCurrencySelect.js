"use client";

import {
  getCurrencyOptions,
  PLATFORM_BILLING_CURRENCIES,
} from "@/config/currencies";

export default function PricingCurrencySelect({
  currency,
  onChange,
  locale,
  label,
  disabled = false,
}) {
  return (
    <select
      aria-label={label}
      className="min-h-12 max-w-full rounded-[4px] border border-[var(--studio-rule,#ddd)] bg-white px-3 pr-9 text-base text-[var(--studio-ink,#202824)] sm:text-sm"
      disabled={disabled}
      value={currency}
      onChange={(event) => onChange(event.target.value)}
    >
      {getCurrencyOptions(PLATFORM_BILLING_CURRENCIES, locale).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
