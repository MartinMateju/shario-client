import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publicTenant = vi.hoisted(() => ({ tenant: null }));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () =>
    publicTenant.tenant ? { tenant: publicTenant.tenant } : null,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key, values) =>
    values?.studio ? `${key}: ${values.studio}` : key,
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, className, open, style, ...props }) =>
    open ? (
      <div
        role="dialog"
        className={className}
        data-tenant-style={props["data-tenant-style"]}
        style={style}
      >
        {children}
      </div>
    ) : null,
  DialogBackdrop: () => <div data-testid="dialog-backdrop" />,
  DialogPanel: ({ children, ...props }) => <div {...props}>{children}</div>,
  DialogTitle: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
}));

vi.mock("@/components/ai/AiMessage", () => ({
  default: ({ compact, feedback, message, tenantThemed }) => (
    <article
      data-testid={`concierge-message-${message?.role}`}
      data-compact={String(Boolean(compact))}
      data-feedback={String(Boolean(feedback))}
      data-tenant-themed={String(Boolean(tenantThemed))}
    >
      {message?.text ?? message?.content}
    </article>
  ),
}));

import ConciergeWidget from "@/components/ai/ConciergeWidget";

const openConcierge = () =>
  fireEvent.click(screen.getByRole("button", { name: "open" }));

describe("ConciergeWidget compact conversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publicTenant.tenant = null;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  it("suppresses disabled portal handoff links while preserving the explanation and preview updates", async () => {
    publicTenant.tenant = {
      publicSite: {
        customerPortal: { pages: { bookings: { enabled: false } } },
      },
    };
    const onSend = vi.fn().mockResolvedValue({
      message: {
        id: "assistant",
        role: "assistant",
        content: "Your booking is confirmed.",
      },
      handoff: {
        title: "Manage booking",
        description: "Contact the studio for help.",
        label: "Open bookings",
        href: "/portal/bookings?location=studio-a",
      },
    });
    const { rerender } = render(
      <ConciergeWidget
        surface="customer"
        studioName="Studio"
        onSend={onSend}
      />,
    );
    openConcierge();
    const input = screen.getByRole("textbox", { name: "inputLabel" });
    fireEvent.change(input, { target: { value: "Show my booking" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByText("Manage booking")).toBeVisible();
    expect(screen.getByText("Contact the studio for help.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Open bookings" })).toBeNull();

    publicTenant.tenant.publicSite.customerPortal.pages.bookings.enabled = true;
    rerender(
      <ConciergeWidget
        surface="customer"
        studioName="Studio"
        onSend={onSend}
      />,
    );
    expect(screen.getByRole("link", { name: "Open bookings" })).toHaveAttribute(
      "href",
      "/portal/bookings?location=studio-a",
    );
  });

  it.each([
    "/portal/account",
    "/app/knowledge",
    "https://example.com/portal/bookings",
    "mailto:studio@example.com",
    "tel:+420123456789",
  ])(
    "preserves enabled portal and nonportal handoff links: %s",
    async (href) => {
      publicTenant.tenant = {
        publicSite: {
          customerPortal: { pages: { bookings: { enabled: false } } },
        },
      };
      const onSend = vi.fn().mockResolvedValue({
        message: {
          id: "assistant",
          role: "assistant",
          content: "Here is more help.",
        },
        handoff: { title: "More help", label: "Continue", href },
      });
      render(
        <ConciergeWidget
          surface="customer"
          studioName="Studio"
          onSend={onSend}
        />,
      );
      openConcierge();
      const input = screen.getByRole("textbox", { name: "inputLabel" });
      fireEvent.change(input, { target: { value: "Help me" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(
        await screen.findByRole("link", { name: "Continue" }),
      ).toHaveAttribute("href", href);
    },
  );

  it("keeps the composer compact and respects multiline and IME keyboard input", async () => {
    const onSend = vi.fn().mockResolvedValue({
      conversationId: "conversation-public",
      message: {
        id: "assistant-public",
        role: "assistant",
        content: "The studio opens at ten.",
      },
      sessionToken: "session-public",
    });
    render(
      <ConciergeWidget
        surface="public"
        studioName="Atelier Nami"
        sessionStorageKey="concierge:public:test"
        onSend={onSend}
      />,
    );

    openConcierge();

    const dialog = screen.getByRole("dialog");
    const panel = dialog.querySelector('[data-dialog-layout="drawer"]');
    const input = screen.getByRole("textbox", { name: "inputLabel" });
    const form = input.closest("form");
    const send = screen.getByRole("button", { name: "send" });
    const close = screen.getByRole("button", { name: "close" });

    expect(form).toHaveAttribute("data-ui-unstyled", "true");
    expect(panel).toHaveClass(
      "h-[100dvh]",
      "w-full",
      "sm:h-[min(760px,calc(100dvh-2.5rem))]",
      "sm:max-w-[430px]",
    );
    expect(input).toHaveAttribute("rows", "1");
    expect(input).toHaveAttribute("aria-describedby");
    expect(send).toHaveClass("h-11", "w-11");
    expect(close).toHaveClass("h-11", "w-11");

    let scrollHeight = 48;
    Object.defineProperty(input, "scrollHeight", {
      configurable: true,
      get: () => scrollHeight,
    });

    fireEvent.change(input, { target: { value: "When do you open?" } });
    await waitFor(() => {
      expect(input.style.height).toBe("48px");
      expect(input.style.overflowY).toBe("hidden");
    });

    scrollHeight = 96;
    fireEvent.change(input, {
      target: { value: "When do you open, and what should I bring?" },
    });
    await waitFor(() => {
      expect(input.style.height).toBe("56px");
      expect(input.style.overflowY).toBe("auto");
    });

    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith({
        message: "When do you open, and what should I bring?",
      }),
    );

    const userMessage = await screen.findByTestId("concierge-message-user");
    const assistantMessage = await screen.findByTestId(
      "concierge-message-assistant",
    );
    for (const message of [userMessage, assistantMessage]) {
      expect(message).toHaveAttribute("data-compact", "true");
      expect(message).toHaveAttribute("data-feedback", "false");
      expect(message).toHaveAttribute("data-tenant-themed", "false");
    }
  });

  it("preserves the authenticated customer tenant theme and themed messages", async () => {
    const tenantThemeStyle = {
      "--tenant-accent": "#9B4B35",
      "--tenant-accent-foreground": "#FFFFFF",
      "--tenant-background": "#F9EADC",
    };
    const onSend = vi.fn().mockResolvedValue({
      conversationId: "conversation-customer",
      message: {
        id: "assistant-customer",
        role: "assistant",
        content: "Use the approved stoneware clay.",
      },
    });
    render(
      <ConciergeWidget
        surface="customer"
        studioName="Atelier Warm"
        tenantStylePresetId="warm-organic-v1"
        tenantThemeStyle={tenantThemeStyle}
        onSend={onSend}
      />,
    );

    expect(screen.getByRole("button", { name: "open" })).toHaveAttribute(
      "data-tenant-hover",
      "preserve",
    );
    openConcierge();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("data-tenant-style", "warm-organic-v1");
    for (const [property, value] of Object.entries(tenantThemeStyle)) {
      expect(dialog.style.getPropertyValue(property)).toBe(value);
    }

    const input = screen.getByRole("textbox", { name: "inputLabel" });
    fireEvent.change(input, { target: { value: "Which clay can I use?" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith({
        message: "Which clay can I use?",
      }),
    );
    const userMessage = await screen.findByTestId("concierge-message-user");
    const assistantMessage = await screen.findByTestId(
      "concierge-message-assistant",
    );
    for (const message of [userMessage, assistantMessage]) {
      expect(message).toHaveAttribute("data-compact", "true");
      expect(message).toHaveAttribute("data-tenant-themed", "true");
    }
    expect(screen.getByRole("button", { name: "send" })).toHaveAttribute(
      "data-customer-concierge-send",
    );
  });

  it("moves the customer launcher clear of both calendar controls", async () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback) => {
        callback();
        return 1;
      }),
    );
    vi.stubGlobal(
      "MutationObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1_000,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 700,
    });

    const rect = (left, top, width, height) => ({
      bottom: top + height,
      height,
      left,
      right: left + width,
      top,
      width,
      x: left,
      y: top,
      toJSON: () => ({}),
    });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect() {
        if (this.matches("[data-concierge-launcher]")) {
          return rect(930, 570, 54, 56);
        }
        if (this.matches("[data-calendar-command-bar]")) {
          return rect(0, 520, 1_000, 60);
        }
        if (this.matches("[data-customer-calendar-studio-selector]")) {
          return rect(700, 450, 284, 70);
        }
        if (this.matches("[data-customer-calendar-shell]")) {
          return rect(0, 420, 1_000, 600);
        }
        return rect(0, 0, 0, 0);
      },
    );

    render(
      <>
        <div data-customer-calendar-shell>
          <div data-customer-calendar-studio-selector />
          <div data-calendar-command-bar />
        </div>
        <ConciergeWidget
          surface="customer"
          studioName="Atelier Warm"
          onSend={vi.fn()}
        />
      </>,
    );

    const launcher = screen.getByRole("button", { name: "open" });
    await waitFor(() =>
      expect(launcher).toHaveAttribute(
        "data-concierge-avoiding-controls",
        "true",
      ),
    );
    expect(launcher).toHaveAttribute("data-concierge-shifted", "true");
    expect(launcher.style.bottom).toContain("px");
    expect(launcher.style.right).toContain("px");
    expect(launcher).not.toHaveClass(
      "pointer-events-none",
      "invisible",
      "opacity-0",
    );
  });

  it("moves the customer launcher clear of the open calendar filter panel", async () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback) => {
        callback();
        return 1;
      }),
    );
    vi.stubGlobal(
      "MutationObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 844,
    });

    const rect = (left, top, width, height) => ({
      bottom: top + height,
      height,
      left,
      right: left + width,
      top,
      width,
      x: left,
      y: top,
      toJSON: () => ({}),
    });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect() {
        // The command bar stays pinned near the top of the scrolled view, so
        // only the filter panel below it can explain any launcher avoidance
        // here: the launcher's resting position sits directly over the
        // legend rendered inside the open filter panel, matching the
        // collapsed customer calendar toolbar on a phone-width viewport.
        if (this.matches("[data-concierge-launcher]")) {
          return rect(316, 770, 58, 58);
        }
        if (this.matches("[data-calendar-command-bar]")) {
          return rect(0, 0, 390, 60);
        }
        if (this.matches("[data-calendar-filter-panel]")) {
          return rect(0, 731, 390, 122);
        }
        if (this.matches("[data-customer-calendar-shell]")) {
          return rect(0, 0, 390, 853);
        }
        return rect(0, 0, 0, 0);
      },
    );

    render(
      <>
        <div data-customer-calendar-shell>
          <div data-calendar-command-bar />
          <div data-calendar-filter-panel />
        </div>
        <ConciergeWidget
          surface="customer"
          studioName="Atelier Warm"
          onSend={vi.fn()}
        />
      </>,
    );

    const launcher = screen.getByRole("button", { name: "open" });
    await waitFor(() =>
      expect(launcher).toHaveAttribute(
        "data-concierge-avoiding-controls",
        "true",
      ),
    );
    expect(launcher.style.bottom).toContain("px");
    expect(launcher).not.toHaveClass(
      "pointer-events-none",
      "invisible",
      "opacity-0",
    );
  });

  it("removes an undockable launcher from visual and keyboard navigation", async () => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback) => {
        callback();
        return 1;
      }),
    );
    vi.stubGlobal(
      "MutationObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 200,
    });

    const rect = (left, top, width, height) => ({
      bottom: top + height,
      height,
      left,
      right: left + width,
      top,
      width,
      x: left,
      y: top,
      toJSON: () => ({}),
    });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect() {
        if (this.matches("[data-concierge-launcher]")) {
          return rect(250, 130, 54, 56);
        }
        if (this.matches("[data-calendar-command-bar]")) {
          return rect(0, 0, 320, 200);
        }
        if (this.matches("[data-customer-calendar-shell]")) {
          return rect(0, 0, 320, 200);
        }
        return rect(0, 0, 0, 0);
      },
    );

    render(
      <>
        <div data-customer-calendar-shell>
          <div data-calendar-command-bar />
        </div>
        <ConciergeWidget
          surface="customer"
          studioName="Atelier Warm"
          onSend={vi.fn()}
        />
      </>,
    );

    const launcher = document.querySelector("[data-concierge-launcher]");
    await waitFor(() => expect(launcher).toBeDisabled());
    expect(launcher).toHaveAttribute("aria-hidden", "true");
    expect(launcher).toHaveAttribute("tabindex", "-1");
    expect(launcher).toHaveAttribute("data-concierge-hidden", "true");
    expect(launcher).toHaveClass(
      "pointer-events-none",
      "invisible",
      "opacity-0",
    );
  });
});
