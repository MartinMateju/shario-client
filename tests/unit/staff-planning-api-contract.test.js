import { describe, expect, it } from "vitest";

import {
  getEntityId,
  getPlanningDateKey,
  normalizeStaffPlanningOverview,
  normalizeStaffTasks,
} from "@/components/views/staff_tasks/staffPlanning.utils";
import { dashboardNavigation } from "@/components/dashboard/dashboard.data";
import { PERMISSIONS } from "@/config/permissions";
import {
  normalizePlanningScope,
  staffPlanningApiRoutes,
  unwrapStaffPlanningEnvelope,
} from "@/lib/features/staffPlanning/staffPlanningApiSlice";

describe("Staff Planning API contract", () => {
  it("uses the settled deterministic and advisory endpoint paths", () => {
    expect(staffPlanningApiRoutes.overview).toBe("/staff-planning/overview");
    expect(staffPlanningApiRoutes.dailyUpdate("2026-07-28")).toBe(
      "/staff-planning/daily-updates/2026-07-28",
    );
    expect(staffPlanningApiRoutes.weeklyPlan("2026-07-27")).toBe(
      "/staff-planning/weekly-plans/2026-07-27",
    );
    expect(staffPlanningApiRoutes.monthlyPriorities("2026-07")).toBe(
      "/staff-planning/monthly-priorities/2026-07",
    );
    expect(staffPlanningApiRoutes.settings).toBe("/staff-planning/settings");
    expect(staffPlanningApiRoutes.aiDailyDraft).toBe(
      "/ai/staff-planning/daily-draft",
    );
    expect(staffPlanningApiRoutes.aiBriefing).toBe(
      "/ai/staff-planning/briefing",
    );
  });

  it("keeps all-location scope implicit and unwraps standard envelopes", () => {
    expect(
      normalizePlanningScope({
        date: "2026-07-28",
        locationId: "",
        unsupported: true,
      }),
    ).toEqual({ date: "2026-07-28" });
    expect(unwrapStaffPlanningEnvelope({ data: { today: {} } })).toEqual({
      today: {},
    });
  });

  it("uses the tenant calendar at UTC boundaries", () => {
    const instant = new Date("2026-01-01T00:30:00.000Z");

    expect(getPlanningDateKey(instant, "Europe/Prague")).toBe("2026-01-01");
    expect(getPlanningDateKey(instant, "America/Los_Angeles")).toBe(
      "2025-12-31",
    );
  });

  it("keeps a daily update id distinct from its author id", () => {
    expect(getEntityId({ _id: "update-1", userId: "user-1" })).toBe("update-1");

    const overview = normalizeStaffPlanningOverview(
      {
        permissions: {
          canSubmit: true,
          canViewTeam: true,
          canManage: true,
          canManageGlobalSettings: true,
        },
        settings: { expectedUpdateTime: "09:15" },
        today: {
          staff: [
            {
              memberId: "member-1",
              userId: "user-1",
              displayName: "Anna",
              canManageSchedule: true,
              isExpectedToday: true,
              state: "needs-attention",
              update: {
                id: "update-1",
                userId: "user-1",
                focusToday: "Unload kiln",
                needsOwnerAttention: true,
              },
            },
            {
              memberId: "staff:unlinked-1",
              displayName: "Unlinked profile",
              state: "not-linked",
            },
          ],
          counts: {
            missing: 0,
            needsOwnerAttention: 1,
            notLinked: 1,
          },
        },
        week: {
          plans: [
            {
              id: "plan-1",
              userId: "user-1",
              outcomes: [{ id: "outcome-1", title: "Stocktake" }],
            },
          ],
        },
        month: {
          prioritySets: [
            {
              id: "set-global",
              locationId: null,
              priorities: [{ id: "priority-1", title: "Kiln maintenance" }],
            },
          ],
        },
      },
      "user-1",
    );

    expect(overview.settings.expectedUpdateTime).toBe("09:15");
    expect(overview.permissions.canManageGlobalSettings).toBe(true);
    expect(overview.today.staff[0].update.id).toBe("update-1");
    expect(overview.today.staff[0].canManageSchedule).toBe(true);
    expect(overview.today.staff[1].state).toBe("not-linked");
    expect(overview.today.counts.missing).toBe(0);
    expect(overview.today.counts.attention).toBe(1);
    expect(overview.week.plans[0]).toMatchObject({
      name: "Anna",
      isMine: true,
    });
    expect(overview.month.prioritySets[0]).toMatchObject({
      id: "set-global",
      locationId: "",
      priorities: [expect.objectContaining({ title: "Kiln maintenance" })],
    });
  });

  it("maps legacy blocked tasks into the Waiting board column", () => {
    expect(
      normalizeStaffTasks([
        {
          id: "task-1",
          title: "Order clay",
          status: "blocked",
          locationId: "location-1",
          appliesToAllLocations: false,
        },
      ])[0],
    ).toMatchObject({
      status: "blocked",
      column: "waiting",
      locationId: "location-1",
      appliesToAllLocations: false,
    });
  });

  it("declares the role-specific planning permission contract", () => {
    expect(PERMISSIONS).toMatchObject({
      PLANNING_SUBMIT: "planning.submit",
      PLANNING_TEAM_VIEW: "planning.team.view",
      PLANNING_MANAGE: "planning.manage",
    });
  });

  it("keeps the compatible operations URL discoverable and module-gated", () => {
    expect(
      dashboardNavigation.find((item) => item.key === "staffPlanning"),
    ).toMatchObject({
      href: "/app/operations?section=tasks",
      module: "staff_tasks",
      requiresExplicitModule: true,
      permissions: expect.arrayContaining([
        PERMISSIONS.PLANNING_SUBMIT,
        PERMISSIONS.PLANNING_TEAM_VIEW,
        PERMISSIONS.PLANNING_MANAGE,
        PERMISSIONS.TASKS_VIEW,
      ]),
    });
  });
});
