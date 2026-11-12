import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  locale: "en",
  selectorState: {
    tenant: {
      _id: "tenant-a",
      modules: { reports: true, ai: true },
    },
    workspaceAccess: {
      tenantId: "tenant-a",
      userId: "user-a",
      membershipId: "membership-a",
      accessVersion: 4,
      permissions: ["reports.view", "ai.use"],
      locationAccess: {
        mode: "selected",
        locationIds: ["location-2", "location-1"],
      },
    },
    activeLocationId: "location-2",
  },
  listQuery: vi.fn(),
  conversationQuery: vi.fn(),
  createConversation: vi.fn(),
  sendMessage: vi.fn(),
  briefingQuery: vi.fn(),
  aiAccess: {
    cacheScope: "tenant-a-ai-access",
    canReadCached: true,
  },
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key) => key,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.selectorState),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={typeof href === "string" ? href : ""} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.tenant,
  selectCurrentWorkspaceAccess: (state) => state.workspaceAccess,
}));

vi.mock("@/components/auth/AiFeatureBoundary", () => ({
  useAiAccess: () => mocks.aiAccess,
}));

vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.activeLocationId,
}));

vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGetAiAssistantConversationsQuery: (...args) => mocks.listQuery(...args),
  useGetLatestAiBriefingQuery: (...args) => mocks.briefingQuery(...args),
  useGetAiAssistantConversationQuery: (...args) =>
    mocks.conversationQuery(...args),
  useCreateAiAssistantConversationMutation: () => [
    mocks.createConversation,
    { isLoading: false },
  ],
  useSendAiAssistantMessageMutation: () => [
    mocks.sendMessage,
    { isLoading: false },
  ],
}));

vi.mock("@/components/ai/AiMessage", () => ({
  default: ({
    message,
    onReply,
    onRetry,
    canCreateBooking,
    showNavigation,
  }) => (
    <div
      data-testid="ai-message"
      data-can-create-booking={canCreateBooking ? "true" : "false"}
      data-show-navigation={showNavigation ? "true" : "false"}
    >
      {String(message?.content ?? message?.text ?? "")}
      {onReply
        ? (message?.suggestedReplies ?? []).map((reply) => (
            <button key={reply} type="button" onClick={() => onReply(reply)}>
              {reply}
            </button>
          ))
        : null}
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          assistant.retry
        </button>
      ) : null}
    </div>
  ),
}));

import StudioAssistantConversation from "@/components/ai/StudioAssistantConversation";

const TENANT_A_CACHE_SCOPE =
  "tenant-a|user-a|membership-a|4|selected|location-1,location-2|ai.use,reports.view|ai=1,reports=1|active-location:location-2";

const tenantAList = [
  { id: "conversation-a", title: "Current workspace conversation" },
];

const selectTenantB = () => {
  mocks.selectorState = {
    tenant: { _id: "tenant-b", modules: { ai: true } },
    workspaceAccess: {
      tenantId: "tenant-b",
      userId: "user-b",
      membershipId: "membership-b",
      accessVersion: 1,
      permissions: ["ai.use"],
      locationAccess: { mode: "selected", locationIds: ["location-b"] },
    },
    activeLocationId: "location-b",
  };
  mocks.listQuery.mockReturnValue({
    data: tenantAList,
    currentData: [],
  });
};

const queryResultForCurrentScope = (args) => {
  if (!String(args?.cacheScope ?? "").startsWith("tenant-a|")) {
    return {
      data: {
        messages: [
          {
            id: "stale-message",
            role: "assistant",
            content: "Stale tenant message",
          },
        ],
      },
      currentData: undefined,
      isFetching: true,
    };
  }

  return args?.conversationId === "conversation-a"
    ? {
        data: {
          messages: [
            {
              id: "wrong-data-message",
              role: "assistant",
              content: "Wrong RTK data message",
            },
          ],
        },
        currentData: {
          messages: [
            {
              id: "current-data-message",
              role: "assistant",
              content: "Current scoped message",
            },
          ],
        },
      }
    : { currentData: undefined };
};

describe("StudioAssistantConversation workspace cache scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.locale = "en";
    mocks.selectorState = {
      tenant: {
        _id: "tenant-a",
        modules: { reports: true, ai: true },
      },
      workspaceAccess: {
        tenantId: "tenant-a",
        userId: "user-a",
        membershipId: "membership-a",
        accessVersion: 4,
        permissions: ["reports.view", "ai.use"],
        locationAccess: {
          mode: "selected",
          locationIds: ["location-2", "location-1"],
        },
      },
      activeLocationId: "location-2",
    };
    mocks.listQuery.mockReturnValue({
      data: [{ id: "stale-conversation", title: "Stale tenant conversation" }],
      currentData: tenantAList,
    });
    mocks.conversationQuery.mockImplementation(queryResultForCurrentScope);
    mocks.aiAccess = {
      cacheScope: "tenant-a-ai-access",
      canReadCached: true,
    };
    mocks.briefingQuery.mockReturnValue({
      data: undefined,
      currentData: undefined,
    });
    mocks.createConversation.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ id: "new-conversation" }),
    }));
    mocks.sendMessage.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          message: {
            id: "assistant-response",
            role: "assistant",
            content: "Scoped assistant reply",
          },
        }),
    }));
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("scopes list and detail caches and renders only currentData", () => {
    render(<StudioAssistantConversation showHistory />);

    expect(mocks.listQuery).toHaveBeenCalledWith(
      { cacheScope: TENANT_A_CACHE_SCOPE, limit: 30 },
      { skip: false },
    );
    expect(screen.getByText("Current workspace conversation")).toBeVisible();
    expect(screen.queryByText("Stale tenant conversation")).toBeNull();

    fireEvent.click(screen.getByText("Current workspace conversation"));

    expect(mocks.conversationQuery).toHaveBeenLastCalledWith(
      {
        cacheScope: TENANT_A_CACHE_SCOPE,
        conversationId: "conversation-a",
      },
      { skip: false },
    );
    expect(screen.getByText("Current scoped message")).toBeVisible();
    expect(screen.queryByText("Wrong RTK data message")).toBeNull();
  });

  it("clears selected and optimistic messages when access or location scope changes", async () => {
    const onConversationChange = vi.fn();
    const view = render(
      <StudioAssistantConversation
        showHistory
        onConversationChange={onConversationChange}
      />,
    );

    fireEvent.click(screen.getByText("Current workspace conversation"));
    expect(screen.getByText("Current scoped message")).toBeVisible();

    fireEvent.change(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
      {
        target: { value: "Scoped local question" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));

    expect(screen.getByText("Scoped local question")).toBeVisible();
    await waitFor(() =>
      expect(screen.getByText("Scoped assistant reply")).toBeVisible(),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
      {
        target: { value: "Unsent tenant-a draft" },
      },
    );
    expect(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
    ).toHaveValue("Unsent tenant-a draft");

    selectTenantB();

    view.rerender(
      <StudioAssistantConversation
        showHistory
        onConversationChange={onConversationChange}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("Current scoped message")).toBeNull();
      expect(screen.queryByText("Scoped local question")).toBeNull();
      expect(screen.queryByText("Scoped assistant reply")).toBeNull();
    });
    expect(screen.getByText("assistant.emptyTitle")).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
    ).toHaveValue("");
    expect(onConversationChange).toHaveBeenLastCalledWith("");
    expect(mocks.listQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cacheScope: expect.stringContaining(
          "tenant-b|user-b|membership-b|1|selected|location-b|ai.use|ai=1|active-location:location-b",
        ),
      }),
      { skip: false },
    );
    expect(mocks.conversationQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cacheScope: expect.stringContaining("tenant-b|user-b"),
        conversationId: "",
      }),
      { skip: true },
    );
  });

  it("ignores an in-flight response after the workspace scope changes", async () => {
    let resolveResponse;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });
    mocks.sendMessage.mockReturnValue({ unwrap: () => responsePromise });
    const view = render(<StudioAssistantConversation showHistory />);

    fireEvent.click(screen.getByText("Current workspace conversation"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
      { target: { value: "Question from tenant A" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));
    expect(screen.getByText("Question from tenant A")).toBeVisible();

    selectTenantB();
    view.rerender(<StudioAssistantConversation showHistory />);
    await waitFor(() =>
      expect(screen.queryByText("Question from tenant A")).toBeNull(),
    );

    await act(async () => {
      resolveResponse({
        message: {
          id: "late-tenant-a-response",
          role: "assistant",
          content: "Late response from tenant A",
        },
      });
      await responsePromise;
    });

    expect(screen.queryByText("Late response from tenant A")).toBeNull();
    expect(screen.getByText("assistant.emptyTitle")).toBeVisible();
  });

  it("clears a setup conversation when the assistant surface changes", async () => {
    const setupContext = {
      surface: "setup_center",
      route: "/app/settings/payments",
      setupStepId: "payments",
    };
    const commandContext = {
      surface: "command_center",
      route: "/app/ai",
    };
    const view = render(
      <StudioAssistantConversation
        showHistory
        assistantContext={setupContext}
      />,
    );

    fireEvent.click(screen.getByText("Current workspace conversation"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
      { target: { value: "Help with this payment step" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));

    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          context: setupContext,
          message: "Help with this payment step",
        }),
      ),
    );

    fireEvent.change(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
      { target: { value: "Now summarize the whole studio" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));

    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          message: "Now summarize the whole studio",
        }),
      ),
    );
    expect(mocks.sendMessage.mock.calls.at(-1)[0]).not.toHaveProperty(
      "context",
    );

    view.rerender(
      <StudioAssistantConversation
        showHistory
        assistantContext={commandContext}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("Help with this payment step")).toBeNull();
      expect(screen.queryByText("Scoped assistant reply")).toBeNull();
      expect(screen.getByText("assistant.emptyTitle")).toBeVisible();
    });

    fireEvent.click(screen.getByText("Current workspace conversation"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
      { target: { value: "Give me a general studio summary" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));

    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          context: commandContext,
          message: "Give me a general studio summary",
        }),
      ),
    );
  });

  it("clears the conversation when the canonical page entity changes", async () => {
    const firstContext = {
      surface: "workspace",
      route: "/app/bookings",
      entity: { kind: "booking", id: "507f1f77bcf86cd799439011" },
    };
    const secondContext = {
      surface: "workspace",
      route: "/app/bookings",
      entity: { kind: "booking", id: "507f191e810c19729de860ea" },
    };
    const view = render(
      <StudioAssistantConversation
        showHistory
        assistantContext={firstContext}
      />,
    );

    fireEvent.click(screen.getByText("Current workspace conversation"));
    expect(screen.getByText("Current scoped message")).toBeVisible();

    view.rerender(
      <StudioAssistantConversation
        showHistory
        assistantContext={secondContext}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText("Current scoped message")).toBeNull();
      expect(screen.getByText("assistant.emptyTitle")).toBeVisible();
    });
  });

  it("uses the currently selected locale for every new response", async () => {
    const view = render(<StudioAssistantConversation showHistory />);

    fireEvent.click(screen.getByText("Current workspace conversation"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
      { target: { value: "English question" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));

    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          locale: "en",
          message: "English question",
        }),
      ),
    );

    mocks.locale = "cs";
    view.rerender(<StudioAssistantConversation showHistory />);
    fireEvent.change(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
      { target: { value: "Česká otázka" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));

    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          locale: "cs",
          message: "Česká otázka",
        }),
      ),
    );
  });

  it("restores one-turn setup context for a failed request and consumes it after retry", async () => {
    const setupContext = {
      surface: "setup_center",
      route: "/app/settings/payments",
      setupStepId: "payments",
    };
    mocks.sendMessage
      .mockImplementationOnce(() => ({
        unwrap: () => Promise.reject(new Error("Temporary connection error")),
      }))
      .mockImplementation(() => ({
        unwrap: () =>
          Promise.resolve({
            message: {
              id: "assistant-response",
              role: "assistant",
              content: "Setup answer",
            },
          }),
      }));
    render(
      <StudioAssistantConversation
        showHistory
        assistantContext={setupContext}
      />,
    );

    fireEvent.click(screen.getByText("Current workspace conversation"));
    const input = screen.getByRole("textbox", {
      name: "assistant.inputLabel",
    });
    fireEvent.change(input, { target: { value: "Retry setup help" } });
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));

    await waitFor(() => expect(input).toHaveValue("Retry setup help"));
    expect(mocks.sendMessage.mock.calls[0][0]).toMatchObject({
      context: setupContext,
      message: "Retry setup help",
    });

    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));
    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledTimes(2));
    expect(mocks.sendMessage.mock.calls[1][0]).toMatchObject({
      context: setupContext,
      message: "Retry setup help",
    });

    fireEvent.change(input, { target: { value: "Now answer generally" } });
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));
    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledTimes(3));
    expect(mocks.sendMessage.mock.calls[2][0]).toMatchObject({
      message: "Now answer generally",
    });
    expect(mocks.sendMessage.mock.calls[2][0]).not.toHaveProperty("context");
  });

  it("updates an untouched localized starter prompt without replacing a user draft", () => {
    const view = render(
      <StudioAssistantConversation
        showHistory
        starterPrompt="English starter question"
      />,
    );
    const input = screen.getByRole("textbox", {
      name: "assistant.inputLabel",
    });

    expect(input).toHaveValue("English starter question");

    mocks.locale = "cs";
    view.rerender(
      <StudioAssistantConversation
        showHistory
        starterPrompt="Česká úvodní otázka"
      />,
    );
    expect(input).toHaveValue("Česká úvodní otázka");

    fireEvent.change(input, {
      target: { value: "Můj vlastní rozepsaný dotaz" },
    });
    mocks.locale = "en";
    view.rerender(
      <StudioAssistantConversation
        showHistory
        starterPrompt="English starter question"
      />,
    );

    expect(input).toHaveValue("Můj vlastní rozepsaný dotaz");
  });

  it("shows at most four starter prompts allowed by modules and permissions", async () => {
    mocks.selectorState = {
      ...mocks.selectorState,
      tenant: {
        ...mocks.selectorState.tenant,
        modules: {
          ai: true,
          bookings: true,
          staff_tasks: true,
          inventory: true,
        },
      },
      workspaceAccess: {
        ...mocks.selectorState.workspaceAccess,
        permissions: [
          "ai.use",
          "bookings.view",
          "tasks.view",
          "inventory.view",
        ],
      },
    };
    const view = render(<StudioAssistantConversation />);

    for (const key of ["today", "bookings", "teamBlockers", "reorders"]) {
      expect(
        screen.getByRole("button", {
          name: `assistant.suggestions.${key}`,
        }),
      ).toBeVisible();
    }
    expect(
      screen.queryByRole("button", {
        name: "assistant.suggestions.generalHelp",
      }),
    ).toBeNull();

    mocks.selectorState = {
      ...mocks.selectorState,
      tenant: {
        ...mocks.selectorState.tenant,
        modules: {
          ai: true,
          bookings: true,
          staff_tasks: false,
          inventory: true,
        },
      },
      workspaceAccess: {
        ...mocks.selectorState.workspaceAccess,
        permissions: ["ai.use", "bookings.view", "tasks.view"],
      },
    };
    view.rerender(<StudioAssistantConversation />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "assistant.suggestions.bookings",
        }),
      ).toBeVisible();
      expect(
        screen.queryByRole("button", {
          name: "assistant.suggestions.teamBlockers",
        }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", {
          name: "assistant.suggestions.reorders",
        }),
      ).toBeNull();
    });
  });

  it("submits suggested replies only from the latest assistant message", async () => {
    mocks.conversationQuery.mockImplementation((args) =>
      args?.conversationId === "conversation-a"
        ? {
            currentData: {
              messages: [
                {
                  id: "user-old",
                  role: "user",
                  content: "How many bookings?",
                },
                {
                  id: "assistant-old",
                  role: "assistant",
                  content: "Which period?",
                  suggestedReplies: ["Old option"],
                },
                {
                  id: "user-latest",
                  role: "user",
                  content: "Show me the choices",
                },
                {
                  id: "assistant-latest",
                  role: "assistant",
                  content: "Choose a period",
                  suggestedReplies: ["Today", "Upcoming", "All time"],
                },
              ],
            },
          }
        : { currentData: undefined },
    );
    render(<StudioAssistantConversation showHistory />);

    fireEvent.click(screen.getByText("Current workspace conversation"));

    expect(
      await screen.findByRole("button", { name: "Upcoming" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Old option" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Upcoming" }));

    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          conversationId: "conversation-a",
          locale: "en",
          message: "Upcoming",
        }),
      ),
    );
    expect(mocks.createConversation).not.toHaveBeenCalled();
  });

  it("normalizes suggested replies returned by a new assistant response", async () => {
    mocks.sendMessage.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          message: {
            id: "assistant-clarification",
            role: "assistant",
            content: "Which period should I check?",
            suggestedReplies: ["Today", "Upcoming", "All time"],
          },
        }),
    }));
    render(<StudioAssistantConversation showHistory />);

    fireEvent.click(screen.getByText("Current workspace conversation"));
    fireEvent.change(
      screen.getByRole("textbox", { name: "assistant.inputLabel" }),
      { target: { value: "How many bookings do I have?" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "assistant.send" }));

    expect(
      await screen.findByRole("button", { name: "Upcoming" }),
    ).toBeVisible();
  });

  it("retries an unavailable response with its preceding user message", async () => {
    mocks.conversationQuery.mockImplementation((args) =>
      args?.conversationId === "conversation-a"
        ? {
            currentData: {
              messages: [
                {
                  id: "user-unavailable",
                  role: "user",
                  content: "Help me plan a promotion",
                },
                {
                  id: "assistant-unavailable",
                  role: "assistant",
                  content: "The live conversation service is unavailable.",
                  grounding: {
                    status: "unavailable",
                    basis: "insufficient",
                    insufficientEvidence: true,
                  },
                },
              ],
            },
          }
        : { currentData: undefined },
    );
    render(<StudioAssistantConversation showHistory />);

    fireEvent.click(screen.getByText("Current workspace conversation"));
    fireEvent.click(
      await screen.findByRole("button", { name: "assistant.retry" }),
    );

    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          conversationId: "conversation-a",
          message: "Help me plan a promotion",
        }),
      ),
    );
    expect(mocks.createConversation).not.toHaveBeenCalled();
  });

  it("shows a bounded fresh Operations Inbox and seeds a grounded question", async () => {
    const dateKey = new Date().toISOString().slice(0, 10);
    mocks.briefingQuery.mockReturnValue({
      data: {
        briefing: {
          locale: "en",
          dateKey,
          freshness: { state: "fresh" },
          operationsInbox: [
            { id: "stale", title: "Retained RTK data", prompt: "Wrong prompt" },
          ],
        },
      },
      currentData: {
        briefing: {
          locale: "en",
          dateKey,
          timezone: "UTC",
          locationId: "location-2",
          scopeKey: "location:location-2",
          freshness: { state: "fresh" },
          operationsInbox: [
            {
              id: "attention-a",
              type: "staff",
              severity: "critical",
              title: "Staff blocker",
              description: "One team member needs help.",
              prompt: "Which staff blocker needs my help first?",
              href: "/app/operations?section=tasks",
            },
            {
              id: "attention-b",
              type: "inventory",
              severity: "warning",
              title: "Low inventory",
              description: "Two items may need replenishment.",
              prompt: "Which inventory items should I review?",
              href: "https://attacker.example/app",
            },
          ],
        },
      },
    });

    render(<StudioAssistantConversation />);

    expect(mocks.briefingQuery).toHaveBeenLastCalledWith(
      {
        cacheScope: "tenant-a-ai-access",
        locale: "en",
        locationId: "location-2",
      },
      { skip: false },
    );
    expect(screen.getByText("Staff blocker")).toBeVisible();
    expect(screen.getByText("Low inventory")).toBeVisible();
    expect(screen.queryByText("Retained RTK data")).toBeNull();
    expect(
      screen.getByRole("link", { name: "assistant.operationsInbox.openItem" }),
    ).toHaveAttribute("href", "/app/operations?section=tasks");
    expect(screen.getAllByRole("link")).toHaveLength(1);

    fireEvent.click(
      screen.getAllByRole("button", {
        name: "assistant.operationsInbox.ask",
      })[0],
    );

    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenLastCalledWith({
        conversationId: "new-conversation",
        message: "Which staff blocker needs my help first?",
        locale: "en",
        context: { surface: "dashboard", route: "/app" },
      }),
    );
  });

  it("renders safe loading and empty Inbox states without generating anything", () => {
    mocks.briefingQuery.mockReturnValue({
      currentData: undefined,
      isLoading: true,
      isFetching: true,
    });
    const loading = render(<StudioAssistantConversation />);

    expect(screen.getByText("assistant.operationsInbox.loading")).toBeVisible();
    loading.unmount();

    const dateKey = new Date().toISOString().slice(0, 10);
    mocks.briefingQuery.mockReturnValue({
      currentData: {
        briefing: {
          locale: "en",
          dateKey,
          timezone: "UTC",
          locationId: "location-2",
          scopeKey: "location:location-2",
          freshness: { state: "fresh" },
          coverage: { complete: true },
          operationsInbox: [],
        },
      },
      isLoading: false,
      isFetching: false,
    });
    render(<StudioAssistantConversation />);

    expect(screen.getByText("assistant.operationsInbox.empty")).toBeVisible();
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it("hides stale, wrong-locale, and explicitly wrong-location Inbox data", () => {
    const dateKey = new Date().toISOString().slice(0, 10);
    for (const briefing of [
      {
        locale: "en",
        dateKey,
        freshness: { state: "stale" },
        operationsInbox: [{ id: "stale", title: "Stale attention" }],
      },
      {
        locale: "cs",
        dateKey,
        freshness: { state: "fresh" },
        operationsInbox: [{ id: "locale", title: "Wrong locale attention" }],
      },
      {
        locale: "en",
        dateKey,
        locationId: "location-1",
        freshness: { state: "fresh" },
        operationsInbox: [
          { id: "location", title: "Wrong location attention" },
        ],
      },
      {
        locale: "en",
        dateKey,
        freshness: { state: "fresh" },
        priorities: ["Legacy priority must not be promoted"],
      },
    ]) {
      mocks.briefingQuery.mockReturnValue({
        currentData: { briefing },
      });
      const view = render(<StudioAssistantConversation />);
      expect(
        screen.queryByText(
          /Stale attention|Wrong locale attention|Wrong location attention|Legacy priority/,
        ),
      ).toBeNull();
      view.unmount();
    }

    mocks.aiAccess = {
      cacheScope: "tenant-a-ai-access",
      canReadCached: false,
    };
    mocks.briefingQuery.mockReturnValue({ currentData: undefined });
    render(<StudioAssistantConversation />);
    expect(mocks.briefingQuery).toHaveBeenLastCalledWith(expect.any(Object), {
      skip: true,
    });
  });

  it("matches the server booking-composer capability gate", () => {
    mocks.selectorState.tenant.modules.bookings = true;
    mocks.selectorState.workspaceAccess.permissions.push("bookings.create");
    mocks.conversationQuery.mockImplementation((args) =>
      args?.conversationId === "conversation-a"
        ? {
            currentData: {
              messages: [
                { id: "assistant-old", role: "assistant", content: "Old" },
                { id: "user-latest", role: "user", content: "Latest question" },
                {
                  id: "assistant-latest",
                  role: "assistant",
                  content: "Latest",
                },
              ],
            },
          }
        : { currentData: undefined },
    );

    const view = render(<StudioAssistantConversation showHistory />);
    fireEvent.click(screen.getByText("Current workspace conversation"));

    let rendered = screen.getAllByTestId("ai-message");
    expect(rendered[0]).toHaveAttribute("data-show-navigation", "false");
    expect(rendered[2]).toHaveAttribute("data-show-navigation", "true");
    expect(rendered[2]).toHaveAttribute("data-can-create-booking", "false");

    view.unmount();
    mocks.selectorState.workspaceAccess.permissions.push(
      "locations.view",
      "products.view",
    );
    render(<StudioAssistantConversation showHistory />);
    fireEvent.click(screen.getByText("Current workspace conversation"));

    rendered = screen.getAllByTestId("ai-message");
    expect(rendered[2]).toHaveAttribute("data-can-create-booking", "true");
  });

  it("keeps the compact composer small, accessible, and keyboard friendly", async () => {
    render(<StudioAssistantConversation compact />);
    const input = screen.getByRole("textbox", {
      name: "assistant.inputLabel",
    });
    const send = screen.getByRole("button", { name: "assistant.send" });
    const form = input.closest("form");

    expect(form).toHaveAttribute("data-ai-composer");
    expect(form).toHaveAttribute("data-ui-unstyled", "true");
    expect(input).toHaveAttribute("rows", "1");
    expect(input).toHaveAttribute("aria-describedby");
    expect(send).toHaveAttribute("data-ai-composer-send");
    expect(send).toHaveClass("h-11", "w-11");

    let scrollHeight = 48;
    Object.defineProperty(input, "scrollHeight", {
      configurable: true,
      get: () => scrollHeight,
    });
    fireEvent.change(input, { target: { value: "Keep this on two lines" } });
    await waitFor(() => {
      expect(input.style.height).toBe("48px");
      expect(input.style.overflowY).toBe("hidden");
    });

    scrollHeight = 96;
    fireEvent.change(input, {
      target: { value: "Keep this on two lines and add more detail" },
    });
    await waitFor(() => {
      expect(input.style.height).toBe("56px");
      expect(input.style.overflowY).toBe("auto");
    });

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(mocks.createConversation).not.toHaveBeenCalled();

    fireEvent.keyDown(input, {
      key: "Enter",
      isComposing: true,
    });
    expect(mocks.createConversation).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(mocks.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Keep this on two lines and add more detail",
        }),
      ),
    );
  });

  it("leaves the full-page composer on its established multiline contract", () => {
    render(<StudioAssistantConversation showHistory />);
    const input = screen.getByRole("textbox", {
      name: "assistant.inputLabel",
    });

    expect(input).toHaveAttribute("rows", "3");
    expect(input.closest("form")).not.toHaveAttribute("data-ai-composer");
    expect(input.closest("form")).not.toHaveAttribute("data-ui-unstyled");
  });
});
