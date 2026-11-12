"use client";

import {
  CalendarDaysIcon,
  ClockIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

export default function BookingsOverview({ summary, t, isLoading }) {
  const metrics = [
    {
      key: "total",
      label: t("overview.total"),
      value: summary.total,
      icon: CalendarDaysIcon,
      accent: "text-[#11110F]",
    },
    {
      key: "today",
      label: t("overview.today"),
      value: summary.today,
      icon: ClockIcon,
      accent: "text-[#11110F]",
    },
    {
      key: "awaitingPayment",
      label: t("overview.awaitingPayment"),
      value: summary.awaitingPayment,
      icon: CreditCardIcon,
      accent: "text-[#F05B3F]",
    },
  ];

  return (
    <section
      className="grid overflow-hidden rounded-[20px] border border-[#E7E4DE] bg-white shadow-[0_12px_34px_rgba(31,31,31,0.04)] sm:grid-cols-3"
      aria-label={t("overview.label")}
    >
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const borderClass =
          index > 0
            ? "border-t border-[#E7E4DE] sm:border-l sm:border-t-0"
            : "";

        return (
          <article
            key={metric.key}
            className={`relative grid min-h-[100px] min-w-0 grid-cols-[minmax(0,1fr)_auto] content-start items-center gap-x-3 gap-y-2 px-5 py-4 sm:px-6 ${borderClass}`}
          >
            <p className="text-[11px] leading-5 text-[#7D7D7D]">
              {metric.label}
            </p>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FBE8E2] text-[#292925]">
              <Icon className="h-5 w-5 stroke-[1.6]" aria-hidden="true" />
            </span>

            <div className="col-span-2 min-w-0">
              {isLoading ? (
                <div className="h-7 w-20 animate-pulse rounded-md bg-[#EFEEE9]" />
              ) : (
                <p
                  className={`whitespace-normal text-[24px] font-medium leading-tight tracking-[-0.045em] tabular-nums [overflow-wrap:anywhere] ${metric.accent}`}
                >
                  {metric.value ?? "—"}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
