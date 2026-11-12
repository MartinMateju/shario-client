import { describe, expect, it } from "vitest";

import { getStudioAssistantIntent } from "./studio-assistant-intents";

describe("Studio Assistant route intents", () => {
  it("maps the daily briefing intent to an editable dashboard prompt", () => {
    expect(getStudioAssistantIntent("review-daily-briefing")).toEqual({
      promptKey: "assistant.intents.reviewDailyBriefing",
      context: { surface: "dashboard", route: "/app" },
    });
  });

  it("ignores unknown or malformed query-string intents", () => {
    expect(getStudioAssistantIntent("delete-everything")).toBeNull();
    expect(getStudioAssistantIntent(null)).toBeNull();
  });

  it("builds a pinned Knowledge Hub context only for a valid source id", () => {
    expect(
      getStudioAssistantIntent("test-knowledge", {
        sourceId: "507f1f77bcf86cd799439011",
      }),
    ).toEqual({
      promptKey: "assistant.intents.testKnowledge",
      context: {
        surface: "knowledge_hub",
        route: "/app/knowledge",
        knowledgeSourceId: "507f1f77bcf86cd799439011",
      },
    });
    expect(
      getStudioAssistantIntent("test-knowledge", {
        sourceId: "../../another-tenant",
      }),
    ).toBeNull();
  });

  it("offers a static general Knowledge Hub prompt without accepting context", () => {
    expect(getStudioAssistantIntent("ask-knowledge")).toEqual({
      promptKey: "assistant.intents.askKnowledge",
      context: { surface: "command_center", route: "/app/ai" },
    });
  });

  it("accepts only strict stable Business Advisor recommendation ids", () => {
    expect(
      getStudioAssistantIntent("review-business-advice", {
        recommendationId: "adv_507f1f77bcf86cd799439011",
      }),
    ).toEqual({
      promptKey: "assistant.intents.reviewBusinessAdvice",
      context: {
        surface: "business_advisor",
        route: "/app/ai",
        recommendationId: "adv_507f1f77bcf86cd799439011",
      },
    });
    expect(
      getStudioAssistantIntent("review-business-advice", {
        recommendationId: "../../another-tenant",
      }),
    ).toBeNull();
  });
});
