import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null,
  tenant: null,
  sessionBoundaryEpoch: 1,
  ownedResult: {},
  ownedBookings: vi.fn(),
  dispatch: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
  selection: null,
  upcoming: vi.fn(),
  calendar: vi.fn(),
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(),
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => mocks.user,
  selectCurrentTenant: () => mocks.tenant,
  selectAuthSessionBoundaryEpoch: () => mocks.sessionBoundaryEpoch,
}));
vi.mock("next-intl", () => ({ useLocale: () => "en" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/features/config/configSlice", () => ({
  openSidebar: (value) => ({ type: "openSidebar", payload: value }),
}));
vi.mock("@/lib/features/credits/creditsApiSlice", () => ({
  useGetMyCreditBalanceQuery: () => ({ data: { balance: 0 } }),
}));
vi.mock("@/lib/features/bookings/bookingsApiSlice", () => ({
  useGetAllUserBookingsQuery: (...args) => {
    mocks.ownedBookings(...args);
    return mocks.ownedResult;
  },
  useGetUserBookingsQuery: (...args) => {
    mocks.upcoming(...args);
    return { data: { bookings: [] } };
  },
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useOptionalCustomerPortalLocation: () => null,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ tenant: mocks.tenant }),
}));
vi.mock("@/components/menu/MenuHeader", () => ({ default: () => null }));
vi.mock("@/components/menu/StudioSwitcher", () => ({ default: () => null }));
vi.mock("@/components/calendar", () => ({
  StudioCalendar: (props) => {
    mocks.calendar(props);
    return (
      <button
        type="button"
        disabled={!props.onSlotSelect}
        onClick={() => props.onSlotSelect(mocks.selection)}
      >
        Book selected calendar time
      </button>
    );
  },
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));

import Menu from "@/components/menu/Menu";
import { getPublicTenantPortalTheme } from "@/components/public-tenant/publicTenantPortalTheme";

const locations = [
  {
    id: "location-a",
    name: "Grohova",
    slug: "grohova",
    timezone: "Europe/Prague",
    booking: { enabled: true },
  },
  {
    id: "location-b",
    name: "Vaclavska",
    slug: "vaclavska",
    timezone: "Europe/Prague",
    booking: { enabled: true },
  },
];
const product = { id: "product-1", name: "Open studio" };
const bookings = [
  {
    id: "own-1",
    locationId: "location-a",
    productId: product.id,
    start: "2026-08-12T10:00:00.000Z",
    end: "2026-08-12T12:00:00.000Z",
    isMine: true,
  },
  {
    id: "own-2",
    locationId: "location-a",
    productId: product.id,
    start: "2026-08-13T10:00:00.000Z",
    end: "2026-08-13T12:00:00.000Z",
    isMine: true,
  },
  {
    id: "safe-occupancy",
    locationId: "location-a",
    start: "2026-08-14T10:00:00.000Z",
    end: "2026-08-14T12:00:00.000Z",
    isMine: false,
    createdBy: "someone-else",
  },
];

const baseProps = {
  bookings,
  products: [product],
  locations,
  activeLocationId: "location-a",
  activeBookingLocationId: "location-a",
  modules: { bookings: true, courses: true, payments: true },
};

describe("customer calendar booking creation integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: "customer-1", name: "Mia Maker" };
    mocks.tenant = { id: "tenant-1", slug: "first-studio" };
    mocks.sessionBoundaryEpoch = 1;
    mocks.ownedResult = {};
    mocks.selection = {
      studio: locations[0],
      activityId: "WORKSTATION",
      start: new Date("2026-08-12T10:00:00.000Z"),
      end: new Date("2026-08-12T12:00:00.000Z"),
      productId: product.id,
      quantity: 1,
    };
  });

  it.each([
    {
      backgroundColor: "#FFFFFF",
      calendarBackgroundColor: "#111827",
      headingColor: "#111111",
    },
    {
      backgroundColor: "#111827",
      calendarBackgroundColor: "#FFFFFF",
      headingColor: "#FFFFFF",
    },
  ])(
    "keeps calendar headings on the page palette when the calendar canvas has the opposite background",
    (appearance) => {
      mocks.tenant.publicSite = { customerPortal: { appearance } };
      const theme = getPublicTenantPortalTheme(mocks.tenant);
      const { container } = render(
        <div style={theme.style}>
          <Menu {...baseProps} />
        </div>,
      );
      const heading = screen.getByRole("heading", {
        name: "Plan your next visit",
      });
      const outside = heading.closest("[data-customer-portal-calendar]");
      const canvas = container.querySelector("[data-customer-calendar-shell]");
      expect(outside.style.getPropertyValue("--tenant-background")).toBe("");
      expect(outside.style.getPropertyValue("--tenant-heading-color")).toBe("");
      expect(heading.style.color).toBe("var(--tenant-heading-color)");
      expect(theme.style["--tenant-heading-color"]).toBe(
        appearance.headingColor,
      );
      expect(theme.style["--tenant-background"]).toBe(
        appearance.backgroundColor,
      );
      expect(canvas.style.getPropertyValue("--tenant-background")).toBe(
        "var(--tenant-portal-calendar-background)",
      );
      expect(canvas.style.getPropertyValue("--tenant-heading-color")).toBe(
        "var(--tenant-portal-calendar-heading)",
      );
      expect(theme.style["--tenant-portal-calendar-background"]).toBe(
        appearance.calendarBackgroundColor,
      );
    },
  );

  const selectTime = () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Book selected calendar time" }),
    );

  it.each(["own-1", "safe-occupancy"])(
    "opens a new booking without editing calendar event %s",
    (existingBookingId) => {
      mocks.selection = {
        ...mocks.selection,
        id: existingBookingId,
        bookingId: existingBookingId,
        createdBy: "private-customer",
        doorCode: "private-door-code",
      };
      render(<Menu {...baseProps} />);
      expect(mocks.calendar.mock.lastCall[0].onBookingClick).toBeUndefined();
      selectTime();
      expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({
        type: "openSidebar",
        payload: {
          context: "studio",
          locationId: "location-a",
          selectedDate: "2026-08-12",
          prefill: {
            start: "2026-08-12T10:00:00.000Z",
            end: "2026-08-12T12:00:00.000Z",
            bookingType: "public",
            activity: "WORKSTATION",
            productId: product.id,
            courseSessionId: "",
            quantity: 1,
            source: "calendar-selection",
          },
        },
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(mocks.router.push).not.toHaveBeenCalled();
      expect(mocks.router.replace).not.toHaveBeenCalled();
    },
  );

  it("preserves selected studio and its local date for a new studio booking", () => {
    mocks.selection = {
      ...mocks.selection,
      studio: locations[1],
      start: new Date("2026-08-12T22:30:00.000Z"),
      end: new Date("2026-08-13T00:30:00.000Z"),
    };
    render(
      <Menu
        {...baseProps}
        activeLocationId="location-b"
        activeBookingLocationId="location-b"
      />,
    );
    selectTime();
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "openSidebar",
      payload: expect.objectContaining({
        locationId: "location-b",
        selectedDate: "2026-08-13",
        prefill: expect.objectContaining({
          productId: product.id,
          courseSessionId: "",
          start: "2026-08-12T22:30:00.000Z",
          end: "2026-08-13T00:30:00.000Z",
          quantity: 1,
        }),
      }),
    });
  });

  it("opens the selected course session in the course checkout page to refresh capacity and holds", () => {
    mocks.selection = {
      ...mocks.selection,
      studio: locations[1],
      productId: "course-product",
      courseSessionId: "course-session",
    };
    render(
      <Menu
        {...baseProps}
        activeLocationId="location-b"
        activeBookingLocationId="location-b"
      />,
    );
    selectTime();
    expect(mocks.router.push).toHaveBeenCalledExactlyOnceWith(
      "/portal/courses/course-product?courseSessionId=course-session&location=vaclavska",
    );
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["disabled module", "disabled page", "missing product"])(
    "does not start course checkout with %s",
    (reason) => {
      mocks.selection = {
        ...mocks.selection,
        courseSessionId: "course-session",
        productId: reason === "missing product" ? "" : "course-product",
      };
      if (reason === "disabled page") {
        mocks.tenant.publicSite = {
          customerPortal: { pages: { courses: { enabled: false } } },
        };
      }
      render(
        <Menu
          {...baseProps}
          modules={{
            ...baseProps.modules,
            courses: reason !== "disabled module",
          }}
        />,
      );
      selectTime();
      expect(mocks.router.push).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );

  it("preserves the existing initial-booking-intent drawer flow without a calendar studio selection", () => {
    render(
      <Menu
        {...baseProps}
        initialBookingIntent={{
          locationId: "location-a",
          productId: product.id,
          courseSessionId: "legacy-course-session",
          start: "2026-08-12T10:00:00.000Z",
          end: "2026-08-12T12:00:00.000Z",
          quantity: 2,
        }}
      />,
    );
    expect(mocks.dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "openSidebar",
      payload: expect.objectContaining({
        locationId: "location-a",
        prefill: expect.objectContaining({
          courseSessionId: "legacy-course-session",
          quantity: 2,
        }),
      }),
    });
    expect(mocks.router.push).not.toHaveBeenCalled();
  });

  it("rejects a stale selection from a different studio after switching locations", () => {
    const { rerender } = render(<Menu {...baseProps} />);
    rerender(
      <Menu
        {...baseProps}
        activeLocationId="location-b"
        activeBookingLocationId="location-b"
      />,
    );
    selectTime();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    mocks.selection = { ...mocks.selection, studio: locations[1] };
    selectTime();
    expect(mocks.dispatch).toHaveBeenCalledOnce();
    expect(mocks.dispatch.mock.lastCall[0].payload.locationId).toBe(
      "location-b",
    );
  });

  it("does not open a booking or details from the builder preview", () => {
    render(<Menu {...baseProps} previewMode />);
    selectTime();
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.calendar.mock.lastCall[0].onBookingClick).toBeUndefined();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.ownedBookings).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );
  });

  it.each([
    { activeLocationId: "", activeBookingLocationId: "" },
    { modules: { bookings: false, courses: false } },
    { modules: { bookings: true, courses: true, payments: false } },
  ])(
    "does not expose calendar booking when its scope is unavailable: %j",
    (props) => {
      render(<Menu {...baseProps} {...props} />);
      expect(mocks.calendar).not.toHaveBeenCalled();
      expect(mocks.dispatch).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );

  it("retains own-booking badges without exposing a detail callback", () => {
    mocks.user.memberNumber = 9999;
    render(<Menu {...baseProps} />);
    const calendar = mocks.calendar.mock.lastCall[0];
    expect(
      calendar.bookings.find((booking) => booking.id === "own-1"),
    ).toMatchObject({
      isMine: true,
      customerIds: ["9999"],
    });
    expect(
      calendar.bookings.find((booking) => booking.id === "safe-occupancy")
        .customerIds,
    ).toEqual([]);
    expect(calendar.onBookingClick).toBeUndefined();
  });

  it("recognizes ownership from the complete customer list beyond upcoming bookings", () => {
    mocks.ownedResult = {
      currentData: {
        bookings: [
          ...Array.from({ length: 8 }, (_, index) => ({
            id: `other-${index}`,
          })),
          { id: "own-1", location: { id: "location-a" } },
        ],
        allPagesLoaded: true,
      },
    };
    render(
      <Menu
        {...baseProps}
        bookings={bookings.map(({ isMine: _isMine, ...booking }) => booking)}
      />,
    );
    expect(mocks.ownedBookings).toHaveBeenLastCalledWith(
      {
        scope: "all",
        locationId: "location-a",
        customerScope: JSON.stringify(["tenant-1", "customer-1", 1]),
      },
      expect.objectContaining({ skip: false }),
    );
    expect(
      mocks.calendar.mock.lastCall[0].bookings.find(
        (booking) => booking.id === "own-1",
      ).isMine,
    ).toBe(true);
  });

  it("does not reuse ownership from a previous customer scope", () => {
    mocks.ownedResult = {
      data: { bookings: [{ id: "own-1" }] },
      currentData: undefined,
    };
    const availability = bookings.map(
      ({ isMine: _isMine, ...booking }) => booking,
    );
    const { rerender } = render(
      <Menu {...baseProps} bookings={availability} />,
    );
    expect(
      mocks.calendar.mock.lastCall[0].bookings.find(
        (booking) => booking.id === "own-1",
      ).isMine,
    ).not.toBe(true);
    mocks.user = { id: "customer-2" };
    mocks.sessionBoundaryEpoch = 2;
    rerender(<Menu {...baseProps} bookings={availability} />);
    expect(mocks.ownedBookings).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerScope: JSON.stringify(["tenant-1", "customer-2", 2]),
      }),
      expect.objectContaining({ skip: false }),
    );
    expect(
      mocks.calendar.mock.lastCall[0].bookings.find(
        (booking) => booking.id === "own-1",
      ).isMine,
    ).not.toBe(true);
  });
});
