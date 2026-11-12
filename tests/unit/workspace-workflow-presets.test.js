import { describe, expect, it } from "vitest";

import {
  WORKSPACE_WORKFLOW_PRESETS,
  buildWorkflowPresetState,
  getMatchingWorkflowPresetId,
  isWorkflowPresetAvailable,
} from "@/components/views/settings/workspaceWorkflowPresets";

const moduleKeys = [
  "bookings",
  "payments",
  "customers",
  "courses",
  "memberships",
  "credits",
  "vouchers",
  "automations",
  "newsletter",
  "inventory",
  "staff_tasks",
  "communications",
  "ai",
];

const modules = Object.fromEntries(
  moduleKeys.map((key) => [key, { entitled: true }]),
);

const navigationEntries = [
  {
    key: "bookings",
    type: "group",
    items: [{ key: "calendar" }, { key: "bookings" }],
  },
  { key: "customers", type: "item", items: [{ key: "customers" }] },
  {
    key: "studio",
    type: "group",
    items: [{ key: "inventory" }],
  },
  {
    key: "sales",
    type: "group",
    items: [{ key: "sales" }, { key: "products" }],
  },
  {
    key: "messages",
    type: "group",
    items: [{ key: "messages" }, { key: "automations" }],
  },
];

const expectedModules = {
  bookingStudio: [
    "ai",
    "bookings",
    "communications",
    "courses",
    "customers",
    "memberships",
    "payments",
  ],
  membershipStudio: ["ai", "customers", "memberships"],
  fullWorkspace: [...moduleKeys].sort(),
};

describe("workspace workflow presets", () => {
  it.each(WORKSPACE_WORKFLOW_PRESETS)(
    "builds the $id studio intent as a complete module selection",
    (preset) => {
      const state = buildWorkflowPresetState({
        presetId: preset.id,
        moduleKeys,
        modules,
        navigationEntries,
      });
      const enabled = Object.entries(state.modules)
        .filter(([, selected]) => selected)
        .map(([key]) => key)
        .sort();

      expect(enabled).toEqual(expectedModules[preset.id]);
      expect(
        getMatchingWorkflowPresetId({
          moduleKeys,
          modules,
          draft: state,
        }),
      ).toBe(preset.id);
    },
  );

  it("never selects a module that is outside the workspace entitlement", () => {
    const limitedModules = {
      ...modules,
      payments: { entitled: false },
      communications: { entitled: false },
      ai: { entitled: false },
    };
    const state = buildWorkflowPresetState({
      presetId: "bookingStudio",
      moduleKeys,
      modules: limitedModules,
      navigationEntries,
    });

    expect(state.modules.bookings).toBe(true);
    expect(state.modules.payments).toBe(false);
    expect(state.modules.communications).toBe(false);
    expect(state.modules.ai).toBe(false);
  });

  it("preserves an explicit AI opt-out when applying an operational preset", () => {
    const optedOutModules = {
      ...modules,
      ai: { entitled: true, selected: false },
    };
    const state = buildWorkflowPresetState({
      presetId: "bookingStudio",
      moduleKeys,
      modules: optedOutModules,
      navigationEntries,
    });

    expect(state.modules.ai).toBe(false);
    expect(
      getMatchingWorkflowPresetId({
        moduleKeys,
        modules: optedOutModules,
        draft: state,
      }),
    ).toBe("bookingStudio");
  });

  it("disables a preset only when its core workflow is unavailable", () => {
    const bookingPreset = WORKSPACE_WORKFLOW_PRESETS.find(
      (preset) => preset.id === "bookingStudio",
    );

    expect(isWorkflowPresetAvailable(bookingPreset, modules)).toBe(true);
    expect(
      isWorkflowPresetAvailable(bookingPreset, {
        ...modules,
        bookings: { entitled: false },
      }),
    ).toBe(false);
  });
});
