import {
  BanknotesIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

import { WorkspaceCard } from "@/components/dashboard/WorkspaceDataSurface";

const cards = [
  {
    key: "revenue",
    icon: BanknotesIcon,
    iconClass: "bg-cobalt-50 text-cobalt-600",
  },
  {
    key: "orders",
    icon: ShoppingBagIcon,
    iconClass: "bg-[var(--studio-orange-soft)] text-[var(--studio-orange-ink)]",
  },
  {
    key: "awaitingPayment",
    icon: CreditCardIcon,
    iconClass: "bg-warning-soft text-warning",
    action: "awaitingPayment",
  },
  {
    key: "failed",
    icon: ExclamationTriangleIcon,
    iconClass: "bg-danger-soft text-danger",
    action: "failed",
  },
];

export default function SalesOverview({
  stats,
  onStatusChange,
  isLoading = false,
  error = false,
  onRetry,
  amountReason = null,
  hasMultiStudioOrders = false,
  t,
}) {
  return (
    <section
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      aria-label={t("overview.label")}
      aria-busy={isLoading}
    >
      {isLoading && (
        <p className="sr-only" role="status">
          {t("overview.updating")}
        </p>
      )}
      {error && !isLoading && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-danger/40 bg-danger-soft px-4 py-3 text-[12px] text-danger sm:col-span-2 xl:col-span-4"
          role="alert"
        >
          <p>{t("overview.error")}</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-full border border-primary/35 bg-white px-4 font-semibold text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {t("overview.retry")}
          </button>
        </div>
      )}
      {cards.map(({ key, icon: Icon, iconClass, action }) => (
        <WorkspaceCard key={key} className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 text-[12px] font-medium leading-5 text-ink-soft">
              {t(`overview.${key}`)}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ${iconClass}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
            </span>
          </div>

          <p className="mt-3 min-w-0 whitespace-normal text-[25px] font-semibold leading-tight tracking-[-0.045em] text-[#171717] tabular-nums [overflow-wrap:anywhere]">
            {isLoading || error ? "—" : stats[key]}
          </p>

          <div className="mt-auto flex min-h-5 items-center justify-between gap-3 pt-4">
            {action ? (
              <button
                type="button"
                onClick={() => onStatusChange(action)}
                className="text-left text-[12px] font-semibold text-primary underline-offset-4 transition hover:underline"
              >
                {t(`overview.${key}Action`)} →
              </button>
            ) : (
              <span className="text-[12px] leading-5 text-ink-muted">
                {t(`overview.${key}Detail`)}
              </span>
            )}
          </div>
          {key === "revenue" && !isLoading && !error && amountReason && (
            <p className="mt-2 text-[12px] leading-5 text-terracotta-700">
              {t(`money.${amountReason}`)}
            </p>
          )}
        </WorkspaceCard>
      ))}
      <p className="text-[12px] leading-5 text-ink-muted sm:col-span-2 xl:col-span-4">
        {t("money.scope")}
        {!isLoading && !error && hasMultiStudioOrders && (
          <> {t("money.multiStudio")}</>
        )}
      </p>
    </section>
  );
}
