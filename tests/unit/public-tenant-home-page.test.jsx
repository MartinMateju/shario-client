import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: null,
  locale: "en",
  state: null,
  locations: vi.fn(),
  products: vi.fn(),
  courses: vi.fn(),
  memberships: vi.fn(),
}));

const translations = {
  "actions.book": "Book a session",
  "actions.signIn": "Sign in",
};

vi.mock("next-intl", async (importOriginal) => {
  const { createTranslator } = await importOriginal();
  const catalogs = {
    en: (await import("@/messages/en.json")).default,
    cs: (await import("@/messages/cs.json")).default,
    nl: (await import("@/messages/nl.json")).default,
  };
  return {
    useLocale: () => mocks.locale,
    useMessages: () => catalogs[mocks.locale],
    useTranslations: (namespace) =>
      namespace === "PublicTenantHome.sections" ||
      namespace?.startsWith("Legacy.")
        ? createTranslator({
            locale: mocks.locale,
            messages: catalogs[mocks.locale],
            namespace,
          })
        : (key) => translations[key] || key,
  };
});

vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "studio-olivie" }),
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/features/publicBooking/publicBookingApiSlice", () => ({
  useGetPublicBookingLocationsQuery: (...args) => mocks.locations(...args),
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetPublicProductsQuery: (...args) => mocks.products(...args),
  useGetPublicCourseProductsQuery: (...args) => mocks.courses(...args),
}));

vi.mock("@/lib/features/memberships/membershipsApiSlice", () => ({
  useGetPublicMembershipCatalogQuery: (...args) => mocks.memberships(...args),
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => mocks.context,
}));

import PublicTenantHomePage from "@/components/public-tenant/PublicTenantHomePage";
import PublicTenantHomeSections from "@/components/public-tenant/PublicTenantHomeSections";
import PublicTenantHeroMedia from "@/components/public-tenant/PublicTenantHeroMedia";

const emptyQuery = () => ({
  data: [],
  isLoading: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
});

const makeContext = ({
  sectionOrder = ["waysToVisit"],
  hiddenSections = [],
  sectionContent = {},
  headlineColor = "",
  hiddenPages = [],
} = {}) => ({
  tenant: {
    slug: "studio-olivie",
    publicCapabilities: {
      bookStudio: true,
      courses: true,
      memberships: true,
      vouchers: true,
      help: true,
    },
    publicSite: {
      branding: {
        displayName: "Studio Olivie",
        logoUrl: "",
        coverImageUrl: "https://cdn.example.test/studio.jpg",
        accentColor: "#1F36D4",
        secondaryColor: "#E56F51",
        backgroundColor: "#FCFBF8",
        textColor: "#1F1F1F",
        description: { en: "A calm place to create.", cs: "" },
      },
      pages: {
        ...Object.fromEntries(
          hiddenPages.map((key) => [key, { visible: false }]),
        ),
        home: {
          eyebrow: { en: "Welcome to", cs: "" },
          headline: { en: "Studio Olivie", cs: "" },
          headlineColor,
          description: { en: "A calm place to create.", cs: "" },
          sectionOrder,
          hiddenSections,
          sectionContent,
        },
      },
    },
  },
  primaryAction: { key: "book", href: "/book" },
  navigation: [
    { key: "book", href: "/book" },
    { key: "memberships", href: "/memberships" },
    { key: "vouchers", href: "/vouchers" },
    { key: "help", href: "/help" },
  ],
});

describe("public tenant home page", () => {
  beforeEach(() => {
    mocks.context = makeContext();
    mocks.locale = "en";
    mocks.state = {
      auth: {
        token: null,
        userInfo: null,
        tenant: null,
        authContext: "customer",
        workspaceAccess: null,
        workspaceAccessResolved: true,
        sessionReady: true,
      },
    };
    for (const query of [
      mocks.locations,
      mocks.products,
      mocks.courses,
      mocks.memberships,
    ]) {
      query.mockReset();
      query.mockReturnValue(emptyQuery());
    }
  });

  it("renders default section headings and navigation in Dutch without English fallback", () => {
    mocks.locale = "nl";
    render(<PublicTenantHomeSections />);
    expect(
      screen.getByRole("heading", { name: "Mogelijkheden voor je bezoek" }),
    ).toBeVisible();
    expect(screen.getByText("Ontdek de studio")).toBeVisible();
    expect(screen.getByText("Lidmaatschappen")).toBeVisible();
    expect(screen.queryByText("Ways to visit")).not.toBeInTheDocument();
    expect(screen.queryByText("Memberships")).not.toBeInTheDocument();
  });

  it("renders the production hero and curated destinations", () => {
    const { container } = render(<PublicTenantHomePage />);

    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Studio Olivie",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveStyle({
      color: "#1F1F1F",
    });
    expect(container.querySelector("[data-public-tenant-hero]")).toBeTruthy();
    expect(
      container.querySelector("[data-public-tenant-hero-media]"),
    ).toHaveAttribute("data-public-tenant-hero-media", "image");
    expect(
      screen.getAllByRole("link", { name: /Book a session/ })[0],
    ).toHaveAttribute("href", "/login?next=%2Fportal%3Ftab%3Dstudio-calendar");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(
      container.querySelector('[data-public-site-home-section="waysToVisit"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-public-tenant-service="memberships"]'),
    ).toHaveAttribute("href", "/memberships");
  });

  it("opens the customer calendar directly for a signed-in customer of this studio", () => {
    mocks.state.auth = {
      ...mocks.state.auth,
      token: "customer-session",
      userInfo: { id: "customer-1" },
      tenant: { slug: "studio-olivie" },
    };

    render(<PublicTenantHomePage />);

    expect(
      screen.getByRole("link", { name: "Book a session" }),
    ).toHaveAttribute("href", "/portal?tab=studio-calendar");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });

  it.each([
    ["another studio", { tenant: { slug: "another-studio" } }],
    ["workspace access", { authContext: "workspace", workspaceAccess: {} }],
    ["an unresolved session", { workspaceAccessResolved: false }],
    ["a session still restoring", { sessionReady: false }],
  ])("requires customer login for %s", (_case, overrides) => {
    mocks.state.auth = {
      ...mocks.state.auth,
      token: "existing-session",
      userInfo: { id: "user-1" },
      tenant: { slug: "studio-olivie" },
      ...overrides,
    };

    render(<PublicTenantHomePage />);

    expect(
      screen.getByRole("link", { name: "Book a session" }),
    ).toHaveAttribute("href", "/login?next=%2Fportal%3Ftab%3Dstudio-calendar");
  });

  it("preserves a configured non-booking primary destination", () => {
    mocks.context.primaryAction = { key: "vouchers", href: "/vouchers" };

    render(<PublicTenantHomePage />);

    expect(
      screen.getByRole("link", { name: "actions.vouchers" }),
    ).toHaveAttribute("href", "/vouchers");
  });

  it("applies a custom homepage headline colour", () => {
    mocks.context = makeContext({ headlineColor: "#243B53" });

    render(<PublicTenantHomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveStyle({
      color: "#243B53",
    });
  });

  it.each(["en", "cs"])(
    "refreshes unsaved %s copy, images and colours without remounting the page",
    (locale) => {
      mocks.locale = locale;
      const previewData = {
        locations: [],
        products: [],
        courses: [],
        memberships: [],
      };
      const { container, rerender } = render(
        <PublicTenantHomePage previewData={previewData} />,
      );
      const main = screen.getByRole("main");
      const initialHeadline = screen.getByRole("heading", { level: 1 });
      const headline = locale === "cs" ? "Tvořte s námi" : "Create with us";
      const description =
        locale === "cs"
          ? "Nový popis našeho studia."
          : "Our updated studio story.";
      const previousSite = mocks.context.tenant.publicSite;
      mocks.context = {
        ...mocks.context,
        tenant: {
          ...mocks.context.tenant,
          publicSite: {
            ...previousSite,
            branding: {
              ...previousSite.branding,
              coverImageUrl: "https://cdn.example.test/new-studio.jpg",
              accentColor: "#184D47",
              backgroundColor: "#FFF4E6",
              textColor: "#243B53",
            },
            pages: {
              ...previousSite.pages,
              home: {
                ...previousSite.pages.home,
                headline: {
                  ...previousSite.pages.home.headline,
                  [locale]: headline,
                },
                description: {
                  ...previousSite.pages.home.description,
                  [locale]: description,
                },
                headlineColor: "#622B39",
              },
            },
          },
        },
      };

      rerender(<PublicTenantHomePage previewData={previewData} />);

      expect(screen.getByRole("main")).toBe(main);
      expect(screen.getByRole("heading", { level: 1 })).toBe(initialHeadline);
      expect(initialHeadline).toHaveTextContent(headline);
      expect(initialHeadline).toHaveAttribute(
        "data-public-site-edit-path",
        `pages.home.headline.${locale}`,
      );
      expect(initialHeadline).toHaveStyle({ color: "#622B39" });
      expect(screen.getByText(description)).toBeVisible();
      expect(main).toHaveStyle({
        backgroundColor: "#FFF4E6",
        color: "#243B53",
      });
      expect(
        container.querySelector("[data-public-tenant-primary-action]"),
      ).toHaveStyle({
        backgroundColor: "#184D47",
      });
      expect(
        container.querySelector("[data-public-tenant-hero-image]"),
      ).toHaveAttribute("src", "https://cdn.example.test/new-studio.jpg");
      expect(mocks.locations.mock.calls.at(-1)[1]).toMatchObject({
        skip: true,
      });
    },
  );

  it("uses supplied studio data, respects section order, and skips public queries", () => {
    mocks.context = makeContext({
      sectionOrder: ["about", "locations", "waysToVisit"],
      hiddenSections: ["waysToVisit"],
      sectionContent: {
        about: {
          title: { en: "Our studio" },
          description: { en: "Made for our community." },
        },
        locations: { title: { en: "Come by" }, description: {} },
      },
    });

    const { container } = render(
      <PublicTenantHomePage
        previewData={{
          locations: [{ id: "location-1", name: "Old Town" }],
          products: [],
          courses: [],
          memberships: [],
        }}
      />,
    );

    expect(
      [...container.querySelectorAll("[data-public-site-home-section]")].map(
        (section) => section.getAttribute("data-public-site-home-section"),
      ),
    ).toEqual(["about", "locations"]);
    expect(screen.getByText("Old Town")).toBeInTheDocument();
    expect(screen.getByText("Made for our community.")).toBeInTheDocument();
    expect(mocks.locations.mock.calls.at(-1)[1]).toMatchObject({ skip: true });
    expect(mocks.products.mock.calls.at(-1)[1]).toMatchObject({ skip: true });
    expect(mocks.courses.mock.calls.at(-1)[1]).toMatchObject({ skip: true });
    expect(mocks.memberships.mock.calls.at(-1)[1]).toMatchObject({
      skip: true,
    });
  });

  it("uses the customer-auth brush language when no hero image is uploaded", () => {
    const { container } = render(
      <PublicTenantHeroMedia
        coverImageUrl=""
        logoUrl="https://cdn.example.test/logo.webp"
        displayName="Studio Olivie"
        accentColor="#1F36D4"
        secondaryColor="#E56F51"
        backgroundColor="#FCFBF8"
      />,
    );

    const media = container.querySelector("[data-public-tenant-hero-media]");
    const swashes = container.querySelectorAll('[data-testid="brush-swash"]');

    expect(media).toHaveAttribute("data-public-tenant-hero-media", "fallback");
    expect(swashes).toHaveLength(2);
    expect(swashes[0]).toHaveStyle({ "--brush-rgb": "31 54 212" });
    expect(swashes[1]).toHaveStyle({ "--brush-rgb": "229 111 81" });
    expect(
      container.querySelector("[data-public-tenant-hero-logo]"),
    ).toHaveAttribute("src", "https://cdn.example.test/logo.webp");
  });

  it.each([
    ["book", "Open studio session"],
    ["courses", "Wheel throwing class"],
    ["memberships", "Monthly membership"],
  ])("omits hidden %s offers from mixed homepage results", (key, title) => {
    mocks.context = makeContext({
      sectionOrder: ["featured"],
      hiddenPages: [key],
    });
    const previewData = {
      products: [
        { id: "studio-1", type: "workshop", name: "Open studio session" },
        { id: "class-1", kind: "class", name: "Wheel throwing class" },
      ],
      courses: [],
      memberships: [
        {
          id: "plan-1",
          name: "Monthly membership",
          prices: [{ currency: "CZK", amountMinor: 89000 }],
        },
      ],
    };

    const { container, rerender } = render(
      <PublicTenantHomeSections previewData={previewData} />,
    );

    expect(screen.queryByText(title)).not.toBeInTheDocument();
    expect(container.querySelector(`a[href^="/${key}"]`)).toBeNull();
    expect(screen.getAllByRole("link", { name: "View details" })).toHaveLength(
      2,
    );

    mocks.context = makeContext({ sectionOrder: ["featured"] });
    rerender(<PublicTenantHomeSections previewData={previewData} />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View details" })).toHaveLength(
      3,
    );
  });

  it("uses translated membership highlights and the studio's primary price", () => {
    mocks.context = makeContext({ sectionOrder: ["featured"] });
    mocks.context.tenant.settings = { currency: "CZK" };
    render(
      <PublicTenantHomeSections
        previewData={{
          products: [],
          courses: [],
          memberships: [
            {
              id: "translated",
              name: "České členství",
              description: "Český popis",
              translations: {
                en: {
                  name: "English membership",
                  description: "English description",
                },
              },
              prices: [
                { currency: "EUR", amountMinor: 3600 },
                { currency: "CZK", amountMinor: 89000 },
              ],
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "English membership" }),
    ).toBeInTheDocument();
    expect(screen.getByText("English description")).toBeInTheDocument();
    expect(screen.getByText(/CZK.*890/)).toBeInTheDocument();
    expect(screen.queryByText(/€36/)).not.toBeInTheDocument();
  });

  it("omits hidden FAQ destinations without linking them to hidden Help", () => {
    mocks.context = makeContext({
      sectionOrder: ["faq"],
      hiddenPages: ["book", "help"],
    });
    mocks.context.navigation = [];

    render(<PublicTenantHomeSections />);

    expect(
      screen.queryByRole("link", { name: "Booking and availability" }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: "Studio help" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Courses and workshops" }),
    ).toHaveAttribute("href", "/courses");
  });

  it("keeps visible offers and FAQ links when only header navigation is hidden", () => {
    mocks.context = makeContext({ sectionOrder: ["featured", "faq"] });
    mocks.context.tenant.publicSite.header = {
      hiddenItems: ["book", "courses", "memberships", "help"],
    };
    mocks.context.navigation = [];

    render(
      <PublicTenantHomeSections
        previewData={{
          courses: [{ id: "class-1", name: "Wheel throwing class" }],
          products: [],
          memberships: [],
        }}
      />,
    );

    expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute(
      "href",
      "/courses/class-1",
    );
    expect(
      screen.getByRole("link", { name: "Booking and availability" }),
    ).toHaveAttribute("href", "/book");
    expect(
      screen.getByRole("link", { name: "Courses and workshops" }),
    ).toHaveAttribute("href", "/courses");
    expect(screen.getByRole("link", { name: "Studio help" })).toHaveAttribute(
      "href",
      "/help",
    );
  });

  it("hides empty sections and skips offer queries when all their pages are hidden", () => {
    mocks.context = makeContext({
      sectionOrder: ["featured", "faq"],
      hiddenPages: ["book", "courses", "memberships", "help"],
    });
    mocks.products.mockReturnValue({
      ...emptyQuery(),
      data: [{ id: "studio-1", type: "workshop", name: "Cached studio offer" }],
    });
    mocks.courses.mockReturnValue({
      ...emptyQuery(),
      data: [{ id: "class-1", name: "Cached class" }],
    });
    mocks.memberships.mockReturnValue({
      ...emptyQuery(),
      data: [{ id: "plan-1", name: "Cached membership" }],
    });

    const { container } = render(<PublicTenantHomeSections />);

    expect(
      container.querySelector("[data-public-site-home-section]"),
    ).toBeNull();
    expect(mocks.products.mock.calls.at(-1)[1]).toMatchObject({ skip: true });
    expect(mocks.courses.mock.calls.at(-1)[1]).toMatchObject({ skip: true });
    expect(mocks.memberships.mock.calls.at(-1)[1]).toMatchObject({
      skip: true,
    });
  });

  it("falls back to studio initials when a tenant logo cannot be loaded", () => {
    const { container } = render(
      <PublicTenantHeroMedia
        coverImageUrl=""
        logoUrl="https://cdn.example.test/broken-logo.webp"
        displayName="Studio Olivie"
        accentColor="#1F36D4"
        secondaryColor="#E56F51"
        backgroundColor="#FCFBF8"
      />,
    );

    fireEvent.error(container.querySelector("[data-public-tenant-hero-logo]"));

    expect(
      container.querySelector("[data-public-tenant-hero-initials]"),
    ).toHaveTextContent("SO");
  });

  it("recovers after a failed cover is replaced in the live preview", async () => {
    const props = {
      logoUrl: "",
      displayName: "Studio Olivie",
      accentColor: "#1F36D4",
      secondaryColor: "#E56F51",
      backgroundColor: "#FCFBF8",
    };
    const { container, rerender } = render(
      <PublicTenantHeroMedia
        {...props}
        coverImageUrl="https://cdn.example.test/broken.jpg"
      />,
    );

    fireEvent.error(container.querySelector("[data-public-tenant-hero-image]"));
    rerender(
      <PublicTenantHeroMedia
        {...props}
        coverImageUrl="https://cdn.example.test/replacement.jpg"
      />,
    );

    await waitFor(() =>
      expect(
        container.querySelector("[data-public-tenant-hero-media]"),
      ).toHaveAttribute("data-public-tenant-hero-media", "image"),
    );
    expect(
      container.querySelector("[data-public-tenant-hero-image]"),
    ).toHaveAttribute("src", "https://cdn.example.test/replacement.jpg");
  });
});
