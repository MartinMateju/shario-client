import { describe, expect, it } from "vitest";

import {
  AI_SETTINGS_FEATURE_KEYS,
  mergeAiSettings,
  toWireAiSettings,
} from "@/components/ai/AiSettingsPage";
import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";

describe("reports AI settings contract", () => {
  it("omits the retired communications copilot even when legacy settings enable it", () => {
    expect(AI_SETTINGS_FEATURE_KEYS).not.toContain("communicationsCopilot");

    const settings = mergeAiSettings({ communicationsCopilotEnabled: true });
    expect(settings.features).not.toHaveProperty("communicationsCopilot");

    const payload = toWireAiSettings({
      ...settings,
      features: {
        ...settings.features,
        communicationsCopilot: true,
        reportInsights: false,
      },
    });

    expect(payload).not.toHaveProperty("communicationsCopilotEnabled");
    expect(payload.reportInsightsEnabled).toBe(false);
  });

  it("exposes report insights as an independent AI feature", () => {
    expect(AI_SETTINGS_FEATURE_KEYS).toContain("reportInsights");

    const disabled = mergeAiSettings({ reportInsightsEnabled: false });
    expect(disabled.features.reportInsights).toBe(false);
    expect(disabled.features.dailyBriefing).toBe(true);

    expect(
      toWireAiSettings({
        ...disabled,
        features: {
          ...disabled.features,
          reportInsights: true,
          dailyBriefing: false,
        },
      }),
    ).toMatchObject({
      reportInsightsEnabled: true,
      dailyBriefingEnabled: false,
    });
  });

  it.each([
    ["English", messagesEn],
    ["Czech", messagesCs],
  ])("provides %s labels and descriptions", (_language, messages) => {
    const copy = messages.AI.settings.features.reportInsights;

    expect(copy.label).toBeTruthy();
    expect(copy.description).toBeTruthy();
  });

  it("exposes Staff Planning AI as an independent feature", () => {
    expect(AI_SETTINGS_FEATURE_KEYS).toContain("staffPlanning");

    const disabled = mergeAiSettings({ staffPlanningEnabled: false });
    expect(disabled.features.staffPlanning).toBe(false);
    expect(disabled.features.reportInsights).toBe(true);

    expect(
      toWireAiSettings({
        ...disabled,
        features: {
          ...disabled.features,
          staffPlanning: true,
        },
      }),
    ).toMatchObject({ staffPlanningEnabled: true });
  });

  it.each([
    ["English", messagesEn],
    ["Czech", messagesCs],
  ])("provides %s Staff Planning AI copy", (_language, messages) => {
    expect(messages.AI.settings.features.staffPlanning.label).toBeTruthy();
    expect(
      messages.AI.settings.features.staffPlanning.description,
    ).toBeTruthy();
  });
});
