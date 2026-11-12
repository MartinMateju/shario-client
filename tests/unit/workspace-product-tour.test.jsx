import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: null,
  pathname: "/app",
  search: "",
  push: vi.fn(),
  replace: vi.fn(),
  track: vi.fn(),
  updatePreferences: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) => {
      const messages = {
        progress: `${values.current} of ${values.total}`,
        skip: "Skip tour",
        close: "Close tour",
        back: "Back",
        next: "Next",
        openLaunchCenter: "Open Launch Center",
        "welcome.eyebrow": "Workspace essentials",
        "welcome.title": "First time here?",
        "welcome.description":
          "Take a quick 60-second tour of the workspace essentials. You can replay it anytime from Help.",
        "welcome.duration": "About 60 seconds",
        "welcome.start": "Start tour",
        "welcome.dismiss": "No, thanks",
        "welcome.close": "Close introduction",
        mobileMenuDescription: `This option is in the main menu, opened with the highlighted button. ${values.description}`,
        "steps.overview.title": "Welcome to your Overview",
        "steps.overview.description": "Overview description",
        "steps.launch_center.title": "Set up in Launch Center",
        "steps.launch_center.description": "Launch Center description",
        "steps.studio_switcher.title": "Your studio switcher",
        "steps.studio_switcher.description.none": "No studio yet",
        "steps.studio_switcher.description.single": "One current studio",
        "steps.studio_switcher.description.multiple": "Switch multiple studios",
        "steps.navigation.title": "Everything has a home",
        "steps.navigation.description": "Navigation description",
        "steps.ai_assistant.title": "Ask the AI Assistant",
        "steps.ai_assistant.description": "AI description",
        "steps.settings.title": "Settings and customization",
        "steps.settings.description": "Settings description",
        "final.title": "You’re ready to start",
        "final.description":
          "Finish setup and preview the customer experience.",
      };
      return messages[key] || key;
    },
}));

vi.mock("react-redux", () => ({
  useSelector: () => mocks.access,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentWorkspaceAccess: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  useTrackSetupEventMutation: () => [
    (body) => {
      mocks.track(body);
      return { unwrap: () => Promise.resolve({ accepted: true }) };
    },
  ],
}));

vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useUpdateWorkspacePreferencesMutation: () => [
    (body) => {
      mocks.updatePreferences(body);
      return { unwrap: () => Promise.resolve({}) };
    },
  ],
}));

import WorkspaceProductTour from "@/components/product-tour/WorkspaceProductTour";

const pendingAccess = () => ({
  membershipId: "membership-1",
  roleKey: "owner",
  preferences: {
    productTour: {
      version: 0,
      status: null,
      lastStep: null,
    },
  },
});

const acknowledgedAccess = (status = "completed") => ({
  ...pendingAccess(),
  preferences: {
    productTour: {
      version: 1,
      status,
      lastStep: status === "completed" ? "settings" : "navigation",
    },
  },
});

const ProductTourFixture = (props) => (
  <>
    <div data-studio-briefing-hero>Studio briefing</div>
    <div data-product-tour-target="launch-center">Launch Center</div>
    <div data-product-tour-target="studio-switcher">Studio switcher</div>
    <div data-product-tour-target="navigation">Navigation</div>
    <div data-product-tour-target="ai-assistant">AI</div>
    <div data-product-tour-target="settings">Settings</div>
    <WorkspaceProductTour eligible studioCount={1} {...props} />
  </>
);

const renderTour = (props = {}) => render(<ProductTourFixture {...props} />);

const startAutomaticTour = async () => {
  fireEvent.click(
    await screen.findByRole("button", {
      name: "Start tour",
    }),
  );
  await screen.findByText("1 of 6");
};

describe("WorkspaceProductTour", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    mocks.access = pendingAccess();
    mocks.pathname = "/app";
    mocks.search = "";
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.track.mockReset();
    mocks.updatePreferences.mockReset();
  });

  it("asks an unacknowledged workspace member before starting the tour", async () => {
    renderTour();

    expect(
      await screen.findByRole("heading", {
        name: "First time here?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("About 60 seconds")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "Welcome to your Overview",
      }),
    ).not.toBeInTheDocument();
    expect(mocks.track).not.toHaveBeenCalled();

    await startAutomaticTour();

    expect(
      screen.queryByRole("heading", {
        name: "First time here?",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Welcome to your Overview",
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.track.mock.calls.map(([event]) => event.event)).toEqual(
        expect.arrayContaining([
          "product_tour_started",
          "product_tour_overview_viewed",
        ]),
      );
    });
  });

  it("treats a loaded membership with missing preferences as pending", async () => {
    mocks.access = {
      membershipId: "membership-1",
      roleKey: "owner",
    };
    renderTour();

    expect(
      await screen.findByRole("heading", {
        name: "First time here?",
      }),
    ).toBeInTheDocument();
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("does not open when the workspace member is ineligible", async () => {
    renderTour({ eligible: false });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "First time here?",
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", {
          name: "Welcome to your Overview",
        }),
      ).not.toBeInTheDocument();
    });
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it.each(["completed", "skipped"])(
    "does not automatically repeat after server-side %s acknowledgement",
    async (status) => {
      mocks.access = acknowledgedAccess(status);
      renderTour();

      await waitFor(() => {
        expect(
          screen.queryByRole("heading", {
            name: "First time here?",
          }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("heading", {
            name: "Welcome to your Overview",
          }),
        ).not.toBeInTheDocument();
      });
      expect(mocks.track).not.toHaveBeenCalled();
    },
  );

  it("remembers when the workspace member declines the welcome", async () => {
    renderTour();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "No, thanks",
      }),
    );

    await waitFor(() => {
      expect(mocks.updatePreferences).toHaveBeenCalledWith({
        productTour: {
          version: 1,
          status: "skipped",
          lastStep: "overview",
        },
      });
      expect(
        screen.queryByRole("heading", {
          name: "First time here?",
        }),
      ).not.toBeInTheDocument();
    });
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("handles Escape once through the welcome Dialog close boundary", async () => {
    const user = userEvent.setup();
    renderTour();

    await screen.findByRole("heading", {
      name: "First time here?",
    });
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "First time here?",
        }),
      ).not.toBeInTheDocument();
    });
    expect(mocks.updatePreferences).toHaveBeenCalledTimes(1);
    expect(mocks.updatePreferences).toHaveBeenCalledWith({
      productTour: {
        version: 1,
        status: "skipped",
        lastStep: "overview",
      },
    });
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("replays from Help even after completion and removes the replay query", async () => {
    mocks.access = acknowledgedAccess();
    mocks.search = "productTour=1";
    renderTour();

    expect(
      await screen.findByRole("heading", {
        name: "Welcome to your Overview",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "First time here?",
      }),
    ).not.toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith("/app", { scroll: false });

    await waitFor(() => {
      expect(mocks.track).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "product_tour_started",
          source: "product_tour",
          metadata: expect.objectContaining({
            tourEntryPoint: "help_replay",
            tourVersion: 1,
          }),
        }),
      );
    });
  });

  it("supports repeated Help replays without starting an automatic duplicate", async () => {
    mocks.replace.mockImplementation(() => {
      mocks.search = "";
    });
    mocks.search = "productTour=1";
    const view = renderTour();

    expect(
      await screen.findByRole("heading", {
        name: "Welcome to your Overview",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "First time here?",
      }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        mocks.track.mock.calls.filter(
          ([event]) => event.event === "product_tour_started",
        ),
      ).toHaveLength(1);
    });

    // Simulate the rerender Next performs after router.replace removes
    // the one-shot replay query.
    view.rerender(<ProductTourFixture />);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Skip tour" }).at(-1),
    );
    mocks.search = "productTour=1";
    view.rerender(<ProductTourFixture />);

    expect(
      await screen.findByRole("heading", {
        name: "Welcome to your Overview",
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      const starts = mocks.track.mock.calls
        .map(([event]) => event)
        .filter(({ event }) => event === "product_tour_started");

      expect(starts).toHaveLength(2);
      expect(
        starts.every(
          ({ metadata }) => metadata.tourEntryPoint === "help_replay",
        ),
      ).toBe(true);
    });
  });

  it("keeps six ordered steps, adaptive studio copy and a clear final CTA", async () => {
    const view = renderTour();
    await startAutomaticTour();

    const next = () =>
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

    next();
    expect(
      screen.getByRole("heading", { name: "Set up in Launch Center" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 of 6")).toBeInTheDocument();

    next();
    expect(
      screen.getByRole("heading", { name: "Your studio switcher" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/One current studio/)).toBeInTheDocument();

    next();
    expect(
      screen.getByRole("heading", { name: "Everything has a home" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This option is in the main menu, opened with the highlighted button. Navigation description",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(
      screen.getByRole("heading", { name: "Your studio switcher" }),
    ).toBeInTheDocument();
    next();
    expect(
      screen.getByRole("heading", { name: "Everything has a home" }),
    ).toBeInTheDocument();

    next();
    expect(
      screen.getByRole("heading", { name: "Ask the AI Assistant" }),
    ).toBeInTheDocument();

    next();
    expect(
      screen.getByRole("heading", { name: "Settings and customization" }),
    ).toBeInTheDocument();
    expect(screen.getByText("6 of 6")).toBeInTheDocument();

    next();
    expect(
      screen.getByRole("heading", { name: "You’re ready to start" }),
    ).toBeInTheDocument();
    expect(screen.getByText("6 of 6")).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.updatePreferences).toHaveBeenCalledWith({
        productTour: {
          version: 1,
          status: "completed",
          lastStep: "settings",
        },
      });
    });

    view.rerender(<ProductTourFixture />);
    expect(
      mocks.updatePreferences.mock.calls.filter(
        ([preferences]) => preferences.productTour?.status === "completed",
      ),
    ).toHaveLength(1);
    expect(
      mocks.track.mock.calls.filter(
        ([event]) => event.event === "product_tour_completed",
      ),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Open Launch Center" }));

    expect(mocks.push).toHaveBeenCalledWith("/app/setup");
    const eventNames = mocks.track.mock.calls.map(([event]) => event.event);
    expect(eventNames).toEqual(
      expect.arrayContaining([
        "product_tour_launch_center_viewed",
        "product_tour_studio_switcher_viewed",
        "product_tour_navigation_viewed",
        "product_tour_ai_assistant_viewed",
        "product_tour_settings_viewed",
        "product_tour_completed",
        "product_tour_launch_center_opened",
      ]),
    );
    for (const event of [
      "product_tour_overview_viewed",
      "product_tour_launch_center_viewed",
      "product_tour_studio_switcher_viewed",
      "product_tour_navigation_viewed",
      "product_tour_ai_assistant_viewed",
      "product_tour_settings_viewed",
      "product_tour_completed",
    ]) {
      expect(eventNames.filter((name) => name === event)).toHaveLength(1);
    }
  });

  it("allows skipping at any step and remembers the last viewed step", async () => {
    renderTour();
    await startAutomaticTour();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.click(
      screen.getAllByRole("button", { name: "Skip tour" }).at(-1),
    );

    expect(mocks.updatePreferences).toHaveBeenCalledWith({
      productTour: {
        version: 1,
        status: "skipped",
        lastStep: "launch_center",
      },
    });
    expect(mocks.track.mock.calls.map(([event]) => event.event)).toContain(
      "product_tour_skipped",
    );
    expect(
      screen.queryByRole("heading", {
        name: "Set up in Launch Center",
      }),
    ).not.toBeInTheDocument();
  });

  it("handles a backdrop click once through the Dialog close boundary", async () => {
    const user = userEvent.setup();
    renderTour();
    await startAutomaticTour();

    await user.click(document.querySelector("[data-product-tour-backdrop]"));

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Welcome to your Overview",
        }),
      ).not.toBeInTheDocument();
    });
    expect(
      mocks.track.mock.calls.filter(
        ([event]) => event.event === "product_tour_skipped",
      ),
    ).toHaveLength(1);
    expect(mocks.updatePreferences).toHaveBeenCalledTimes(1);
  });

  it("remeasures when an Overview target mounts after the tour opens", async () => {
    render(<WorkspaceProductTour eligible studioCount={1} />);
    await startAutomaticTour();
    expect(
      document.querySelector("[data-product-tour-spotlight]"),
    ).not.toBeInTheDocument();

    const target = document.createElement("div");
    target.dataset.studioBriefingHero = "";
    target.getBoundingClientRect = () => ({
      bottom: 140,
      height: 100,
      left: 40,
      right: 240,
      top: 40,
      width: 200,
      x: 40,
      y: 40,
      toJSON: () => ({}),
    });
    document.body.append(target);

    await waitFor(() => {
      expect(
        document.querySelector("[data-product-tour-spotlight]"),
      ).toBeInTheDocument();
    });

    target.remove();
  });

  it("uses centered fallback copy when an optional target is unavailable", async () => {
    render(<WorkspaceProductTour eligible studioCount={2} />);

    await startAutomaticTour();
    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }

    expect(
      screen.getByRole("heading", { name: "Ask the AI Assistant" }),
    ).toBeInTheDocument();
    expect(screen.getByText("AI description")).toBeInTheDocument();
  });

  it("spotlights the visible menu trigger for mobile sidebar-only steps", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    const trigger = document.createElement("button");
    trigger.dataset.mobileNavigationTrigger = "";
    trigger.getBoundingClientRect = () => ({
      bottom: 64,
      height: 44,
      left: 16,
      right: 60,
      top: 20,
      width: 44,
      x: 16,
      y: 20,
      toJSON: () => ({}),
    });
    document.body.append(trigger);

    render(<WorkspaceProductTour eligible studioCount={1} />);
    await startAutomaticTour();

    for (const title of ["Set up in Launch Center", "Your studio switcher"]) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
      await waitFor(() => {
        expect(
          document.querySelector("[data-product-tour-spotlight]"),
        ).toHaveStyle({ height: "60px", width: "60px" });
      });
    }

    trigger.remove();
  });

  it("retargets an open step when the sidebar breakpoint changes", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });

    const desktopTarget = document.createElement("div");
    desktopTarget.dataset.productTourTarget = "launch-center";
    desktopTarget.getBoundingClientRect = () => ({
      bottom: 144,
      height: 44,
      left: 500,
      right: 620,
      top: 100,
      width: 120,
      x: 500,
      y: 100,
      toJSON: () => ({}),
    });
    const mobileTarget = document.createElement("button");
    mobileTarget.dataset.mobileNavigationTrigger = "";
    mobileTarget.getBoundingClientRect = () => ({
      bottom: 64,
      height: 44,
      left: 16,
      right: 60,
      top: 20,
      width: 44,
      x: 16,
      y: 20,
      toJSON: () => ({}),
    });
    document.body.append(desktopTarget, mobileTarget);

    render(<WorkspaceProductTour eligible studioCount={1} />);
    await startAutomaticTour();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    const spotlight = () =>
      document.querySelector("[data-product-tour-spotlight]");
    await waitFor(() => {
      expect(spotlight()).toHaveStyle({ left: "492px", width: "136px" });
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    fireEvent(window, new Event("resize"));
    await waitFor(() => {
      expect(spotlight()).toHaveStyle({ left: "8px", width: "60px" });
      expect(
        screen.getByText(/This option is in the main menu/),
      ).toBeInTheDocument();
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
    fireEvent(window, new Event("resize"));
    await waitFor(() => {
      expect(spotlight()).toHaveStyle({ left: "492px", width: "136px" });
    });

    desktopTarget.remove();
    mobileTarget.remove();
  });
});
