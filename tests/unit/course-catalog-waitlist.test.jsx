import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ courseQuery: vi.fn() }));

const products = [
  {
    id: "course-places",
    name: "Course with places",
    price: 1000,
    nextSession: { remainingCapacity: 2 },
  },
  {
    id: "course-waitlist",
    name: "Course with waitlist",
    price: 1000,
    nextSession: {
      remainingCapacity: 0,
      waitlist: { enabled: true, accepting: true },
    },
  },
  {
    id: "course-full",
    name: "Full course",
    price: 1000,
    nextSession: {
      remainingCapacity: 0,
      waitlist: { enabled: true, accepting: false },
    },
  },
  {
    id: "course-soon",
    name: "Course coming soon",
    price: 1000,
    nextSession: null,
  },
];

const t = (key, values = {}) => {
  const copy = {
    "courses.title": "Classes at Studio One",
    "courses.description": "Choose a class.",
    "catalog.viewDates": "View dates",
    "catalog.loading": "Loading",
    "catalog.error": "Error",
    "catalog.retry": "Try again",
    "catalog.empty": "No classes",
    "catalog.availability.placesLeft": `${values.count} places left`,
    "catalog.availability.fullWaitlistOpen": "Full · waitlist open",
    "catalog.availability.full": "Full",
    "catalog.availability.newDatesSoon": "New dates soon",
  };
  return copy[key] || key;
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => t,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ tenantSlug: "studio-one" }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/courses",
  useRouter: () => ({ replace: vi.fn() }),
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => null,
  selectIsCustomerAuthenticated: () => false,
}));
vi.mock("@/lib/features/publicBooking/publicBookingApiSlice", () => ({
  useGetPublicCourseLocationsQuery: () => ({
    currentData: [
      {
        id: "location-main",
        slug: "studio-main",
        name: "Main studio",
        isActive: true,
        isPrimary: true,
      },
    ],
  }),
}));

vi.mock("@/components/products/products.utils", () => ({
  formatProductPrice: (product) => `CZK ${product.price}`,
  getProductDescription: () => "",
  getProductId: (product) => product.id,
  getProductName: (product) => product.name,
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetPublicCourseProductsQuery: (...args) => {
    mocks.courseQuery(...args);
    return {
      data: products,
      currentData: products,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
  useGetPublicProductsQuery: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/public-tenant/PublicCapabilityGate", () => ({
  default: ({ children }) => children,
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({
    tenant: {
      publicCapabilities: { courses: true },
      publicSite: {
        branding: { displayName: "Studio One" },
        pages: { courses: { title: {}, description: {} } },
      },
    },
  }),
}));

vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  getLocalizedPublicTenantText: (_value, _locale, fallback) => fallback,
  getPublicTenantTheme: () => ({
    accentColor: "#1F36D4",
    accentForeground: "#FFFFFF",
    accentLinkColor: "#1F36D4",
    backgroundColor: "#FCFBF8",
    textForeground: "#1F1F1F",
  }),
}));

vi.mock("@/components/public-tenant/publicProductTaxonomy", () => ({
  getPublicProductHref: (product) => `/courses/${product.id}`,
  isPublicCatalogProduct: () => true,
}));

vi.mock("@/utils/tenantRouting", () => ({
  getValidatedTenantSlugParam: () => "studio-one",
}));

import PublicProductCatalogPage, {
  getCourseCatalogAvailability,
} from "@/components/public-tenant/PublicProductCatalogPage";

describe("course catalog waitlist discovery", () => {
  it("renders every server-supplied next-session state on course cards", () => {
    render(<PublicProductCatalogPage kind="courses" />);

    expect(screen.getByText("2 places left")).toBeInTheDocument();
    expect(screen.getByText("Full · waitlist open")).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(screen.getByText("New dates soon")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View dates" })).toHaveLength(4);
    expect(mocks.courseQuery).toHaveBeenCalledWith(
      { tenantSlug: "studio-one", locationId: "location-main" },
      { skip: false },
    );
    screen
      .getAllByRole("link", { name: "View dates" })
      .forEach((link, index) => {
        expect(link).toHaveAttribute(
          "href",
          `/courses/${products[index].id}?location=studio-main`,
        );
      });
  });

  it("uses detail-page discovery as the fallback when aggregation is absent", () => {
    expect(getCourseCatalogAvailability({ id: "legacy-course" }, t)).toBe("");
  });
});
