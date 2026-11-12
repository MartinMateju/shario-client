import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/brand/SkabLogo", () => ({
  default: () => <span>Shario</span>,
}));

import Brand from "@/components/headers/Brand";

const tenant = (branding) => ({
  name: "Atelier Klei",
  publicSite: { branding },
});

describe("tenant header brand", () => {
  it("is inert by default even if an old home destination and callback are supplied", () => {
    const onClickHome = vi.fn();
    const { container } = render(
      <Brand
        href="/portal?location=vaclavska"
        onClickHome={onClickHome}
        tenant={tenant({
          displayName: "Atelier Klei",
          logoUrl: "https://assets.example.test/klei.svg",
          logoRedirectUrl: "https://www.atelierklei.cz/",
        })}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelector("[tabindex], button, a")).toBeNull();
    fireEvent.click(screen.getByRole("img", { name: "Atelier Klei" }));
    expect(onClickHome).not.toHaveBeenCalled();
  });

  it.each([
    "https://www.atelierklei.cz/",
    "https://www.atelierklei.cz/en/commissions/?from=portal#details",
    "/cs/courses?location=vaclavska#available",
  ])("uses the enabled destination unchanged: %s", (destination) => {
    const onClickHome = vi.fn();
    render(
      <Brand
        href="/portal?location=grohova"
        onClickHome={onClickHome}
        tenant={tenant({
          displayName: "Atelier Klei",
          logoRedirectEnabled: true,
          logoRedirectUrl: destination,
        })}
      />,
    );

    const link = screen.getByRole("link", { name: "Atelier Klei" });
    expect(link).toHaveAttribute("href", destination);
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(onClickHome).toHaveBeenCalledOnce();
  });

  it.each([
    "",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://www.atelierklei.cz/",
    "//other.example.test/",
    "/\\other.example.test/",
    "https://user:password@other.example.test/",
  ])("keeps an invalid enabled destination inert: %s", (destination) => {
    const onClickHome = vi.fn();
    const { container } = render(
      <Brand
        href="/portal"
        onClickHome={onClickHome}
        tenant={tenant({
          displayName: "Atelier Klei",
          logoRedirectEnabled: true,
          logoRedirectUrl: destination,
        })}
      />,
    );

    expect(container.querySelector("a, button, [tabindex]")).toBeNull();
    fireEvent.click(screen.getByText("Atelier Klei"));
    expect(onClickHome).not.toHaveBeenCalled();
  });

  it("removes the destination and click callback immediately when switched off", () => {
    const onClickHome = vi.fn();
    const branding = {
      displayName: "Atelier Klei",
      logoRedirectEnabled: true,
      logoRedirectUrl: "https://www.atelierklei.cz/",
    };
    const { rerender } = render(
      <Brand tenant={tenant(branding)} onClickHome={onClickHome} />,
    );
    expect(screen.getByRole("link", { name: "Atelier Klei" })).toHaveAttribute(
      "href",
      branding.logoRedirectUrl,
    );

    rerender(
      <Brand
        tenant={tenant({ ...branding, logoRedirectEnabled: false })}
        onClickHome={onClickHome}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Atelier Klei"));
    expect(onClickHome).not.toHaveBeenCalled();
  });

  it("retains the Shario link and callback outside tenant pages", () => {
    const onClickHome = vi.fn();
    render(<Brand href="/" onClickHome={onClickHome} />);

    const link = screen.getByRole("link", { name: "Shario home" });
    expect(link).toHaveAttribute("href", "/");
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(onClickHome).toHaveBeenCalledOnce();
  });

  it("shows only the uploaded logo when one is available", () => {
    const { container } = render(
      <Brand
        tenant={tenant({
          displayName: "Atelier Klei",
          logoUrl: "https://assets.example.test/klei.svg",
          logoSize: 72,
        })}
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://assets.example.test/klei.svg",
    );
    expect(container.querySelector("img")).toHaveClass("max-h-[72px]");
    expect(container.querySelector("img")).toHaveStyle({ height: "72px" });
    expect(screen.queryByText("Atelier Klei")).not.toBeInTheDocument();
  });

  it("shows only text when no logo is configured", () => {
    const { container } = render(
      <Brand tenant={tenant({ displayName: "Atelier Klei" })} />,
    );

    expect(screen.getByText("Atelier Klei")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("falls back to text if the uploaded logo cannot load", () => {
    const { container } = render(
      <Brand
        tenant={tenant({
          displayName: "Atelier Klei",
          logoUrl: "https://assets.example.test/missing.svg",
        })}
      />,
    );

    fireEvent.error(container.querySelector("img"));
    expect(screen.getByText("Atelier Klei")).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
