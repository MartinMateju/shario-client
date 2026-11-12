import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";

const mocks = vi.hoisted(() => ({ locale: "en", tenant: null }));

vi.mock("react-redux", () => ({ useSelector: () => null }));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () =>
    mocks.tenant ? { tenant: mocks.tenant } : null,
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import CustomerPortalHelpDrawer, {
  CustomerPortalHelpTrigger,
  getCustomerPortalHelpCopy,
  getCustomerPortalHelpTopics,
} from "@/components/customer-shell/CustomerPortalHelpDrawer";
import {
  CUSTOMER_PORTAL_CONCIERGE_OPEN_EVENT,
  emitCustomerPortalOverlayEvent,
} from "@/components/customer-shell/customerPortalOverlayEvents";

function HelpHarness({ locationReference = "studio-brno", onStartTour }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <CustomerPortalHelpTrigger
        controls="customer-help"
        expanded={open}
        onOpen={() => setOpen(true)}
      />
      <CustomerPortalHelpDrawer
        dialogId="customer-help"
        locationReference={locationReference}
        onClose={() => setOpen(false)}
        onStartTour={onStartTour}
        open={open}
        primaryColor="#8A3FFC"
        primaryForeground="#FFFFFF"
      />
    </>
  );
}

afterEach(() => {
  cleanup();
  mocks.locale = "en";
  mocks.tenant = null;
});

describe("CustomerPortalHelpDrawer", () => {
  it("omits disabled destinations and the calendar tour without removing the drawer close action", async () => {
    mocks.tenant = {
      publicSite: {
        customerPortal: {
          pages: {
            calendar: { enabled: false },
            vouchers: { enabled: false },
            bookings: { enabled: false },
          },
        },
      },
    };
    const user = userEvent.setup();
    render(<HelpHarness />);
    await user.click(screen.getByRole("button", { name: "Help and guides" }));
    expect(
      await screen.findByRole("dialog", { name: "Help and guides" }),
    ).toBeInTheDocument();
    expect(
      document.querySelectorAll("[data-customer-portal-help-action]"),
    ).toHaveLength(0);
    expect(
      document.querySelector("[data-customer-portal-tour-replay]"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close help" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("retains enabled help links and their location while hiding credit guidance if credits are disabled", () => {
    const topics = getCustomerPortalHelpTopics({
      locale: "en",
      locationReference: "studio-brno",
      tenant: {
        publicSite: {
          customerPortal: { pages: { credits: { enabled: false } } },
        },
      },
    });
    expect(topics.map(({ id }) => id)).not.toContain("useCredits");
    expect(topics.find(({ id }) => id === "createBooking").href).toBe(
      "/portal?tab=studio-calendar&location=studio-brno",
    );
  });
  it("opens an accessible system-owned drawer with five fixed topics", async () => {
    const user = userEvent.setup();
    render(<HelpHarness />);

    const trigger = screen.getByRole("button", { name: "Help and guides" });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-controls", "customer-help");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("data-tenant-hover", "preserve");
    expect(trigger).toHaveClass(
      "h-11",
      "w-11",
      "border-transparent",
      "text-[var(--tenant-text)]",
      "hover:bg-[var(--tenant-surface)]",
    );
    expect(trigger).not.toHaveClass("bg-white/85", "border-white/80");
    expect(trigger.className).not.toContain("shadow-");

    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Help and guides",
    });
    const panel = dialog.querySelector("[data-customer-portal-help-panel]");
    expect(panel).toHaveAttribute(
      "data-customer-portal-help-content",
      "system",
    );
    expect(panel).toHaveClass("w-full", "max-w-[470px]");
    expect(panel).toHaveAttribute("data-tenant-surface", "panel");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      document.querySelectorAll("[data-customer-portal-help-topic]"),
    ).toHaveLength(5);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "What would you like help with?",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose a topic for clear steps and a direct link to the right place.",
      ),
    ).toBeVisible();

    const themeRoot = document.querySelector(
      '[style*="--tenant-portal-button"]',
    );
    expect(themeRoot.style.getPropertyValue("--tenant-portal-button")).toBe(
      "#8A3FFC",
    );
    expect(
      themeRoot.style.getPropertyValue("--tenant-portal-button-foreground"),
    ).toBe("#FFFFFF");
    expect(themeRoot.style.getPropertyValue("--tenant-background")).toBe(
      "var(--tenant-portal-profile-background)",
    );

    const topicButtons = document.querySelectorAll(
      "[data-customer-portal-help-toggle]",
    );
    expect(topicButtons).toHaveLength(5);
    topicButtons.forEach((button) =>
      expect(button).toHaveAttribute("aria-expanded", "false"),
    );
    topicButtons.forEach((button) =>
      expect(button).toHaveAttribute("data-tenant-hover", "preserve"),
    );
    expect(screen.getByRole("button", { name: "Close help" })).toHaveAttribute(
      "data-tenant-hover",
      "preserve",
    );

    const createButton = screen.getByRole("button", {
      name: /How to create a booking/,
    });
    const voucherButton = screen.getByRole("button", {
      name: /How to redeem a gift voucher/,
    });

    createButton.focus();
    await user.keyboard("{Enter}");

    const createRegion = screen.getByRole("region", {
      name: /How to create a booking/,
    });
    expect(createButton).toHaveAttribute("aria-expanded", "true");
    expect(createButton).toHaveAttribute("aria-controls", createRegion.id);
    expect(createRegion).toHaveAttribute("aria-labelledby", createButton.id);
    expect(
      screen.getByText(
        "Open Book a session and choose the studio location you want to visit.",
      ),
    ).toBeVisible();

    await user.click(voucherButton);
    expect(createButton).toHaveAttribute("aria-expanded", "false");
    expect(voucherButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(
        "Open Book a session and choose the studio location you want to visit.",
      ),
    ).not.toBeVisible();
    expect(
      screen.getByText(
        "Enter the code in the format D4T-32S-053 and select Redeem voucher.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Redeem a voucher" }),
    ).toHaveAttribute("href", "/portal/vouchers?location=studio-brno");
    expect(
      screen.getByRole("link", { name: "Redeem a voucher" }),
    ).toHaveAttribute("data-tenant-hover", "preserve");

    await user.click(voucherButton);
    expect(voucherButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("region", {
        name: /How to redeem a gift voucher/,
      }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close help" }));
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Help and guides" }),
      ).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  }, 10_000);

  it("replays the product tour from the tenant-themed guide card", async () => {
    const user = userEvent.setup();
    const onStartTour = vi.fn();
    render(<HelpHarness onStartTour={onStartTour} />);

    await user.click(screen.getByRole("button", { name: "Help and guides" }));
    const replay = await screen.findByRole("button", { name: /Replay tour/ });

    expect(replay).toHaveAttribute("data-customer-portal-tour-replay");
    expect(replay).toHaveAttribute("data-tenant-surface", "card");
    expect(replay).toHaveAttribute("data-tenant-hover", "preserve");
    await user.click(replay);
    expect(onStartTour).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Help and guides" }),
      ).not.toBeInTheDocument();
    });
  });

  it("uses Czech system copy and keeps the selected studio in every action", () => {
    mocks.locale = "cs";

    const copy = getCustomerPortalHelpCopy("cs");
    const topics = getCustomerPortalHelpTopics({
      locale: "cs",
      locationReference: "studio-praha",
    });

    expect(copy.title).toBe("Nápověda a návody");
    expect(copy.eyebrow).toBe("Nápověda k rezervacím");
    expect(topics.map((topic) => topic.id)).toEqual([
      "createBooking",
      "redeemVoucher",
      "cancelBooking",
      "editBooking",
      "useCredits",
    ]);
    expect(topics).toHaveLength(5);

    for (const topic of topics) {
      expect(topic.title).toBeTruthy();
      expect(topic.summary).toBeTruthy();
      expect(topic.steps).toHaveLength(3);
      expect(topic.href).toContain("location=studio-praha");
    }
  });

  it("closes when the customer concierge opens", async () => {
    const user = userEvent.setup();
    render(<HelpHarness />);
    await user.click(screen.getByRole("button", { name: "Help and guides" }));
    await screen.findByRole("dialog", { name: "Help and guides" });

    emitCustomerPortalOverlayEvent(CUSTOMER_PORTAL_CONCIERGE_OPEN_EVENT);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Help and guides" }),
      ).not.toBeInTheDocument();
    });
  });
});
