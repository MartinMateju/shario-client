import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  courseProducts: [],
  publicProducts: [],
  courseQuery: vi.fn(),
}));

const t = (key, values = {}) => {
  const copy = {
    "courses.title": "Classes at Studio One",
    "courses.description": "Choose a class.",
    "courses.filters.label": "Class categories",
    "courses.filters.all": "All",
    "courses.filters.searchLabel": "Search classes",
    "courses.filters.searchPlaceholder": "Search classes…",
    "courses.filters.clearSearch": "Clear search",
    "courses.filters.resultCount": `${values.visible} / ${values.total} classes`,
    "courses.filters.noResults":
      "No classes match your search or selected category.",
    "courses.filters.reset": "Show all classes",
    "catalog.viewDates": "View dates",
    "catalog.viewDetails": "View details",
    "catalog.loading": "Loading",
    "catalog.error": "Error",
    "catalog.retry": "Try again",
    "catalog.empty": "No classes",
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
  getProductDescription: (product) => product.description || "",
  getProductId: (product) => product.id,
  getProductName: (product) => product.name,
}));

const query = (data) => ({
  data,
  currentData: data,
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
});

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetPublicCourseProductsQuery: (...args) => {
    mocks.courseQuery(...args);
    return query(mocks.courseProducts);
  },
  useGetPublicProductsQuery: () => query(mocks.publicProducts),
}));

vi.mock("@/components/public-tenant/PublicCapabilityGate", () => ({
  default: ({ children }) => children,
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({
    tenant: {
      publicCapabilities: { bookStudio: true, courses: true },
      publicSite: {
        branding: { displayName: "Studio One" },
        pages: {
          book: { title: {}, description: {} },
          courses: { title: {}, description: {} },
        },
      },
    },
  }),
}));

vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  getLocalizedPublicTenantText: (_value, _locale, fallback) => fallback,
  getPublicTenantTheme: () => ({
    accentColor: "#1F36D4",
    accentForeground: "#FFFFFF",
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

import PublicProductCatalogPage from "@/components/public-tenant/PublicProductCatalogPage";

const classes = [
  {
    id: "wheel-beginners",
    name: "Točení pro začátečníky",
    description: "Start from the basics.",
    classCategory: " Hrncířský kruh ",
    price: 2400,
  },
  {
    id: "wheel-advanced",
    name: "Pokročilé točení",
    description: "Build confidence on the wheel.",
    classCategory: "hrnčířský KRUH",
    price: 2800,
  },
  {
    id: "glazing",
    name: "Glazing basics",
    description: "Colour and finish your pieces.",
    classCategory: "Glazování",
    price: 1000,
  },
  {
    id: "modelling",
    name: "Modelování pro děti",
    description: "A playful family class.",
    classCategory: "",
    price: 800,
  },
];

describe("public class catalog filters", () => {
  beforeEach(() => {
    mocks.courseProducts = classes;
    mocks.publicProducts = classes;
  });

  it("derives customer-facing category chips and filters by category", () => {
    render(<PublicProductCatalogPage kind="courses" />);

    expect(mocks.courseQuery).toHaveBeenCalledWith(
      { tenantSlug: "studio-one", locationId: "location-main" },
      { skip: false },
    );
    const group = screen.getByRole("group", { name: "Class categories" });
    expect(within(group).getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(group).getByRole("button", { name: "Hrncířský kruh" }),
    ).toBeInTheDocument();
    expect(
      within(group).getByRole("button", { name: "Glazování" }),
    ).toBeInTheDocument();
    expect(within(group).getAllByRole("button")).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "View dates" })).toHaveLength(4);

    fireEvent.click(
      within(group).getByRole("button", { name: "Hrncířský kruh" }),
    );

    expect(screen.getAllByRole("link", { name: "View dates" })).toHaveLength(2);
    expect(screen.getByText("2 / 4 classes")).toBeInTheDocument();
    expect(
      within(group).getByRole("button", { name: "Hrncířský kruh" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("combines filters, searches without Czech diacritics, and resets", () => {
    render(<PublicProductCatalogPage kind="courses" />);

    const group = screen.getByRole("group", { name: "Class categories" });
    const search = screen.getByRole("searchbox", { name: "Search classes" });

    fireEvent.change(search, { target: { value: "toceni" } });
    expect(screen.getAllByRole("link", { name: "View dates" })).toHaveLength(2);

    fireEvent.click(within(group).getByRole("button", { name: "Glazování" }));
    expect(
      screen.getByText("No classes match your search or selected category."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all classes" }));
    expect(search).toHaveValue("");
    expect(screen.getAllByRole("link", { name: "View dates" })).toHaveLength(4);

    fireEvent.change(search, { target: { value: "modelovani" } });
    expect(screen.getAllByRole("link", { name: "View dates" })).toHaveLength(1);
    expect(screen.getByText("Modelování pro děti")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(screen.getAllByRole("link", { name: "View dates" })).toHaveLength(4);
  });

  it("keeps the shared Open Studio catalog free of class-only controls", () => {
    const { container } = render(<PublicProductCatalogPage kind="book" />);

    expect(
      container.querySelector("[data-class-catalog-filters]"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("searchbox", { name: "Search classes" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View details" })).toHaveLength(
      4,
    );
  });
});
