import {
  ExclamationTriangleIcon,
  FolderIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

import { WorkspaceCard } from "@/components/dashboard/WorkspaceDataSurface";

const statDefinitions = [
  {
    key: "active",
    icon: ShoppingBagIcon,
    iconClass: "bg-cobalt-50 text-cobalt-600",
  },
  {
    key: "online",
    icon: GlobeAltIcon,
    iconClass: "bg-[#EDF3E6] text-[#527043]",
  },
  {
    key: "categories",
    icon: FolderIcon,
    iconClass: "bg-[#FBF0DF] text-[#B86C00]",
  },
  {
    key: "attention",
    icon: ExclamationTriangleIcon,
    iconClass: "bg-coral-50 text-terracotta-600",
  },
];

export default function ProductOverview({ stats, t }) {
  return (
    <section
      className="grid snap-x snap-mandatory grid-flow-col auto-cols-[78%] gap-3 overflow-x-auto pb-2 sm:auto-cols-[45%] lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:pb-0"
      aria-label={t("overview.label")}
    >
      {statDefinitions.map(({ key, icon: Icon, iconClass }) => (
        <WorkspaceCard key={key} className="min-w-0 snap-start p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] ${iconClass}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
            </span>

            <div className="min-w-0">
              <p className="text-[25px] font-semibold leading-none tracking-[-0.045em] text-[#171717]">
                {stats[key]}
              </p>
              <p className="mt-1.5 truncate text-[12px] font-medium text-ink-soft">
                {t(`overview.${key}`)}
              </p>
            </div>
          </div>

          <p
            className={`mt-4 text-[12px] leading-5 ${
              key === "attention" && stats[key] > 0
                ? "text-terracotta-600"
                : "text-ink-muted"
            }`}
          >
            {t(`overview.${key}Detail`, { count: stats[key] })}
          </p>
        </WorkspaceCard>
      ))}
    </section>
  );
}
