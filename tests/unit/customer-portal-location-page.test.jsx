import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  activeLocationId: "",
  availabilityArgs: null,
  availabilityOptions: null,
  bookingError: false,
  bookingsByLocation: {},
  creditOptions: null,
  dispatch: vi.fn(),
  locations: [],
  menuProps: null,
  productError: false,
  catalogProducts: [],
  productArgs: null,
  productOptions: null,
  refetchBookings: vi.fn(),
  refetchProducts: vi.fn(),
  sidebarProps: null,
  upcomingArgs: null,
  upcomingOptions: null,
  publicTenant: null,
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ tenant: mocks.publicTenant }),
}));

vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => "en",
    }))(...args),
  );
});

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(),
}));

vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useCustomerPortalLocation: () => ({
    activeLocation:
      mocks.locations.find(
        (location) => location.id === mocks.activeLocationId,
      ) || null,
    activeLocationId: mocks.activeLocationId,
    locations: mocks.locations,
  }),
}));

vi.mock("@/components/menu/Menu", () => ({
  default: (props) => {
    mocks.menuProps = props;

    return (
      <div data-testid="portal-menu">
        {props.activeLocationId}:{props.bookings[0]?.id || "empty"}
      </div>
    );
  },
}));

vi.mock("@/components/modals/CartModal", () => ({ default: () => null }));
vi.mock("@/components/loaders/Loader", () => ({
  default: () => <div data-testid="loader" />,
}));
vi.mock("@/components/sidebars/Sidebar", () => ({
  default: (props) => {
    mocks.sidebarProps = props;
    return (
      <div
        data-testid="booking-sidebar"
        data-location-id={props.activeLocationId}
      />
    );
  },
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({
    modules: { bookings: true, courses: true, payments: true },
  }),
  selectCurrentUser: () => ({ id: "64b000000000000000000011" }),
}));
vi.mock("@/lib/features/cart/cartSlice", () => ({
  selectCartIsOpen: () => false,
}));
vi.mock("@/lib/features/config/configSlice", () => ({
  setLoaderRunning: (value) => ({ type: "loader", payload: value }),
}));
vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useGetCustomerBookingAvailabilityQuery: (args, options) => {
    mocks.availabilityArgs = args;
    mocks.availabilityOptions = options;

    return {
      data: { bookings: mocks.bookingsByLocation[args?.locationId] || [] },
      isLoading: false,
      isError: mocks.bookingError,
      refetch: mocks.refetchBookings,
    };
  },
  useGetUserBookingsQuery: (args, options) => {
    mocks.upcomingArgs = args;
    mocks.upcomingOptions = options;

    return {};
  },
}));
vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  useGetMyCreditBalanceQuery: (_args, options) => {
    mocks.creditOptions = options;

    return {};
  },
}));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetCustomerCatalogQuery: (args, options) => {
    mocks.productArgs = args;
    mocks.productOptions = options;

    return {
      data: mocks.catalogProducts,
      isLoading: false,
      isError: mocks.productError,
      refetch: mocks.refetchProducts,
    };
  },
}));
vi.mock("@/utils/studioFlow", () => ({
  isAnyStudioModuleEnabled: () => true,
  isCustomerBookingCommerceEnabled: () => true,
  isCustomerBookingFlowEnabled: () => true,
  isServiceCatalogEnabled: () => true,
}));

import BookingDashboard from "@/app/[locale]/tenants/[tenantSlug]/portal/page";

const brno = {
  id: "64b000000000000000000021",
  name: "Atelier Brno",
  slug: "atelier-brno",
  isActive: true,
  isPrimary: true,
  booking: { enabled: true },
};
const prague = {
  id: "64b000000000000000000022",
  name: "Atelier Prague",
  slug: "atelier-prague",
  isActive: true,
  booking: { enabled: true },
};
const pieceStudio = {
  id: "64b000000000000000000023",
  name: "Atelier Pieces",
  slug: "atelier-pieces",
  isActive: true,
  booking: { enabled: false },
};

describe("customer portal studio-scoped availability", () => {
  beforeEach(() => {
    mocks.activeLocationId = brno.id;
    mocks.availabilityArgs = null;
    mocks.availabilityOptions = null;
    mocks.bookingError = false;
    mocks.creditOptions = null;
    mocks.bookingsByLocation = {
      [brno.id]: [{ id: "brno-booking", locationId: brno.id }],
      [prague.id]: [{ id: "prague-booking", locationId: prague.id }],
    };
    mocks.dispatch.mockReset();
    mocks.locations = [brno, prague];
    mocks.menuProps = null;
    mocks.productError = false;
    mocks.catalogProducts = [];
    mocks.productArgs = null;
    mocks.productOptions = null;
    mocks.refetchBookings.mockReset();
    mocks.refetchProducts.mockReset();
    mocks.sidebarProps = null;
    mocks.upcomingArgs = null;
    mocks.upcomingOptions = null;
    mocks.publicTenant = null;
  });

  it("starts the dashboard header queries alongside the calendar data", () => {
    mocks.activeLocationId = prague.id;

    render(<BookingDashboard />);

    expect(mocks.upcomingArgs).toEqual({
      scope: "upcoming",
      page: 1,
      limit: 5,
      locationId: prague.id,
    });
    expect(mocks.upcomingOptions).toMatchObject({ skip: false });
    expect(mocks.creditOptions).toMatchObject({ skip: false });
  });

  it("waits for a studio before requesting the next visit", () => {
    mocks.activeLocationId = "";

    render(<BookingDashboard />);

    expect(mocks.upcomingOptions).toMatchObject({ skip: true });
  });

  it("omits disabled credit and booking-history summaries without disabling the calendar", () => {
    mocks.publicTenant = {
      publicSite: {
        customerPortal: {
          pages: {
            credits: { enabled: false },
            bookings: { enabled: false },
          },
        },
      },
    };
    render(<BookingDashboard />);
    expect(mocks.creditOptions).toMatchObject({ skip: true });
    expect(mocks.upcomingOptions).toMatchObject({ skip: true });
    expect(mocks.availabilityOptions).toMatchObject({ skip: false });
    expect(screen.getByTestId("booking-sidebar")).toBeInTheDocument();
  });

  it("omits calendar data and new booking controls when another portal tab is available", () => {
    mocks.publicTenant = {
      publicSite: {
        customerPortal: { pages: { calendar: { enabled: false } } },
      },
    };
    render(<BookingDashboard />);
    expect(mocks.availabilityOptions).toMatchObject({ skip: true });
    expect(screen.queryByTestId("booking-sidebar")).not.toBeInTheDocument();
    expect(screen.getByTestId("portal-menu")).toBeInTheDocument();
  });

  it("keys availability, menu data, and the booking drawer to the active studio", () => {
    mocks.activeLocationId = prague.id;

    render(<BookingDashboard />);

    expect(mocks.availabilityArgs).toEqual({ locationId: prague.id });
    expect(mocks.availabilityOptions).toMatchObject({ skip: false });
    expect(mocks.productArgs).toEqual({ locationId: prague.id });
    expect(mocks.menuProps).toMatchObject({
      activeLocationId: prague.id,
      activeBookingLocationId: prague.id,
      bookings: [expect.objectContaining({ id: "prague-booking" })],
    });
    expect(screen.getByTestId("portal-menu")).toHaveTextContent(
      `${prague.id}:prague-booking`,
    );
    expect(screen.getByTestId("booking-sidebar")).toHaveAttribute(
      "data-location-id",
      prague.id,
    );
  });

  it("re-keys all booking data when the provider switches studios", () => {
    const view = render(<BookingDashboard />);

    expect(mocks.availabilityArgs).toEqual({ locationId: brno.id });
    expect(screen.getByTestId("portal-menu")).toHaveTextContent(
      `${brno.id}:brno-booking`,
    );

    mocks.activeLocationId = prague.id;
    view.rerender(<BookingDashboard />);

    expect(mocks.availabilityArgs).toEqual({ locationId: prague.id });
    expect(screen.getByTestId("portal-menu")).toHaveTextContent(
      `${prague.id}:prague-booking`,
    );
    expect(mocks.sidebarProps.activeLocationId).toBe(prague.id);
  });

  it("filters retained product data as soon as the portal location changes", () => {
    mocks.catalogProducts = [
      { id: "brno-product", kind: "open-studio", locationId: brno.id },
      { id: "prague-product", kind: "open-studio", locationId: prague.id },
      { id: "unassigned", kind: "open-studio" },
      { id: "voucher", kind: "voucher" },
    ];
    const view = render(<BookingDashboard />);
    expect(mocks.sidebarProps.products.map((product) => product.id)).toEqual([
      "brno-product",
      "voucher",
    ]);
    mocks.activeLocationId = prague.id;
    view.rerender(<BookingDashboard />);
    expect(mocks.sidebarProps.products.map((product) => product.id)).toEqual([
      "prague-product",
      "voucher",
    ]);
  });

  it("skips availability and does not mount the drawer without a studio", () => {
    mocks.activeLocationId = "";

    render(<BookingDashboard />);

    expect(mocks.availabilityArgs).toEqual({ locationId: "" });
    expect(mocks.availabilityOptions).toMatchObject({ skip: true });
    expect(screen.queryByTestId("booking-sidebar")).not.toBeInTheDocument();
  });

  it("switches to a piece-based studio without requesting booking availability", () => {
    mocks.locations = [brno, pieceStudio];
    mocks.activeLocationId = pieceStudio.id;

    render(<BookingDashboard />);

    expect(mocks.availabilityArgs).toEqual({ locationId: "" });
    expect(mocks.availabilityOptions).toMatchObject({ skip: true });
    expect(mocks.productArgs).toEqual({ locationId: pieceStudio.id });
    expect(mocks.menuProps).toMatchObject({
      activeLocationId: pieceStudio.id,
      activeBookingLocationId: "",
    });
    expect(screen.queryByTestId("booking-sidebar")).not.toBeInTheDocument();
  });

  it("retries only the active studio booking and catalog requests", async () => {
    const user = userEvent.setup();
    mocks.bookingError = true;
    mocks.productError = true;

    render(<BookingDashboard />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetchBookings).toHaveBeenCalledTimes(1);
    expect(mocks.refetchProducts).toHaveBeenCalledTimes(1);
  });
});
