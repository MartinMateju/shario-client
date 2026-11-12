"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { COUNTRY_CODES, getCountryName } from "@/config/regions";
import { formatMinorCurrencyAmount } from "@/utils/money";
import { resolveIntlLocale } from "@/i18n/formatting";

export const EMPTY_VOUCHER_ADDRESS = {
  firstname: "",
  lastname: "",
  street: "",
  city: "",
  postalCode: "",
  countryCode: "",
};
export const isVoucherAddressValid = (address) =>
  Object.keys(EMPTY_VOUCHER_ADDRESS).every((key) =>
    String(address[key] || "").trim(),
  ) &&
  COUNTRY_CODES.includes(address.countryCode) &&
  address.countryCode !== "XK";
const fieldClass =
  "mt-2 min-h-12 w-full rounded-[14px] border border-[color:var(--tenant-border)] bg-transparent px-4 text-sm font-normal outline-none focus:border-[color:var(--tenant-accent-on-surface)] focus:ring-2 focus:ring-[var(--tenant-accent-on-surface)]/15";

export default function VoucherDeliveryChoice({
  enabled,
  postageFeeMinor,
  currency,
  physical,
  address,
  onPhysicalChange,
  onAddressChange,
  disabled,
}) {
  const t = useTranslations("PublicTenant.vouchers.postal");
  const locale = resolveIntlLocale(useLocale());
  const countries = useMemo(
    () =>
      COUNTRY_CODES.filter((code) => code !== "XK")
        .map((code) => ({ code, name: getCountryName(code, locale) }))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    [locale],
  );
  if (!enabled) return null;
  return (
    <fieldset
      disabled={disabled}
      className="mt-5 space-y-3 border-t border-[color:var(--tenant-border)] pt-4"
    >
      <legend className="px-1 text-sm font-semibold">{t("title")}</legend>
      {[false, true].map((option) => (
        <label
          key={String(option)}
          className="flex items-start gap-3 rounded-xl border border-[color:var(--tenant-border)] p-3 text-sm"
        >
          <input
            type="radio"
            name="voucher-delivery"
            checked={physical === option}
            onChange={() => onPhysicalChange(option)}
            className="mt-1"
          />
          <span>
            <span className="block font-semibold">
              {t(option ? "physical" : "digital")}
            </span>
            <span className="mt-1 block text-xs leading-5 text-[color:var(--tenant-muted-on-surface)]">
              {option
                ? t("postage", {
                    amount: formatMinorCurrencyAmount(
                      postageFeeMinor,
                      currency,
                      locale,
                    ),
                  })
                : t("digitalHelp")}
            </span>
          </span>
        </label>
      ))}
      {physical && (
        <p className="text-xs leading-5 text-[color:var(--tenant-muted-on-surface)]">
          {t("backup")}
        </p>
      )}
      {physical && (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["firstname", "given-name", 80],
            ["lastname", "family-name", 80],
            ["street", "street-address", 200],
            ["city", "address-level2", 120],
            ["postalCode", "postal-code", 40],
          ].map(([key, autocomplete, maxLength]) => (
            <label
              key={key}
              className={`text-sm font-semibold ${key === "street" ? "sm:col-span-2" : ""}`}
            >
              {t(key)}
              <input
                type="text"
                required
                maxLength={maxLength}
                autoComplete={`shipping ${autocomplete}`}
                value={address[key]}
                onChange={(event) => onAddressChange(key, event.target.value)}
                className={fieldClass}
                data-tenant-surface="field"
              />
            </label>
          ))}
          <label className="text-sm font-semibold">
            {t("country")}
            <select
              required
              autoComplete="shipping country"
              value={address.countryCode}
              onChange={(event) =>
                onAddressChange("countryCode", event.target.value)
              }
              className={`${fieldClass} pr-10`}
              data-tenant-surface="field"
            >
              <option value="">{t("chooseCountry")}</option>
              {countries.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </fieldset>
  );
}
