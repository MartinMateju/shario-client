import { describe, expect, it } from "vitest";

import { resolveCommunicationAutomationSaveState } from "@/components/communications/email/automationPersistence";

describe("managed email automation readiness", () => {
  it("allows an unready managed sender to save an inactive draft", () => {
    expect(
      resolveCommunicationAutomationSaveState({
        activate: false,
        managedReady: false,
        currentlyActive: true,
        currentStatus: "active",
      }),
    ).toEqual({
      allowed: true,
      isActive: false,
      automationStatus: "inactive",
    });
  });

  it("fails closed when activation is requested before setup is ready", () => {
    expect(
      resolveCommunicationAutomationSaveState({
        activate: true,
        managedReady: false,
      }),
    ).toEqual({
      allowed: false,
      isActive: false,
      automationStatus: "inactive",
    });
  });

  it("allows activation only after managed setup is ready", () => {
    expect(
      resolveCommunicationAutomationSaveState({
        activate: true,
        managedReady: true,
      }),
    ).toEqual({
      allowed: true,
      isActive: true,
      automationStatus: "active",
    });
  });
});
