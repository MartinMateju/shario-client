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
    iconClass: "bg-[#FFE7DF] text-[#B34A34]",
    valueClass: "text-[#292925]",
  },
  {
    key: "activeMemberships",
    icon: IdentificationIcon,
    iconClass: "bg-[#E8F0E3] text-[#506242]",
    valueClass: "text-[#292925]",
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
    iconClass: "bg-[#FFF0EA] text-[#D65338]",
    valueClass: "text-[#292925]",
  },
];

export default function PeopleOverview({ summary, locale, t }) {
  return (
    <section
      aria-label={t("overview.label")}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {statConfig.map((item) => {
        const Icon = item.icon;
        const rawValue = summary[item.key] || 0;
        const value =
          item.key === "credits" ? formatMoney(rawValue, locale) : rawValue;

        return (
          <article
            key={item.key}
            className="grid min-h-[108px] min-w-0 grid-cols-[minmax(0,1fr)_auto] content-start items-center gap-x-3 gap-y-2 rounded-[18px] border border-[#E7E4DE] bg-white px-5 py-4 shadow-[0_10px_30px_rgba(17,17,15,0.04)]"
          >
            <p className="text-[12px] leading-5 text-ink-muted">
              {t(`overview.${item.key}`)}
            </p>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.iconClass}`}
            >
              <Icon className="h-5 w-5 stroke-[1.6]" aria-hidden="true" />
            </span>

            <div className="col-span-2 min-w-0">
              <p
                className={`break-words text-[25px] font-medium leading-tight tabular-nums tracking-[-0.045em] ${item.valueClass}`}
              >
                {value}
              </p>
              {item.key === "totalCustomers" && summary.newThisMonth > 0 && (
                <p className="mt-1 inline-flex max-w-full rounded-full bg-[#E8F0E3] px-2 py-0.5 text-[10px] font-medium text-[#506242]">
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
