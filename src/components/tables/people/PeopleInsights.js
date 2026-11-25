import {
  ArrowRightIcon,
  ExclamationCircleIcon,
  IdentificationIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";

import { Link } from "@/i18n/navigation";

import { formatMoney } from "./people-table.utils";

export default function PeopleInsights({
  summary,
  locale,
  t,
  insightsHref,
  currency,
}) {
  const items = [
    {
      key: "memberships",
      value: summary.activeMemberships ?? "—",
      icon: IdentificationIcon,
      tone: "bg-[#E8F0E3] text-[#506242]",
    },
    {
      key: "credits",
      value:
        currency === null
          ? "—"
          : formatMoney(summary.credits, locale, currency),
      icon: WalletIcon,
      tone: "bg-skab-cobalt-100 text-primary-text",
    },
    {
      key: "attention",
      value: summary.needsAttention,
      icon: ExclamationCircleIcon,
      tone: "bg-warning-soft text-warning",
    },
  ];

  return (
    <section className="grid gap-3 rounded-[18px] border border-line bg-white p-4 shadow-[0_10px_30px_rgba(17,17,15,0.035)] sm:grid-cols-3 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto] xl:items-center">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2"
          >
            <p className="text-[13px] leading-5 text-ink-muted">
              {t(`insights.${item.key}`)}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${item.tone}`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="col-span-2 min-w-0 whitespace-normal text-[18px] font-medium leading-tight tracking-[-0.035em] text-[#292925] tabular-nums [overflow-wrap:anywhere]">
              {item.value}
            </p>
          </div>
        );
      })}

      {insightsHref && (
        <Link
          href={insightsHref}
          className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-2 rounded-lg px-2 text-[13px] font-semibold text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:col-span-3 xl:col-span-1"
        >
          <span className="min-w-0 truncate">{t("insights.view")}</span>
          <ArrowRightIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
