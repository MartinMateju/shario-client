import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import PublicWebsiteHeader from "@/components/headers/PublicWebsiteHeader";
import { normalizePublicTenant } from "@/components/public-tenant/publicTenant.config";

vi.mock("next-intl", () => ({
  useTranslations: () => (key) =>
    ({
      openMenu: "Open menu",
      closeMenu: "Close menu",
      "mobile.navigation": "Studio navigation",
      "mobile.language": "Language",
    })[key] || key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a {...props} href={`/en${href}`} data-router-link>
      {children}
    </a>
  ),
}));

const tenant = normalizePublicTenant({
  slug: "example",
  publicSite: {
    branding: {
      displayName: "Example studio",
      logoUrl: "https://www.example.com/logo.svg",
      logoRedirectEnabled: true,
      logoRedirectUrl: "https://www.example.com/",
      backgroundColor: "#FFFFFF",
    },
    header: {
      layout: "website",
      backgroundColor: "#F6EADE",
      linkColor: "#2F61CC",
      buttonColor: "#ED8467",
    },
  },
});
const items = [
  {
    key: "custom-courses",
    custom: true,
    label: "Courses",
    href: "/en/courses?location=vaclavska",
  },
  {
    key: "custom-studios",
    custom: true,
    label: "Studios",
    children: [
      {
        key: "custom-group:studios:grohova",
        custom: true,
        label: "Grohova",
        href: "https://www.example.com/en/grohova/",
      },
      {
        key: "custom-group:studios:about",
        custom: true,
        label: "About us",
        href: "https://www.example.com/en/about/",
        separatorBefore: true,
      },
    ],
  },
  {
    key: "custom-reserve",
    custom: true,
    label: "Reservation",
    href: "/en/portal",
    emphasis: "button",
  },
];
const props = {
  tenant,
  items,
  locale: "en",
  localeCodes: ["cs", "en"],
  onLocaleChange: vi.fn(),
};

describe("public website header", () => {
  it("uses the compact menu for long or dense custom navigation without truncating labels", async () => {
    const user = userEvent.setup();
    const longLabel = "A very long translated studio navigation destination";
    const { container } = render(
      <PublicWebsiteHeader
        {...props}
        items={[
          {
            key: "custom-long",
            custom: true,
            label: longLabel,
            href: "https://www.example.com/long",
          },
        ]}
      />,
    );
    expect(
      container.querySelector("[data-public-website-header]"),
    ).toHaveAttribute("data-compact", "true");
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("link", { name: longLabel }),
    ).toHaveAttribute("href", "https://www.example.com/long");
    await user.click(
      within(dialog).getByRole("button", { name: "Close menu" }),
    );
  });

  it("uses independent header colors and exact configured destinations", () => {
    const { container } = render(<PublicWebsiteHeader {...props} />);
    const header = container.querySelector("[data-public-website-header]");
    expect(header.style.getPropertyValue("--website-header-background")).toBe(
      "#F6EADE",
    );
    expect(header.style.getPropertyValue("--website-header-link")).toBe(
      "#2F61CC",
    );
    expect(header.style.getPropertyValue("--website-header-button")).toBe(
      "#ED8467",
    );
    expect(tenant.publicSite.branding.backgroundColor).toBe("#FFFFFF");
    expect(screen.getByRole("link", { name: "Courses" })).toHaveAttribute(
      "href",
      "/en/courses?location=vaclavska",
    );
    expect(screen.getByRole("link", { name: "Reservation" })).toHaveAttribute(
      "href",
      "/en/portal",
    );
    expect(
      screen.getByRole("link", { name: "Example studio" }),
    ).toHaveAttribute("href", "https://www.example.com/");
    expect(screen.getByRole("link", { name: "Courses" })).not.toHaveAttribute(
      "data-router-link",
    );
    expect(screen.getAllByRole("link", { name: "Reservation" })).toHaveLength(
      1,
    );
  });

  it("opens groups by click, preserves child hrefs, and closes on Escape with focus restored", async () => {
    const user = userEvent.setup();
    render(<PublicWebsiteHeader {...props} />);
    const trigger = screen.getByRole("button", { name: "Studios" });
    expect(screen.queryByRole("link", { name: "Grohova" })).toBeNull();
    await user.click(trigger);
    const child = screen.getByRole("link", { name: "Grohova" });
    expect(child).toHaveAttribute(
      "href",
      "https://www.example.com/en/grohova/",
    );
    child.focus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("keeps one disclosure open and switches only to a different configured language", async () => {
    const user = userEvent.setup();
    const onLocaleChange = vi.fn();
    render(<PublicWebsiteHeader {...props} onLocaleChange={onLocaleChange} />);
    await user.click(screen.getByRole("button", { name: "Studios" }));
    await user.click(screen.getByRole("button", { name: "Language, EN" }));
    expect(screen.getByRole("button", { name: "Studios" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await user.click(screen.getByRole("button", { name: "CZ" }));
    expect(onLocaleChange).toHaveBeenCalledWith("cs");
    expect(
      screen.getByRole("button", { name: "Language, EN" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("closes desktop disclosure on outside pointer and focus", () => {
    render(
      <>
        <PublicWebsiteHeader {...props} />
        <button>Outside</button>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Studios" });
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    fireEvent.focusIn(screen.getByRole("button", { name: "Outside" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("traps mobile focus, closes a disclosure before the menu, and restores the trigger", async () => {
    const user = userEvent.setup();
    const { container } = render(<PublicWebsiteHeader {...props} />);
    const open = screen.getByRole("button", { name: "Open menu" });
    await user.click(open);
    const dialog = await screen.findByRole("dialog", {
      name: "Studio navigation",
    });
    expect(container).toHaveAttribute("aria-hidden", "true");
    const studio = within(dialog).getByRole("button", { name: "Studios" });
    await user.click(studio);
    expect(
      within(dialog).getByRole("link", { name: "Grohova" }),
    ).toHaveAttribute("href", "https://www.example.com/en/grohova/");
    await user.keyboard("{Escape}");
    expect(studio).toHaveAttribute("aria-expanded", "false");
    expect(dialog).toBeInTheDocument();
    expect(studio).toHaveFocus();
    for (let index = 0; index < 12; index++) await user.tab();
    expect(dialog).toContainElement(document.activeElement);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(open).toHaveFocus());
    expect(container).not.toHaveAttribute("aria-hidden");
  });
});
