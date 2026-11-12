import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openSetupAssistant: vi.fn(),
  queryOptions: null,
  replace: vi.fn(),
  search: "setupStep=kilns",
  setup: null,
  trackSetupEvent: vi.fn(() => ({
    unwrap: vi.fn().mockResolvedValue({ accepted: true }),
  })),
}));

const messages = {
  "actions.configure_kilns": "Configure kilns",
  "assistant.action": "Ask Launch Assistant",
  "assistant.prompt": "Help me complete {step}",
  "contextual.complete":
    "This launch outcome is complete. Continue from Launch Center.",
  "contextual.completedEyebrow": "Outcome complete",
  "contextual.dismiss": "Dismiss launch guidance",
  "contextual.eyebrow": "Launch guidance",
  "contextual.returnToLaunchCenter": "Return to Launch Center",
  "contextual.viewStep": "View in Launch Center",
  "steps.kilns.description": "Add the kiln used by your studio.",
  "steps.kilns.outcome": "Your kiln is ready for firing work",
};

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) =>
      (messages[key] ?? key).replace(
        /\{(\w+)\}/g,
        (_match, name) => values[name] ?? `{${name}}`,
      ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/app/firings",
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/components/ai/AiWorkspaceProvider", () => ({
  useAiWorkspace: () => ({
    available: true,
    openSetupAssistant: mocks.openSetupAssistant,
  }),
}));

vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  useGetSetupCenterQuery: (_arg, options) => {
    mocks.queryOptions = options;
    return { data: mocks.setup };
  },
  useTrackSetupEventMutation: () => [mocks.trackSetupEvent],
}));

import ContextualSetupGuide from "@/components/setup-center/ContextualSetupGuide";
import {
  claimGuidedCompletion,
  clearGuidedCompletionClaims,
  releaseGuidedCompletion,
} from "@/components/setup-center/guidedCompletionOwnership";

const setupWithStatus = (status) => ({
  steps: [
    {
      id: "kilns",
      status,
      applicable: true,
      checks: [],
      actions: [
        {
          key: "configure_kilns",
          enabled: true,
          href: "/app/firings?section=kilns&action=create",
        },
      ],
    },
  ],
});

describe("ContextualSetupGuide", () => {
  beforeEach(() => {
    clearGuidedCompletionClaims();
    mocks.openSetupAssistant.mockReset();
    mocks.replace.mockReset();
    mocks.trackSetupEvent.mockClear();
    mocks.queryOptions = null;
    mocks.search = "setupStep=kilns";
    mocks.setup = setupWithStatus("incomplete");
  });

  it("keeps live Launch Center progress subscribed while guided work is open", () => {
    render(<ContextualSetupGuide />);

    expect(mocks.queryOptions).toMatchObject({
      skip: false,
      refetchOnFocus: true,
      refetchOnMountOrArgChange: true,
    });
    expect(
      screen.getByRole("link", { name: /View in Launch Center/ }),
    ).toHaveAttribute("href", "/app/setup?step=kilns");
    expect(
      screen.getByRole("link", { name: "Configure kilns" }),
    ).toHaveAttribute(
      "href",
      "/app/firings?section=kilns&action=create&setupStep=kilns",
    );
    expect(screen.getByText("Add the kiln used by your studio.")).toBeVisible();
  });

  it("turns a refreshed completed step into an explicit return action", () => {
    const { rerender } = render(<ContextualSetupGuide />);

    mocks.setup = setupWithStatus("complete");
    rerender(<ContextualSetupGuide />);

    expect(screen.getByText("Outcome complete")).toBeVisible();
    expect(
      screen.getByText(
        "This launch outcome is complete. Continue from Launch Center.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Return to Launch Center/ }),
    ).toHaveAttribute("href", "/app/setup?step=kilns&review=ready");
    expect(
      screen.queryByRole("link", { name: "Configure kilns" }),
    ).not.toBeInTheDocument();
    expect(mocks.trackSetupEvent).toHaveBeenCalledTimes(2);
    expect(mocks.trackSetupEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: "step_completed",
        stepId: "kilns",
      }),
    );
    expect(mocks.replace).toHaveBeenCalledOnce();
  });

  it("does not duplicate a completion owned by the successful form save", () => {
    const { rerender } = render(<ContextualSetupGuide />);
    mocks.trackSetupEvent.mockClear();
    const claim = claimGuidedCompletion("kilns");

    mocks.setup = setupWithStatus("complete");
    rerender(<ContextualSetupGuide />);

    expect(mocks.trackSetupEvent).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    releaseGuidedCompletion("kilns", claim);
  });

  it("lets an owner dismiss guidance without changing setup state", () => {
    render(<ContextualSetupGuide />);

    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss launch guidance" }),
    );

    expect(
      screen.queryByText("Your kiln is ready for firing work"),
    ).not.toBeInTheDocument();
  });
});
