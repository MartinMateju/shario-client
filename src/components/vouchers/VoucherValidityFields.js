"use client";

import { useTranslations } from "next-intl";
import {
  workspaceInputClass,
  workspaceLabelClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import { VOUCHER_MONTH_PRESETS } from "./voucherValidity.mjs";

export default function VoucherValidityFields({ form, updateField, disabled }) {
  const t = useTranslations("VoucherFoundation");
  return (
    <fieldset
      disabled={disabled}
      className="rounded-[15px] border border-line bg-sand-50/60 p-4 sm:col-span-2"
    >
      <legend className="px-1 text-sm font-semibold text-ink">
        {t("validity.title")}
      </legend>
      <p className="mb-4 text-sm leading-5 text-ink-muted">
        {t("validity.help")}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={workspaceLabelClass}>
          {t("validity.period")}
          <select
            value={form.voucherValidityChoice}
            onChange={(event) =>
              updateField("voucherValidityChoice", event.target.value)
            }
            className={workspaceInputClass}
          >
            {VOUCHER_MONTH_PRESETS.map((months) => (
              <option key={months} value={String(months)}>
                {t("validity.months", { count: months })}
              </option>
            ))}
            <option value="custom">{t("validity.customMonths")}</option>
            <option value="date">{t("validity.fixedDate")}</option>
            <option value="none">{t("validity.noExpiry")}</option>
          </select>
        </label>
        {form.voucherValidityChoice === "custom" && (
          <label className={workspaceLabelClass}>
            {t("validity.monthCount")}
            <input
              type="number"
              min="1"
              max="120"
              step="1"
              required
              value={form.voucherValidityMonths}
              onChange={(event) =>
                updateField("voucherValidityMonths", event.target.value)
              }
              className={workspaceInputClass}
            />
          </label>
        )}
        {form.voucherValidityChoice === "date" && (
          <label className={workspaceLabelClass}>
            {t("validity.date")}
            <input
              type="date"
              required
              value={form.voucherValidityDate}
              onChange={(event) =>
                updateField("voucherValidityDate", event.target.value)
              }
              className={workspaceInputClass}
            />
          </label>
        )}
      </div>
      {form.voucherValidityChoice === "date" && (
        <p className="mt-3 text-sm text-ink-muted">{t("validity.dateHelp")}</p>
      )}
      {form.voucherValidityChoice === "none" && (
        <p className="mt-3 text-sm text-ink-muted">{t("validity.noneHelp")}</p>
      )}
    </fieldset>
  );
}
