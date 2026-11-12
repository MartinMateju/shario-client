import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import englishMessages from "@/messages/en.json";
import czechMessages from "@/messages/cs.json";

const mocks = vi.hoisted(() => ({
  search: "",
  locale: "en",
  product: null,
  productQuery: null,
  productId: "wheel",
  authenticated: false,
  customerTenant: null,
  vouchers: false,
  guestCheckoutEnabled: false,
  previewMode: false,
  legal: {},
  voucherPageVisible: true,
  catalogQuery: null,
  sessionsQuery: null,
  locationsQuery: null,
  catalog: vi.fn(),
  sessions: vi.fn(),
  create: vi.fn(),
  guestCheckout: vi.fn(),
  quoteVoucher: vi.fn(),
  productRequest: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: (namespace) => (key) =>
    namespace === "PublicTenant.legal"
      ? (mocks.locale === "cs" ? czechMessages : englishMessages).PublicTenant
          .legal[key]
      : key,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
  useParams: () => ({ tenantSlug: "klei", productId: mocks.productId }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => `/courses/${mocks.productId}`,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => mocks.customerTenant,
  selectCurrentUser: () => null,
  selectCurrentWorkspaceAccess: () => null,
  selectIsAuthenticated: () => mocks.authenticated,
  selectIsCustomerAuthenticated: () => mocks.authenticated,
}));
vi.mock("@/utils/user-profile.utils", () => ({
  getUserAccess: () => ({ isEndCustomer: true }),
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({
    previewMode: mocks.previewMode,
    tenant: {
      slug: "klei",
      publicCapabilities: {
        courses: true,
        vouchers: mocks.vouchers,
        guestCourseCheckout: mocks.guestCheckoutEnabled,
      },
      publicSite: {
        branding: { displayName: "Klei" },
        footer: { legal: mocks.legal },
        pages: {
          courses: {},
          vouchers: { visible: mocks.voucherPageVisible },
        },
      },
    },
  }),
}));
vi.mock("@/components/galleries/CourseImageGallery", () => ({
  default: () => null,
}));
vi.mock("@/components/modals/CourseDetailsModal", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/publicTenantPortalTheme", () => ({
  getPublicTenantPortalTheme: () => ({}),
}));
vi.mock("@/components/public-tenant/PublicCapabilityGate", () => ({
  default: ({ children }) => children,
}));
vi.mock("@/components/waitlists/CourseWaitlistAction", () => ({
  default: ({ returnPath }) => <a href={returnPath}>Waitlist</a>,
}));
vi.mock("@/lib/features/bookingIntents/bookingIntentsApiSlice", () => ({
  useCreatePublicBookingIntentMutation: () => [
    (payload) => {
      mocks.create(payload);
      return { unwrap: async () => ({ token: "intent-token-123" }) };
    },
    {},
  ],
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useQuoteGuestCourseVoucherMutation: () => [
    (payload) => ({ unwrap: () => mocks.quoteVoucher(payload) }),
    {},
  ],
  useGuestCheckoutMutation: () => [
    (payload) => ({
      unwrap: () => mocks.guestCheckout(payload),
    }),
    {},
  ],
}));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetPublicProductQuery: (...args) => {
    mocks.productRequest(...args);
    return (
      mocks.productQuery || {
        data: mocks.product || product,
        currentData: mocks.product || product,
      }
    );
  },
  useGetPublicCourseProductsQuery: (...args) => {
    mocks.catalog(...args);
    return mocks.catalogQuery;
  },
  useGetPublicProductsQuery: () => ({ data: [] }),
}));
vi.mock("@/lib/features/publicBooking/publicBookingApiSlice", () => ({
  useGetPublicCourseLocationsQuery: () => mocks.locationsQuery,
  useGetPublicBookingLocationsQuery: () => mocks.locationsQuery,
  useGetPublicBookingAvailabilityQuery: () => ({ data: { slots: [] } }),
  useGetPublicCourseSessionsQuery: (...args) => {
    mocks.sessions(...args);
    return mocks.sessionsQuery;
  },
}));

import PublicProductCatalogPage from "@/components/public-tenant/PublicProductCatalogPage";
import PublicBookingProductDetailPage from "@/components/public-tenant/PublicBookingProductDetailPage";
import CourseCard from "@/components/cards/CourseCard";

const product = {
  id: "wheel",
  kind: "class",
  name: "Wheel course",
  price: 500,
  currency: "CZK",
};
const session = {
  id: "date-a",
  start: "2099-11-01T10:00:00Z",
  end: "2099-11-01T12:00:00Z",
  available: true,
  remainingCapacity: 2,
  location: { id: "location-a", name: "Václavská" },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  sessionStorage.clear();
  mocks.search = "location=vaclavska";
  mocks.locale = "en";
  mocks.product = null;
  mocks.productQuery = null;
  mocks.productId = "wheel";
  mocks.authenticated = false;
  mocks.customerTenant = null;
  mocks.vouchers = false;
  mocks.guestCheckoutEnabled = false;
  mocks.previewMode = false;
  mocks.legal = {};
  mocks.guestCheckout.mockResolvedValue({ url: "" });
  mocks.quoteVoucher.mockResolvedValue({
    currency: "CZK",
    totalAmountMinor: 50000,
    voucherAppliedMinor: 20000,
    remainingToPayMinor: 30000,
  });
  mocks.voucherPageVisible = true;
  mocks.catalogQuery = { data: [product], currentData: [product] };
  mocks.sessionsQuery = { data: [session], currentData: [session] };
  mocks.locationsQuery = {
    currentData: [
      {
        id: "location-a",
        slug: "vaclavska",
        name: "Václavská",
        booking: { enabled: false },
      },
      { id: "location-b", slug: "grohova", name: "Grohova" },
    ],
  };
});
afterEach(() => vi.unstubAllGlobals());

describe("legacy public course location preservation", () => {
  it("keeps legacy cards scoped and suppresses their gift button when vouchers are unavailable", () => {
    const view = render(
      <CourseCard
        course={{ productId: "wheel", name: { EN: "Wheel" } }}
        language="EN"
        locationReference="vaclavska"
      />,
    );
    expect(screen.getByRole("link", { name: "Book course" })).toHaveAttribute(
      "href",
      "/courses/wheel?location=vaclavska",
    );
    expect(screen.queryByRole("link", { name: "Gift voucher" })).toBeNull();
    mocks.vouchers = true;
    view.rerender(
      <CourseCard
        course={{ productId: "wheel", name: { EN: "Wheel" } }}
        language="EN"
        locationReference="vaclavska"
      />,
    );
    expect(screen.getByRole("link", { name: "Gift voucher" })).toHaveAttribute(
      "href",
      "/vouchers?location=vaclavska",
    );
    mocks.authenticated = true;
    mocks.customerTenant = { slug: "klei", modules: { vouchers: true } };
    view.rerender(
      <CourseCard
        course={{ productId: "wheel", name: { EN: "Wheel" } }}
        language="EN"
        locationReference="vaclavska"
      />,
    );
    expect(screen.getByRole("link", { name: "Book course" })).toHaveAttribute(
      "href",
      "/portal/courses/wheel?location=vaclavska",
    );
    expect(screen.getByRole("link", { name: "Gift voucher" })).toHaveAttribute(
      "href",
      "/portal/vouchers?location=vaclavska",
    );
  });
  it("hides the gift button when the public voucher page is disabled despite voucher capability", () => {
    mocks.vouchers = true;
    mocks.voucherPageVisible = false;
    render(
      <CourseCard
        course={{ productId: "wheel", name: { EN: "Wheel" } }}
        language="EN"
        locationReference="vaclavska"
      />,
    );
    expect(screen.queryByRole("link", { name: "Gift voucher" })).toBeNull();
  });
  it("resolves a course-only studio slug, filters the public request and keeps it on course links", () => {
    render(<PublicProductCatalogPage kind="courses" />);
    expect(mocks.catalog).toHaveBeenCalledWith(
      { tenantSlug: "klei", locationId: "location-a" },
      expect.objectContaining({ skip: false }),
    );
    expect(
      screen.getByRole("link", { name: "catalog.viewDates" }),
    ).toHaveAttribute("href", "/courses/wheel?location=vaclavska");
  });

  it("sends same-tenant authenticated customers to portal courses without losing location", () => {
    mocks.authenticated = true;
    mocks.customerTenant = { slug: "klei" };
    render(<PublicProductCatalogPage kind="courses" />);
    expect(
      screen.getByRole("link", { name: "catalog.viewDates" }),
    ).toHaveAttribute("href", "/portal/courses/wheel?location=vaclavska");
  });

  it("shows and searches localized course metadata when legacy copy is empty", () => {
    mocks.locale = "cs";
    const enriched = {
      ...product,
      description: "",
      courseContent: {
        name: { en: "Wheel course", cs: "Kurz točení" },
        description: { cs: "Práce s porcelánem pro začátečníky." },
        durationLabel: { cs: "4 × 2,5 hodiny" },
        images: ["/courses/wheel-front.jpg", "/courses/wheel-side.jpg"],
      },
    };
    mocks.catalogQuery = { data: [enriched], currentData: [enriched] };
    render(<PublicProductCatalogPage kind="courses" />);
    expect(
      screen.getByRole("heading", { name: "Kurz točení" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Práce s porcelánem pro začátečníky."),
    ).toBeInTheDocument();
    expect(screen.getByText("4 × 2,5 hodiny")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "porcelanem" },
    });
    expect(
      screen.getByRole("link", { name: "catalog.viewDates" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Kurz točení" })).toHaveAttribute(
      "src",
      "/courses/wheel-front.jpg",
    );
    fireEvent.click(screen.getByRole("button", { name: "nextImage" }));
    expect(screen.getByRole("img", { name: "Kurz točení" })).toHaveAttribute(
      "src",
      "/courses/wheel-side.jpg",
    );
  });

  it("keeps the public date picker alongside localized details, duration and gallery", () => {
    mocks.locale = "cs";
    mocks.product = {
      ...product,
      description: "",
      courseContent: {
        name: { cs: "Kurz točení" },
        description: { cs: "Vytvořte si vlastní hrnek." },
        details: {
          cs: "Materiál a výpal jsou zahrnuty.\nVhodné pro začátečníky.",
        },
        durationLabel: { cs: "4 × 2,5 hodiny" },
        images: ["/courses/wheel-front.jpg", "/courses/wheel-side.jpg"],
      },
    };
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(
      screen.getByRole("heading", { name: "Kurz točení" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vytvořte si vlastní hrnek.")).toBeInTheDocument();
    expect(
      screen.getByText(/Materiál a výpal jsou zahrnuty/),
    ).toBeInTheDocument();
    expect(screen.getByText("4 × 2,5 hodiny")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "nextImage" }));
    expect(screen.getByRole("img", { name: "Kurz točení" })).toHaveAttribute(
      "src",
      "/courses/wheel-side.jpg",
    );
    expect(screen.getByRole("radio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "backToCourses" })).toHaveAttribute(
      "href",
      "/courses?location=vaclavska",
    );
  });

  it("does not reuse catalog data from a previous location while its request loads", () => {
    mocks.catalogQuery = {
      data: [product],
      currentData: undefined,
      isFetching: true,
    };
    render(<PublicProductCatalogPage kind="courses" />);
    expect(
      screen.queryByRole("link", { name: "catalog.viewDates" }),
    ).toBeNull();
  });

  it("fails closed for an unknown studio instead of showing unfiltered dates", () => {
    mocks.search = "location=does-not-exist";
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(mocks.sessions).toHaveBeenCalledWith(
      { tenantSlug: "klei", productId: "wheel" },
      expect.objectContaining({ skip: true }),
    );
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("filters dates and URL selection to the chosen studio and keeps the back link scoped", () => {
    mocks.search += "&courseSessionId=foreign";
    mocks.sessionsQuery.currentData.push({
      ...session,
      id: "foreign",
      location: { id: "location-b" },
    });
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(mocks.sessions).toHaveBeenCalledWith(
      { tenantSlug: "klei", productId: "wheel", locationId: "location-a" },
      expect.objectContaining({ skip: false }),
    );
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    expect(screen.getByRole("radio")).not.toBeChecked();
    expect(screen.getByRole("link", { name: "backToCourses" })).toHaveAttribute(
      "href",
      "/courses?location=vaclavska",
    );
  });

  it("clears a previously selected date when the public location changes", () => {
    const view = render(<PublicBookingProductDetailPage kind="courses" />);
    fireEvent.click(screen.getByRole("radio"));
    expect(screen.getByRole("radio")).toBeChecked();
    mocks.search = "location=grohova";
    mocks.sessionsQuery = {
      data: [session],
      currentData: undefined,
      isFetching: true,
    };
    view.rerender(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("preserves legacy locationId links through full-session waitlist recovery", () => {
    mocks.search = "locationId=location-a";
    mocks.sessionsQuery.currentData = [
      { ...session, available: false, remainingCapacity: 0 },
    ];
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByRole("link", { name: "Waitlist" })).toHaveAttribute(
      "href",
      "/courses/wheel?courseSessionId=date-a&location=vaclavska",
    );
  });
});

describe("public course detail guest checkout", () => {
  const fillGuestDetails = () => {
    fireEvent.change(screen.getByRole("textbox", { name: "firstName" }), {
      target: { value: " Anna " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "lastName" }), {
      target: { value: " Novak " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "email" }), {
      target: { value: " ANNA@example.com " },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "phone" }), {
      target: { value: " +420 777 123 456 " },
    });
  };

  beforeEach(() => {
    mocks.guestCheckoutEnabled = true;
  });

  it("reviews a voucher without spending it, then submits the exact quote and code", async () => {
    mocks.search += "&courseSessionId=date-a";
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.change(screen.getByRole("textbox", { name: "voucherCode" }), {
      target: { value: " abc-def-123 " },
    });
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "voucherReviewRequired",
    );
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "checkVoucher" }));
    expect(await screen.findByText("voucherPartial")).toBeVisible();
    expect(mocks.quoteVoucher).toHaveBeenCalledWith({
      tenantSlug: "klei",
      locale: "en",
      promoCode: "ABC-DEF-123",
      cart: [
        {
          product: { _id: "wheel", type: "public-course", kind: "class" },
          bookingCourse: "date-a",
          locationId: "location-a",
          quantity: 1,
          numberOfGuests: 1,
          guests: [],
        },
      ],
    });
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
    expect(screen.getByText("remainingToPay").nextSibling).toHaveTextContent(
      "300",
    );
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() =>
      expect(mocks.guestCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          promoCode: "ABC-DEF-123",
          expectedVoucherQuote: {
            currency: "CZK",
            totalAmountMinor: 50000,
            voucherAppliedMinor: 20000,
            remainingToPayMinor: 30000,
          },
        }),
      ),
    );
  });

  it("offers direct booking confirmation when the voucher covers the full amount", async () => {
    mocks.search += "&courseSessionId=date-a";
    mocks.quoteVoucher.mockResolvedValue({
      currency: "CZK",
      totalAmountMinor: 50000,
      voucherAppliedMinor: 50000,
      remainingToPayMinor: 0,
    });
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.change(screen.getByRole("textbox", { name: "voucherCode" }), {
      target: { value: "ABC-DEF-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "checkVoucher" }));
    const confirm = await screen.findByRole("button", {
      name: "confirmWithVoucher",
    });
    expect(screen.getByText("voucherCoversAll")).toBeVisible();
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(mocks.guestCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          expectedVoucherQuote: expect.objectContaining({
            remainingToPayMinor: 0,
          }),
        }),
      ),
    );
  });

  it("invalidates a reviewed discount when the number of attendees changes", async () => {
    mocks.search += "&courseSessionId=date-a";
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.change(screen.getByRole("textbox", { name: "voucherCode" }), {
      target: { value: "ABC-DEF-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "checkVoucher" }));
    await screen.findByText("voucherPartial");
    fireEvent.change(screen.getByRole("combobox", { name: "people" }), {
      target: { value: "2" },
    });
    expect(screen.queryByText("voucherPartial")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "voucherReviewRequired",
    );
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
  });

  it("requires another review after the server reports a changed voucher balance", async () => {
    mocks.search += "&courseSessionId=date-a";
    mocks.guestCheckout.mockRejectedValue({
      data: { code: "VOUCHER_QUOTE_CHANGED" },
    });
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.change(screen.getByRole("textbox", { name: "voucherCode" }), {
      target: { value: "ABC-DEF-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "checkVoucher" }));
    await screen.findByText("voucherPartial");
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "voucherChanged",
    );
    expect(screen.queryByText("voucherPartial")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    expect(mocks.guestCheckout).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "checkVoucher" }));
    await screen.findByText("voucherPartial");
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() => expect(mocks.guestCheckout).toHaveBeenCalledTimes(2));
    expect(mocks.guestCheckout.mock.calls[1][0].idempotencyKey).not.toBe(
      mocks.guestCheckout.mock.calls[0][0].idempotencyKey,
    );
  });

  it("never submits while voucher validation is pending or accepts a malformed quote", async () => {
    mocks.search += "&courseSessionId=date-a";
    let resolveQuote;
    mocks.quoteVoucher.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveQuote = resolve;
        }),
    );
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.change(screen.getByRole("textbox", { name: "voucherCode" }), {
      target: { value: "ABC-DEF-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "checkVoucher" }));
    fireEvent.click(screen.getByRole("button", { name: "checkVoucher" }));
    fireEvent.submit(
      screen.getByRole("button", { name: "continue" }).closest("form"),
    );
    expect(mocks.quoteVoucher).toHaveBeenCalledTimes(1);
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
    resolveQuote({
      currency: "CZK",
      totalAmountMinor: 50000,
      voucherAppliedMinor: 60000,
      remainingToPayMinor: -10000,
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("voucherError");
    expect(screen.queryByText("voucherPartial")).not.toBeInTheDocument();
  });

  it("does not use a quote that completes after the guest selects another studio", async () => {
    mocks.search += "&courseSessionId=date-a";
    let resolveQuote;
    mocks.quoteVoucher.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveQuote = resolve;
        }),
    );
    const view = render(<PublicBookingProductDetailPage kind="courses" />);
    fireEvent.change(screen.getByRole("textbox", { name: "voucherCode" }), {
      target: { value: "ABC-DEF-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "checkVoucher" }));
    view.unmount();
    resolveQuote({
      currency: "CZK",
      totalAmountMinor: 50000,
      voucherAppliedMinor: 50000,
      remainingToPayMinor: 0,
    });
    await waitFor(() =>
      expect(mocks.quoteVoucher.mock.results[0].value).resolves.toHaveProperty(
        "remainingToPayMinor",
        0,
      ),
    );
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
  });

  it("preserves guest contact, terms, selected date and canonical studio without requiring login", async () => {
    mocks.product = product;
    mocks.legal = { terms: "https://studio.example/booking-terms" };
    render(<PublicBookingProductDetailPage kind="courses" />);
    fireEvent.click(screen.getByRole("radio"));
    fireEvent.change(screen.getByRole("combobox", { name: "people" }), {
      target: { value: "2" },
    });
    fillGuestDetails();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("termsRequired");
    fireEvent.click(screen.getByRole("checkbox", { name: "acceptTerms" }));
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() =>
      expect(mocks.guestCheckout).toHaveBeenCalledWith({
        tenantSlug: "klei",
        locale: "en",
        idempotencyKey: expect.any(String),
        acceptedTerms: true,
        cart: [
          expect.objectContaining({
            bookingProduct: "wheel",
            bookingCourse: "date-a",
            bookingRef: "date-a",
            locationId: "location-a",
            start: session.start,
            end: session.end,
            quantity: 2,
            numberOfGuests: 2,
            termsAccepted: true,
            guests: [{}],
            product: { ...mocks.product, _id: "wheel", type: "public-course" },
          }),
        ],
        guestInfo: {
          firstName: "Anna",
          lastName: "Novak",
          email: "anna@example.com",
          phone: "+420 777 123 456",
        },
      }),
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("does not present a marketing description as terms or require accepting it", async () => {
    mocks.locale = "cs";
    mocks.product = {
      ...product,
      courseContent: {
        details: { en: "Learn to make a bowl", cs: "Naučte se vyrobit misku" },
      },
    };
    mocks.search += "&courseSessionId=date-a";
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByText("Naučte se vyrobit misku")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "acceptTerms" })).toBeNull();
    fillGuestDetails();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() => expect(mocks.guestCheckout).toHaveBeenCalledOnce());
    expect(mocks.guestCheckout.mock.calls[0][0]).not.toHaveProperty(
      "acceptedTerms",
    );
  });

  it("requires acknowledgment of published studio terms and cancellation links", async () => {
    mocks.locale = "cs";
    mocks.legal = {
      terms: "https://studio.example/obchodni-podminky",
      cancellation: "/cancellation",
      privacy: "https://studio.example/privacy",
    };
    mocks.search += "&courseSessionId=date-a";
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(
      screen.getByRole("link", {
        name: czechMessages.PublicTenant.legal.terms,
      }),
    ).toHaveAttribute("href", mocks.legal.terms);
    expect(
      screen.getByRole("link", {
        name: czechMessages.PublicTenant.legal.cancellation,
      }),
    ).toHaveAttribute("href", mocks.legal.cancellation);
    expect(
      screen.queryByRole("link", {
        name: czechMessages.PublicTenant.legal.privacy,
      }),
    ).toBeNull();
    fillGuestDetails();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("termsRequired");
    fireEvent.click(screen.getByRole("checkbox", { name: "acceptTerms" }));
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() =>
      expect(mocks.guestCheckout).toHaveBeenCalledWith(
        expect.objectContaining({ locale: "cs", acceptedTerms: true }),
      ),
    );
  });

  it("does not render unsafe policy links as checkout consent", async () => {
    mocks.legal = {
      terms: "javascript:alert(1)",
      cancellation: "//evil.test/policy",
    };
    mocks.search += "&courseSessionId=date-a";
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.queryByRole("checkbox", { name: "acceptTerms" })).toBeNull();
    expect(
      screen.queryByRole("link", {
        name: englishMessages.PublicTenant.legal.terms,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", {
        name: englishMessages.PublicTenant.legal.cancellation,
      }),
    ).toBeNull();
  });

  it("requires fresh consent and a new attempt when the published policies change", async () => {
    mocks.legal = { terms: "https://studio.example/terms-v1" };
    mocks.guestCheckout.mockRejectedValue({ status: "FETCH_ERROR" });
    mocks.search += "&courseSessionId=date-a";
    const view = render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.click(screen.getByRole("checkbox", { name: "acceptTerms" }));
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await screen.findByRole("alert");
    const firstKey = mocks.guestCheckout.mock.calls[0][0].idempotencyKey;

    mocks.legal = { terms: "https://studio.example/terms-v2" };
    view.rerender(<PublicBookingProductDetailPage kind="courses" />);
    expect(
      screen.getByRole("checkbox", { name: "acceptTerms" }),
    ).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    expect(mocks.guestCheckout).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent("termsRequired");
    fireEvent.click(screen.getByRole("checkbox", { name: "acceptTerms" }));
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() => expect(mocks.guestCheckout).toHaveBeenCalledTimes(2));
    expect(mocks.guestCheckout.mock.calls[1][0].idempotencyKey).not.toBe(
      firstKey,
    );
    await screen.findByRole("alert");

    mocks.legal = {};
    view.rerender(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.queryByRole("checkbox", { name: "acceptTerms" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() => expect(mocks.guestCheckout).toHaveBeenCalledTimes(3));
    expect(mocks.guestCheckout.mock.calls[2][0]).not.toHaveProperty(
      "acceptedTerms",
    );
    expect(mocks.guestCheckout.mock.calls[2][0].cart[0]).not.toHaveProperty(
      "termsAccepted",
    );
  });

  it("reuses an attempt after a network error and changes it when guest contact changes", async () => {
    mocks.guestCheckout.mockRejectedValue({ status: "FETCH_ERROR" });
    mocks.search += "&courseSessionId=date-a";
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await screen.findByRole("alert");
    const first = mocks.guestCheckout.mock.calls[0][0];
    expect(first.idempotencyKey).toMatch(/^[a-f\d-]{36}$/i);
    expect(first.cart[0].guests).toEqual([]);
    expect(first).not.toHaveProperty("acceptedTerms");
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() => expect(mocks.guestCheckout).toHaveBeenCalledTimes(2));
    expect(mocks.guestCheckout.mock.calls[1][0].idempotencyKey).toBe(
      first.idempotencyKey,
    );
    await screen.findByRole("alert");
    fireEvent.change(screen.getByRole("textbox", { name: "email" }), {
      target: { value: "other@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() => expect(mocks.guestCheckout).toHaveBeenCalledTimes(3));
    expect(mocks.guestCheckout.mock.calls[2][0].idempotencyKey).not.toBe(
      first.idempotencyKey,
    );
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("starts a new attempt only after expiry is reported and the guest clicks again", async () => {
    mocks.search += "&courseSessionId=date-a";
    mocks.guestCheckout
      .mockRejectedValueOnce({
        data: { code: "GUEST_CHECKOUT_ATTEMPT_EXPIRED" },
      })
      .mockRejectedValueOnce({ status: "FETCH_ERROR" });
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "attemptExpired",
    );
    const first = mocks.guestCheckout.mock.calls[0][0].idempotencyKey;
    expect(mocks.guestCheckout).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() => expect(mocks.guestCheckout).toHaveBeenCalledTimes(2));
    expect(mocks.guestCheckout.mock.calls[1][0].idempotencyKey).not.toBe(first);
  });

  it("blocks duplicate submission while preparing and never turns an existing email into an account intent", async () => {
    mocks.search += "&courseSessionId=date-a";
    let rejectRequest;
    mocks.guestCheckout.mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectRequest = reject;
        }),
    );
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    const form = screen
      .getByRole("button", { name: "continue" })
      .closest("form");
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(mocks.guestCheckout).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("button", { name: "starting" })).toBeDisabled();
    rejectRequest({ data: { code: "PUBLIC_GUEST_EMAIL_SIGN_IN_REQUIRED" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("checkoutError");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("caps guest attendees at twenty and shows their total", () => {
    mocks.search += "&courseSessionId=date-a&quantity=50";
    mocks.sessionsQuery = {
      currentData: [{ ...session, capacity: 60, remainingCapacity: 60 }],
    };
    render(<PublicBookingProductDetailPage kind="courses" />);
    const people = screen.getByRole("combobox", { name: "people" });
    expect(people).toHaveValue("20");
    expect(people.querySelectorAll("option")).toHaveLength(20);
    expect(screen.getByText("totalLabel").nextSibling).toHaveTextContent(
      "10,000",
    );
  });

  it("rejects a checkout redirect without a valid order and proof", async () => {
    mocks.search += "&courseSessionId=date-a";
    mocks.guestCheckout.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay/test",
    });
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("checkoutError");
    expect(
      [...Array(sessionStorage.length)].map((_, index) =>
        sessionStorage.key(index),
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^shario:guest-course:klei:/),
      ]),
    );
  });

  it("never submits a guest payment from the website preview", () => {
    mocks.previewMode = true;
    mocks.search += "&courseSessionId=date-a";
    render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    const button = screen.getByRole("button", { name: "continue" });
    expect(button).toBeDisabled();
    fireEvent.submit(button.closest("form"));
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
  });

  it("does not redirect an obsolete form after a guest changes studio", async () => {
    let resolveRequest;
    mocks.guestCheckout.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    mocks.search += "&courseSessionId=date-a";
    const view = render(<PublicBookingProductDetailPage kind="courses" />);
    fillGuestDetails();
    fireEvent.click(screen.getByRole("button", { name: "continue" }));
    await waitFor(() => expect(mocks.guestCheckout).toHaveBeenCalledTimes(1));
    view.unmount();
    resolveRequest({
      url: "https://checkout.stripe.com/c/pay/test",
      orderId: "507f1f77bcf86cd799439011",
      accessToken: "a".repeat(43),
    });
    await waitFor(() =>
      expect(mocks.guestCheckout.mock.results[0].value).resolves.toHaveProperty(
        "url",
      ),
    );
    expect(
      sessionStorage.getItem(
        "shario:guest-course:klei:507f1f77bcf86cd799439011",
      ),
    ).toBeNull();
  });

  it("switches studios, removes an old URL selection immediately and resets quantity and guest form", () => {
    mocks.search += "&courseSessionId=date-a&quantity=2";
    const view = render(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByRole("combobox", { name: "people" })).toHaveValue("2");
    fillGuestDetails();
    fireEvent.change(screen.getByRole("combobox", { name: "location" }), {
      target: { value: "location-b" },
    });
    expect(mocks.replace).toHaveBeenCalledWith(
      "/courses/wheel?location=grohova",
      { scroll: false },
    );
    expect(screen.queryByRole("button", { name: "continue" })).toBeNull();

    mocks.search = "location=grohova";
    const secondSession = {
      ...session,
      id: "date-b",
      location: { id: "location-b", name: "Grohova" },
    };
    mocks.sessionsQuery = {
      data: [session],
      currentData: [secondSession],
    };
    view.rerender(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByRole("radio")).not.toBeChecked();
    fireEvent.click(screen.getByRole("radio"));
    expect(screen.getByRole("combobox", { name: "people" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "email" })).toHaveValue("");
    mocks.search = "location=vaclavska";
    mocks.sessionsQuery = { currentData: [session] };
    view.rerender(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByRole("radio")).not.toBeChecked();
    expect(screen.queryByRole("button", { name: "continue" })).toBeNull();
    expect(mocks.guestCheckout).not.toHaveBeenCalled();
  });

  it("does not show a previous studio's product or checkout while its scoped product loads", () => {
    const view = render(<PublicBookingProductDetailPage kind="courses" />);
    fireEvent.click(screen.getByRole("radio"));
    mocks.search = "location=grohova";
    mocks.productQuery = {
      data: product,
      currentData: undefined,
      isFetching: true,
    };
    view.rerender(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.queryByRole("heading", { name: "Wheel course" })).toBeNull();
    expect(screen.queryByRole("button", { name: "continue" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "location" })).toHaveValue(
      "location-b",
    );
    expect(mocks.productRequest).toHaveBeenLastCalledWith(
      {
        tenantSlug: "klei",
        productId: "wheel",
        locationId: "location-b",
      },
      { skip: false },
    );
  });

  it("waits for locations before making product or date requests, including a link without a studio", () => {
    mocks.search = "";
    mocks.locationsQuery = {
      data: [{ id: "old-location", slug: "old-studio" }],
      currentData: undefined,
      isLoading: true,
    };
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(mocks.productRequest).toHaveBeenCalledWith(
      { tenantSlug: "klei", productId: "wheel" },
      { skip: true },
    );
    expect(mocks.sessions).toHaveBeenCalledWith(
      { tenantSlug: "klei", productId: "wheel" },
      { skip: true },
    );
    expect(screen.queryByRole("heading", { name: "Wheel course" })).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("retains a deep link's valid session quantity after the initial studio lookup resolves", () => {
    mocks.search += "&courseSessionId=date-a&quantity=2";
    const locations = mocks.locationsQuery.currentData;
    mocks.locationsQuery = { currentData: undefined, isLoading: true };
    const view = render(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.queryByRole("button", { name: "continue" })).toBeNull();
    mocks.locationsQuery = { currentData: locations };
    view.rerender(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByRole("radio")).toBeChecked();
    expect(screen.getByRole("combobox", { name: "people" })).toHaveValue("2");
  });

  it("keeps the studio switcher available for an unknown studio without showing unscoped details", () => {
    mocks.search = "location=unknown";
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByRole("combobox", { name: "location" })).toHaveValue("");
    expect(screen.queryByRole("heading", { name: "Wheel course" })).toBeNull();
    expect(mocks.productRequest).toHaveBeenCalledWith(
      { tenantSlug: "klei", productId: "wheel" },
      { skip: true },
    );
    expect(screen.queryByRole("button", { name: "continue" })).toBeNull();
  });

  it("withdraws guest checkout during date refresh and when the current date becomes full", () => {
    const view = render(<PublicBookingProductDetailPage kind="courses" />);
    fireEvent.click(screen.getByRole("radio"));
    expect(
      screen.getByRole("button", { name: "continue" }),
    ).toBeInTheDocument();
    mocks.sessionsQuery = {
      data: [session],
      currentData: [session],
      isFetching: true,
    };
    view.rerender(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.queryByRole("button", { name: "continue" })).toBeNull();
    mocks.sessionsQuery = {
      data: [session],
      currentData: [{ ...session, remainingCapacity: 0, available: false }],
    };
    view.rerender(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByRole("radio")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "continue" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "bookWithAccount" }),
    ).toBeNull();
  });

  it("does not restore checkout for a full date requested in the URL", () => {
    mocks.search += "&courseSessionId=date-a";
    mocks.sessionsQuery.currentData = [
      { ...session, available: false, remainingCapacity: 0 },
    ];
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByRole("link", { name: "Waitlist" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "continue" })).toBeNull();
  });

  it("creates the account booking intent with the current course date and studio", async () => {
    mocks.search += "&courseSessionId=date-a&quantity=8";
    render(<PublicBookingProductDetailPage kind="courses" />);
    expect(screen.getByRole("combobox", { name: "people" })).toHaveValue("2");
    fireEvent.click(screen.getByRole("button", { name: "bookWithAccount" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: "wheel",
          locationId: "location-a",
          courseSessionId: "date-a",
          quantity: 2,
          start: session.start,
          end: session.end,
        }),
      ),
    );
    expect(mocks.push).toHaveBeenCalledWith(
      "/login?next=%2Fportal%2Fbooking%2Fconfirm%3Fintent%3Dintent-token-123%26location%3Dvaclavska",
    );
  });

  it("keeps the selected studio on an authenticated customer's direct confirmation link", async () => {
    mocks.authenticated = true;
    mocks.customerTenant = { slug: "klei" };
    mocks.search += "&courseSessionId=date-a";
    render(<PublicBookingProductDetailPage kind="courses" />);
    fireEvent.click(screen.getByRole("button", { name: "continueInPortal" }));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        "/portal/booking/confirm?intent=intent-token-123&location=vaclavska",
      ),
    );
  });
});
