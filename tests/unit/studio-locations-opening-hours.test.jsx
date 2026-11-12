import { render, screen } from "@testing-library/react";

import StudioLocationsPage from "@/components/views/locations/StudioLocationsPage";

const LOCATION_ID = "64b000000000000000000001";
const searchParams = new URLSearchParams("tab=details&source=settings");

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key) =>
    ({
      edit: "Edit",
      addLocation: "Add location",
      active: "Active",
      inactive: "Inactive",
      primary: "Primary",
      timezone: "Timezone",
      capacity: "Capacity",
      deactivate: "Deactivate",
      activate: "Activate",
      makePrimary: "Make primary",
      accessCodes: "Door access",
      noAddress: "Address not added",
    })[key] || key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => ({ tenantId: "64b000000000000000000000" }),
  selectCurrentWorkspaceAccess: () => ({ role: "owner" }),
}));

vi.mock("@/config/permissions", () => ({
  PERMISSIONS: {
    ACCESS_CODES_VIEW: "access_codes.view",
    LOCATIONS_MANAGE: "locations.manage",
  },
  hasPermission: () => true,
}));

vi.mock("@/components/views/locations/CustomerPortalLinks", () => ({
  default: () => null,
}));

vi.mock("@/lib/features/tenants/tenantApiSlice", () => ({
  useGetCurrentTenantOnboardingQuery: () => ({
    data: { tenant: { limits: { locations: 2 } } },
  }),
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useActivateLocationMutation: () => [vi.fn()],
  useDeactivateLocationMutation: () => [vi.fn()],
  useGetLocationsQuery: () => ({
    data: {
      locations: [
        {
          id: LOCATION_ID,
          name: "Klei Atelier – Václavská",
          isActive: true,
          isPrimary: true,
          address: {
            line1: "Václavská 237/6",
            city: "Brno",
            postalCode: "603 00",
          },
          booking: {
            timezone: "Europe/Prague",
            globalCapacity: 8,
          },
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useSetPrimaryLocationMutation: () => [vi.fn()],
}));

describe("StudioLocationsPage", () => {
  it("routes edit actions to the dedicated page and renders no dialog", () => {
    render(<StudioLocationsPage showPageHeader={false} />);

    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/app/settings/locations/${LOCATION_ID}/edit?tab=details&source=settings`,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Klei Atelier – Václavská")).toBeInTheDocument();
  });
});
