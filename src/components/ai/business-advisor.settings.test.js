import { describe, expect, it } from "vitest";

import {
  AI_SETTINGS_FEATURE_KEYS,
  mergeAiSettings,
  toWireAiSettings,
} from "./AiSettingsPage";
import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";

describe("Business Advisor settings contract", () => {
  it("supports an independent workspace setting and wire field", () => {
    expect(AI_SETTINGS_FEATURE_KEYS).toContain("businessAdvisor");

    const disabled = mergeAiSettings({ businessAdvisorEnabled: false });
    expect(disabled.features.businessAdvisor).toBe(false);
    expect(disabled.features.dailyBriefing).toBe(true);

    expect(
      toWireAiSettings({
        ...disabled,
        features: { ...disabled.features, businessAdvisor: true },
      }),
    ).toMatchObject({ businessAdvisorEnabled: true });
  });

  it.each([
    ["English", messagesEn],
    ["Czech", messagesCs],
  ])("provides %s settings copy", (_language, messages) => {
    expect(messages.AI.settings.features.businessAdvisor.label).toBeTruthy();
    expect(
      messages.AI.settings.features.businessAdvisor.description,
    ).toBeTruthy();
  });

  it.each([
    ["English", messagesEn],
    ["Czech", messagesCs],
  ])(
    "provides %s labels for every emitted evidence source",
    (_language, messages) => {
      const sources = messages.AI.businessAdvisor.evidence.sources;
      expect(sources.sales).toBeTruthy();
      expect(sources.stafftasks).toBeTruthy();
    },
  );
});
