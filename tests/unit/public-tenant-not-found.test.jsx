import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import csMessages from "@/messages/cs.json";
import enMessages from "@/messages/en.json";

const translations = {
  en: enMessages.PublicSiteNotFound,
  cs: csMessages.PublicSiteNotFound,
};

const getTranslation = (locale, key) =>
  key
    .split(".")
    .reduce((value, segment) => value?.[segment], translations[locale]);

const mocks = vi.hoisted(() => ({
  locale: "en",
  pathname: "/",
  params: { tenantSlug: "studio-beta" },
  state: {
    auth: {
      tenant: { slug: "studio-beta" },
      authenticated: true,
      sessionReady: true,
      workspaceAuthenticated: true,
    },
  },
  preview: {
    data: {
      editor: {
        publiclyAvailable: false,
        publicationStatus: "draft",
      },
    },
    isLoading: false,
    isFetching: false,
    isUninitialized: false,
  },
  skip: null,
}));

vi.mock("next-intl", () => ({
  useLocale: () => mocks.locale,
  useTranslations: () => (key) => getTranslation(mocks.locale, key),
}));

vi.mock("next/navigation", () => ({
  useParams: () => mocks.params,
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
  usePathname: () => mocks.pathname,
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.auth.tenant,
  selectIsAuthenticated: (state) => state.auth.authenticated,
  selectIsSessionReady: (state) => state.auth.sessionReady,
  selectIsWorkspaceAuthenticated: (state) => state.auth.workspaceAuthenticated,
}));

vi.mock("@/lib/features/publicSite/publicSiteApiSlice", () => ({
  useGetPublicSitePreviewQuery: (_arg, options) => {
    mocks.skip = options.skip;
    return mocks.preview;
  },
}));

vi.mock("@/utils/tenantRouting", () => ({
  normalizeTenantSlug: (value) =>
    String(value || "")
      .trim()
      .toLowerCase(),
  buildPlatformUrl: ({ locale }) => `https://shario.io/${locale}`,
}));

import PublicTenantNotFound from "@/components/public-tenant/PublicTenantNotFound";

describe("PublicTenantNotFound", () => {
  beforeEach(() => {
    mocks.locale = "en";
    mocks.pathname = "/";
    mocks.params = { tenantSlug: "studio-beta" };
    mocks.state = {
      auth: {
        tenant: { slug: "studio-beta" },
        authenticated: true,
        sessionReady: true,
        workspaceAuthenticated: true,
      },
    };
    mocks.preview = {
      data: {
        editor: {
          publiclyAvailable: false,
          publicationStatus: "draft",
        },
      },
      isLoading: false,
      isFetching: false,
      isUninitialized: false,
    };
    mocks.skip = null;
  });

  it("guides a matching authenticated workspace to review and publish", () => {
    const { container } = render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your public website is still private",
      }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(document.title).toBe(
      "Your public website is still private | shario.io",
    );
    expect(
      screen.getByRole("link", { name: /Review and publish/ }),
    ).toHaveAttribute("href", "/app/setup?step=publish");
    expect(screen.getByRole("link", { name: /Edit website/ })).toHaveAttribute(
      "href",
      "/app/settings/public-site",
    );
    expect(
      screen.queryByText("This studio page isn’t available"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByTestId("brush-swash")).toHaveLength(2);
    expect(
      screen
        .getAllByTestId("brush-swash")
        .map((swash) => swash.getAttribute("data-brush-texture-src")),
    ).toEqual([
      "/images/marketing/brush-loaded-wide.webp",
      "/images/marketing/brush-dry-rake.webp",
    ]);
    expect(
      within(screen.getByRole("heading", { level: 1 })).getByText("private"),
    ).toHaveProperty("tagName", "EM");
    expect(container.querySelectorAll("header")).toHaveLength(1);
    expect(
      screen.getByRole("link", {
        name: `shario.io — ${enMessages.PublicSiteNotFound.brandLabel}`,
      }),
    ).toHaveAttribute("href", "https://shario.io/en");
    expect(mocks.skip).toBe(false);
  });

  it("keeps a truly anonymous visitor neutral without loading private data", () => {
    mocks.state.auth = {
      tenant: null,
      authenticated: false,
      sessionReady: true,
      workspaceAuthenticated: false,
    };

    render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This studio page isn’t available",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Review and publish/ }),
    ).not.toBeInTheDocument();
    expect(document.title).toBe("This studio page isn’t available | shario.io");
    expect(mocks.skip).toBe(true);
  });

  it("keeps anonymous and mismatched visitors on neutral 404 copy", () => {
    mocks.state.auth = {
      tenant: { slug: "another-studio" },
      authenticated: true,
      sessionReady: true,
      workspaceAuthenticated: true,
    };

    render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This studio page isn’t available",
      }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Visit Shario/ })).toHaveAttribute(
      "href",
      "https://shario.io/en",
    );
    expect(
      screen.queryByRole("link", { name: /Review and publish/ }),
    ).not.toBeInTheDocument();
    expect(mocks.skip).toBe(true);
  });

  it("does not mislabel a missing page on a published website", () => {
    mocks.preview.data.editor = {
      publiclyAvailable: true,
      publicationStatus: "live",
    };

    render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This studio page isn’t available",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText("Your public website is still private"),
    ).not.toBeInTheDocument();
  });

  it("keeps a matching authenticated customer neutral and skips owner preview", () => {
    mocks.state.auth = {
      tenant: { slug: "studio-beta" },
      authenticated: true,
      sessionReady: true,
      workspaceAuthenticated: false,
    };

    render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This studio page isn’t available",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Review and publish/ }),
    ).not.toBeInTheDocument();
    expect(mocks.skip).toBe(true);
  });

  it("keeps workspace-route 404s neutral even when the public site is a draft", () => {
    mocks.pathname = "/app/missing";

    render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This studio page isn’t available",
      }),
    ).toBeVisible();
    expect(
      screen.queryByText("Your public website is still private"),
    ).not.toBeInTheDocument();
    expect(mocks.skip).toBe(true);
  });

  it("verifies matching owners on nested public routes", () => {
    mocks.pathname = "/help/missing-article";

    render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your public website is still private",
      }),
    ).toBeVisible();
    expect(mocks.skip).toBe(false);
  });

  it("fails closed to neutral copy when the preview response is incomplete", () => {
    mocks.preview.data = { editor: {} };

    render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This studio page isn’t available",
      }),
    ).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Review and publish/ }),
    ).not.toBeInTheDocument();
  });

  it("renders the Czech owner experience", () => {
    mocks.locale = "cs";

    render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Váš web zatím není zveřejněný",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Zkontrolovat a zveřejnit/ }),
    ).toHaveAttribute("href", "/app/setup?step=publish");
  });

  it("renders the Czech visitor experience and locale-aware platform link", () => {
    mocks.locale = "cs";
    mocks.state.auth = {
      tenant: null,
      authenticated: false,
      sessionReady: true,
      workspaceAuthenticated: false,
    };

    render(<PublicTenantNotFound />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Tato stránka studia není dostupná",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Navštívit Shario/ }),
    ).toHaveAttribute("href", "https://shario.io/cs");
  });

  it("waits for session restoration before choosing the message", () => {
    mocks.state.auth.sessionReady = false;
    mocks.preview = {
      data: undefined,
      isLoading: false,
      isFetching: false,
      isUninitialized: true,
    };

    render(<PublicTenantNotFound />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking website status…",
    );
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("keeps the loader visible while a matching owner preview is loading", () => {
    mocks.preview = {
      data: undefined,
      isLoading: true,
      isFetching: true,
      isUninitialized: false,
    };

    render(<PublicTenantNotFound />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Checking website status…",
    );
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(mocks.skip).toBe(false);
  });

  it("keeps arbitrary missing paths inside the safe standalone surface", () => {
    mocks.pathname = "/missing-page";

    const { container } = render(<PublicTenantNotFound />);
    const page = container.querySelector("[data-public-tenant-not-found]");

    expect(container.querySelectorAll("header")).toHaveLength(1);
    expect(page).toHaveClass("-mt-[var(--header-height)]");
    expect(
      screen.getByRole("link", {
        name: `shario.io — ${enMessages.PublicSiteNotFound.brandLabel}`,
      }),
    ).toHaveAttribute("href", "https://shario.io/en");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "This studio page isn’t available",
      }),
    ).toBeVisible();
  });
});
