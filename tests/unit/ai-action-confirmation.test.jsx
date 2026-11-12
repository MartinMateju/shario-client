import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const aiMocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  dismiss: vi.fn(),
}));

const workspace = vi.hoisted(() => ({
  tenant: { modules: { courses: true } },
  access: {
    status: "active",
    permissions: ["courses.manage", "courses.view", "locations.view"],
  },
}));

const translations = vi.hoisted(() => ({
  "actions.summaries.create_event": "Create a studio event",
  "actions.status.suggested": "Awaiting confirmation",
  "actions.status.completed": "Completed",
  "actions.fields.location": "Location",
  "actions.fields.date": "Date",
  "actions.fields.startTime": "Start time",
  "actions.fields.endTime": "End time",
  "actions.fields.status": "Status",
  "actions.values.inquiry": "Inquiry",
  "actions.review": "Review command",
  "actions.reviewEyebrow": "Confirmation required",
  "actions.confirmation.create_event":
    "Check the location, date and time before creating the event.",
  "actions.closeReview": "Close command review",
  "actions.confirmHint": "Nothing changes until you explicitly confirm it.",
  "actions.cancel": "Keep pending",
  "actions.confirm": "Confirm and execute",
  "actions.confirming": "Confirming…",
  "actions.dismiss": "Dismiss",
  "actions.dismissing": "Dismissing…",
  "actions.openResult": "Open result",
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => translations[key] ?? key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => workspace.tenant,
  selectCurrentWorkspaceAccess: () => workspace.access,
}));

vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGetAiActionQuery: () => ({ currentData: null }),
  useConfirmAiAssistantActionMutation: () => [
    aiMocks.confirm,
    { isLoading: false },
  ],
  useDismissAiAssistantActionMutation: () => [
    aiMocks.dismiss,
    { isLoading: false },
  ],
}));

import AiActionConfirmation from "@/components/ai/AiActionConfirmation";

const preview = {
  title: "Closed studio",
  summary: "create_event",
  fields: [
    { key: "location", value: "Grohova" },
    { key: "date", value: "2026-08-17" },
    { key: "startTime", value: "09:00" },
    { key: "endTime", value: "10:00" },
    { key: "status", value: "inquiry" },
  ],
  warnings: [],
};

describe("AI create-event confirmation", () => {
  beforeEach(() => {
    workspace.tenant = { modules: { courses: true } };
    workspace.access = {
      status: "active",
      permissions: ["courses.manage", "courses.view", "locations.view"],
    };
    aiMocks.confirm.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          id: "action-1",
          key: "create_event",
          status: "completed",
          preview,
          result: {
            type: "event",
            id: "event-1",
            title: "Closed studio",
          },
        }),
    });
    aiMocks.dismiss.mockReturnValue({
      unwrap: () => Promise.resolve({ id: "action-1", status: "dismissed" }),
    });
  });

  it.each([
    ["courses.view", ["courses.manage", "locations.view"]],
    ["locations.view", ["courses.manage", "courses.view"]],
  ])(
    "suppresses the event result link when %s is missing",
    (_missingPermission, permissions) => {
      workspace.access = {
        status: "active",
        permissions,
      };

      render(
        <AiActionConfirmation
          action={{
            id: "action-1",
            key: "create_event",
            status: "completed",
            preview,
            result: {
              type: "event",
              id: "event-1",
              title: "Closed studio",
            },
          }}
          conversationId="conversation-1"
        />,
      );

      expect(screen.getByText("Completed")).toBeVisible();
      expect(screen.queryByRole("link", { name: /Open result/ })).toBeNull();
    },
  );

  it("renders a friendly preview, confirms it and opens the completed event", async () => {
    render(
      <AiActionConfirmation
        action={{
          id: "action-1",
          key: "create_event",
          status: "suggested",
          canConfirm: true,
          canDismiss: true,
          preview,
        }}
        conversationId="conversation-1"
      />,
    );

    expect(screen.getByText("Closed studio")).toBeVisible();
    expect(screen.getByText("Create a studio event")).toBeVisible();
    expect(screen.getByText("Location")).toBeVisible();
    expect(screen.getByText("Grohova")).toBeVisible();
    expect(screen.getByText("Date")).toBeVisible();
    expect(
      screen.getByText(
        new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
          new Date("2026-08-17T00:00:00"),
        ),
      ),
    ).toBeVisible();
    expect(screen.getByText("Start time")).toBeVisible();
    expect(screen.getByText("09:00")).toBeVisible();
    expect(screen.getByText("End time")).toBeVisible();
    expect(screen.getByText("10:00")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Review command" }));

    expect(screen.getByText("Status")).toBeVisible();
    expect(screen.getByText("Inquiry")).toBeVisible();
    expect(
      screen.getByText(
        "Check the location, date and time before creating the event.",
      ),
    ).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm and execute" }),
    );

    await waitFor(() =>
      expect(aiMocks.confirm).toHaveBeenCalledWith({
        actionId: "action-1",
        conversationId: "conversation-1",
      }),
    );

    const resultLink = await screen.findByRole("link", {
      name: /Open result/,
    });
    expect(resultLink).toHaveAttribute(
      "href",
      "/app/operations?section=events",
    );
    expect(screen.getByText("Completed")).toBeVisible();
  });
});
