import WorkspaceTabs from "@/components/dashboard/WorkspaceTabs";

export const PEOPLE_TABS_ID = "people-sections";
export const PEOPLE_HEADING_ID = "people-section-heading";

export default function PeopleTabs({
  activeTab,
  counts,
  tabs = ["customers", "staff"],
  t,
  onChange,
}) {
  if (tabs.length === 1) {
    const tab = tabs[0];

    return (
      <div className="flex min-w-0 items-center gap-2.5">
        <h2
          id={PEOPLE_HEADING_ID}
          className="text-[15px] font-semibold text-ink"
        >
          {t(`tabs.${tab}`)}
        </h2>
        <span className="rounded-full bg-sand-50 px-2.5 py-0.5 text-[12px] font-medium tabular-nums text-ink-muted">
          {counts[tab] ?? 0}
        </span>
      </div>
    );
  }

  return (
    <WorkspaceTabs
      id={PEOPLE_TABS_ID}
      className="w-full !border-b-0 sm:w-auto"
      tabs={tabs.map((tab) => ({
        id: tab,
        label: t(`tabs.${tab}`),
        badge: counts[tab] ?? 0,
      }))}
      value={activeTab}
      onChange={onChange}
      ariaLabel={t("tabs.label")}
      stretch
    />
  );
}
