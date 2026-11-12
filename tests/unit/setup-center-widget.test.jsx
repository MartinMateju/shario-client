import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: {
    permissions: ["workspace:update"],
    preferences: {},
  },
  getSetupCenter: vi.fn(),
  launchComplete: false,
  launchProgress: {
    completed: 1,
    percentage: 25,
    total: 4,
  },
  nextStep: null,
  outcomeLabel: "Customer payments are connected",
  updatePreferences: vi.fn(),
  unwrapUpdate: vi.fn(),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  ArrowPathIcon: (props) => <svg {...props} />,
  ArrowRightIcon: (props) => <svg {...props} />,
  CheckCircleIcon: (props) => <svg {...props} />,
  RocketLaunchIcon: (props) => <svg {...props} />,
  XMarkIcon: (props) => <svg {...props} />,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) => {
    const labels = {
      "widget.allComplete": "Your studio is ready",
      "widget.eyebrow": "Launch Center",
      "widget.hide": "Hide Launch Center from Overview",
      "widget.hideError": "Launch Center could not be hidden. Try again.",
      "widget.next": "Next Best Action",
      "widget.open": "Open Launch Center",
      "widget.readyDescription":
        "Your launch tools remain available whenever you need them.",
      "widget.readyTitle": "Studio ready",
      "widget.checklistComplete": "Launch checklist complete",
      "widget.review": "Review launch settings",
      "widget.title": "Keep your launch moving",
      "steps.payments.outcome": mocks.outcomeLabel,
    };

    return labels[key] || key;
  },
}));

vi.mock("react-redux", () => ({
  useSelector: () => mocks.access,
}));

vi.mock("@/config/permissions", () => ({
  PERMISSIONS: { WORKSPACE_UPDATE: "workspace:update" },
  hasPermission: () => true,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentWorkspaceAccess: () => null,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  useGetSetupCenterQuery: (...args) => mocks.getSetupCenter(...args),
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useUpdateWorkspacePreferencesMutation: () => [
    mocks.updatePreferences,
    { isLoading: false },
  ],
}));

vi.mock("@/components/setup-center/setupCenter.utils", () => ({
  getLaunchSetupProgress: () => mocks.launchProgress,
  getNextBestSetupStep: () => mocks.nextStep,
  getOverviewSetupPresentation: () =>
    mocks.launchComplete ? "hidden" : "guided",
  getPrimaryAction: (step) => step?.actions?.[0] ?? null,
  getSetupActionHref: (step, action) =>
    action?.href && step?.id
      ? `${action.href}?setupStep=${step.id}`
      : action?.href,
  getSetupStepEstimatedMinutes: () => 2,
}));

import SetupCenterWidget from "@/components/setup-center/SetupCenterWidget";

const setupResponse = {
  phase: "launch",
  progress: { percentage: 25 },
  recommendations: [],
  steps: [],
};

describe("SetupCenterWidget", () => {
  beforeEach(() => {
    mocks.access = {
      permissions: ["workspace:update"],
      preferences: {},
    };
    mocks.nextStep = null;
    mocks.outcomeLabel = "Customer payments are connected";
    mocks.launchComplete = false;
    mocks.launchProgress = {
      completed: 1,
      percentage: 25,
      total: 4,
    };
    mocks.getSetupCenter.mockReset();
    mocks.getSetupCenter.mockReturnValue({
      data: setupResponse,
      currentData: setupResponse,
      isError: false,
      isLoading: false,
      isSuccess: true,
    });
    mocks.unwrapUpdate.mockReset();
    mocks.unwrapUpdate.mockResolvedValue({});
    mocks.updatePreferences.mockReset();
    mocks.updatePreferences.mockReturnValue({ unwrap: mocks.unwrapUpdate });
  });

  afterEach(cleanup);

  it("keeps the guided loading state in the balanced widget footprint", () => {
    mocks.getSetupCenter.mockReturnValue({
      data: undefined,
      currentData: undefined,
      isError: false,
      isLoading: true,
      isSuccess: false,
    });

    render(<SetupCenterWidget />);

    expect(screen.getByRole("status", { name: "loading" })).toHaveClass(
      "w-full",
      "h-[126px]",
    );
  });

  it("uses the guided presentation while launch checklist work remains", () => {
    render(<SetupCenterWidget />);

    const guided = document.querySelector(
      '[data-setup-center-presentation="guided"]',
    );
    expect(guided).toBeInTheDocument();
    expect(guided).toHaveClass("w-full");
    expect(
      screen.getByRole("heading", { name: "Keep your launch moving" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Launch checklist complete")).toBeVisible();
    const progress = screen.getByRole("progressbar", { name: "Launch Center" });
    expect(progress).toHaveAttribute("aria-valuenow", "1");
    expect(progress).toHaveAttribute("aria-valuemax", "4");

    expect(
      screen.getByRole("link", { name: "Open Launch Center" }),
    ).toHaveClass("min-h-11", "min-w-11");
    expect(
      screen.getByRole("button", {
        name: "Hide Launch Center from Overview",
      }),
    ).toHaveClass("h-11", "w-11");
  });

  it("keeps the guided step context when linking into a setup form", () => {
    mocks.nextStep = {
      id: "payments",
      actions: [
        {
          enabled: true,
          href: "/app/settings/payments",
        },
      ],
    };

    render(<SetupCenterWidget />);

    const nextAction = screen.getByRole("link", {
      name: /Customer payments are connected/,
    });
    expect(nextAction).toHaveAttribute(
      "href",
      "/app/settings/payments?setupStep=payments",
    );
    expect(nextAction).toHaveClass("min-h-12");
  });

  it.each(["guided", "compact"])(
    "retains the full next-step outcome in the %s presentation",
    (presentation) => {
      mocks.outcomeLabel =
        "Každý výrobek vytvořený ve studiu má jednotnou cenu";
      mocks.nextStep = {
        id: "payments",
        actions: [
          {
            enabled: true,
            href: "/app/settings/payments",
          },
        ],
      };

      render(<SetupCenterWidget presentation={presentation} />);

      expect(screen.getByText(mocks.outcomeLabel)).toBeVisible();
      expect(
        screen.getByRole("link", { name: new RegExp(mocks.outcomeLabel) }),
      ).toHaveAttribute("href", "/app/settings/payments?setupStep=payments");
    },
  );

  it("shows remaining launch progress instead of claiming compact setup is complete", () => {
    mocks.launchProgress = { completed: 2, percentage: 29, total: 7 };

    render(<SetupCenterWidget presentation="compact" />);

    expect(
      screen.getByRole("heading", { name: "Keep your launch moving" }),
    ).toBeVisible();
    expect(screen.queryByText("Studio ready")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "Your launch tools remain available whenever you need them.",
      ),
    ).not.toBeInTheDocument();
    const progress = screen.getByRole("progressbar", { name: "Launch Center" });
    expect(progress).toHaveAttribute("aria-valuenow", "2");
    expect(progress).toHaveAttribute("aria-valuemax", "7");
    expect(
      screen.getByRole("link", { name: "Review launch settings" }),
    ).toHaveAttribute("href", "/app/setup");
  });

  it("leaves Overview once the full launch journey is complete", () => {
    const completeSetup = {
      ...setupResponse,
      phase: "learning",
      progress: { percentage: 100 },
    };
    mocks.launchComplete = true;
    mocks.launchProgress = {
      completed: 4,
      percentage: 100,
      total: 4,
    };
    mocks.getSetupCenter.mockReturnValue({
      data: completeSetup,
      currentData: completeSetup,
      isError: false,
      isLoading: false,
      isSuccess: true,
    });

    render(<SetupCenterWidget />);

    expect(
      document.querySelector("[data-setup-center-presentation]"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Review launch settings" }),
    ).not.toBeInTheDocument();
  });

  it("permanently dismisses the Overview widget through workspace preferences", async () => {
    render(<SetupCenterWidget />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hide Launch Center from Overview",
      }),
    );

    expect(mocks.updatePreferences).toHaveBeenCalledWith({
      overviewLaunchCenterDismissed: true,
    });
    await waitFor(() => {
      expect(
        document.querySelector("[data-setup-center-presentation]"),
      ).not.toBeInTheDocument();
    });
  });

  it("stays hidden and skips Launch Center data when the preference is saved", () => {
    mocks.access = {
      permissions: ["workspace:update"],
      preferences: { overviewLaunchCenterDismissed: true },
    };

    render(<SetupCenterWidget />);

    expect(
      screen.queryByRole("button", {
        name: "Hide Launch Center from Overview",
      }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector("[data-setup-center-presentation]"),
    ).not.toBeInTheDocument();
    expect(mocks.getSetupCenter).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ skip: true }),
    );
  });

  it("keeps the widget visible and reports a failed preference update", async () => {
    mocks.unwrapUpdate.mockRejectedValue(new Error("network unavailable"));

    render(<SetupCenterWidget />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "Hide Launch Center from Overview",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Launch Center could not be hidden. Try again.",
    );
    expect(
      screen.getByRole("heading", { name: "Keep your launch moving" }),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-setup-center-presentation="guided"]'),
    ).toBeInTheDocument();
  });
});
