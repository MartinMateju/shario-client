import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import messages from "@/messages/en.json";

vi.mock("next-intl", () => ({
  useTranslations: () => (key) =>
    key.split(".").reduce((value, part) => value?.[part], messages) || key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/features/cart/cartSlice", () => ({
  selectCurrentCart: (state) => state?.cart || [],
}));
import DesktopNavPublic from "@/components/headers/DesktopNavPublic";

describe("public navigation", () => {
  it("opens product navigation and supports dismissal with Escape", () => {
    render(<DesktopNavPublic pathname="/" />);
    const trigger = screen.getByRole("button", { name: "Product" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("link", { name: /Bookings made simple/ }),
    ).toHaveAttribute("href", "/product#bookings-payments");
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
  it("offers generic destinations for shared spaces", () => {
    render(<DesktopNavPublic pathname="/for-studios" />);
    fireEvent.click(screen.getByRole("button", { name: "For your space" }));
    expect(
      screen.getByRole("link", { name: /Coworking spaces/ }),
    ).toHaveAttribute("href", "/for-studios#coworking");
    expect(
      screen.getByRole("link", { name: /Rehearsal spaces/ }),
    ).toHaveAttribute("href", "/for-studios#rehearsal");
    expect(screen.queryByRole("link", { name: /pottery/i })).toBeNull();
  });
});
