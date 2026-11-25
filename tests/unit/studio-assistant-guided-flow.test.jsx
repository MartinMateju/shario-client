import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  state: {},
  locale: "en",
  create: vi.fn(),
  send: vi.fn(),
  reportProps: null,
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key) => key,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.tenant,
  selectCurrentWorkspaceAccess: (state) => state.access,
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: (state) => state.locationId,
}));
vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useCreateAiAssistantConversationMutation: () => [mocks.create],
  useSendAiAssistantMessageMutation: () => [mocks.send],
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/ai/AiSources", () => ({
  default: () => <div>Verified sources</div>,
}));
vi.mock("@/components/ai/StudioAssistantReport", () => ({
  default: (props) => {
    mocks.reportProps = props;
    return <div data-testid="report-offer">Monthly studio report</div>;
  },
}));

import StudioAssistantQuestions from "@/components/ai/StudioAssistantQuestions";

const question = (key) =>
  screen.getByRole("button", {
    name: `guided.questions.${key}.label`,
  });
const deferred = () => {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};
const response = (text = "There are 12 bookings today.", extra = {}) => ({
  message: { id: "answer-id", role: "assistant", content: text, ...extra },
});

describe("guided studio AI questions", () => {
  beforeEach(() => {
    mocks.locale = "en";
    mocks.reportProps = null;
    mocks.state = {
      tenant: {
        _id: "tenant-a",
        modules: { ai: true, bookings: true, inventory: true },
        settings: { timezone: "Europe/Prague" },
      },
      access: {
        tenantId: "tenant-a",
        userId: "user-a",
        accessVersion: 1,
        permissions: [
          "ai.use",
          "bookings.view",
          "reports.view",
          "inventory.view",
        ],
      },
      locationId: "studio-a",
    };
    mocks.create.mockReset().mockImplementation(() => ({
      unwrap: () => Promise.resolve({ conversation: { id: "conversation-a" } }),
    }));
    mocks.send.mockReset().mockImplementation(() => ({
      unwrap: () => Promise.resolve(response()),
    }));
  });

  it("shows only selectable questions without a chat composer, history, or automatic requests", () => {
    render(<StudioAssistantQuestions compact />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText("assistant.recent")).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("answers one selected question using a fresh scoped conversation and offers a report", async () => {
    const context = { surface: "command_center", route: "/app/settings" };
    render(<StudioAssistantQuestions assistantContext={context} />);
    fireEvent.click(question("bookings"));
    expect(
      await screen.findByText("There are 12 bookings today."),
    ).toBeVisible();
    expect(mocks.create).toHaveBeenCalledWith({
      locale: "en",
      locationId: "studio-a",
    });
    expect(mocks.send).toHaveBeenCalledWith({
      conversationId: "conversation-a",
      locale: "en",
      message: "guided.questions.bookings.prompt",
      context: { surface: "command_center", route: "/app/ai" },
    });
    expect(
      screen.getByRole("heading", { name: "guided.questions.bookings.label" }),
    ).toHaveFocus();
    expect(screen.getByTestId("report-offer")).toBeVisible();
    expect(mocks.reportProps).toMatchObject({
      locale: "en",
      locationId: "studio-a",
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    expect(screen.queryByRole("textbox")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "guided.back" }));
    expect(question("bookings")).toHaveFocus();
    expect(screen.queryByText("There are 12 bookings today.")).toBeNull();
    fireEvent.click(question("today"));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
  });

  it("blocks duplicate requests and lets the user return while an answer is pending", async () => {
    const pending = deferred();
    const abort = vi.fn();
    mocks.create.mockReturnValue({ unwrap: () => pending.promise, abort });
    render(<StudioAssistantQuestions />);
    const selectedQuestion = question("today");
    fireEvent.click(selectedQuestion);
    fireEvent.click(selectedQuestion);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("guided.loading");
    fireEvent.click(screen.getByRole("button", { name: "guided.back" }));
    expect(abort).toHaveBeenCalled();
    await act(async () => pending.resolve({ id: "late-conversation" }));
    expect(mocks.send).not.toHaveBeenCalled();
    expect(question("today")).toBeVisible();
  });

  it("allows retry after a failure without requiring typing", async () => {
    mocks.send.mockImplementationOnce(() => ({
      unwrap: () => Promise.reject(new Error("Temporary outage")),
    }));
    render(<StudioAssistantQuestions />);
    fireEvent.click(question("today"));
    // Raw provider errors are replaced with localized fallback copy.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "errors.message",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("Temporary outage");
    fireEvent.click(screen.getByRole("button", { name: "guided.retry" }));
    expect(
      await screen.findByText("There are 12 bookings today."),
    ).toBeVisible();
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it("does not carry provider reply chips or mutation action cards into the guided answer", async () => {
    mocks.send.mockReturnValue({
      unwrap: () =>
        Promise.resolve(
          response("A single answer", {
            suggestedReplies: ["Type more", "Choose another period"],
            actions: [
              {
                id: "mutation",
                key: "create_booking",
                label: "Create booking",
              },
            ],
            navigation: [
              { href: "https://outside.example", label: "Unsafe link" },
              { href: "/app/bookings", label: "View bookings" },
            ],
          }),
        ),
    });
    render(<StudioAssistantQuestions />);
    fireEvent.click(question("today"));
    expect(await screen.findByText("A single answer")).toBeVisible();
    expect(screen.queryByText("Type more")).toBeNull();
    expect(screen.queryByText("Create booking")).toBeNull();
    expect(screen.queryByText("Unsafe link")).toBeNull();
    expect(screen.getByRole("link", { name: "View bookings" })).toHaveAttribute(
      "href",
      "/app/bookings",
    );
  });

  it("keeps contextual help selectable and does not automatically spend AI credits", async () => {
    const context = {
      surface: "setup_center",
      route: "/app/settings/payments",
      setupStepId: "payments",
    };
    render(
      <StudioAssistantQuestions
        assistantContext={context}
        starterPrompt="Help with payment setup"
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", {
        name: "guided.contextQuestion",
      }),
    );
    await waitFor(() =>
      expect(mocks.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Help with payment setup",
          context,
        }),
      ),
    );
    expect(screen.queryByTestId("report-offer")).toBeNull();
  });

  it("excludes the old knowledge prompt that would ask for free-text input", () => {
    render(
      <StudioAssistantQuestions starterPrompt="assistant.intents.askKnowledge" />,
    );
    expect(screen.queryByText("guided.contextQuestion")).toBeNull();
    expect(question("generalHelp")).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("offers retry but no report when the AI service cannot answer", async () => {
    mocks.send.mockReturnValue({
      unwrap: () =>
        Promise.resolve(
          response("Service unavailable", {
            grounding: { status: "unavailable", basis: "insufficient" },
          }),
        ),
    });
    render(<StudioAssistantQuestions />);
    fireEvent.click(question("today"));
    expect(await screen.findByText("Service unavailable")).toBeVisible();
    expect(screen.getByRole("button", { name: "guided.retry" })).toBeVisible();
    expect(screen.queryByTestId("report-offer")).toBeNull();
  });

  it.each(["tenant", "location", "permissions", "locale", "context"])(
    "clears the answer and ignores old in-flight data after a %s change",
    async (change) => {
      const pending = deferred();
      const abort = vi.fn();
      mocks.send.mockReturnValue({ unwrap: () => pending.promise, abort });
      const view = render(<StudioAssistantQuestions />);
      fireEvent.click(question("today"));
      await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1));
      let nextContext;
      if (change === "tenant")
        mocks.state = {
          ...mocks.state,
          tenant: { ...mocks.state.tenant, _id: "tenant-b" },
        };
      if (change === "location")
        mocks.state = { ...mocks.state, locationId: "studio-b" };
      if (change === "permissions")
        mocks.state = {
          ...mocks.state,
          access: { ...mocks.state.access, permissions: ["ai.use"] },
        };
      if (change === "locale") mocks.locale = "cs";
      if (change === "context")
        nextContext = { surface: "command_center", route: "/app/other" };
      view.rerender(
        <StudioAssistantQuestions assistantContext={nextContext} />,
      );
      expect(abort).toHaveBeenCalled();
      await act(async () => pending.resolve(response("Old workspace answer")));
      expect(screen.queryByText("Old workspace answer")).toBeNull();
      expect(question("today")).toBeVisible();
      expect(screen.queryByTestId("report-offer")).toBeNull();
    },
  );

  it("hides the answer while the report is open and restores it on return", async () => {
    render(<StudioAssistantQuestions />);
    fireEvent.click(question("today"));
    expect(
      await screen.findByText("There are 12 bookings today."),
    ).toBeVisible();
    act(() => mocks.reportProps.onViewChange(true));
    expect(screen.getByText("There are 12 bookings today.")).not.toBeVisible();
    expect(screen.queryByRole("button", { name: "guided.back" })).toBeNull();
    act(() => mocks.reportProps.onViewChange(false));
    expect(screen.getByText("There are 12 bookings today.")).toBeVisible();
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
});
