import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  customerLocationsArgs: null,
  customerLocationsOptions: null,
  customerSurfaceReady: true,
  isError: false,
  isFetching: false,
  isLoading: false,
  hasCurrentData: true,
  locale: "en",
  locations: [],
  dispatch: vi.fn(),
  pathname: "/portal",
  refetch: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
  user: { id: "64b000000000000000000030" },
  tenant: {
    id: "64b000000000000000000020",
    slug: "atelier-tenant",
  },
}));

vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => mocks.locale,
    }))(...args),
  );
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) =>
    selector({ auth: { tenant: mocks.tenant, userInfo: mocks.user } }),
}));

vi.mock("@/components/auth/useIsCustomerSurfaceReady", () => ({
  default: () => mocks.customerSurfaceReady,
}));

vi.mock("@/lib/features/config/configSlice", () => ({
  closeSidebar: () => ({ type: "config/closeSidebar" }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetCustomerLocationsQuery: (args, options) => {
    mocks.customerLocationsArgs = args;
    mocks.customerLocationsOptions = options;

    return {
      data: { locations: mocks.locations },
      currentData: mocks.hasCurrentData
        ? { locations: mocks.locations }
        : undefined,
      isError: mocks.isError,
      isFetching: mocks.isFetching,
      isLoading: mocks.isLoading,
      refetch: mocks.refetch,
    };
  },
}));

vi.mock("@/lib/features/locations/location.utils", () => ({
  getLocationId: (location) => String(location?.id || location?._id || ""),
  normalizeLocationsResponse: (response) => response?.locations || [],
}));

vi.mock("@/components/customer-shell/customerShell.config", () => ({
  CUSTOMER_SHELL_SURFACES: { PORTAL: "portal" },
  getCustomerShellSurface: (_surface, pathname) =>
    /^\/portal\/(success|cancel)/.test(pathname)
      ? "transaction"
      : String(pathname).startsWith("/portal")
        ? "portal"
        : "public",
}));

vi.mock("@/components/customer-shell/PortalLocationChooser", () => ({
  default: () => <div data-testid="location-chooser" />,
}));

import CustomerPortalLocationProvider, {
  useCustomerPortalLocation,
  CustomerPortalLocationGate,
} from "@/components/customer-shell/CustomerPortalLocationProvider";

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

function LocationProbe() {
  const location = useCustomerPortalLocation();

  return (
    <div>
      <output data-testid="active-location">{location.activeLocationId}</output>
      <output data-testid="active-reference">
        {location.activeLocationReference}
      </output>
      <output data-testid="location-count">{location.locations.length}</output>
      <button type="button" onClick={() => location.selectLocation(prague.id)}>
        Select Prague
      </button>
      <button
        type="button"
        onClick={() => location.rememberLocation(prague.id)}
      >
        Remember checkout Prague
      </button>
    </div>
  );
}

describe("customer portal location provider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.user = { id: "64b000000000000000000030" };
    mocks.customerLocationsArgs = null;
    mocks.customerLocationsOptions = null;
    mocks.customerSurfaceReady = true;
    mocks.isError = false;
    mocks.isFetching = false;
    mocks.isLoading = false;
    mocks.hasCurrentData = true;
    mocks.locale = "en";
    mocks.locations = [brno, prague];
    mocks.pathname = "/portal";
    mocks.dispatch.mockReset();
    mocks.refetch.mockReset();
    mocks.replace.mockReset();
    mocks.searchParams = new URLSearchParams(
      "location=atelier-brno&tab=studio-calendar",
    );
    mocks.tenant = {
      id: "64b000000000000000000020",
      slug: "atelier-tenant",
    };
  });

  it("scopes the studio catalog cache to the tenant and always refreshes it", () => {
    render(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );

    expect(mocks.customerLocationsArgs).toEqual({
      tenantId: "64b000000000000000000020",
    });
    expect(mocks.customerLocationsOptions).toMatchObject({
      skip: false,
      refetchOnFocus: true,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true,
    });
  });

  it("waits for the customer session before loading the studios", () => {
    mocks.customerSurfaceReady = false;

    render(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );

    expect(mocks.customerLocationsOptions).toMatchObject({ skip: true });
  });

  it.each([
    ["/portal/vouchers", ""],
    ["/portal", "tab=vouchers"],
  ])(
    "does not block tenant-wide vouchers at %s on a location choice or error",
    (pathname, query) => {
      mocks.pathname = pathname;
      mocks.searchParams = new URLSearchParams(query);
      mocks.isError = true;
      mocks.isLoading = true;
      render(
        <CustomerPortalLocationProvider>
          <CustomerPortalLocationGate>
            <p>Voucher shop</p>
          </CustomerPortalLocationGate>
        </CustomerPortalLocationProvider>,
      );
      expect(screen.getByText("Voucher shop")).toBeVisible();
      expect(screen.queryByTestId("location-chooser")).not.toBeInTheDocument();
    },
  );

  it("does not race the voucher redirect with a location canonicalization", () => {
    mocks.pathname = "/portal";
    mocks.searchParams = new URLSearchParams("tab=vouchers");
    mocks.locations = [brno];
    render(
      <CustomerPortalLocationProvider>
        <CustomerPortalLocationGate>
          <p>Voucher redirect</p>
        </CustomerPortalLocationGate>
      </CustomerPortalLocationProvider>,
    );
    expect(screen.getByText("Voucher redirect")).toBeVisible();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("switches through canonical URL state and preserves the current tab", async () => {
    const user = userEvent.setup();

    const view = render(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );

    expect(screen.getByTestId("active-location")).toHaveTextContent(brno.id);

    await user.click(screen.getByRole("button", { name: "Select Prague" }));

    expect(mocks.replace).toHaveBeenCalledWith(
      "/portal?location=atelier-prague&tab=studio-calendar",
      { scroll: false },
    );
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "config/closeSidebar",
    });
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "Current studio changed to Atelier Prague.",
    );

    mocks.searchParams = new URLSearchParams(
      "location=atelier-prague&tab=studio-calendar",
    );
    view.rerender(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );

    expect(screen.getByTestId("active-location")).toHaveTextContent(prague.id);
  });

  it("keeps customers on the direct bookings route when they switch studios", async () => {
    const user = userEvent.setup();
    mocks.pathname = "/portal/bookings";
    mocks.searchParams = new URLSearchParams(
      "location=atelier-brno&scope=history",
    );

    render(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Select Prague" }));

    expect(mocks.replace).toHaveBeenCalledWith(
      "/portal/bookings?location=atelier-prague&scope=history",
      { scroll: false },
    );
  });

  it("exposes every active customer studio, including piece-based locations", () => {
    mocks.locations = [
      brno,
      prague,
      {
        id: "64b000000000000000000023",
        name: "Archived",
        slug: "archived",
        isActive: false,
        booking: { enabled: true },
      },
      {
        id: "64b000000000000000000024",
        name: "Bookings disabled",
        slug: "bookings-disabled",
        isActive: true,
        booking: { enabled: false },
      },
    ];

    render(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );

    expect(screen.getByTestId("location-count")).toHaveTextContent("3");
  });

  it("writes the sole available studio into an unscoped portal URL", () => {
    mocks.locations = [brno];
    mocks.searchParams = new URLSearchParams();

    render(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );

    expect(mocks.replace).toHaveBeenCalledWith(
      "/portal?location=atelier-brno",
      { scroll: false },
    );
  });

  it("upgrades a legacy locationId deep link to the canonical studio slug", () => {
    mocks.searchParams = new URLSearchParams(
      `locationId=${brno.id}&scope=history`,
    );

    render(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );

    expect(mocks.replace).toHaveBeenCalledWith(
      "/portal?scope=history&location=atelier-brno",
      { scroll: false },
    );
  });

  it("restores the last studio after leaving checkout and remounting at a bare portal URL", () => {
    mocks.searchParams = new URLSearchParams("location=atelier-prague");
    const view = render(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );
    view.unmount();
    mocks.searchParams = new URLSearchParams("tab=studio-calendar");
    mocks.replace.mockClear();

    render(
      <CustomerPortalLocationProvider>
        <CustomerPortalLocationGate>
          <LocationProbe />
        </CustomerPortalLocationGate>
      </CustomerPortalLocationProvider>,
    );

    expect(screen.getByTestId("active-location")).toHaveTextContent(prague.id);
    expect(screen.queryByTestId("location-chooser")).not.toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith(
      "/portal?tab=studio-calendar&location=atelier-prague",
      { scroll: false },
    );
  });

  it("uses and remembers the explicit URL studio instead of a saved selection", () => {
    const content = (
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>
    );
    const view = render(content);
    mocks.searchParams = new URLSearchParams("location=atelier-prague");
    view.rerender(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );
    expect(screen.getByTestId("active-location")).toHaveTextContent(prague.id);
    view.unmount();
    mocks.searchParams = new URLSearchParams();
    render(content);
    expect(screen.getByTestId("active-location")).toHaveTextContent(prague.id);
  });

  it.each(["tenant", "customer"])(
    "does not reuse a saved studio for a different %s",
    (scope) => {
      const view = render(
        <CustomerPortalLocationProvider>
          <LocationProbe />
        </CustomerPortalLocationProvider>,
      );
      view.unmount();
      mocks.searchParams = new URLSearchParams();
      if (scope === "tenant") {
        mocks.tenant = { id: "64b000000000000000000099", slug: "other-tenant" };
      } else {
        mocks.user = { id: "64b000000000000000000098" };
      }

      render(
        <CustomerPortalLocationProvider>
          <CustomerPortalLocationGate>
            <LocationProbe />
          </CustomerPortalLocationGate>
        </CustomerPortalLocationProvider>,
      );
      expect(screen.getByTestId("location-chooser")).toBeInTheDocument();
    },
  );

  it.each(["removed-studio", "bad%2Fstudio", ""])(
    "does not silently replace explicit URL studio '%s' with the saved studio",
    (reference) => {
      const view = render(
        <CustomerPortalLocationProvider>
          <LocationProbe />
        </CustomerPortalLocationProvider>,
      );
      view.unmount();
      mocks.searchParams = new URLSearchParams(`location=${reference}`);
      mocks.replace.mockClear();
      render(
        <CustomerPortalLocationProvider>
          <CustomerPortalLocationGate>
            <LocationProbe />
          </CustomerPortalLocationGate>
        </CustomerPortalLocationProvider>,
      );
      expect(screen.getByTestId("location-chooser")).toBeInTheDocument();
      expect(mocks.replace).not.toHaveBeenCalled();
    },
  );

  it("does not display prior tenant query data while the new studio list loads", () => {
    mocks.hasCurrentData = false;
    mocks.isFetching = true;
    render(
      <CustomerPortalLocationProvider>
        <CustomerPortalLocationGate>
          <LocationProbe />
        </CustomerPortalLocationGate>
      </CustomerPortalLocationProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your studios",
    );
    expect(screen.queryByTestId("active-location")).not.toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("remembers the verified checkout studio and exposes it to transaction navigation", async () => {
    const user = userEvent.setup();
    const content = (
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>
    );
    const view = render(content);
    view.unmount();
    mocks.pathname = "/portal/success";
    mocks.searchParams = new URLSearchParams("orderId=order-123");
    mocks.hasCurrentData = false;
    const checkout = render(content);
    expect(screen.getByTestId("active-reference")).toHaveTextContent(brno.id);
    await user.click(
      screen.getByRole("button", { name: "Remember checkout Prague" }),
    );
    expect(screen.getByTestId("active-reference")).toHaveTextContent(prague.id);
    checkout.unmount();
    mocks.pathname = "/portal";
    mocks.searchParams = new URLSearchParams();
    mocks.hasCurrentData = true;
    render(content);
    expect(screen.getByTestId("active-location")).toHaveTextContent(prague.id);
  });

  it("ignores a remembered studio that is no longer available", () => {
    const view = render(
      <CustomerPortalLocationProvider>
        <LocationProbe />
      </CustomerPortalLocationProvider>,
    );
    view.unmount();
    mocks.searchParams = new URLSearchParams();
    mocks.locations = [
      { ...brno, isActive: false },
      prague,
      { ...prague, id: "64b000000000000000000024", slug: "third-studio" },
    ];
    render(
      <CustomerPortalLocationProvider>
        <CustomerPortalLocationGate>
          <LocationProbe />
        </CustomerPortalLocationGate>
      </CustomerPortalLocationProvider>,
    );
    expect(screen.getByTestId("location-chooser")).toBeInTheDocument();
  });

  it("continues to honor explicit location URLs when browser storage is blocked", () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("Storage blocked");
      });
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("Storage blocked");
      });
    try {
      render(
        <CustomerPortalLocationProvider>
          <LocationProbe />
        </CustomerPortalLocationProvider>,
      );
      expect(screen.getByTestId("active-location")).toHaveTextContent(brno.id);
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});
