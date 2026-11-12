import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const workspace = vi.hoisted(() => ({
  tenant: { modules: { courses: true, communications: true } },
  access: {
    status: "active",
    permissions: ["courses.manage", "courses.view", "locations.view"],
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ section: "events" }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => workspace.tenant,
  selectCurrentWorkspaceAccess: () => workspace.access,
}));

vi.mock("@/components/auth/PermissionBoundary", () => ({
  default: ({ children }) => children,
}));

vi.mock(
  "@/components/views/automated_communications/AutomatedCommunicationsPage",
  () => ({ default: () => <div>Automations surface</div> }),
);
vi.mock("@/components/views/events/EventsManagementPage", () => ({
  default: () => <div>Events surface</div>,
}));
vi.mock("@/components/views/inventory/InventoryManagementPage", () => ({
  default: () => <div>Inventory surface</div>,
}));
vi.mock("@/components/views/membership_plans/MembershipPlansPage", () => ({
  default: () => <div>Memberships surface</div>,
}));
vi.mock("@/components/views/staff_tasks/StaffTasksPage", () => ({
  default: () => <div>Tasks surface</div>,
}));
vi.mock("@/components/views/statistics/StatisticsPage", () => ({
  default: () => <div>Statistics surface</div>,
}));

import AdminOperationsPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/operations/page";

describe("AI event result destination", () => {
  beforeEach(() => {
    workspace.tenant = {
      modules: { courses: true, communications: true },
    };
    workspace.access = {
      status: "active",
      permissions: ["courses.manage", "courses.view", "locations.view"],
    };
  });

  it.each([
    [
      "all prerequisites are present",
      true,
      ["courses.manage", "courses.view", "locations.view"],
      true,
    ],
    [
      "the courses module is disabled",
      false,
      [
        "courses.manage",
        "courses.view",
        "locations.view",
        "communications.view",
      ],
      false,
    ],
    [
      "courses.manage is missing",
      true,
      ["courses.view", "locations.view", "communications.view"],
      false,
    ],
    [
      "courses.view is missing",
      true,
      ["courses.manage", "locations.view", "communications.view"],
      false,
    ],
    [
      "locations.view is missing",
      true,
      ["courses.manage", "courses.view", "communications.view"],
      false,
    ],
  ])(
    "shows Events only when %s",
    (_case, coursesEnabled, permissions, shouldShowEvents) => {
      workspace.tenant = {
        modules: {
          courses: coursesEnabled,
          communications: true,
        },
      };
      workspace.access = {
        status: "active",
        permissions,
      };

      render(<AdminOperationsPage />);

      if (shouldShowEvents) {
        expect(screen.getByText("Events surface")).toBeVisible();
        expect(screen.queryByText("Automations surface")).toBeNull();
      } else {
        expect(screen.queryByText("Events surface")).toBeNull();
        expect(screen.getByText("Automations surface")).toBeVisible();
      }
    },
  );
});
