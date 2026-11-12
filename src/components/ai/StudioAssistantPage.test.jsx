import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  intent: "review-daily-briefing",
  sourceId: null,
  recommendationId: null,
  view: null,
  paramsNull: false,
  conversationProps: null,
  advisorProps: null,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () =>
    mocks.paramsNull
      ? null
      : {
          get: (key) =>
            key === "intent"
              ? mocks.intent
              : key === "sourceId"
                ? mocks.sourceId
                : key === "recommendationId"
                  ? mocks.recommendationId
                  : key === "view"
                    ? mocks.view
                    : null,
        },
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => {
    if (key === "assistant.intents.reviewDailyBriefing") {
      return "Review today’s verified briefing without making changes.";
    }
    if (key === "assistant.intents.testKnowledge") {
      return "Test only this approved source.";
    }
    if (key === "assistant.intents.reviewBusinessAdvice") {
      return "Review this verified recommendation without making changes.";
    }
    return key;
  },
}));

vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  useAiAccess: () => ({
    available: true,
    hasPermission: true,
    isLoading: false,
    moduleEnabled: true,
    usageBlocked: false,
  }),
}));

vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGetAiActionsQuery: () => ({ data: { total: 0 } }),
}));

vi.mock("./StudioAssistantConversation", () => ({
  default: (props) => {
    mocks.conversationProps = props;
    return <div>Assistant conversation</div>;
  },
}));

vi.mock("./AiActionActivity", () => ({
  default: () => <div>Action activity panel</div>,
}));

vi.mock("./BusinessAdvisorPanel", () => ({
  default: (props) => {
    mocks.advisorProps = props;
    return <div>Business Advisor panel</div>;
  },
}));

import StudioAssistantPage from "./StudioAssistantPage";

describe("StudioAssistantPage briefing intent", () => {
  beforeEach(() => {
    mocks.intent = "review-daily-briefing";
    mocks.sourceId = null;
    mocks.recommendationId = null;
    mocks.view = null;
    mocks.paramsNull = false;
    mocks.conversationProps = null;
    mocks.advisorProps = null;
  });

  it("prefills an editable allowlisted prompt without submitting it", () => {
    render(<StudioAssistantPage showPageHeader={false} />);

    expect(mocks.conversationProps).toMatchObject({
      starterPrompt: "Review today’s verified briefing without making changes.",
      assistantContext: { surface: "dashboard", route: "/app" },
    });
    expect(screen.getByText("Assistant conversation")).toBeVisible();
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("ignores unknown intents and exposes the activity tab semantically", () => {
    mocks.intent = "unknown-destructive-intent";
    render(<StudioAssistantPage showPageHeader={false} />);

    expect(mocks.conversationProps).toMatchObject({
      starterPrompt: "",
      assistantContext: { surface: "command_center", route: "/app/ai" },
    });
    fireEvent.click(screen.getByRole("tab", { name: /activity/i }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Action activity panel",
    );
  });

  it("supports roving keyboard focus across command center tabs", () => {
    render(<StudioAssistantPage showPageHeader={false} />);
    const assistantTab = screen.getByRole("tab", { name: /assistant/i });
    const advisorTab = screen.getByRole("tab", { name: /advisor/i });

    assistantTab.focus();
    fireEvent.keyDown(assistantTab, { key: "ArrowRight" });

    expect(advisorTab).toHaveFocus();
    expect(advisorTab).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tabpanel")).toHaveTextContent(
      "Business Advisor panel",
    );
  });

  it("prefills a pinned Knowledge Hub test without auto-submitting it", () => {
    mocks.intent = "test-knowledge";
    mocks.sourceId = "507f1f77bcf86cd799439011";

    render(<StudioAssistantPage showPageHeader={false} />);

    expect(mocks.conversationProps).toMatchObject({
      starterPrompt: "Test only this approved source.",
      assistantContext: {
        surface: "knowledge_hub",
        route: "/app/knowledge",
        knowledgeSourceId: "507f1f77bcf86cd799439011",
      },
    });
  });

  it("opens a deep-linked Advisor recommendation without rendering the assistant", () => {
    mocks.intent = null;
    mocks.view = "advisor";
    mocks.recommendationId = "adv_507f1f77bcf86cd799439011";

    render(<StudioAssistantPage showPageHeader={false} />);

    expect(screen.getByText("Business Advisor panel")).toBeVisible();
    expect(mocks.advisorProps).toMatchObject({
      selectedRecommendationId: "adv_507f1f77bcf86cd799439011",
    });
    expect(mocks.advisorProps.onDiscuss).toEqual(expect.any(Function));
    expect(screen.getByRole("tab", { name: /advisor/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("prefills a server-resolved Business Advisor discussion context", () => {
    mocks.intent = "review-business-advice";
    mocks.recommendationId = "adv_507f1f77bcf86cd799439011";

    render(<StudioAssistantPage showPageHeader={false} />);

    expect(mocks.conversationProps).toMatchObject({
      starterPrompt:
        "Review this verified recommendation without making changes.",
      assistantContext: {
        surface: "business_advisor",
        route: "/app/ai",
        recommendationId: "adv_507f1f77bcf86cd799439011",
      },
    });
  });

  it("handles a null search-params value without crashing", () => {
    mocks.paramsNull = true;
    render(<StudioAssistantPage showPageHeader={false} />);

    expect(screen.getByText("Assistant conversation")).toBeVisible();
  });
});
