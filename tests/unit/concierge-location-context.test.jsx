import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const GROHOVA = "6aa6942193290d4927b4c181";
const VACLAVSKA = "6aa6942193290d4927b4c182";
const mocks = vi.hoisted(() => ({
  tenantSlug: "klei-atelier",
  locale: "cs",
  pathname: "/courses",
  params: new URLSearchParams(),
  tenant: { name: "Atelier Klei", modules: { ai: true } },
  user: { id: "customer-1" },
  location: null,
  config: null,
  publicSend: vi.fn(),
  customerSend: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: mocks.tenantSlug }),
  useSearchParams: () => mocks.params,
}));
vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key) => key,
}));
vi.mock("next/dynamic", async () => {
  const { default: Widget } = await import("@/components/ai/ConciergeWidget");
  return { default: () => Widget };
});
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => mocks.tenant,
  selectCurrentUser: () => mocks.user,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ tenant: mocks.tenant }),
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => mocks.location,
}));
vi.mock("@/lib/features/ai/aiApiSlice", () => ({
  useGetPublicConciergeConfigQuery: () => ({ currentData: mocks.config }),
  useGetCustomerConciergeConfigQuery: () => ({ data: mocks.config }),
  useSendPublicConciergeMessageMutation: () => [mocks.publicSend],
  useSendCustomerConciergeMessageMutation: () => [mocks.customerSend],
}));
vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, open }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogBackdrop: () => null,
  DialogPanel: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
}));
vi.mock("@/components/ai/AiMessage", () => ({
  default: ({ message }) => <article>{message.text}</article>,
}));

import PublicStudioConcierge from "@/components/ai/PublicStudioConcierge";
import CustomerStudioConcierge from "@/components/ai/CustomerStudioConcierge";

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: "open" }));
const ask = async (send, message = "Kdy máte otevřeno?") => {
  const count = send.mock.calls.length;
  fireEvent.change(screen.getByRole("textbox", { name: "inputLabel" }), {
    target: { value: message },
  });
  fireEvent.click(screen.getByRole("button", { name: "send" }));
  await waitFor(() => expect(send).toHaveBeenCalledTimes(count + 1));
  await waitFor(() => expect(screen.queryByText("thinking")).toBeNull());
};

describe("Concierge studio and conversation scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    mocks.tenantSlug = "klei-atelier";
    mocks.locale = "cs";
    mocks.pathname = "/courses";
    mocks.params = new URLSearchParams("location=vaclavska");
    mocks.tenant = { name: "Atelier Klei", modules: { ai: true } };
    mocks.user = { id: "customer-1" };
    mocks.location = { activeLocationId: VACLAVSKA };
    mocks.config = {
      enabled: true,
      locations: [
        { id: GROHOVA, slug: "grohova", name: "Grohova", isPrimary: true },
        { id: VACLAVSKA, slug: "vaclavska", name: "Václavská" },
      ],
    };
    for (const send of [mocks.publicSend, mocks.customerSend]) {
      send.mockImplementation(() => ({
        unwrap: async () => ({
          conversationId: `conversation-${send.mock.calls.length}`,
          sessionToken: `token-${send.mock.calls.length}`,
          message: { content: "Studio answer", role: "assistant" },
        }),
      }));
    }
  });

  it("sends the public studio ID and starts a separate conversation after switching studios", async () => {
    const { rerender } = render(<PublicStudioConcierge />);
    open();
    await ask(mocks.publicSend);
    expect(mocks.publicSend).toHaveBeenLastCalledWith({
      tenantSlug: "klei-atelier",
      locale: "cs",
      locationId: VACLAVSKA,
      request: { message: "Kdy máte otevřeno?" },
    });
    await ask(mocks.publicSend, "A o víkendu?");
    expect(mocks.publicSend.mock.lastCall[0].request).toEqual({
      message: "A o víkendu?",
      conversationId: "conversation-1",
      sessionToken: "token-1",
    });

    mocks.params = new URLSearchParams("location=grohova");
    rerender(<PublicStudioConcierge />);
    expect(screen.queryByRole("dialog")).toBeNull();
    open();
    expect(screen.queryByText("Studio answer")).toBeNull();
    await ask(mocks.publicSend);
    expect(mocks.publicSend.mock.lastCall[0]).toEqual({
      tenantSlug: "klei-atelier",
      locale: "cs",
      locationId: GROHOVA,
      request: { message: "Kdy máte otevřeno?" },
    });
    expect(
      JSON.parse(
        window.sessionStorage.getItem(
          `shario:concierge:klei-atelier:cs:${VACLAVSKA}`,
        ),
      ),
    ).toEqual({ conversationId: "conversation-2", sessionToken: "token-2" });
  });

  it("accepts legacy public location IDs only when they belong to this studio", async () => {
    mocks.params = new URLSearchParams(`locationId=${VACLAVSKA}`);
    render(<PublicStudioConcierge />);
    open();
    await ask(mocks.publicSend);
    expect(mocks.publicSend.mock.lastCall[0].locationId).toBe(VACLAVSKA);
  });

  it.each([
    "location=unknown",
    "location=",
    "locationId=6aa6942193290d4927b4c199",
  ])(
    "never falls back to the primary studio for an unresolved public location: %s",
    (query) => {
      mocks.params = new URLSearchParams(query);
      render(<PublicStudioConcierge />);
      expect(screen.queryByRole("button", { name: "open" })).toBeNull();
      expect(mocks.publicSend).not.toHaveBeenCalled();
    },
  );

  it("keeps unselected public pages in the default scope without reusing a studio session", async () => {
    mocks.params = new URLSearchParams();
    window.sessionStorage.setItem(
      `shario:concierge:klei-atelier:cs:${VACLAVSKA}`,
      JSON.stringify({
        conversationId: "old-location",
        sessionToken: "old-token",
      }),
    );
    render(<PublicStudioConcierge />);
    open();
    await ask(mocks.publicSend);
    expect(mocks.publicSend.mock.lastCall[0]).toEqual({
      tenantSlug: "klei-atelier",
      locale: "cs",
      locationId: "",
      request: { message: "Kdy máte otevřeno?" },
    });
  });

  it("uses the customer provider's selected location and resets conversation when it changes", async () => {
    mocks.pathname = "/portal";
    const { rerender } = render(<CustomerStudioConcierge />);
    open();
    await ask(mocks.customerSend);
    expect(mocks.customerSend.mock.lastCall[0]).toEqual({
      locale: "cs",
      locationId: VACLAVSKA,
      message: "Kdy máte otevřeno?",
    });
    await ask(mocks.customerSend, "A o víkendu?");
    expect(mocks.customerSend.mock.lastCall[0].conversationId).toBe(
      "conversation-1",
    );

    mocks.location = { activeLocationId: GROHOVA };
    rerender(<CustomerStudioConcierge />);
    open();
    expect(screen.queryByText("Studio answer")).toBeNull();
    await ask(mocks.customerSend);
    expect(mocks.customerSend.mock.lastCall[0]).toEqual({
      locale: "cs",
      locationId: GROHOVA,
      message: "Kdy máte otevřeno?",
    });
  });

  it.each([
    { activeLocationId: "" },
    { activeLocationId: VACLAVSKA, isLoading: true },
    { activeLocationId: VACLAVSKA, isSwitching: true },
  ])("waits for a resolved customer location: %j", (location) => {
    mocks.pathname = "/portal";
    mocks.location = location;
    render(<CustomerStudioConcierge />);
    expect(screen.queryByRole("button", { name: "open" })).toBeNull();
    expect(mocks.customerSend).not.toHaveBeenCalled();
  });

  it.each(["tenant", "locale", "user"])(
    "does not carry a customer conversation across a %s change",
    async (changed) => {
      mocks.pathname = "/portal";
      const { rerender } = render(<CustomerStudioConcierge />);
      open();
      await ask(mocks.customerSend);
      if (changed === "tenant") mocks.tenantSlug = "another-studio";
      if (changed === "locale") mocks.locale = "en";
      if (changed === "user") mocks.user = { id: "customer-2" };
      rerender(<CustomerStudioConcierge />);
      open();
      await ask(mocks.customerSend);
      expect(mocks.customerSend.mock.lastCall[0]).not.toHaveProperty(
        "conversationId",
      );
    },
  );

  it("preserves feature gates for both Concierge surfaces", () => {
    mocks.config.enabled = false;
    const { rerender } = render(<PublicStudioConcierge />);
    expect(screen.queryByRole("button", { name: "open" })).toBeNull();
    mocks.pathname = "/portal";
    rerender(<CustomerStudioConcierge />);
    expect(screen.queryByRole("button", { name: "open" })).toBeNull();
    mocks.config.enabled = true;
    mocks.tenant.modules.ai = false;
    rerender(<CustomerStudioConcierge />);
    expect(screen.queryByRole("button", { name: "open" })).toBeNull();
  });
});
