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
    sparkline: true,
  },
  {
    key: "orders",
    icon: ShoppingBagIcon,
    iconClass: "bg-[#EDF3E6] text-[#527043]",
    sparkline: true,
  },
  {
    key: "awaitingPayment",
    icon: CreditCardIcon,
    iconClass: "bg-[#FBF0DF] text-[#B86C00]",
    action: "awaitingPayment",
  },
  {
    key: "failed",
    icon: ExclamationTriangleIcon,
    iconClass: "bg-coral-50 text-terracotta-600",
    action: "failed",
  },
];

function Sparkline() {
  return (
    <svg
      viewBox="0 0 58 20"
      className="h-5 w-14 text-cobalt-500"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 17 8 13l7 2 8-8 7 4 7-7 7 4 13-7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SalesOverview({
  stats,
  onStatusChange,
  isLoading = false,
  error = false,
  onRetry,
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
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-[12px] text-terracotta-700 sm:col-span-2 xl:col-span-4"
          role="alert"
        >
          <p>{t("overview.error")}</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-11 rounded-full border border-current px-4 font-semibold"
          >
            {t("overview.retry")}
          </button>
        </div>
      )}
      {cards.map(({ key, icon: Icon, iconClass, sparkline, action }) => (
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
                className="text-left text-[12px] font-medium text-terracotta-600 transition hover:text-terracotta-700"
              >
                {t(`overview.${key}Action`)} →
              </button>
            ) : (
              <span className="text-[12px] leading-5 text-ink-muted">
                {t(`overview.${key}Detail`)}
              </span>
            )}

            {sparkline && <Sparkline />}
          </div>
        </WorkspaceCard>
      ))}
    </section>
  );
}
