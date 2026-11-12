"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  BellAlertIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import BrushStrokeEdge from "@/components/decorations/BrushStrokeEdge";
import WorkspaceTabs, {
  WorkspaceTabPanel,
} from "@/components/dashboard/WorkspaceTabs";
import { PERMISSIONS, hasAnyPermission } from "@/config/permissions";
import { useRouter } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useGetCommunicationEmailSetupQuery } from "@/lib/features/communicationEmailSetup/communicationEmailSetupApiSlice";

import AutomatedCommunicationsPage from "@/components/views/automated_communications/AutomatedCommunicationsPage";
import EmailReadinessCard from "./email/EmailReadinessCard";
import EmailSetupView from "./email/EmailSetupView";
import { getEmailSetupPollingInterval } from "./email/emailSetup";
import {
  getEmailWorkspaceHref,
  resolveEmailWorkspaceSection,
} from "./email/emailWorkspaceNavigation";

const sectionDefinitions = [
  { id: "history", icon: ClockIcon },
  { id: "automations", icon: BellAlertIcon, automation: true },
  { id: "templates", icon: DocumentTextIcon, automation: true },
  { id: "setup", icon: Cog6ToothIcon, settings: true },
];

export default function CommunicationsWorkspace({ showPageHeader = true }) {
  const t = useTranslations("CommunicationsEmail");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canView = hasAnyPermission(workspaceAccess, [
    PERMISSIONS.COMMUNICATIONS_VIEW,
    PERMISSIONS.COMMUNICATIONS_MANAGE,
  ]);
  const canManage = hasAnyPermission(workspaceAccess, [
    PERMISSIONS.COMMUNICATIONS_SETTINGS_MANAGE,
    PERMISSIONS.COMMUNICATIONS_MANAGE,
  ]);
  const automationsEnabled = tenant?.modules?.automations !== false;
  const guided = searchParams.get("setupStep") === "communications";
  const visibleSections = useMemo(
    () =>
      sectionDefinitions.filter((section) => {
        if (section.settings) return canManage;
        if (section.automation) return canView && automationsEnabled;
        return canView;
      }),
    [automationsEnabled, canManage, canView],
  );
  const availableSectionIds = visibleSections.map((section) => section.id);
  const activeSection = resolveEmailWorkspaceSection({
    section: searchParams.get("section"),
    tab: searchParams.get("tab"),
    availableSections: availableSectionIds,
    guided,
  });
  const skipSetupQuery = !canView && !canManage;
  const setupQuery = useGetCommunicationEmailSetupQuery(undefined, {
    skip: skipSetupQuery,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const setup = setupQuery.data;
  const setupPollingInterval = getEmailSetupPollingInterval(setup);
  useGetCommunicationEmailSetupQuery(undefined, {
    skip: skipSetupQuery || setupPollingInterval === 0,
    pollingInterval: setupPollingInterval,
    skipPollingIfUnfocused: true,
  });
  useEffect(() => {
    const requestedSection = searchParams.get("section");
    const requestedTab = searchParams.get("tab");
    if (
      searchParams.has("compose") ||
      ((requestedSection || requestedTab) &&
        (requestedSection !== activeSection || requestedTab))
    ) {
      router.replace(getEmailWorkspaceHref(searchParams, activeSection), {
        scroll: false,
      });
    }
  }, [activeSection, router, searchParams]);

  const navigate = (section) => {
    router.replace(getEmailWorkspaceHref(searchParams, section), {
      scroll: false,
    });
  };

  const tabs = visibleSections.map((section) => ({
    ...section,
    label: t(`tabs.${section.id}`),
    description: t(`tabs.${section.id}Description`),
  }));

  if (!visibleSections.length) return null;

  return (
    <section className="mx-auto w-full max-w-[1800px]" data-email-workspace>
      {showPageHeader && !guided ? (
        <header className="mb-5 overflow-hidden rounded-[28px] border border-line bg-canvas shadow-card">
          <div className="relative overflow-hidden px-5 py-6 sm:px-7 lg:px-8">
            <BrushStrokeEdge className="-right-2 -top-14 hidden h-[calc(100%+112px)] w-[clamp(72px,9vw,118px)] opacity-[0.12] sm:block" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cobalt-700">
                  <EnvelopeIcon className="h-4 w-4" aria-hidden="true" />
                  {t("eyebrow")}
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">
                  {t("title")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  {t("description")}
                </p>
              </div>
            </div>
          </div>
        </header>
      ) : null}

      {activeSection !== "setup" ? (
        <div className="mb-5">
          <EmailReadinessCard
            setup={setup}
            isLoading={setupQuery.isLoading}
            isError={setupQuery.isError}
            onOpenSetup={canManage ? () => navigate("setup") : undefined}
            compact
          />
        </div>
      ) : null}

      {!guided ? (
        <WorkspaceTabs
          id="email-workspace-sections"
          tabs={tabs}
          value={activeSection}
          onChange={navigate}
          ariaLabel={t("tabs.label")}
          variant="cards"
          className="mb-5"
        />
      ) : null}

      <WorkspaceTabPanel
        tabsId="email-workspace-sections"
        tabId={activeSection}
      >
        {activeSection === "history" ? (
          <AutomatedCommunicationsPage view="history" emailSetup={setup} />
        ) : null}
        {activeSection === "automations" ? (
          <AutomatedCommunicationsPage view="automations" emailSetup={setup} />
        ) : null}
        {activeSection === "templates" ? (
          <AutomatedCommunicationsPage view="templates" emailSetup={setup} />
        ) : null}
        {activeSection === "setup" && canManage ? (
          <EmailSetupView
            setup={setup}
            canManage={canManage}
            onChanged={() => setupQuery.refetch()}
          />
        ) : null}
      </WorkspaceTabPanel>
    </section>
  );
}
