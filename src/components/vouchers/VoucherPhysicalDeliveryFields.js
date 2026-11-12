"use client";

import { useTranslations } from "next-intl";
import {
  workspaceInputClass,
  workspaceLabelClass,
} from "@/components/dashboard/WorkspaceFormSurface";
import { getMajorCurrencyInputStep } from "@/utils/money";

export default function VoucherPhysicalDeliveryFields({
  form,
  updateField,
  disabled,
}) {
  const t = useTranslations("VoucherFoundation.physicalDelivery");
  return (
    <fieldset
      disabled={disabled}
      className="rounded-[15px] border border-line bg-sand-50/60 p-4 sm:col-span-2"
    >
      <legend className="px-1 text-sm font-semibold text-ink">
        {t("title")}
      </legend>
      <label className="flex items-start gap-3 text-sm font-semibold text-ink">
        <input
          type="checkbox"
          checked={form.voucherPhysicalDeliveryEnabled}
          onChange={(event) =>
            updateField("voucherPhysicalDeliveryEnabled", event.target.checked)
          }
          className="mt-1 rounded border-line text-cobalt-500 focus:ring-cobalt-500"
        />
        {t("enable")}
      </label>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{t("help")}</p>
      {form.voucherPhysicalDeliveryEnabled && (
        <label className={`${workspaceLabelClass} mt-4 max-w-sm`}>
          {t("postage", { currency: form.currency })}
          <input
            type="number"
            min="0"
            step={getMajorCurrencyInputStep(form.currency)}
            required
            value={form.voucherPostageFee}
            onChange={(event) =>
              updateField("voucherPostageFee", event.target.value)
            }
            className={workspaceInputClass}
          />
          <span className="mt-2 block text-xs font-normal leading-5 text-ink-muted">
            {t("postageHelp")}
          </span>
        </label>
      )}
    </fieldset>
  );
}
