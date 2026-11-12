import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  access: null,
  aiAvailable: true,
  tenant: null,
  pathname: "/app/calendar",
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
    (key, values = {}) =>
      key === "progress"
        ? `${values.current} of ${values.total}`
        : key === "finishedDescription"
          ? `Finished ${values.guide}`
          : key,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        tenant: mocks.tenant,
        workspaceAccess: mocks.access,
      },
    }),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
  selectCurrentWorkspaceAccess: (state) => state.auth.workspaceAccess,
}));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
  }),
}));
vi.mock("@/components/ai/AiWorkspaceProvider", () => ({
  useAiWorkspace: () => ({
    available: mocks.aiAvailable,
  }),
}));
vi.mock("@/lib/features/setup-center/setupCenterApiSlice", () => ({
  useTrackSetupEventMutation: () => [
    (body) => {
      mocks.track(body);
      return {
        unwrap: () =>
          Promise.resolve({
            accepted: true,
          }),
      };
    },
  ],
}));
vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useUpdateWorkspacePreferencesMutation: () => [
    (body) => {
      mocks.updatePreferences(body);
      return {
        unwrap: () => Promise.resolve({}),
      };
    },
  ],
}));
import WorkspaceContextualGuides from "@/components/guides/WorkspaceContextualGuides";
const access = (contextualGuides = {}) => ({
  membershipId: "membership-1",
  permissions: ["bookings.view", "bookings.create"],
  preferences: {
    productTour: {
      version: 1,
      status: "completed",
      lastStep: "settings",
    },
    contextualGuides,
  },
});
const Fixture = ({ productTourEligible = false } = {}) => (
  <>
    <div data-calendar-shell="true">Calendar</div>
    <button data-contextual-guide-target="first-booking-create">Create</button>
    <div data-calendar-command-bar="true">Toolbar</div>
    <div data-calendar-viewport="true">Calendar viewport</div>
    <WorkspaceContextualGuides productTourEligible={productTourEligible} />
  </>
);
describe("WorkspaceContextualGuides", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1024,
    });
    mocks.access = access();
    mocks.aiAvailable = true;
    mocks.tenant = {
      modules: {
        bookings: true,
      },
    };
    mocks.pathname = "/app/calendar";
    mocks.search = "";
    mocks.push.mockReset();
    mocks.replace.mockReset();
    mocks.track.mockReset();
    mocks.updatePreferences.mockReset();
    window.sessionStorage.clear();
  });
  it("replays from Help, preserves route state and completes once", async () => {
    mocks.search = "view=week&guide=first_booking";
    const view = render(<Fixture />);
    expect(
      await screen.findByRole("heading", {
        name: "items.first_booking.steps.calendar.title",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith("/app/calendar?view=week", {
      scroll: false,
    });
    for (const step of ["create_action", "booking_details", "confirmation"]) {
      fireEvent.click(
        screen.getByRole("button", {
          name: "next",
        }),
      );
      expect(
        screen.getByRole("heading", {
          name: `items.first_booking.steps.${step}.title`,
        }),
      ).toBeInTheDocument();
    }
    fireEvent.click(
      screen.getByRole("button", {
        name: "next",
      }),
    );
    expect(
      screen.getByRole("heading", {
        name: "finishedTitle",
      }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.updatePreferences).toHaveBeenCalledWith({
        contextualGuides: {
          first_booking: {
            version: 1,
            status: "completed",
            lastStep: "confirmation",
          },
        },
      });
    });
    view.rerender(<Fixture />);
    expect(
      mocks.updatePreferences.mock.calls.filter(
        ([body]) =>
          body.contextualGuides?.first_booking?.status === "completed",
      ),
    ).toHaveLength(1);
    expect(
      mocks.track.mock.calls.filter(
        ([body]) => body.event === "contextual_guide_completed",
      ),
    ).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", {
        name: "finish",
      }),
    );
    expect(mocks.push).toHaveBeenCalledWith("/app/calendar?view=week");
  });
  it("hands first-offer completion to Launch Center without leaking filters", async () => {
    mocks.access = {
      ...access(),
      permissions: ["products.view", "products.manage"],
    };
    mocks.tenant = {
      modules: {
        bookings: true,
        courses: false,
      },
    };
    mocks.pathname = "/app/products";
    mocks.search = "category=classes&locationId=studio-1&guide=first_offer";
    render(<Fixture />);
    expect(
      await screen.findByRole("heading", {
        name: "items.first_offer.steps.offer_types.title",
      }),
    ).toBeInTheDocument();
    for (const step of ["create_offer", "price_capacity", "publish"]) {
      fireEvent.click(
        screen.getByRole("button", {
          name: "next",
        }),
      );
      expect(
        screen.getByRole("heading", {
          name: `items.first_offer.steps.${step}.title`,
        }),
      ).toBeInTheDocument();
    }
    fireEvent.click(
      screen.getByRole("button", {
        name: "next",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "items.first_offer.cta",
      }),
    );
    expect(mocks.push).toHaveBeenCalledWith("/app/setup?step=bookable_offer");
  });
  it("keeps passive setup guides in Help without prompting", async () => {
    mocks.access = {
      ...access(),
      permissions: ["payments.connect.manage"],
    };
    mocks.tenant = {
      modules: {
        payments: true,
      },
    };
    mocks.pathname = "/app/settings/payments";
    render(<Fixture />);
    await waitFor(() => {
      expect(
        screen.queryByRole("region", {
          name: "promptTitle",
        }),
      ).not.toBeInTheDocument();
    });
    expect(mocks.track).not.toHaveBeenCalled();
  });
  it("offers one nonmodal prompt per session and defers Not now", async () => {
    render(
      <StrictMode>
        <Fixture />
      </StrictMode>,
    );
    expect(
      await screen.findByRole("region", {
        name: "promptTitle",
      }),
    ).toHaveAttribute("data-contextual-guide-prompt", "first_booking");
    fireEvent.click(
      screen.getByRole("button", {
        name: "notNow",
      }),
    );
    await waitFor(() => {
      expect(
        screen.queryByRole("region", {
          name: "promptTitle",
        }),
      ).not.toBeInTheDocument();
    });
    expect(mocks.updatePreferences).not.toHaveBeenCalled();
    expect(mocks.track).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "contextual_guide_skipped",
        metadata: expect.objectContaining({
          guideEntryPoint: "contextual_prompt",
        }),
      }),
    );
    expect(window.sessionStorage.length).toBe(1);
  });
  it("does not re-prompt after a Help replay is skipped", async () => {
    mocks.search = "guide=first_booking";
    const view = render(<Fixture />);
    await screen.findByRole("heading", {
      name: "items.first_booking.steps.calendar.title",
    });
    mocks.search = "";
    view.rerender(<Fixture />);
    const skipButtons = screen.getAllByRole("button", {
      name: "skip",
    });
    fireEvent.click(skipButtons.at(-1));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("region", {
        name: "promptTitle",
      }),
    ).not.toBeInTheDocument();
  });
  it("prompts users who were not eligible for the product tour", async () => {
    mocks.access = {
      ...access(),
      preferences: {
        contextualGuides: {},
      },
    };
    render(<Fixture productTourEligible={false} />);
    expect(
      await screen.findByRole("region", {
        name: "promptTitle",
      }),
    ).toHaveAttribute("data-contextual-guide-prompt", "first_booking");
  });
  it("suppresses prompts after completion and during Launch Center guidance", async () => {
    mocks.access = access({
      first_booking: {
        version: 1,
        status: "completed",
        lastStep: "confirmation",
      },
    });
    const view = render(<Fixture />);
    await waitFor(() => {
      expect(
        screen.queryByRole("region", {
          name: "promptTitle",
        }),
      ).not.toBeInTheDocument();
    });
    mocks.access = access();
    mocks.search = "setupStep=bookable_offer";
    view.rerender(<Fixture />);
    await waitFor(() => {
      expect(
        screen.queryByRole("region", {
          name: "promptTitle",
        }),
      ).not.toBeInTheDocument();
    });
    expect(mocks.track).not.toHaveBeenCalled();
  });
  it("uses the visible preview toggle for customer-journey steps on mobile", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    mocks.access = {
      ...access(),
      permissions: ["workspace.update", "products.view", "bookings.create"],
    };
    mocks.tenant = {
      modules: {
        bookings: true,
      },
    };
    mocks.pathname = "/app/settings/public-site";
    mocks.search = "guide=test_customer_journey";
    const target = document.createElement("button");
    target.dataset.contextualGuideTarget = "website-preview-toggle";
    target.getBoundingClientRect = () => ({
      bottom: 72,
      height: 44,
      left: 20,
      right: 120,
      top: 28,
      width: 100,
      x: 20,
      y: 28,
      toJSON: () => ({}),
    });
    document.body.append(target);
    render(<WorkspaceContextualGuides />);
    for (const key of [
      "public_site",
      "test_booking",
      "confirmation_email",
      "customer_portal",
    ]) {
      expect(
        await screen.findByRole("heading", {
          name: `items.test_customer_journey.steps.${key}.title`,
        }),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(
          document.querySelector("[data-contextual-guide-spotlight]"),
        ).toBeInTheDocument();
      });
      if (key !== "customer_portal") {
        fireEvent.click(
          screen.getByRole("button", {
            name: "next",
          }),
        );
      }
    }
    target.remove();
  });
});
