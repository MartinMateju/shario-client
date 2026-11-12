import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assistantOpen: false,
  closeAssistant: vi.fn(),
  pathname: "/app",
  search: "",
  access: {
    preferences: {
      contextualGuides: {
        website_builder: {
          version: 1,
          status: "completed",
        },
      },
      productTour: {
        version: 1,
        status: "completed",
      },
    },
  },
  tenant: {},
}));

const messages = {
  "help.open": "Help",
  "help.title": "Help & guides",
  "help.close": "Close Help",
  "help.productTour": "Product tour",
  "help.productTourDescription": "Learn the workspace essentials.",
  "help.productTourSection": "Workspace essentials",
  "help.startProductTour": "Start tour",
  "help.replayProductTour": "Replay tour",
  "guides.centerDescription": "Short walkthroughs for your studio.",
  "guides.duration": "About 60 seconds",
  "guides.completed": "Completed",
  "guides.availableTitle": "Guides to explore",
  "guides.completedTitle": "Completed guides",
  "guides.startGuide": "Start guide",
  "guides.replayGuide": "Replay guide",
  "guides.noneAvailable": "No guides are available.",
  "guides.items.first_booking.title": "Create your first booking",
  "guides.items.first_booking.description": "Learn the booking workflow.",
  "guides.items.website_builder.title": "Customize your website",
  "guides.items.website_builder.description": "Learn the website builder.",
};

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key, values = {}) =>
      key === "guides.summary"
        ? `${values.completed} of ${values.total} completed`
        : messages[key] || key,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      tenant: mocks.tenant,
      workspaceAccess: mocks.access,
    }),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.tenant,
  selectCurrentWorkspaceAccess: (state) => state.workspaceAccess,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, onClick, ...props }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
  usePathname: () => mocks.pathname,
}));

vi.mock("@/components/ai/AiWorkspaceProvider", () => ({
  useAiWorkspace: () => ({
    assistantOpen: mocks.assistantOpen,
    available: true,
    closeAssistant: mocks.closeAssistant,
  }),
}));

vi.mock("@/components/product-tour/productTour.config", () => ({
  PRODUCT_TOUR_REPLAY_PARAM: "productTour",
  PRODUCT_TOUR_REPLAY_VALUE: "1",
  PRODUCT_TOUR_VERSION: 1,
}));

vi.mock("@/components/guides/contextualGuides.config", () => ({
  buildContextualGuideHref: (guide) => `${guide.href}?guide=${guide.id}`,
  getEligibleContextualGuides: () => [
    {
      id: "first_booking",
      version: 1,
      href: "/app/calendar",
    },
    {
      id: "website_builder",
      version: 1,
      href: "/app/settings/public-site",
    },
  ],
}));

vi.mock("@/components/tooltips/UtilityTooltip", () => ({
  default: ({ children }) => <span>{children}</span>,
}));

import WorkspaceHelpMenu from "@/components/dashboard/WorkspaceHelpMenu";

describe("WorkspaceHelpMenu", () => {
  beforeEach(() => {
    mocks.assistantOpen = false;
    mocks.closeAssistant.mockReset();
  });

  it("opens as an accessible drawer and reports guide progress", async () => {
    render(<WorkspaceHelpMenu canReplayProductTour />);

    const trigger = screen.getByRole("button", { name: "Help" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveClass("bg-coral-100");
    expect(trigger).not.toHaveClass("bg-surface-warm");

    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Help & guides",
    });
    const panel = dialog.querySelector('[data-dialog-layout="drawer"]');
    expect(panel).toHaveAttribute("data-workspace-guide-center");
    expect(panel).toHaveClass("max-w-[470px]");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(mocks.closeAssistant).toHaveBeenCalledTimes(1);
    expect(screen.getByText("2 of 3 completed")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

    const progress = screen.getByRole("progressbar", {
      name: "2 of 3 completed",
    });
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "3");
    expect(progress).toHaveAttribute("aria-valuenow", "2");
    expect(progress.firstElementChild).toHaveStyle({ width: "67%" });

    const availableGuide = screen.getByRole("link", {
      name: /Create your first booking/,
    });
    expect(availableGuide).toHaveAttribute(
      "href",
      "/app/calendar?guide=first_booking",
    );
    expect(availableGuide).toHaveTextContent("Start guide");

    const completedGuide = screen.getByRole("link", {
      name: /Customize your website/,
    });
    expect(completedGuide).toHaveTextContent("Completed");
    expect(completedGuide).toHaveTextContent("Replay guide");

    const productTour = screen.getByRole("link", { name: /Product tour/ });
    expect(productTour).toHaveTextContent("Completed");
    expect(productTour).toHaveTextContent("Replay tour");
  });

  it("closes when the AI drawer opens", async () => {
    const view = render(<WorkspaceHelpMenu canReplayProductTour />);
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    await screen.findByRole("dialog", { name: "Help & guides" });

    mocks.assistantOpen = true;
    view.rerender(<WorkspaceHelpMenu canReplayProductTour />);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Help & guides" }),
      ).not.toBeInTheDocument();
    });
  });

  it.each([/Product tour/, /Create your first booking/])(
    "removes the drawer immediately when navigating to %s and can reopen it",
    async (guideName) => {
      render(<WorkspaceHelpMenu canReplayProductTour />);
      const trigger = screen.getByRole("button", { name: "Help" });
      fireEvent.click(trigger);
      const guide = await screen.findByRole("link", { name: guideName });

      // Guide navigation can open another dialog before the entrance finishes.
      fireEvent.click(guide);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(
        document.querySelector("[data-workspace-guide-center]"),
      ).not.toBeInTheDocument();

      fireEvent.click(trigger);
      await screen.findByRole("dialog", { name: "Help & guides" });
      expect(screen.getAllByRole("link", { name: guideName })).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: "Close Help" }));
      await waitFor(() => {
        expect(
          document.querySelector("[data-workspace-guide-center]"),
        ).not.toBeInTheDocument();
      });
    },
  );
});
