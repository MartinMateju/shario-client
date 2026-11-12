import { describe, expect, it } from "vitest";

import messagesCs from "@/messages/cs.json";
import messagesEn from "@/messages/en.json";
import messagesNl from "@/messages/nl.json";

const workflowPresets = ["bookingStudio", "membershipStudio", "fullWorkspace"];

describe.each([
  ["English", messagesEn],
  ["Czech", messagesCs],
  ["Dutch", messagesNl],
])("WorkspaceModules translations in %s", (_locale, messages) => {
  it("provides the five generic setup questions", () => {
    const questions = messages.WorkspaceModules.workflowQuestions;
    for (const key of [
      "sharedStudio",
      "classes",
      "memberships",
      "vouchers",
      "inventory",
    ]) {
      expect(questions.items[key].question).toEqual(expect.any(String));
      expect(questions.items[key].description).toEqual(expect.any(String));
    }
    expect(questions.items).not.toHaveProperty("firingServices");
    expect(questions.items).not.toHaveProperty("pricingMode");
  });
  it("keeps dependency and workflow preset copy in the component namespace", () => {
    expect(messages.WorkspaceModules.requiresCommunications).toEqual(
      expect.any(String),
    );

    const { presets } = messages.WorkspaceModules;

    for (const key of [
      "eyebrow",
      "title",
      "description",
      "applied",
      "notAvailable",
      "note",
    ]) {
      expect(presets[key]).toEqual(expect.any(String));
    }

    for (const preset of workflowPresets) {
      expect(presets.options[preset].title).toEqual(expect.any(String));
      expect(presets.options[preset].description).toEqual(expect.any(String));
    }
  });
});
