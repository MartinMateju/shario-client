import React from "react";
import { NextIntlClientProvider } from "next-intl";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import nl from "@/messages/nl.json";
import DesktopNavAdmin from "@/components/headers/DesktopNavAdmin";
import MobileMenu from "@/components/headers/MobileMenu";
import { CUSTOMER_SHELL_SURFACES } from "@/components/customer-shell/customerShell.config";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function Dutch({ children }) {
  return (
    <NextIntlClientProvider locale="nl" messages={nl} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

describe("localized admin header navigation", () => {
  it("uses the active locale for desktop labels and descriptions despite a legacy English prop", () => {
    render(
      <Dutch>
        <DesktopNavAdmin pathname="/app/bookings" language="EN" />
      </Dutch>,
    );
    expect(
      screen.getByRole("navigation", { name: "Beheernavigatie" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Basis" }));
    expect(
      screen.getByText("Boekingen, kalender en dagelijkse werkzaamheden."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Beheer boekingen, gasten, betalingen en wijzigingen."),
    ).toBeInTheDocument();
    expect(screen.getByText("Module openen")).toBeInTheDocument();
    expect(
      screen.queryByText("Bookings, calendar and daily operations."),
    ).not.toBeInTheDocument();
  });

  it("uses the same localized definitions in the mobile admin menu", () => {
    render(
      <Dutch>
        <MobileMenu
          open
          setOpen={vi.fn()}
          closeMobileMenu={vi.fn()}
          isAdminRoute
          isAuthenticated
          pathname="/app/settings/team"
          showLanguageSelector={false}
        />
      </Dutch>,
    );
    expect(screen.getByRole("button", { name: "Beheer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Systeem" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Integraties" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "System" }),
    ).not.toBeInTheDocument();
  });

  it("localizes customer booking help in the mobile portal", () => {
    const onOpenCustomerHelp = vi.fn();
    render(
      <Dutch>
        <MobileMenu
          open
          setOpen={vi.fn()}
          closeMobileMenu={vi.fn()}
          isTenantRoute
          isAuthenticated
          customerSurface={CUSTOMER_SHELL_SURFACES.PORTAL}
          tenant={{ name: "Atelier" }}
          onOpenCustomerHelp={onOpenCustomerHelp}
          showLanguageSelector={false}
        />
      </Dutch>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hulp bij boeken" }));
    expect(onOpenCustomerHelp).toHaveBeenCalledOnce();
    expect(screen.queryByText("Booking help")).not.toBeInTheDocument();
  });
});
