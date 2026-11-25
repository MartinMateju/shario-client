import {
  IdentificationIcon,
  UserGroupIcon,
  UserPlusIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";

import { formatMoney } from "./people-table.utils";

const statConfig = [
  {
    key: "totalCustomers",
    icon: UserGroupIcon,
    iconClass: "bg-accent-soft text-accent-text",
    valueClass: "text-ink",
  },
  {
    key: "activeMemberships",
    icon: IdentificationIcon,
    iconClass: "bg-success-soft text-success",
    valueClass: "text-ink",
  },
  {
    key: "credits",
    icon: WalletIcon,
    iconClass: "bg-skab-cobalt-100 text-primary-text",
    valueClass: "text-primary-text",
  },
  {
    key: "newThisMonth",
    icon: UserPlusIcon,
    iconClass: "bg-accent-soft text-accent-text",
    valueClass: "text-ink",
  },
];

export default function PeopleOverview({
  summary,
  locale,
  t,
  loading = false,
  currency,
}) {
  return (
    <section
      aria-label={t("overview.label")}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {statConfig.map((item) => {
        const Icon = item.icon;
        const rawValue = summary[item.key];
        const value =
          loading || rawValue === null || rawValue === undefined
            ? "—"
            : item.key === "credits"
              ? currency === null
                ? "—"
                : formatMoney(rawValue, locale, currency)
              : rawValue;

        return (
          <article
            key={item.key}
            className="grid min-h-[108px] min-w-0 grid-cols-[minmax(0,1fr)_auto] content-start items-center gap-x-3 gap-y-2 rounded-[18px] border border-line bg-white px-5 py-4 shadow-[0_10px_30px_rgba(17,17,15,0.04)]"
          >
            <p className="text-[13px] font-semibold leading-5 text-ink-soft">
              {t(`overview.${item.key}`)}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.iconClass}`}
            >
              <Icon className="h-5 w-5 stroke-[1.6]" aria-hidden="true" />
            </span>

            <div className="col-span-2 min-w-0">
              <p
                className={`break-words text-[28px] font-semibold leading-tight tabular-nums tracking-[-0.045em] ${item.valueClass}`}
              >
                {value}
              </p>
              {item.key === "activeMemberships" && rawValue == null && (
                <p className="mt-1 text-[10px] text-ink-muted">
                  {t("overview.unavailable")}
                </p>
              )}
              {item.key === "totalCustomers" && summary.newThisMonth > 0 && (
                <p className="mt-1 inline-flex max-w-full rounded-full border border-success/40 bg-success-soft px-2.5 py-0.5 text-[12px] font-semibold text-success">
                  {t("overview.monthlyChange", {
                    count: summary.newThisMonth,
                  })}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}
