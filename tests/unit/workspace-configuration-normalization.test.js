import { describe, expect, it } from "vitest";

import { normalizeWorkspaceConfigurationResponse } from "@/lib/features/workspace-access/workspaceAccessApiSlice";

describe("workspace configuration response normalization", () => {
  it.each(["configuration", "data"])(
    "hydrates a %s response wrapper",
    (wrapper) => {
      const response = {
        [wrapper]: {
          definitionVersion: 3,
          intent: {
            configured: true,
            definitionVersion: 1,
            source: "owner",
          },
          modules: {
            firing: { entitled: true, selected: true, enabled: true },
            payments: { entitled: false, selected: false, enabled: false },
          },
          effectiveModules: { firing: true, payments: false },
          navigation: {
            hiddenGroups: ["bookings", "bookings"],
            hiddenItems: ["reports", "reports"],
          },
        },
      };

      expect(normalizeWorkspaceConfigurationResponse(response)).toMatchObject({
        definitionVersion: 3,
        intent: {
          configured: true,
          definitionVersion: 1,
          source: "owner",
        },
        effectiveModules: { firing: true, payments: false },
        navigation: {
          hiddenGroups: ["bookings"],
          hiddenItems: ["reports"],
        },
      });
    },
  );
});
