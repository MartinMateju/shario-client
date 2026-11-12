"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import WorkspaceTabs, {
  WorkspaceTabPanel,
} from "@/components/dashboard/WorkspaceTabs";

export default function AdminModuleTabs({
  tabs = [],
  defaultTab = "",
  sectionAliases = {},
  ariaLabel = "Workspace sections",
  children,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fallbackTab = defaultTab || tabs[0]?.id || "";
  const requestedTab = searchParams.get("section") || fallbackTab;
  const activeTab = sectionAliases[requestedTab] || requestedTab;

  const activeTabConfig = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab) || tabs[0] || null;
  }, [activeTab, tabs]);

  const handleTabChange = (tabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("section", tabId);

    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <section className="mx-auto max-w-[1540px] px-4 py-8 sm:px-6 lg:px-8">
      <WorkspaceTabs
        id="admin-module-sections"
        tabs={tabs}
        value={activeTabConfig?.id}
        onChange={handleTabChange}
        ariaLabel={ariaLabel}
      />

      <WorkspaceTabPanel
        tabsId="admin-module-sections"
        tabId={activeTabConfig?.id || fallbackTab}
        className="mt-6 rounded-[2rem] border border-[#e3d8ce] bg-white/70 shadow-[0_18px_45px_rgba(72,56,39,0.055)]"
      >
        {children}
      </WorkspaceTabPanel>
    </section>
  );
}
