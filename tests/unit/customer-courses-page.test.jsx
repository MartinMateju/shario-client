import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tenant: null,
  location: null,
  catalog: null,
  sessions: null,
  modules: null,
  cart: [],
  search: "",
  productId: "wheel",
  dispatch: vi.fn(),
  catalogHook: vi.fn(),
  sessionsHook: vi.fn(),
  locationHook: vi.fn(),
  selectLocation: vi.fn(),
  ownerScope: "tenant:customer",
  publicCatalogHook: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key, values) =>
    values?.count ? `${key}: ${values.count}` : key,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ productId: mocks.productId }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => mocks.dispatch,
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({ modules: mocks.modules }),
  getAuthCacheIdentity: () => mocks.ownerScope,
}));
vi.mock("@/lib/features/cart/cartSlice", () => ({
  selectCurrentCart: () => mocks.cart,
  addToCart: (payload) => ({ type: "cart/addToCart", payload }),
  openCart: (payload) => ({ type: "cart/openCart", payload }),
}));
vi.mock("@/components/customer-shell/CustomerPortalLocationProvider", () => ({
  useCustomerPortalLocation: () => {
    mocks.locationHook();
    return mocks.location;
  },
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: mocks.tenant }),
}));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetCustomerCourseProductsQuery: (...args) => {
    mocks.catalogHook(...args);
    return mocks.catalog;
  },
  useGetPublicCourseProductsQuery: (...args) => {
    mocks.publicCatalogHook(...args);
    return mocks.catalog;
  },
  useGetPublicProductsQuery: vi.fn(),
}));
vi.mock("@/lib/features/publicBooking/publicBookingApiSlice", () => ({
  useGetPublicCourseLocationsQuery: () => ({ currentData: locations }),
  useGetCustomerCourseSessionsQuery: (...args) => {
    mocks.sessionsHook(...args);
    return mocks.sessions;
  },
}));
vi.mock("@/components/waitlists/CourseWaitlistAction", () => ({
  default: ({ returnPath }) => <a href={returnPath}>Waitlist</a>,
}));
vi.mock("@/components/menu/StudioSwitcher", () => ({
  default: ({ locations, activeLocationId, onChange }) => (
    <select
      aria-label="Change studio"
      value={activeLocationId}
      onChange={(event) => onChange?.(event.target.value)}
    >
      {locations.map((location) => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </select>
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/courses",
  useRouter: () => ({ replace: mocks.replace }),
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import CustomerCoursesPage, {
  CustomerCourseDetailPage,
  PublicCustomerCoursesPage,
} from "@/components/courses/CustomerCoursesPage";

const locations = [
  { id: "vaclavska", slug: "vaclavska", name: "Václavská", isActive: true },
  { id: "grohova", slug: "grohova", name: "Grohova", isActive: true },
];
const session = (overrides = {}) => ({
  id: "wheel-date",
  start: "2099-11-01T10:00:00.000Z",
  end: "2099-11-01T12:30:00.000Z",
  location: { id: "vaclavska" },
  capacity: 4,
  remainingCapacity: 2,
  available: true,
  language: "en",
  ...overrides,
});
const course = (overrides = {}) => ({
  id: "wheel",
  kind: "class",
  name: "Wheel course",
  description: "Learn to throw your first bowl.",
  classCategory: "Wheel",
  price: 500,
  currency: "CZK",
  imageSrc: "https://example.test/wheel.jpg",
  nextSession: session(),
  ...overrides,
});
const selectStudio = (index) => {
  mocks.location = {
    activeLocation: locations[index],
    activeLocationId: locations[index].id,
    activeLocationReference: locations[index].slug,
    locations,
    selectLocation: mocks.selectLocation,
    isSwitching: false,
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.modules = { courses: true, payments: true, vouchers: true };
  mocks.ownerScope = "tenant:customer";
  mocks.tenant = {
    slug: "klei",
    publicCapabilities: { courses: true, vouchers: true },
    publicSite: {
      customerPortal: {
        courses: {
          locations: [
            {
              locationId: "vaclavska",
              headline: { en: "Create in Václavská" },
              description: { en: "Small groups and hands-on teaching." },
              heroImageUrl: "https://example.test/studio.jpg",
            },
          ],
        },
      },
    },
  };
  selectStudio(0);
  mocks.catalog = { currentData: [course()], refetch: vi.fn() };
  mocks.sessions = { currentData: [session()], refetch: vi.fn() };
  mocks.cart = [];
  mocks.search = "";
  mocks.productId = "wheel";
});

describe("customer course catalog", () => {
  it("uses shared studio context for catalog, hero and every booking/voucher link", async () => {
    render(<CustomerCoursesPage />);
    expect(mocks.catalogHook).toHaveBeenCalledWith(
      { locationId: "vaclavska", ownerScope: "tenant:customer" },
      expect.objectContaining({ skip: false }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Create in Václavská",
    );
    expect(screen.getByRole("link", { name: "chooseDate" })).toHaveAttribute(
      "href",
      "/portal/courses/wheel?location=vaclavska",
    );
    expect(screen.getByRole("link", { name: "giftVoucher" })).toHaveAttribute(
      "href",
      "/portal/vouchers?location=vaclavska",
    );
    const dateLink = screen
      .getAllByRole("link")
      .find((link) => link.href.includes("courseSessionId"));
    expect(dateLink).toHaveAttribute(
      "href",
      "/portal/courses/wheel?courseSessionId=wheel-date&location=vaclavska",
    );
    expect(screen.getByText("durationMinutes: 150")).toBeVisible();
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Change studio" }),
      "grohova",
    );
    expect(mocks.selectLocation).toHaveBeenCalledWith("grohova");
  });

  it("filters canonical courses by category and localized rich content", async () => {
    mocks.catalog.currentData.push(
      course({
        id: "hand",
        name: "Legacy title",
        classCategory: "Hand building",
        nextSession: null,
        courseContent: {
          name: { en: "Clay creatures" },
          description: { en: "Make a friendly dragon." },
          durationLabel: { en: "4 × 2.5 hours" },
          images: ["https://example.test/dragon.jpg"],
        },
      }),
    );
    render(<CustomerCoursesPage />);
    await userEvent.click(
      screen.getByRole("button", { name: "Hand building" }),
    );
    expect(screen.queryByRole("link", { name: "Wheel course" })).toBeNull();
    expect(screen.getByRole("link", { name: "Clay creatures" })).toBeVisible();
    expect(screen.getByText("4 × 2.5 hours")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "allCategories" }),
    );
    await userEvent.type(screen.getByRole("searchbox"), "dragon");
    expect(screen.queryByRole("link", { name: "Wheel course" })).toBeNull();
    expect(screen.getByRole("link", { name: "Clay creatures" })).toBeVisible();
  });

  it("never displays a different studio's next date and hides a disabled gift-voucher page", () => {
    selectStudio(1);
    mocks.tenant.publicSite.customerPortal.pages = {
      vouchers: { enabled: false },
    };
    render(<CustomerCoursesPage />);
    expect(screen.getByText("noDates")).toBeVisible();
    expect(screen.queryByText("durationMinutes: 150")).toBeNull();
    expect(screen.queryByRole("link", { name: "giftVoucher" })).toBeNull();
    expect(screen.getByRole("link", { name: "details" })).toHaveAttribute(
      "href",
      "/portal/courses/wheel?location=grohova",
    );
  });

  it("does not reuse the previous studio's products while the new studio is loading", () => {
    selectStudio(1);
    mocks.catalog = {
      data: [course()],
      currentData: undefined,
      isFetching: true,
    };
    render(<CustomerCoursesPage />);
    expect(screen.queryByRole("link", { name: "Wheel course" })).toBeNull();
    expect(screen.getByText("loading")).toBeVisible();
  });

  it("renders a studio preview without location context, requests or active checkout links", async () => {
    mocks.location = null;
    render(
      <CustomerCoursesPage
        previewData={{ courses: [course()], locations }}
        previewLocationId="vaclavska"
      />,
    );
    expect(mocks.locationHook).not.toHaveBeenCalled();
    expect(mocks.catalogHook).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Create in Václavská",
    );
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    screen.getByRole("link", { name: "details" }).dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(screen.queryByText("noDates")).toBeNull();
    expect(screen.queryByRole("link", { name: "chooseDate" })).toBeNull();
  });

  it("matches studio publication scope in preview while keeping global courses", () => {
    mocks.location = null;
    render(
      <CustomerCoursesPage
        previewData={{
          locations,
          courses: [
            course({ courseContent: { locationIds: ["vaclavska"] } }),
            course({ id: "global", name: "Global course", nextSession: null }),
          ],
        }}
        previewLocationId="grohova"
      />,
    );
    expect(screen.queryByRole("link", { name: "Wheel course" })).toBeNull();
    expect(screen.getByRole("link", { name: "Global course" })).toBeVisible();
  });
});

describe("customer course dates and existing cart", () => {
  it("adds only the selected studio's canonical session and party to the existing cart", async () => {
    mocks.search = "courseSessionId=wheel-date";
    render(<CustomerCourseDetailPage />);
    expect(mocks.sessionsHook).toHaveBeenCalledWith(
      {
        productId: "wheel",
        locationId: "vaclavska",
        ownerScope: "tenant:customer",
      },
      expect.objectContaining({ skip: false }),
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "people" }),
      "2",
    );
    await userEvent.click(screen.getByRole("button", { name: "addToCart" }));
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/addToCart",
      payload: {
        cartItem: expect.objectContaining({
          bookingCourse: "wheel-date",
          bookingRef: "wheel-date",
          bookingProduct: "wheel",
          locationId: "vaclavska",
          product: mocks.catalog.currentData[0],
          quantity: 2,
        }),
      },
    });
    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "cart/openCart",
      payload: { checkoutKind: "bookings" },
    });
    expect(screen.getByRole("link", { name: "back" })).toHaveAttribute(
      "href",
      "/portal/courses?location=vaclavska",
    );
  });

  it("rejects foreign-location URL preselection and never offers its date", () => {
    mocks.search = "courseSessionId=other-date";
    mocks.sessions.currentData = [
      session(),
      session({
        id: "other-date",
        location: { id: "grohova" },
        start: "2099-12-01T10:00:00Z",
        end: "2099-12-01T11:00:00Z",
      }),
    ];
    render(<CustomerCourseDetailPage />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(1);
    expect(radios[0]).not.toBeChecked();
    expect(screen.getByRole("button", { name: "addToCart" })).toBeDisabled();
  });

  it("resets chosen dates when switching studios and ignores previous-argument session data", () => {
    mocks.search = "courseSessionId=wheel-date";
    const view = render(<CustomerCourseDetailPage />);
    expect(screen.getByRole("radio")).toBeChecked();
    selectStudio(1);
    mocks.sessions = {
      data: [session()],
      currentData: undefined,
      isFetching: true,
    };
    view.rerender(<CustomerCourseDetailPage />);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("button", { name: "addToCart" })).toBeNull();
    expect(screen.getByText("loading")).toBeVisible();
  });

  it("shows a full date as unavailable and preserves location in the waitlist return link", () => {
    mocks.sessions.currentData = [
      session({ available: false, remainingCapacity: 0 }),
    ];
    render(<CustomerCourseDetailPage />);
    expect(screen.getByRole("radio")).toBeDisabled();
    expect(screen.getByRole("button", { name: "addToCart" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Waitlist" })).toHaveAttribute(
      "href",
      "/portal/courses/wheel?courseSessionId=wheel-date&location=vaclavska",
    );
  });

  it("prevents duplicate cart sessions while allowing the existing cart to open", async () => {
    mocks.search = "courseSessionId=wheel-date";
    mocks.cart = [{ bookingCourse: "wheel-date" }];
    render(<CustomerCourseDetailPage />);
    expect(screen.getByRole("button", { name: "inCart" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "viewCart" }));
    expect(mocks.dispatch).toHaveBeenCalledTimes(1);
    expect(mocks.dispatch.mock.calls[0][0].type).toBe("cart/openCart");
  });

  it("removes the added confirmation when the selected course is removed from the cart", async () => {
    mocks.search = "courseSessionId=wheel-date";
    const view = render(<CustomerCourseDetailPage />);
    await userEvent.click(screen.getByRole("button", { name: "addToCart" }));
    mocks.cart = [{ bookingCourse: "wheel-date" }];
    view.rerender(<CustomerCourseDetailPage />);
    expect(screen.getByText("added")).toBeVisible();
    mocks.cart = [];
    view.rerender(<CustomerCourseDetailPage />);
    expect(screen.queryByText("added")).toBeNull();
    expect(screen.getByRole("button", { name: "addToCart" })).toBeEnabled();
  });

  it("disables purchasing when payments are paused and uses portal colour tokens", () => {
    mocks.modules.payments = false;
    mocks.search = "courseSessionId=wheel-date";
    const { container } = render(<CustomerCourseDetailPage />);
    expect(screen.getByRole("radio")).toBeDisabled();
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("data-ui-unstyled", "true");
    const add = within(form).getByRole("button", { name: "addToCart" });
    expect(add).toBeDisabled();
    expect(add.className).toContain("var(--tenant-portal-button)");
    expect(form.querySelector("select").className).toContain(
      "var(--tenant-surface)",
    );
  });
});

describe("anonymous course catalog", () => {
  it("uses public data without a session and preserves the studio in detail and voucher links", () => {
    mocks.ownerScope = null;
    mocks.search = "location=vaclavska";
    render(<PublicCustomerCoursesPage />);
    expect(
      screen.getByRole("heading", { name: "Create in Václavská" }),
    ).toBeVisible();
    expect(mocks.catalogHook).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );
    expect(mocks.publicCatalogHook).toHaveBeenLastCalledWith(
      { tenantSlug: "klei", locationId: "vaclavska" },
      expect.objectContaining({ skip: false }),
    );
    expect(screen.getByRole("link", { name: "Wheel course" })).toHaveAttribute(
      "href",
      "/courses/wheel?location=vaclavska",
    );
    expect(screen.getByRole("link", { name: "giftVoucher" })).toHaveAttribute(
      "href",
      "/vouchers?location=vaclavska",
    );
  });

  it("switches studios without carrying a date from the previous studio", async () => {
    mocks.ownerScope = null;
    mocks.search = "location=vaclavska&courseSessionId=wheel-date&quantity=2";
    render(<PublicCustomerCoursesPage />);
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Change studio" }),
      "grohova",
    );
    expect(mocks.replace).toHaveBeenCalledWith("/courses?location=grohova", {
      scroll: false,
    });
  });

  it("does not query an unscoped catalog for an invalid requested studio", () => {
    mocks.ownerScope = null;
    mocks.search = "location=missing";
    render(<PublicCustomerCoursesPage />);
    expect(mocks.publicCatalogHook).not.toHaveBeenCalled();
    expect(screen.getByText("unavailable")).toBeVisible();
    expect(screen.queryByText("Wheel course")).toBeNull();
  });

  it("does not render courses or request data when the tenant disables the page", () => {
    mocks.ownerScope = null;
    mocks.tenant.publicSite.customerPortal.pages = {
      courses: { enabled: false },
    };
    render(<PublicCustomerCoursesPage />);
    expect(screen.getByText("unavailable.title")).toBeVisible();
    expect(mocks.publicCatalogHook).not.toHaveBeenCalled();
    expect(screen.queryByText("Wheel course")).toBeNull();
  });
});
