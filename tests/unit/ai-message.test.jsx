import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useSubmitAiFeedbackMutation: () => [vi.fn()],
}));

vi.mock("@/components/ai/AiSources", () => ({
  default: () => <div data-testid="source-disclosure">Show sources</div>,
}));

vi.mock("@/components/ai/AiActionConfirmation", () => ({
  default: () => null,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }) => <a href={href}>{children}</a>,
}));

import AiMessage from "@/components/ai/AiMessage";

const renderMessage = (message, props = {}) =>
  render(
    <AiMessage message={message} conversationId="conversation-a" {...props} />,
  );

describe("AiMessage unanswered states", () => {
  it("keeps an insufficient reply visible without sources or feedback", () => {
    renderMessage({
      role: "assistant",
      content: "I can’t verify active reorder requests right now.",
      grounding: {
        status: "insufficient",
        basis: "insufficient",
        insufficientEvidence: true,
      },
      evidence: {
        sources: [{ type: "context", label: "Inventory" }],
        context: { basis: "insufficient", sourceCount: 1 },
      },
      runId: "run-a",
    });

    expect(
      screen.getByText("I can’t verify active reorder requests right now."),
    ).toBeVisible();
    expect(screen.queryByTestId("source-disclosure")).toBeNull();
    expect(screen.queryByText("feedback.helpful")).toBeNull();
  });

  it("treats the forward-compatible unavailable status as unanswered", () => {
    renderMessage({
      role: "assistant",
      content: "That source is unavailable.",
      grounding: { status: "unavailable" },
      runId: "run-b",
    });

    expect(screen.getByText("That source is unavailable.")).toBeVisible();
    expect(screen.queryByTestId("source-disclosure")).toBeNull();
    expect(screen.queryByText("feedback.helpful")).toBeNull();
  });

  it("keeps controls for a valid workspace answer when knowledge is unavailable", () => {
    renderMessage({
      role: "assistant",
      content: "You have 148 customer accounts.",
      grounding: {
        status: "workspace_facts",
        basis: "workspace_facts",
        insufficientEvidence: false,
        knowledgeStatus: "unavailable",
      },
      runId: "run-c",
    });

    expect(screen.getByTestId("source-disclosure")).toBeVisible();
    expect(screen.getByText("feedback.helpful")).toBeVisible();
  });

  it("hides studio sources but keeps feedback for general conversation", () => {
    renderMessage({
      role: "assistant",
      content: "Here’s a concise draft you can use.",
      grounding: {
        status: "general_knowledge",
        basis: "general_knowledge",
        insufficientEvidence: false,
      },
      evidence: {
        sources: [],
        context: { basis: "general_knowledge", sourceCount: 0 },
      },
      runId: "run-general",
    });

    expect(
      screen.getByText("Here’s a concise draft you can use."),
    ).toBeVisible();
    expect(screen.queryByTestId("source-disclosure")).toBeNull();
    expect(screen.getByText("feedback.helpful")).toBeVisible();
  });

  it("renders normalized clarification replies through the supplied callback", () => {
    const onReply = vi.fn();
    renderMessage(
      {
        role: "assistant",
        content: "Which booking period should I check?",
        suggestedReplies: ["Today", "Upcoming", "All time", "Today", "", 42],
      },
      { onReply },
    );

    expect(
      screen.getByRole("group", {
        name: "assistant.suggestedRepliesLabel",
      }),
    ).toBeVisible();
    for (const reply of ["Today", "Upcoming", "All time"]) {
      expect(screen.getByRole("button", { name: reply })).toBeVisible();
    }

    fireEvent.click(screen.getByRole("button", { name: "Upcoming" }));
    expect(onReply).toHaveBeenCalledWith("Upcoming");
  });

  it("offers a retry for a provider-unavailable response", () => {
    const onRetry = vi.fn();
    renderMessage(
      {
        role: "assistant",
        content: "The live conversation service is temporarily unavailable.",
        grounding: {
          status: "unavailable",
          basis: "insufficient",
          insufficientEvidence: true,
        },
        runId: "run-unavailable",
      },
      { onRetry },
    );

    fireEvent.click(screen.getByRole("button", { name: "assistant.retry" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("source-disclosure")).toBeNull();
    expect(screen.queryByText("feedback.helpful")).toBeNull();
  });

  it("preserves safe booking navigation and suppresses invalid links", () => {
    const bookingHref =
      "/app/bookings/new?productId=product-a&locationId=location-a&start=2026-08-14T07%3A00%3A00.000Z&end=2026-08-14T08%3A00%3A00.000Z&returnTo=%2Fapp%2Fai";
    const safeView = renderMessage(
      {
        role: "assistant",
        content: "I prepared the booking form for review.",
        navigation: [
          {
            kind: "booking_composer",
            label: "Review booking",
            href: bookingHref,
          },
        ],
      },
      { canCreateBooking: true },
    );

    expect(
      screen.getByRole("link", { name: /Review booking/ }),
    ).toHaveAttribute("href", bookingHref);
    safeView.unmount();

    renderMessage({
      role: "assistant",
      content: "I could not prepare a safe destination.",
      navigation: [
        { label: "Unsafe", href: "https://example.com/app/bookings/new" },
        { label: "Missing" },
      ],
    });

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("Unsafe")).toBeNull();
    expect(screen.queryByText("Missing")).toBeNull();
  });

  it("gates booking handoff and rejects partial or tampered prefill", () => {
    const navigation = [
      {
        kind: "booking_composer",
        label: "Review booking",
        href: "/app/bookings/new?productId=product-a&locationId=location-a&start=2026-08-14T07%3A00%3A00.000Z&end=2026-08-14T08%3A00%3A00.000Z&returnTo=%2Fapp%2Fai",
      },
    ];
    const denied = renderMessage({
      role: "assistant",
      content: "Prepared.",
      navigation,
    });
    expect(screen.queryByRole("link", { name: /Review booking/ })).toBeNull();
    denied.unmount();

    const disguised = renderMessage(
      {
        role: "assistant",
        content: "Prepared.",
        navigation: [
          {
            kind: "setup_step",
            label: "Disguised booking",
            href: navigation[0].href,
          },
          {
            label: "Trailing slash booking",
            href: "/app/bookings/new/?returnTo=%2Fapp%2Fai",
          },
        ],
      },
      { canCreateBooking: true },
    );
    expect(
      screen.queryByRole("link", { name: /Disguised booking/ }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: /Trailing slash booking/ }),
    ).toBeNull();
    disguised.unmount();

    for (const href of [
      "/app/bookings/new?productId=product-a&returnTo=%2Fapp%2Fai",
      "/app/bookings/new?productId=&returnTo=%2Fapp%2Fai",
      "/app/bookings/new?productId=product-a&locationId=location-a&start=2026-08-14T07%3A00%3A00.000Z&end=2026-08-14T08%3A00%3A00.000Z&note=private",
      "/app/bookings/new?productId=product-a&productId=product-b&locationId=location-a&start=2026-08-14T07%3A00%3A00.000Z&end=2026-08-14T08%3A00%3A00.000Z",
      "/app/bookings/new?productId=product-a&locationId=location-a&start=2026-08-14T08%3A00%3A00.000Z&end=2026-08-14T07%3A00%3A00.000Z",
      "/app/bookings/new?returnTo=https%3A%2F%2Fevil.example",
    ]) {
      const view = renderMessage(
        {
          role: "assistant",
          content: "Prepared.",
          navigation: [{ kind: "booking_composer", label: "Unsafe", href }],
        },
        { canCreateBooking: true },
      );
      expect(screen.queryByRole("link", { name: /Unsafe/ })).toBeNull();
      view.unmount();
    }
  });

  it("allows an unprefilled booking handoff and avoids competing reply pills", () => {
    const onReply = vi.fn();
    renderMessage(
      {
        role: "assistant",
        content: "Open the booking form.",
        navigation: [
          {
            kind: "booking_composer",
            label: "Create booking",
            href: "/app/bookings/new?returnTo=%2Fapp%2Fai",
          },
        ],
        suggestedReplies: ["Tomorrow"],
      },
      { canCreateBooking: true, onReply },
    );

    expect(screen.getByRole("link", { name: /Create booking/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Tomorrow" })).toBeNull();
  });

  it("suppresses navigation when the message is not the latest turn", () => {
    renderMessage(
      {
        role: "assistant",
        content: "Old handoff.",
        navigation: [{ label: "Old destination", href: "/app/bookings" }],
      },
      { showNavigation: false },
    );

    expect(screen.queryByRole("link", { name: /Old destination/ })).toBeNull();
  });

  it("preserves legacy behavior when grounding is absent", () => {
    renderMessage({
      role: "assistant",
      content: "Legacy answer",
      runId: "run-d",
    });

    expect(screen.getByTestId("source-disclosure")).toBeVisible();
    expect(screen.getByText("feedback.helpful")).toBeVisible();
  });

  it("applies the calmer message treatment only to compact conversations", () => {
    const compactUser = render(
      <AiMessage
        compact
        message={{ role: "user", content: "Summarize today" }}
        conversationId="conversation-a"
      />,
    );
    const userArticle = compactUser.getByRole("article");
    expect(userArticle).toHaveAttribute("data-ai-message-variant", "compact");
    expect(userArticle).toHaveClass("max-w-[80%]");
    compactUser.unmount();

    const compactAssistant = render(
      <AiMessage
        compact
        message={{ role: "assistant", content: "Today is running smoothly." }}
        conversationId="conversation-a"
      />,
    );
    const compactArticle = compactAssistant.getByRole("article");
    expect(compactArticle).toHaveClass("max-w-[92%]");
    expect(compactArticle).not.toHaveClass("shadow-sm");
    compactAssistant.unmount();

    renderMessage({ role: "assistant", content: "Full page answer" });
    expect(screen.getByRole("article")).toHaveClass("shadow-sm");
    expect(screen.getByRole("article")).not.toHaveAttribute(
      "data-ai-message-variant",
    );
  });
});
