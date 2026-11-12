import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PublicSitePreviewRoute from "@/components/public-site-editor/PublicSitePreviewRoute";

const componentCalls = vi.hoisted(() => ({
  book: vi.fn(),
  chrome: vi.fn(),
  courses: vi.fn(),
  portalCourses: vi.fn(),
  help: vi.fn(),
  home: vi.fn(),
  login: vi.fn(),
  memberships: vi.fn(),
  menu: vi.fn(),
  register: vi.fn(),
  vouchers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("nonce=preview-route-nonce"),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({
    tenant: componentCalls.chrome.mock.calls.at(-1)[0].tenant,
  }),
}));

vi.mock("@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/login/page", () => ({
  default: (props) => {
    componentCalls.login(props);
    return <div data-testid="production-login">Login</div>;
  },
}));

vi.mock(
  "@/app/[locale]/tenants/[tenantSlug]/(tenant-auth)/register/page",
  () => ({
    default: (props) => {
      componentCalls.register(props);
      return <div data-testid="production-register">Register</div>;
    },
  }),
);

vi.mock("@/components/memberships/PublicMembershipCatalog", () => ({
  default: (props) => {
    componentCalls.memberships(props);
    return <div data-testid="production-memberships">Memberships</div>;
  },
}));

vi.mock("@/components/menu/Menu", () => ({
  default: (props) => {
    componentCalls.menu(props);
    return (
      <button type="button" data-testid="production-portal-action">
        Portal action
      </button>
    );
  },
}));

vi.mock("@/components/courses/CustomerCoursesPage", () => ({
  default: (props) => {
    componentCalls.portalCourses(props);
    return <div data-testid="production-portal-courses">Customer courses</div>;
  },
}));

vi.mock("@/components/public-tenant/PublicBookingAvailabilityPage", () => ({
  default: (props) => {
    componentCalls.book(props);
    return <div data-testid="production-book">Book</div>;
  },
}));

vi.mock("@/components/public-tenant/PublicHelpPage", () => ({
  default: (props) => {
    componentCalls.help(props);
    return <div data-testid="production-help">Help</div>;
  },
}));

vi.mock("@/components/public-tenant/PublicProductCatalogPage", () => ({
  default: (props) => {
    componentCalls.courses(props);
    return <div data-testid="production-courses">Courses</div>;
  },
}));

vi.mock("@/components/public-tenant/PublicTenantChrome", () => ({
  default: ({ children, ...props }) => {
    componentCalls.chrome(props);
    return (
      <div
        data-testid="production-chrome"
        data-preview-pathname={props.previewPathname}
        data-surface={props.surface}
      >
        {children}
      </div>
    );
  },
}));

vi.mock("@/components/public-tenant/PublicTenantHomePage", () => ({
  default: (props) => {
    componentCalls.home(props);
    return (
      <div data-testid="production-home">
        <a
          href="#unsafe-navigation"
          data-testid="editable-home-link"
          data-public-site-edit-path="pages.home.headline.en"
        >
          <span>Editable headline</span>
        </a>
        <button type="button" data-testid="non-editable-action">
          Book now
        </button>
        <form data-testid="production-form" action="/unsafe-submit">
          <button type="submit">Submit</button>
        </form>
      </div>
    );
  },
}));

vi.mock("@/components/public-tenant/PublicVoucherCatalogPage", () => ({
  default: (props) => {
    componentCalls.vouchers(props);
    return <div data-testid="production-vouchers">Vouchers</div>;
  },
}));

vi.mock(
  "@/components/public-tenant/publicTenant.config",
  async (importOriginal) => ({
    ...(await importOriginal()),
    normalizePublicTenant: (tenant, tenantSlug) => ({
      ...tenant,
      slug: tenantSlug,
    }),
  }),
);

const tenant = {
  id: "tenant-1",
  name: "Clay House",
  publicCapabilities: {
    bookStudio: true,
    courses: true,
    memberships: true,
    vouchers: true,
    help: true,
  },
  publicSite: { branding: { displayName: "Clay House" } },
};

const previewData = {
  courses: [{ id: "course-1", name: "Wheel basics" }],
  help: [{ id: "help-1", title: "Arrival" }],
  locations: [
    { id: "location-1", name: "Annex" },
    { id: "location-2", name: "Main studio", isPrimary: true },
  ],
  membershipLocations: [{ id: "location-2", name: "Main studio" }],
  memberships: [{ id: "membership-1", name: "Studio member" }],
  products: [{ id: "product-1", name: "Clay bag" }],
  vouchers: [{ id: "voucher-1", name: "Gift card" }],
};

function dispatchUpdate(payload, overrides = {}) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        source: window.parent,
        data: {
          type: "shario:public-site-preview:update",
          nonce: "preview-route-nonce",
          payload,
          ...overrides,
        },
      }),
    );
  });
}

function renderPage(page, data = previewData) {
  render(<PublicSitePreviewRoute tenantSlug="clay-house" />);
  dispatchUpdate({ tenant, page, data });
}

describe("PublicSitePreviewRoute", () => {
  beforeEach(() => {
    vi.spyOn(window, "postMessage").mockImplementation(() => {});
  });

  it("acknowledges the accepted revision after committing its preview content", () => {
    render(<PublicSitePreviewRoute tenantSlug="clay-house" />);
    expect(
      window.postMessage.mock.calls.some(
        ([message]) => message.type === "shario:public-site-preview:applied",
      ),
    ).toBe(false);
    dispatchUpdate(
      { tenant, page: "home", data: previewData },
      { revision: 7 },
    );
    expect(screen.getByTestId("production-home")).toBeInTheDocument();
    expect(window.postMessage).toHaveBeenLastCalledWith(
      {
        type: "shario:public-site-preview:applied",
        nonce: "preview-route-nonce",
        revision: 7,
      },
      window.location.origin,
    );
    window.postMessage.mockClear();
    dispatchUpdate(
      { tenant, page: "help", data: previewData },
      { revision: 8, nonce: "incorrect" },
    );
    expect(window.postMessage).not.toHaveBeenCalled();
    expect(screen.getByTestId("production-home")).toBeInTheDocument();
    dispatchUpdate(
      { tenant, page: "help", data: previewData },
      { revision: 9 },
    );
    expect(screen.getByTestId("production-help")).toBeInTheDocument();
    expect(window.postMessage.mock.lastCall[0].revision).toBe(9);
  });

  it("announces readiness and accepts only the nonce-bound parent payload", () => {
    render(<PublicSitePreviewRoute tenantSlug="clay-house" />);

    expect(window.postMessage).toHaveBeenCalledWith(
      {
        type: "shario:public-site-preview:ready",
        nonce: "preview-route-nonce",
      },
      window.location.origin,
    );
    expect(screen.queryByTestId("production-chrome")).not.toBeInTheDocument();

    dispatchUpdate(
      { tenant, page: "home", data: previewData },
      { nonce: "wrong-nonce" },
    );
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://attacker.example",
          source: window.parent,
          data: {
            type: "shario:public-site-preview:update",
            nonce: "preview-route-nonce",
            payload: { tenant, page: "home", data: previewData },
          },
        }),
      );
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: null,
          data: {
            type: "shario:public-site-preview:update",
            nonce: "preview-route-nonce",
            payload: { tenant, page: "home", data: previewData },
          },
        }),
      );
    });
    expect(screen.queryByTestId("production-chrome")).not.toBeInTheDocument();

    dispatchUpdate({ tenant, page: "home", data: previewData });
    expect(screen.getByTestId("production-home")).toBeInTheDocument();
  });

  it.each([
    ["home", "production-home", "public", "/"],
    ["book", "production-book", "public", "/book"],
    ["courses", "production-courses", "public", "/courses"],
    ["memberships", "production-memberships", "public", "/memberships"],
    ["vouchers", "production-vouchers", "public", "/vouchers"],
    ["help", "production-help", "public", "/help"],
    ["login", "production-login", "auth", "/login"],
    ["register", "production-register", "auth", "/register"],
    ["portal", "production-portal-action", "portal", "/portal"],
  ])(
    "renders the production %s surface at its real pathname",
    (page, testId, surface, pathname) => {
      renderPage(page);

      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.getByTestId("production-chrome")).toHaveAttribute(
        "data-surface",
        surface,
      );
      expect(screen.getByTestId("production-chrome")).toHaveAttribute(
        "data-preview-pathname",
        pathname,
      );
    },
  );

  it("feeds each production catalog from the matching studio data", () => {
    renderPage("vouchers");
    expect(componentCalls.vouchers.mock.calls.at(-1)[0].previewData).toEqual(
      previewData.vouchers,
    );

    dispatchUpdate({ tenant, page: "courses", data: previewData });
    expect(componentCalls.courses.mock.calls.at(-1)[0]).toMatchObject({
      kind: "courses",
      previewData: previewData.courses,
    });

    dispatchUpdate({ tenant, page: "memberships", data: previewData });
    expect(componentCalls.memberships.mock.calls.at(-1)[0].previewData).toEqual(
      {
        plans: previewData.memberships,
        locations: previewData.membershipLocations,
      },
    );

    dispatchUpdate({ tenant, page: "portal", data: previewData });
    expect(componentCalls.menu.mock.calls.at(-1)[0]).toMatchObject({
      activeLocationId: "location-2",
      activeBookingLocationId: "location-2",
      locations: previewData.locations,
      products: previewData.products,
      previewMode: true,
    });
  });

  it("previews a disabled portal calendar without mounting customer booking content", () => {
    render(<PublicSitePreviewRoute tenantSlug="clay-house" />);
    dispatchUpdate({
      tenant: {
        ...tenant,
        publicSite: {
          ...tenant.publicSite,
          customerPortal: {
            pages: { calendar: { enabled: false } },
            navigation: { memberships: { visible: false } },
          },
        },
      },
      page: "portal",
      data: previewData,
    });

    expect(
      screen.getByRole("heading", { name: "Page unavailable" }),
    ).toBeVisible();
    expect(
      screen.queryByTestId("production-portal-action"),
    ).not.toBeInTheDocument();
    expect(componentCalls.menu).not.toHaveBeenCalled();
    expect(
      componentCalls.chrome.mock.calls.at(-1)[0].tenant.publicSite
        .customerPortal,
    ).toMatchObject({
      pages: { calendar: { enabled: false } },
      navigation: { memberships: { visible: false } },
    });

    dispatchUpdate({ tenant, page: "portal", data: previewData });
    expect(screen.getByTestId("production-portal-action")).toBeInTheDocument();
    expect(componentCalls.menu.mock.calls.at(-1)[0]).toMatchObject({
      bookings: [],
      previewMode: true,
    });
  });

  it("previews course content in portal colours at the selected studio and honors its page toggle", () => {
    render(<PublicSitePreviewRoute tenantSlug="clay-house" />);
    dispatchUpdate({
      tenant,
      page: "portalCourses",
      data: previewData,
      previewLocationId: "location-2",
    });
    expect(componentCalls.portalCourses.mock.calls.at(-1)[0]).toEqual({
      previewData,
      previewLocationId: "location-2",
    });
    expect(screen.getByTestId("production-chrome")).toHaveAttribute(
      "data-surface",
      "portal",
    );
    expect(screen.getByTestId("production-chrome")).toHaveAttribute(
      "data-preview-pathname",
      "/portal/courses",
    );
    dispatchUpdate({
      tenant: {
        ...tenant,
        publicSite: {
          ...tenant.publicSite,
          customerPortal: { pages: { courses: { enabled: false } } },
        },
      },
      page: "portalCourses",
      data: previewData,
      previewLocationId: "location-2",
    });
    expect(
      screen.queryByTestId("production-portal-courses"),
    ).not.toBeInTheDocument();
  });

  it("previews courses at course-only studios without broadening calendar locations", () => {
    const courseLocations = [
      { id: "course-only", name: "Course studio", bookingEnabled: false },
    ];
    const data = { ...previewData, courseLocations };
    render(<PublicSitePreviewRoute tenantSlug="clay-house" />);
    dispatchUpdate({
      tenant,
      page: "portalCourses",
      data,
      previewLocationId: "course-only",
    });
    expect(componentCalls.portalCourses.mock.calls.at(-1)[0]).toEqual({
      previewData: { ...data, locations: courseLocations },
      previewLocationId: "course-only",
    });

    dispatchUpdate({ tenant, page: "portal", data });
    expect(componentCalls.menu.mock.calls.at(-1)[0].locations).toEqual(
      previewData.locations,
    );
  });

  it("passes explicit preview modules to the portal content, header and disabled-page fallback", () => {
    render(<PublicSitePreviewRoute tenantSlug="clay-house" />);
    const previewModules = {
      bookings: true,
      courses: false,
      memberships: false,
      vouchers: true,
    };
    dispatchUpdate({
      tenant,
      page: "portal",
      data: previewData,
      previewModules,
    });
    expect(componentCalls.menu.mock.calls.at(-1)[0].modules).toEqual(
      previewModules,
    );
    expect(componentCalls.chrome.mock.calls.at(-1)[0].previewModules).toEqual(
      previewModules,
    );
    expect(
      componentCalls.chrome.mock.calls.at(-1)[0].tenant,
    ).not.toHaveProperty("modules");

    dispatchUpdate({
      tenant: {
        ...tenant,
        publicSite: {
          ...tenant.publicSite,
          customerPortal: { pages: { calendar: { enabled: false } } },
        },
      },
      page: "portal",
      data: previewData,
      previewModules,
    });
    expect(
      screen.getByRole("link", { name: "Continue in the portal" }),
    ).toHaveAttribute("href", "/portal/vouchers");
  });

  it.each(["book", "courses", "memberships", "vouchers", "help"])(
    "does not mount hidden %s preview content and restores it when shown",
    (page) => {
      render(<PublicSitePreviewRoute tenantSlug="clay-house" />);
      dispatchUpdate({
        tenant: {
          ...tenant,
          publicSite: {
            ...tenant.publicSite,
            pages: { [page]: { visible: false } },
          },
        },
        page,
        data: previewData,
      });

      expect(
        screen.queryByTestId(`production-${page}`),
      ).not.toBeInTheDocument();
      expect(componentCalls[page]).not.toHaveBeenCalled();
      expect(screen.getByText("unavailable.title")).toBeInTheDocument();

      dispatchUpdate({ tenant, page, data: previewData });
      expect(screen.getByTestId(`production-${page}`)).toBeInTheDocument();
    },
  );

  it("preserves the preview page while emitting click-to-edit and blocking actions", () => {
    renderPage("home");
    const editableText = screen.getByText("Editable headline");
    const interactiveAction = screen.getByTestId("non-editable-action");
    const form = screen.getByTestId("production-form");

    const editableClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    expect(editableText.dispatchEvent(editableClick)).toBe(false);
    expect(window.postMessage).toHaveBeenCalledWith(
      {
        type: "shario:public-site-preview:edit",
        nonce: "preview-route-nonce",
        path: "pages.home.headline.en",
      },
      window.location.origin,
    );
    expect(screen.getByTestId("production-home")).toBeInTheDocument();
    expect(screen.getByTestId("production-chrome")).toHaveAttribute(
      "data-preview-pathname",
      "/",
    );

    const editMessageCount = window.postMessage.mock.calls.filter(
      ([message]) => message?.type === "shario:public-site-preview:edit",
    ).length;
    expect(
      interactiveAction.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      ),
    ).toBe(false);
    expect(
      form.dispatchEvent(
        new SubmitEvent("submit", { bubbles: true, cancelable: true }),
      ),
    ).toBe(false);
    expect(
      window.postMessage.mock.calls.filter(
        ([message]) => message?.type === "shario:public-site-preview:edit",
      ),
    ).toHaveLength(editMessageCount);
  });
});
