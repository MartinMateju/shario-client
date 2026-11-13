import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PublicBookingAvailabilityPage, {
  dateKeyInTimeZone,
  getPublicBookingRate,
  getPublicCalendarRange,
  getPublicCalendarOccupancyRange,
  getPublicCalendarTimeZone,
  resolvePublicBookingLocation,
} from "@/components/public-tenant/PublicBookingAvailabilityPage";
import { normalizeLocationToCalendarStudio } from "@/components/calendar/calendar.adapters";
import { getCalendarSlotAvailability } from "@/components/calendar/calendar.utils";

const mocks = vi.hoisted(() => ({
  locationsQuery: vi.fn(),
  occupancyQuery: vi.fn(),
  productsQuery: vi.fn(),
  replace: vi.fn(),
  search: "location=studio-emilka&view=week",
  tenant: null,
  calendarProps: vi.fn(),
  nextDayBlock: null,
}));

const copy = {
  "calendar.description": "Only anonymous occupancy is shown.",
  "calendar.empty":
    "No occupied periods were returned. This does not guarantee availability.",
  "calendar.error": "Could not load occupancy.",
  "calendar.invalidLocation": "This studio location is not available",
  "calendar.invalidLocationDescription": "Choose a published studio.",
  "calendar.legend": "Calendar legend",
  "calendar.loading": "Loading occupancy",
  "calendar.loadingStudios": "Loading studios",
  "calendar.locationError": "Could not load locations.",
  "calendar.noLocations": "No studio is available yet",
  "calendar.noLocationsDescription": "No public locations.",
  "calendar.occupied": "Occupied",
  "calendar.occupiedSummary": "Occupied periods are shown.",
  "calendar.readOnly": "Read-only",
  "calendar.title": "Studio occupancy",
  description: "Browse current occupancy.",
  eyebrow: "Plan your visit",
  priceFrom: "Booking rates from",
  priceLabel: "Booking rate",
  priceUnavailable: "Ask the studio",
  priceUnit: "per 30-minute block, per guest",
  retry: "Try again",
  studioLabel: "Studio location",
  studioRequired: "No studio selected",
  title: "See when Studio Olivie is occupied",
};

const locations = [
  {
    id: "507f1f77bcf86cd799439021",
    name: "Studio Olivie",
    slug: "studio-olivie",
    isPrimary: true,
    booking: { enabled: true, timezone: "Europe/Prague" },
  },
  {
    id: "507f1f77bcf86cd799439022",
    name: "Studio Emilka",
    slug: "studio-emilka",
    booking: { enabled: true, timezone: "Europe/Prague" },
  },
];

vi.mock("next-intl", async (...args) => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs(
    await (() => ({
      useLocale: () => "en",
      useTranslations: () => (key) => copy[key] || key,
    }))(...args),
  );
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "studio-olivie" }),
  usePathname: () => "/en/book",
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock("@/components/calendar/StudioCalendar", () => ({
  default: (props) => {
    mocks.calendarProps(props);
    const {
      availableViews,
      bookings,
      pageScroll,
      readOnly,
      selectedLocationId,
      view,
    } = props;
    return (
      <div
        data-testid="studio-calendar"
        data-location={selectedLocationId}
        data-page-scroll={String(pageScroll)}
        data-read-only={String(readOnly)}
        data-view={view}
        data-views={availableViews.join(",")}
      >
        {bookings.map((booking) => booking.title).join(",")}
      </div>
    );
  },
}));

vi.mock("@/components/menu/StudioSwitcher", () => ({
  default: ({ activeLocationId, locations: options, onChange }) => (
    <div data-testid="studio-switcher" data-location={activeLocationId}>
      {options.map((location) => (
        <button
          key={location.id}
          type="button"
          onClick={() => onChange(location.id)}
        >
          {location.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/components/products/products.utils", () => ({
  formatProductPrice: (product) => `CZK ${product.price}`,
}));

vi.mock("@/components/public-tenant/publicProductTaxonomy", () => ({
  isPublicCatalogProduct: (product) =>
    product?.kind === "open-studio" && product?.isActive !== false,
}));

vi.mock("@/lib/features/publicBooking/publicBookingApiSlice", () => ({
  useGetPublicBookingLocationsQuery: (...args) => {
    mocks.locationsQuery(...args);
    return {
      data: locations,
      isError: false,
      isLoading: false,
      isSuccess: true,
      refetch: vi.fn(),
    };
  },
  useGetPublicBookingOccupancyQuery: (...args) => {
    mocks.occupancyQuery(...args);
    const request = args[0];
    return {
      currentData: {
        location: locations[1],
        from: request.from,
        to: request.to,
        blocks: [
          {
            start: "2026-08-07T08:00:00.000Z",
            end: "2026-08-07T10:00:00.000Z",
            kind: "occupied",
          },
          ...(mocks.nextDayBlock && request.to >= "2026-08-10"
            ? [mocks.nextDayBlock]
            : []),
        ],
      },
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetPublicProductsQuery: (...args) => {
    mocks.productsQuery(...args);
    return {
      data: [
        {
          id: "product-2",
          locationId: "507f1f77bcf86cd799439022",
          kind: "open-studio",
          price: 350,
          isActive: true,
        },
        {
          id: "product-1",
          locationId: "507f1f77bcf86cd799439022",
          kind: "open-studio",
          price: 250,
          isActive: true,
        },
      ],
      isLoading: false,
    };
  },
}));

vi.mock("@/utils/tenantRouting", () => ({
  getValidatedTenantSlugParam: () => "studio-olivie",
}));

vi.mock("@/components/public-tenant/PublicCapabilityGate", () => ({
  default: ({ capability, children }) =>
    mocks.tenant.publicCapabilities[capability] ? (
      children
    ) : (
      <div data-public-capability-unavailable={capability} />
    ),
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: mocks.tenant }),
}));

const tenant = () => ({
  publicCapabilities: { bookStudio: true },
  publicSite: {
    branding: {
      accentColor: "#1F36D4",
      backgroundColor: "#FCFBF8",
      displayName: "Studio Olivie",
      logoUrl: "",
      secondaryColor: "#E56F51",
      textColor: "#1F1F1F",
    },
    pages: {
      book: { title: {}, description: {} },
    },
  },
});

describe("public booking availability page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search = "location=studio-emilka&view=week";
    mocks.tenant = tenant();
    mocks.nextDayBlock = null;
    delete locations[1].openingHours;
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches next-day occupancy for an overnight final-week-day booking without extending the displayed week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T12:00:00Z"));
    locations[1].openingHours = Object.fromEntries(
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].map((key) => [
        key,
        { isOpen: true, openTime: "05:00", closeTime: "01:00" },
      ]),
    );
    mocks.nextDayBlock = {
      start: "2026-08-09T22:00:00Z",
      end: "2026-08-09T23:00:00Z",
      kind: "occupied",
    };
    render(<PublicBookingAvailabilityPage />);
    expect(mocks.occupancyQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ from: "2026-08-03", to: "2026-08-10" }),
      expect.objectContaining({ skip: false }),
    );
    const calendarProps = mocks.calendarProps.mock.lastCall[0];
    expect(calendarProps.view).toBe("week");
    expect(calendarProps.bookings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          start: mocks.nextDayBlock.start,
          end: mocks.nextDayBlock.end,
        }),
      ]),
    );
    expect(
      getPublicCalendarRange({
        date: calendarProps.date,
        view: "week",
        timeZone: "Europe/Prague",
      }),
    ).toEqual({ from: "2026-08-03", to: "2026-08-09" });
    expect(
      getCalendarSlotAvailability({
        studio: normalizeLocationToCalendarStudio(locations[1]),
        bookings: calendarProps.bookings,
        day: new Date("2026-08-09T12:00:00Z"),
        startMinute: 1410,
        endMinute: 1470,
        now: new Date("2026-08-07T12:00:00Z"),
      }),
    ).toMatchObject({ state: "blocked", isBookable: false });
  });

  it("leaves ordinary and midnight-close query ranges unchanged and adds only one day for overnight hours", () => {
    const range = { from: "2026-08-03", to: "2026-08-09" };
    for (const closeTime of ["20:00", "00:00", "24:00"]) {
      expect(
        getPublicCalendarOccupancyRange(range, {
          openingHours: {
            monday: { isOpen: true, openTime: "06:00", closeTime },
          },
        }),
      ).toEqual(range);
    }
    const overnight = {
      openingHours: {
        monday: { isOpen: true, openTime: "05:00", closeTime: "01:00" },
      },
    };
    expect(getPublicCalendarOccupancyRange(range, overnight)).toEqual({
      ...range,
      to: "2026-08-10",
    });
    expect(
      getPublicCalendarOccupancyRange(
        { from: "2026-08-09", to: "2026-08-09" },
        overnight,
      ),
    ).toEqual({ from: "2026-08-09", to: "2026-08-10" });
  });

  it("does not show a previous location's prices while the next location catalog loads", () => {
    const { rerender } = render(<PublicBookingAvailabilityPage />);
    expect(screen.getByText("CZK 250")).toBeVisible();
    mocks.search = "location=studio-olivie";
    rerender(<PublicBookingAvailabilityPage />);
    expect(screen.queryByText("CZK 250")).not.toBeInTheDocument();
    expect(screen.getByText("Ask the studio")).toBeVisible();
    expect(mocks.productsQuery).toHaveBeenLastCalledWith(
      { tenantSlug: "studio-olivie", locationId: locations[0].id },
      expect.any(Object),
    );
  });

  it("renders the requested public location as a read-only Month/Week/Day calendar", () => {
    render(<PublicBookingAvailabilityPage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "See when Studio Olivie is occupied",
    );
    expect(screen.getByTestId("studio-switcher")).toHaveAttribute(
      "data-location",
      locations[1].id,
    );
    expect(screen.getByTestId("studio-calendar")).toHaveAttribute(
      "data-views",
      "month,week,day",
    );
    expect(screen.getByTestId("studio-calendar")).toHaveAttribute(
      "data-read-only",
      "true",
    );
    expect(screen.getByTestId("studio-calendar")).toHaveTextContent("Occupied");
    expect(screen.getByText("CZK 250")).toBeInTheDocument();
    expect(screen.getByText("Booking rates from")).toBeInTheDocument();
    expect(
      screen.getByText("per 30-minute block, per guest"),
    ).toBeInTheDocument();
    const legend = screen.getByRole("list", { name: "Calendar legend" });
    expect(legend).toHaveTextContent("Occupied");
    expect(screen.queryByText("Available time")).not.toBeInTheDocument();
    expect(mocks.occupancyQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: locations[1].id,
        tenantSlug: "studio-olivie",
      }),
      expect.objectContaining({ skip: false }),
    );
  });

  it("switches location through the canonical location query and preserves filters", () => {
    render(<PublicBookingAvailabilityPage />);

    fireEvent.click(screen.getByRole("button", { name: "Studio Olivie" }));

    expect(mocks.replace).toHaveBeenCalledWith(
      "/en/book?location=studio-olivie&view=week",
      { scroll: false },
    );
  });

  it("fails closed for an invalid location and lets the visitor choose a published one", () => {
    mocks.search = "location=not-a-public-studio";
    render(<PublicBookingAvailabilityPage />);

    expect(
      screen.getByText("This studio location is not available"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("studio-calendar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("studio-switcher")).not.toBeInTheDocument();
    expect(screen.getByText("No studio selected")).toBeInTheDocument();
    expect(mocks.occupancyQuery).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ skip: true }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Studio Emilka" }));
    expect(mocks.replace).toHaveBeenCalledWith(
      "/en/book?location=studio-emilka",
      { scroll: false },
    );
  });

  it("canonicalizes a legacy locationId query without losing other filters", async () => {
    mocks.search = `locationId=${locations[1].id}&view=day`;
    render(<PublicBookingAvailabilityPage />);

    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        "/en/book?view=day&location=studio-emilka",
        { scroll: false },
      ),
    );
  });

  it("skips every public catalog request when the studio has not enabled booking", () => {
    mocks.tenant.publicCapabilities.bookStudio = false;

    render(<PublicBookingAvailabilityPage />);

    expect(
      document.querySelector(
        '[data-public-capability-unavailable="bookStudio"]',
      ),
    ).toBeInTheDocument();
    expect(mocks.locationsQuery).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ skip: true }),
    );
    expect(mocks.productsQuery).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ skip: true }),
    );
    expect(mocks.occupancyQuery).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ skip: true }),
    );
  });

  it("uses page scrolling while preserving the mobile weekly time grid", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    render(<PublicBookingAvailabilityPage />);

    await waitFor(() => {
      expect(screen.getByTestId("studio-calendar")).toHaveAttribute(
        "data-page-scroll",
        "true",
      );
    });
    expect(screen.getByTestId("studio-calendar")).toHaveAttribute(
      "data-view",
      "week",
    );
    expect(screen.getByTestId("studio-calendar")).toHaveAttribute(
      "data-views",
      "month,week,day",
    );
    const latestOccupancyRequest = mocks.occupancyQuery.mock.calls.at(-1)[0];
    expect(latestOccupancyRequest.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(latestOccupancyRequest.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(latestOccupancyRequest.from).not.toBe(latestOccupancyRequest.to);
    expect(
      document.querySelector("[data-public-calendar-frame='true']"),
    ).toHaveClass("h-auto", "overflow-visible");
    // Phones in landscape are wide but too short for the framed calendar.
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(max-width: 639px), (max-height: 600px)",
    );
  });
});

describe("public booking availability helpers", () => {
  it("uses a deterministic lowest 30-minute, per-guest product rate", () => {
    expect(
      getPublicBookingRate(
        [
          { id: "b", kind: "open-studio", price: 400 },
          { id: "a", kind: "open-studio", price: 250 },
        ],
        "en",
      ),
    ).toMatchObject({ formatted: "CZK 250", from: true });
  });

  it("resolves requested slugs without silently falling back", () => {
    expect(resolvePublicBookingLocation(locations, "missing")).toMatchObject({
      location: null,
      invalid: true,
    });
    expect(resolvePublicBookingLocation(locations, "")).toMatchObject({
      location: locations[0],
      invalid: false,
    });
  });

  it("builds a Monday-to-Sunday range in the studio timezone", () => {
    expect(
      getPublicCalendarRange({
        date: new Date("2026-08-07T12:00:00.000Z"),
        view: "week",
        timeZone: "Europe/Prague",
      }),
    ).toEqual({ from: "2026-08-03", to: "2026-08-09" });
  });

  it("builds the complete six-week grid range for Month view", () => {
    expect(
      getPublicCalendarRange({
        date: new Date("2026-08-07T12:00:00.000Z"),
        view: "month",
        timeZone: "Europe/Prague",
      }),
    ).toEqual({ from: "2026-07-27", to: "2026-09-06" });
  });

  it("falls back to the server booking timezone when studio configuration is invalid", () => {
    const date = new Date("2026-08-02T23:30:00.000Z");

    expect(getPublicCalendarTimeZone("Not/A_Real_Zone")).toBe("Europe/Prague");
    expect(dateKeyInTimeZone(date, "Not/A_Real_Zone")).toBe("2026-08-03");
    expect(
      getPublicCalendarRange({
        date,
        view: "week",
        timeZone: "Not/A_Real_Zone",
      }),
    ).toEqual({ from: "2026-08-03", to: "2026-08-09" });
  });

  it("returns an empty range for an invalid calendar date", () => {
    expect(
      getPublicCalendarRange({
        date: "not-a-date",
        view: "week",
        timeZone: "Europe/Prague",
      }),
    ).toEqual({ from: "", to: "" });
    expect(dateKeyInTimeZone(Symbol("invalid"), "Europe/Prague")).toBe("");
  });
});
