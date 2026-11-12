import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const writeText = vi.fn();
const mocks = vi.hoisted(() => ({ locale: "en" }));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key, values) =>
    ({
      title: "Customer portal links",
      description: "Share a portal link.",
      generalLabel: "General customer portal",
      generalDescription: "Customers choose a studio.",
      locationDescription: `Opens ${values?.studio || "the studio"} first.`,
      copy: "Copy link",
      copyFor: `Copy link for ${values?.studio || "the studio"}`,
      copied: "Copied",
      open: "Open",
      openFor: `Open ${values?.studio || "the studio"}`,
      copyError: "Could not copy.",
    })[key] || key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import CustomerPortalLinks from "@/components/views/locations/CustomerPortalLinks";

const locations = [
  {
    id: "64b000000000000000000001",
    name: "Studio Emilka",
    slug: "studio-emilka",
    isActive: true,
    booking: { enabled: true },
  },
  {
    id: "64b000000000000000000002",
    name: "Studio Olivka",
    slug: "studio-olivka",
    isActive: true,
    booking: { enabled: true },
  },
  {
    id: "64b000000000000000000003",
    name: "Inactive Studio",
    slug: "inactive-studio",
    isActive: false,
    booking: { enabled: true },
  },
  {
    id: "64b000000000000000000004",
    name: "Offline Booking Studio",
    slug: "offline-booking-studio",
    isActive: true,
    booking: { enabled: false },
  },
];

describe("studio settings customer portal links", () => {
  beforeEach(() => {
    mocks.locale = "en";
    writeText.mockReset();
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  it("renders a general link and one canonical link per active studio", () => {
    render(<CustomerPortalLinks locations={locations} />);

    expect(screen.getByText("General customer portal")).toBeVisible();
    expect(screen.getByText("Studio Emilka")).toBeVisible();
    expect(screen.getByText("Studio Olivka")).toBeVisible();
    expect(screen.queryByText("Inactive Studio")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Offline Booking Studio"),
    ).not.toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: /^Open / });
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/portal",
      "/portal?location=studio-emilka",
      "/portal?location=studio-olivka",
    ]);
  });

  it("copies the localized absolute location link", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<CustomerPortalLinks locations={locations} />);

    await user.click(
      screen.getByRole("button", { name: "Copy link for Studio Olivka" }),
    );

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0][0]).toMatch(
      /\/en\/portal\?location=studio-olivka$/,
    );
    expect(
      screen.getByRole("button", { name: "Copy link for Studio Olivka" }),
    ).toHaveTextContent("Copied");
  });

  it("shows and copies the canonical European Portuguese route", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    mocks.locale = "pt_PT";
    render(<CustomerPortalLinks locations={locations} />);

    expect(document.querySelector("code")).toHaveTextContent("/pt-PT/portal");

    await user.click(
      screen.getByRole("button", { name: "Copy link for Studio Olivka" }),
    );

    expect(writeText.mock.calls[0][0]).toMatch(
      /\/pt-PT\/portal\?location=studio-olivka$/,
    );
  });
});
