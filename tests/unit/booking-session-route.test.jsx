import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/PermissionBoundary", () => ({
  default: ({ children, permission }) => (
    <div data-testid="permission" data-permission={permission}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/bookings/BookingSessionComposer", () => ({
  default: () => <div data-testid="composer" />,
}));

import NewTenantBookingPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/bookings/new/page";

describe("new tenant booking route", () => {
  it("requires booking creation permission and renders the full-page composer", () => {
    render(<NewTenantBookingPage />);

    expect(screen.getByTestId("permission")).toHaveAttribute(
      "data-permission",
      "bookings.create",
    );
    expect(screen.getByTestId("composer")).toBeInTheDocument();
  });
});
