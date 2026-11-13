import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_LOCALE_CODES } from "@/i18n/locales";

const catalogModules = import.meta.glob("../../src/messages/*.json", {
  eager: true,
  import: "default",
});
const rawCatalogs = Object.fromEntries(
  Object.entries(catalogModules).map(([path, messages]) => [
    path.split("/").at(-1).replace(".json", ""),
    messages,
  ]),
);
const catalogs = rawCatalogs;

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  sidebarLocationId: "location-1",
  prefill: {
    bookingMode: "public",
    end: "2026-08-05T09:00:00.000Z",
    start: "2026-08-05T08:00:00.000Z",
  },
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
  useSelector: (selector) => selector(),
}));

vi.mock("@headlessui/react", () => ({
  Dialog: ({ children, open, onClose, ...props }) => {
    mocks.dialogOnClose = onClose;
    return open ? <div {...props}>{children}</div> : null;
  },
  DialogPanel: ({ children, transition: _transition, ...props }) => (
    <div {...props}>{children}</div>
  ),
  DialogTitle: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentUser: () => ({
    id: "customer-1",
    firstname: "Martin",
    email: "martin@example.test",
  }),
}));

vi.mock("@/lib/features/cart/cartSlice", () => ({
  addToCart: (payload) => ({ type: "cart/add", payload }),
  openCart: () => ({ type: "cart/open" }),
}));

vi.mock("@/lib/features/config/configSlice", () => ({
  closeSidebar: () => ({ type: "sidebar/close" }),
  selectIsSidebarOpen: () => true,
  selectPickedDate: () => "2026-08-05",
  selectSidebarLocationId: () => mocks.sidebarLocationId,
  selectSidebarPrefill: () => mocks.prefill,
}));

vi.mock("@/lib/features/language/languageSlice", () => ({
  selectCurrentLanguage: () => "EN",
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => ({ tenant: {} }),
}));

vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  getPublicTenantTheme: () => ({ style: {} }),
}));

vi.mock("@/utils/locationBookingUtils", () => ({
  buildDurationOptions: () => [60, 90, 120],
  buildStartTimeOptions: () => ["08:00"],
  checkLocationAvailability: () => ({ available: true, reason: null }),
  formatDuration: (value) => `${value} minutes`,
  formatLocationAddress: () => "Vancurova 49, Brno",
  formatWallDate: () => "2026-08-05",
  formatWallTime: (value) =>
    `${String(value.getUTCHours()).padStart(2, "0")}:${String(
      value.getUTCMinutes(),
    ).padStart(2, "0")}`,
  getEntityId: (value) => String(value?.id || value?._id || ""),
  getLocationTimeZone: () => "Europe/Prague",
  zonedDateTimeToUtc: (date, time) => new Date(`${date}T${time}:00.000Z`),
}));

vi.mock("@/components/sidebars/openStudioBooking.utils", () => ({
  findClassProduct: () => null,
  findOpenStudioProduct: (products) => products[0],
  formatBookingDateLabel: () => "Wednesday, 5 August 2026",
  formatBookingGuestCount: (guests) => `${guests} guests`,
  formatBookingPrice: (value) => `CZK ${value}`,
  formatBookingSummary: () => "1 hour · 08:00–09:00",
  getBookingAvailabilityPresentation: ({ available, isLoading }) =>
    isLoading
      ? {
          description: "We are refreshing this time with the studio.",
          title: "Checking availability…",
          tone: "loading",
        }
      : {
          description: "Availability is checked again at checkout.",
          title: available ? "This time is available." : "Unavailable",
          tone: available ? "available" : "unavailable",
        },
  getBookingPriceBreakdown: () => ({
    baseTotal: 500,
    durationQuantity: 2,
    guestCount: 1,
    hasDetails: false,
    surchargeTotal: 0,
    total: 500,
  }),
  getBookingDrawerCartFields: ({ bookingMode, plannedActivity }) => ({
    bookingMode,
    plannedActivity,
  }),
  getClassProducts: () => [],
  getLocalizedBookingProductName: () => "Open Studio",
  getOpenStudioBookingFields: (product, selectedMode = "public") => ({
    bookingMode:
      product?.bookingMode === "customer-choice" ? selectedMode : "public",
  }),
  getOpenStudioProducts: (products) => products,
}));

import Sidebar from "@/components/sidebars/Sidebar";

const location = {
  id: "location-1",
  name: "Studio Olivie",
  booking: {
    activityCapacities: [],
    enabled: true,
    globalCapacity: 8,
    minBookingMinutes: 60,
  },
};

const product = {
  id: "product-1",
  currency: "CZK",
  price: 250,
};

const defaultSidebarProps = {
  activeLocationId: location.id,
  bookings: [],
  locations: [location],
  products: [product],
};

const sidebarElement = (props = {}, locale = "en") => (
  <NextIntlClientProvider
    locale={locale}
    messages={catalogs[locale]}
    timeZone="Europe/Prague"
  >
    <Sidebar {...defaultSidebarProps} {...props} />
  </NextIntlClientProvider>
);

const renderSidebar = (props = {}, locale = "en") =>
  render(sidebarElement(props, locale));

afterEach(() => {
  cleanup();
  mocks.dispatch.mockReset();
  mocks.sidebarLocationId = location.id;
  vi.useRealTimers();
});

describe("customer booking sidebar interactions", () => {
  it("does not allow a retained product from another studio to enter the cart", () => {
    renderSidebar({
      products: [
        { ...product, kind: "open-studio", locationId: "other-studio" },
      ],
    });
    expect(screen.getByRole("button", { name: "Add to cart" })).toBeDisabled();
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("switches customer choice, bounds public groups to two and submits the chosen mode", async () => {
    renderSidebar({
      products: [
        {
          ...product,
          kind: "open-studio",
          locationId: "location-1",
          bookingMode: "customer-choice",
          maxNumberOfParticipants: 8,
          openStudioPolicy: {
            publicCapacityMode: "fixed",
            publicCapacityLimit: 2,
            privateBookingSurcharge: 300,
          },
        },
      ],
    });
    const guests = screen.getByRole("combobox", { name: "Guests" });
    const mode = screen.getByRole("combobox", { name: "Privacy settings" });
    expect(guests.options).toHaveLength(2);
    fireEvent.change(guests, { target: { value: "2" } });
    expect(mode).toHaveValue("public");
    fireEvent.change(mode, { target: { value: "private" } });
    expect(guests.options).toHaveLength(8);
    fireEvent.change(guests, { target: { value: "8" } });
    fireEvent.change(mode, { target: { value: "public" } });
    await waitFor(() => expect(guests).toHaveValue("2"));
    fireEvent.change(mode, { target: { value: "private" } });
    const submit = screen.getByRole("button", { name: "Add to cart" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.submit(submit.closest("form"));
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/add",
      payload: {
        cartItem: expect.objectContaining({
          bookingMode: "private",
          numberOfGuests: 2,
        }),
      },
    });
  });

  it("shows a perceivable confirmation before opening the cart", async () => {
    renderSidebar();

    const submit = screen.getByRole("button", { name: "Add to cart" });
    await waitFor(() => expect(submit).toBeEnabled());

    vi.useFakeTimers();
    await act(async () => {
      fireEvent.submit(submit.closest("form"));
    });

    expect(mocks.dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      "cart/add",
    ]);
    const addedSubmit = screen.getByRole("button", { name: "Added to cart" });
    expect(addedSubmit).toHaveAttribute("data-booking-submit-state", "added");

    act(() => vi.advanceTimersByTime(519));
    expect(mocks.dispatch).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(1));
    expect(mocks.dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      "cart/add",
      "sidebar/close",
      "cart/open",
    ]);
  });

  it("ignores a tap on Add to cart while the drawer is still opening", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(10_000);
    renderSidebar();

    const submit = screen.getByRole("button", { name: "Add to cart" });
    await waitFor(() => expect(submit).toBeEnabled());

    // The second tap of a double-tap on the calendar's Continue button lands
    // here while the drawer slides in under the same finger. Cancelling the
    // click's default action keeps it from submitting the form.
    now.mockReturnValue(10_250);
    expect(fireEvent.click(submit)).toBe(false);

    now.mockReturnValue(10_600);
    expect(fireEvent.click(submit)).toBe(true);
    now.mockRestore();
  });

  it("ignores outside taps while the drawer opens but not clicks or Escape", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(10_000);
    renderSidebar();
    now.mockReturnValue(10_050);
    const closes = () =>
      mocks.dispatch.mock.calls.filter(
        ([action]) => action.type === "sidebar/close",
      ).length;

    // Headless UI dismisses dialogs from document and window listeners:
    // touchend for taps outside the panel, click for the mouse, and keydown
    // for Escape.
    const dismissOn = (type) =>
      window.addEventListener(type, () => mocks.dialogOnClose(), {
        once: true,
      });

    dismissOn("touchend");
    fireEvent.touchEnd(window);
    expect(closes()).toBe(0);

    dismissOn("keydown");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(closes()).toBe(1);

    dismissOn("click");
    fireEvent.click(window);
    expect(closes()).toBe(2);

    now.mockReturnValue(10_600);
    dismissOn("touchend");
    fireEvent.touchEnd(window);
    expect(closes()).toBe(3);
    now.mockRestore();
  });

  it("closes on a trackpad or mouse click beside the drawer, as on an iPad", () => {
    renderSidebar();
    const closes = () =>
      mocks.dispatch.mock.calls.filter(
        ([action]) => action.type === "sidebar/close",
      ).length;
    const drawer = document.querySelector("[data-customer-booking-drawer]");
    const beside = drawer.parentElement;

    // Selecting text in a field and letting go beside the drawer keeps it.
    fireEvent.pointerDown(drawer, { pointerType: "mouse" });
    fireEvent.click(beside);
    expect(closes()).toBe(0);

    // Finger taps are left to Headless UI, which suppresses their click.
    fireEvent.pointerDown(beside, { pointerType: "touch" });
    fireEvent.click(beside);
    expect(closes()).toBe(0);

    fireEvent.pointerDown(beside, { pointerType: "mouse" });
    fireEvent.click(beside);
    expect(closes()).toBe(1);
  });

  it("renders a reduced-motion-safe loading status and blocks stale checkout", () => {
    renderSidebar({ isAvailabilityLoading: true });

    expect(screen.getAllByText("Checking availability…")).toHaveLength(2);
    expect(
      document.querySelector("[data-booking-loading-skeleton]"),
    ).toBeVisible();
    expect(
      document.querySelector('[data-booking-availability-state="loading"]'),
    ).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("button", { name: "Checking availability…" }),
    ).toBeDisabled();
    expect(
      document.querySelector("[data-booking-loading-skeleton]")?.innerHTML,
    ).toContain("motion-reduce:animate-none");
  });

  it("allows an optional activity to remain unspecified", async () => {
    const optionalLocation = {
      ...location,
      booking: {
        ...location.booking,
        activityCapacities: [
          {
            activity: "WORKSTATION",
            capacity: 4,
          },
        ],
        activitySelectionMode: "OPTIONAL",
      },
    };
    renderSidebar({ locations: [optionalLocation] });

    expect(
      screen.getByRole("combobox", { name: "Planned activity" }),
    ).toHaveValue("UNDEFINED");
    const submit = screen.getByRole("button", { name: "Add to cart" });
    await waitFor(() => expect(submit).toBeEnabled());

    fireEvent.submit(submit.closest("form"));

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/add",
      payload: {
        cartItem: expect.objectContaining({
          locationId: optionalLocation.id,
          plannedActivity: "UNDEFINED",
        }),
      },
    });
  });

  it("hides and omits activity selection when the location policy is hidden", async () => {
    const hiddenLocation = {
      ...location,
      booking: {
        ...location.booking,
        activityCapacities: [
          {
            activity: "WORKSTATION",
            capacity: 4,
          },
        ],
        activitySelectionMode: "HIDDEN",
      },
    };
    renderSidebar({ locations: [hiddenLocation] });

    expect(
      screen.queryByRole("combobox", { name: "Planned activity" }),
    ).not.toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Add to cart" });
    await waitFor(() => expect(submit).toBeEnabled());

    fireEvent.submit(submit.closest("form"));

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/add",
      payload: {
        cartItem: expect.objectContaining({
          locationId: hiddenLocation.id,
          plannedActivity: "UNDEFINED",
        }),
      },
    });
  });

  it("requires an activity only when the location policy is required", async () => {
    const requiredLocation = {
      ...location,
      booking: {
        ...location.booking,
        activityCapacities: [
          {
            activity: "WORKSTATION",
            capacity: 4,
          },
        ],
        activitySelectionMode: "REQUIRED",
      },
    };
    renderSidebar({ locations: [requiredLocation] });

    const activity = screen.getByRole("combobox", {
      name: "Planned activity",
    });
    const submit = screen.getByRole("button", { name: "Add to cart" });
    expect(submit).toBeDisabled();

    fireEvent.change(activity, { target: { value: "WORKSTATION" } });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.submit(submit.closest("form"));

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/add",
      payload: {
        cartItem: expect.objectContaining({
          locationId: requiredLocation.id,
          plannedActivity: "WORKSTATION",
        }),
      },
    });
  });

  it("uses the active portal location instead of a retained drawer location", async () => {
    const staleLocation = {
      ...location,
      id: "location-old",
      name: "Previous studio",
      booking: {
        ...location.booking,
        activitySelectionMode: "REQUIRED",
      },
    };
    const activeLocation = {
      ...location,
      id: "location-current",
      name: "Current studio",
      booking: {
        ...location.booking,
        activitySelectionMode: "OPTIONAL",
      },
    };
    mocks.sidebarLocationId = staleLocation.id;

    renderSidebar({
      activeLocationId: activeLocation.id,
      locations: [staleLocation, activeLocation],
    });

    expect(screen.getByText(activeLocation.name)).toBeVisible();
    const submit = screen.getByRole("button", { name: "Add to cart" });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.submit(submit.closest("form"));

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/add",
      payload: {
        cartItem: expect.objectContaining({
          locationId: activeLocation.id,
          plannedActivity: "UNDEFINED",
        }),
      },
    });
  });
});

const translatedBookingProps = {
  locations: [
    {
      ...location,
      booking: {
        ...location.booking,
        activitySelectionMode: "REQUIRED",
        activityCapacities: [
          { activity: "WORKSTATION", capacity: 4 },
          { activity: "SHARED_TABLE", capacity: 4 },
        ],
      },
    },
  ],
  products: [
    {
      ...product,
      kind: "open-studio",
      locationId: location.id,
      bookingMode: "customer-choice",
      maxNumberOfParticipants: 8,
      openStudioPolicy: {
        publicCapacityMode: "fixed",
        publicCapacityLimit: 2,
        privateBookingSurcharge: 300,
      },
    },
  ],
};

describe("customer booking sidebar translations", () => {
  it.each(ALL_LOCALE_CODES)(
    "renders %s privacy and planned activity translations while submitting canonical values",
    async (locale) => {
      renderSidebar(translatedBookingProps, locale);
      // Read the locale's own catalog, so fallback messages cannot hide a
      // missing translation in a partially translated catalog.
      const copy = rawCatalogs[locale].PublicTenant.details;
      for (const key of ["mode", "public", "private"]) {
        expect(copy.customerChoice[key].trim()).not.toBe("");
        expect(copy.customerChoice[key]).not.toMatch(/Open Studio/i);
      }

      const mode = screen.getByRole("combobox", {
        name: copy.customerChoice.mode,
      });
      for (const modeId of ["public", "private"]) {
        expect(
          within(mode).getByRole("option", {
            name: copy.customerChoice[modeId],
            exact: true,
          }),
        ).toHaveValue(modeId);
      }

      const activity = screen.getByRole("combobox", { name: copy.activity });
      for (const [activityId, key] of [
        ["WORKSTATION", "activityWorkstation"],
        ["SHARED_TABLE", "activitySharedTable"],
      ]) {
        expect(copy[key].trim()).not.toBe("");
        expect(
          within(activity).getByRole("option", {
            name: `${copy[key]} · 4`,
            exact: true,
          }),
        ).toHaveValue(activityId);
      }
      expect(
        within(activity).getByRole("option", { name: copy.activityChoose }),
      ).toBeDisabled();

      fireEvent.change(mode, { target: { value: "private" } });
      fireEvent.change(activity, { target: { value: "SHARED_TABLE" } });
      const form = mode.closest("form");
      await waitFor(() =>
        expect(form.querySelector('[type="submit"]')).toBeEnabled(),
      );
      fireEvent.submit(form);

      expect(mocks.dispatch).toHaveBeenCalledWith({
        type: "cart/add",
        payload: {
          cartItem: expect.objectContaining({
            bookingMode: "private",
            plannedActivity: "SHARED_TABLE",
          }),
        },
      });
    },
  );

  it("updates translated labels without resetting privacy or activity when the locale changes", () => {
    const { rerender } = renderSidebar(translatedBookingProps, "en");
    const english = rawCatalogs.en.PublicTenant.details;
    fireEvent.change(
      screen.getByRole("combobox", { name: english.customerChoice.mode }),
      { target: { value: "private" } },
    );
    fireEvent.change(screen.getByRole("combobox", { name: english.activity }), {
      target: { value: "SHARED_TABLE" },
    });

    for (const locale of ALL_LOCALE_CODES) {
      rerender(sidebarElement(translatedBookingProps, locale));
      const copy = rawCatalogs[locale].PublicTenant.details;
      const mode = screen.getByRole("combobox", {
        name: copy.customerChoice.mode,
      });
      const activity = screen.getByRole("combobox", { name: copy.activity });
      expect(mode).toHaveValue("private");
      expect(mode.selectedOptions[0]).toHaveTextContent(
        copy.customerChoice.private,
      );
      expect(activity).toHaveValue("SHARED_TABLE");
      expect(activity.selectedOptions[0]).toHaveTextContent(
        copy.activitySharedTable,
      );
    }
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
