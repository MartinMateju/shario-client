"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  IdentificationIcon,
  InboxStackIcon,
} from "@heroicons/react/24/outline";

import AutomatedCommunicationsPage from "@/components/views/automated_communications/AutomatedCommunicationsPage";
import EventsManagementPage from "@/components/views/events/EventsManagementPage";
import InventoryManagementPage from "@/components/views/inventory/InventoryManagementPage";
import MembershipPlansPage from "@/components/views/membership_plans/MembershipPlansPage";
import StaffTasksPage from "@/components/views/staff_tasks/StaffTasksPage";
import StatisticsPage from "@/components/views/statistics/StatisticsPage";
import PermissionBoundary from "@/components/auth/PermissionBoundary";
import {
  PERMISSIONS,
  hasAllPermissions,
  hasAnyPermission,
} from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";

const OPERATIONS_PERMISSIONS = [
  PERMISSIONS.COMMUNICATIONS_VIEW,
  PERMISSIONS.COURSES_MANAGE,
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.TASKS_VIEW,
  PERMISSIONS.PLANNING_SUBMIT,
  PERMISSIONS.PLANNING_TEAM_VIEW,
  PERMISSIONS.PLANNING_MANAGE,
  PERMISSIONS.MEMBERSHIPS_VIEW,
  PERMISSIONS.REPORTS_VIEW,
];

const operationsTabs = [
  {
    id: "automations",
    icon: InboxStackIcon,
    modules: ["communications", "automations"],
    permissions: [PERMISSIONS.COMMUNICATIONS_VIEW],
    component: <AutomatedCommunicationsPage />,
  },
  {
    id: "events",
    icon: CalendarDaysIcon,
    module: "courses",
    permissions: [
      PERMISSIONS.COURSES_MANAGE,
      PERMISSIONS.COURSES_VIEW,
      PERMISSIONS.LOCATIONS_VIEW,
    ],
    requireAllPermissions: true,
    component: <EventsManagementPage />,
  },
  {
    id: "inventory",
    icon: CubeIcon,
    permissions: [PERMISSIONS.INVENTORY_VIEW],
    component: <InventoryManagementPage showPageHeader={false} />,
  },
  {
    id: "tasks",
    icon: ClipboardDocumentListIcon,
    module: "staff_tasks",
    permissions: [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.PLANNING_SUBMIT,
      PERMISSIONS.PLANNING_TEAM_VIEW,
      PERMISSIONS.PLANNING_MANAGE,
    ],
    component: <StaffTasksPage showPageHeader={false} />,
  },
  {
    id: "memberships",
    icon: IdentificationIcon,
    permissions: [PERMISSIONS.MEMBERSHIPS_VIEW],
    component: <MembershipPlansPage showPageHeader={false} />,
  },
  {
    id: "statistics",
    icon: ChartBarIcon,
    permissions: [PERMISSIONS.REPORTS_VIEW],
    component: <StatisticsPage />,
  },
];

const tabModulesEnabled = (tab, tenant) => {
  if (Array.isArray(tab.modules)) {
    return tab.modules.every((module) => tenant?.modules?.[module] !== false);
  }
  if (tab.module) return tenant?.modules?.[tab.module] === true;
  return true;
};

function AdminOperationsContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("Operations");
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const requestedSection = searchParams.get("section") || "automations";
  const activeSection =
    requestedSection === "suppliers" ? "inventory" : requestedSection;
  const visibleTabs = useMemo(
    () =>
      operationsTabs
        .filter((tab) => tabModulesEnabled(tab, tenant))
        .filter((tab) =>
          tab.requireAllPermissions
            ? hasAllPermissions(workspaceAccess, tab.permissions)
            : hasAnyPermission(workspaceAccess, tab.permissions),
        )
        .map((tab) => ({
          ...tab,
          label: t(`tabs.${tab.id}.label`),
          description: t(`tabs.${tab.id}.description`),
        })),
    [t, tenant, workspaceAccess],
  );

  const activeTab = useMemo(
    () => visibleTabs.find((tab) => tab.id === activeSection) || visibleTabs[0],
    [activeSection, visibleTabs],
  );

  if (!activeTab) return null;

  return (
    <main className="min-h-screen text-[#483827]">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {activeTab.id === "inventory" ? (
            <InventoryManagementPage
              defaultSection={
                requestedSection === "suppliers" ? "suppliers" : "items"
              }
              showPageHeader={false}
            />
          ) : (
            activeTab.component
          )}
        </div>
      </div>
    </main>
  );
}

export default function AdminOperationsPage() {
  return (
    <PermissionBoundary anyOf={OPERATIONS_PERMISSIONS}>
      <AdminOperationsContent />
    </PermissionBoundary>
  );
}
