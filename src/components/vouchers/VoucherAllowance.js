"use client";

import { useTranslations } from "next-intl";
import { useGetVoucherAllowanceQuery } from "@/lib/features/products/productsApiSlice";

export default function VoucherAllowance() {
  const t = useTranslations("VoucherFoundation");
  const { data, isLoading, isError, refetch } = useGetVoucherAllowanceQuery();

  return (
    <div
      className="rounded-[15px] border border-line bg-white px-4 py-3 text-sm text-ink-muted"
      role="status"
    >
      {isLoading ? (
        t("allowance.loading")
      ) : isError ? (
        <>
          {t("allowance.error")}{" "}
          <button type="button" onClick={refetch} className="underline">
            {t("retry")}
          </button>
        </>
      ) : data ? (
        <>
          <span className="font-semibold text-ink">
            {t(
              data.maxActiveVoucherOfferings === null
                ? "allowance.unlimited"
                : "allowance.usage",
              {
                count: data.activeCount,
                limit: data.maxActiveVoucherOfferings ?? 0,
              },
            )}
          </span>
          {!data.canPublish && (
            <p className="mt-1">{t("allowance.limitHelp")}</p>
          )}
        </>
      ) : null}
    </div>
  );
}
