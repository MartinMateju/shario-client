import { PERMISSIONS, hasPermission } from "@/config/permissions";

const ASSISTANT_SUGGESTIONS = Object.freeze([
  Object.freeze({
    key: "bookings",
    module: "bookings",
    permission: PERMISSIONS.BOOKINGS_VIEW,
  }),
  Object.freeze({
    key: "teamBlockers",
    module: "staff_tasks",
    permission: PERMISSIONS.TASKS_VIEW,
  }),
  Object.freeze({
    key: "reorders",
    module: "inventory",
    permission: PERMISSIONS.INVENTORY_VIEW,
  }),
]);

export const getStudioAssistantSuggestionKeys = ({ tenant, access } = {}) => {
  const suggestions = ["today"];

  ASSISTANT_SUGGESTIONS.forEach((suggestion) => {
    if (
      tenant?.modules?.[suggestion.module] === true &&
      hasPermission(access, suggestion.permission)
    ) {
      suggestions.push(suggestion.key);
    }
  });

  if (suggestions.length === 1) suggestions.push("generalHelp");
  return suggestions.slice(0, 4);
};

const ASSISTANT_INTENTS = {
  "review-daily-briefing": {
    promptKey: "assistant.intents.reviewDailyBriefing",
    context: { surface: "dashboard", route: "/app" },
  },
  "ask-knowledge": {
    promptKey: "assistant.intents.askKnowledge",
    context: { surface: "command_center", route: "/app/ai" },
  },
};

const KNOWLEDGE_RESOURCE_ID = /^[a-f\d]{24}$/i;
const ADVISOR_RECOMMENDATION_ID = /^adv_[a-f\d]{24}$/i;

export const getStudioAssistantIntent = (
  value,
  { sourceId, recommendationId } = {},
) => {
  if (typeof value !== "string") return null;

  if (value === "test-knowledge") {
    const knowledgeSourceId = String(sourceId ?? "").trim();
    if (!KNOWLEDGE_RESOURCE_ID.test(knowledgeSourceId)) return null;

    return {
      promptKey: "assistant.intents.testKnowledge",
      context: {
        surface: "knowledge_hub",
        route: "/app/knowledge",
        knowledgeSourceId,
      },
    };
  }

  if (value === "review-business-advice") {
    const normalizedRecommendationId = String(recommendationId ?? "").trim();
    if (!ADVISOR_RECOMMENDATION_ID.test(normalizedRecommendationId)) {
      return null;
    }

    return {
      promptKey: "assistant.intents.reviewBusinessAdvice",
      context: {
        surface: "business_advisor",
        route: "/app/ai",
        recommendationId: normalizedRecommendationId,
      },
    };
  }

  return ASSISTANT_INTENTS[value] ?? null;
};
