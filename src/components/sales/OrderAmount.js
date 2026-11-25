import { minorUnitsToMajor } from "@/utils/money";
import { formatMoney, getSalesAmounts } from "./sales.utils";

export default function OrderAmount({ order, locale, t }) {
  const amounts = getSalesAmounts(order);
  if (!amounts) {
    return (
      <span
        className="text-[12px] font-normal text-ink-muted"
        title={t("money.unavailableDetail")}
      >
        {t("money.unavailable")}
      </span>
    );
  }
  const money = (value) =>
    formatMoney(
      minorUnitsToMajor(value, amounts.currency),
      amounts.currency,
      locale,
    );
  return (
    <div>
      <span className="whitespace-nowrap">
        {money(amounts.grossAmountMinor)}
      </span>
      {amounts.refundedAmountMinor > 0 && (
        <div className="mt-1 text-[11px] font-normal leading-5 text-ink-muted">
          <p>
            {t("money.refunded")}: {money(amounts.refundedAmountMinor)}
          </p>
          <p>
            {t("money.net")}: {money(amounts.netAmountMinor)}
          </p>
        </div>
      )}
    </div>
  );
}
