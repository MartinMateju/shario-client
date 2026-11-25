import { describe, expect, it } from "vitest";

import { getStudioAssistantQuestions } from "@/components/ai/studio-assistant-questions";
import { PERMISSIONS } from "@/config/permissions";
import cs from "@/messages/cs.json";
import en from "@/messages/en.json";
import nl from "@/messages/nl.json";

const tenant = {
  modules: {
    ai: true,
    bookings: true,
    staff_tasks: true,
    inventory: true,
  },
};
const accessWith = (...permissions) => ({
  status: "active",
  permissions: [PERMISSIONS.AI_USE, ...permissions],
});
const keysFor = (access, workspace = tenant) =>
  getStudioAssistantQuestions({ tenant: workspace, access }).map(
    ({ key }) => key,
  );

describe("guided studio questions", () => {
  it("offers four relevant questions with their actual answer periods", () => {
    expect(
      getStudioAssistantQuestions({ tenant, access: { role: "owner" } }),
    ).toEqual([
      { key: "today", period: "today" },
      { key: "bookings", period: "today" },
      { key: "bookingTrend", period: "last30Days" },
      { key: "teamBlockers", period: "today" },
    ]);
  });

  it("does not offer the feature without AI access or an enabled AI module", () => {
    expect(getStudioAssistantQuestions()).toEqual([]);
    expect(keysFor({ permissions: [PERMISSIONS.BOOKINGS_VIEW] })).toEqual([]);
    expect(keysFor({ role: "owner", status: "suspended" })).toEqual([]);
    expect(
      keysFor({ role: "owner" }, { modules: { ...tenant.modules, ai: false } }),
    ).toEqual([]);
  });

  it("requires both booking and reporting access for the booking trend", () => {
    expect(keysFor(accessWith(PERMISSIONS.BOOKINGS_VIEW))).toEqual([
      "today",
      "bookings",
    ]);
    expect(keysFor(accessWith(PERMISSIONS.REPORTS_VIEW))).toEqual([
      "today",
      "generalHelp",
    ]);
    expect(
      keysFor(accessWith(PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.REPORTS_VIEW)),
    ).toEqual(["today", "bookings", "bookingTrend"]);
  });

  it("requires planning access to answer team blocker questions", () => {
    expect(keysFor(accessWith(PERMISSIONS.TASKS_VIEW))).toEqual([
      "today",
      "generalHelp",
    ]);
    for (const permission of [
      PERMISSIONS.PLANNING_TEAM_VIEW,
      PERMISSIONS.PLANNING_MANAGE,
    ]) {
      expect(keysFor(accessWith(permission))).toEqual([
        "today",
        "teamBlockers",
      ]);
    }
  });

  it("omits disabled modules even when the role still has their permissions", () => {
    expect(
      keysFor(
        { role: "owner" },
        {
          modules: {
            ...tenant.modules,
            bookings: false,
            staff_tasks: false,
          },
        },
      ),
    ).toEqual(["today", "reorders"]);
    expect(keysFor({ role: "owner" }, { modules: { ai: true } })).toEqual([
      "today",
      "generalHelp",
    ]);
  });

  it("provides complete copy for every question and the report in ready locales", () => {
    const questionKeys = [
      "today",
      "bookings",
      "bookingTrend",
      "teamBlockers",
      "reorders",
      "generalHelp",
    ];
    for (const catalog of [en, cs, nl]) {
      for (const key of questionKeys) {
        for (const field of ["label", "hint", "prompt"]) {
          expect(catalog.AI.guided.questions[key][field]).toEqual(
            expect.any(String),
          );
          expect(catalog.AI.guided.questions[key][field].trim()).not.toBe("");
        }
      }
      expect(catalog.AI.guided.report.description).toContain("{date}");
      expect(Object.keys(catalog.AI.guided.report).sort()).toEqual(
        Object.keys(en.AI.guided.report).sort(),
      );
    }
  });
});
