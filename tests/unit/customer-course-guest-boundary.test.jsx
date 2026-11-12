import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathname: "/portal/courses",
  searchParams: new URLSearchParams(),
  state: {},
  dispatch: vi.fn(),
  replace: vi.fn(),
  onboarding: vi.fn(() => ({})),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "cs",
  useTranslations: () => (key) => key,
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "atelier-klei" }),
  useSearchParams: () => mocks.searchParams,
}));
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
  useDispatch: () => mocks.dispatch,
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  logOut: (payload) => ({ type: "auth/logOut", payload }),
  selectCurrentUser: (state) => state.user,
  selectCurrentTenant: (state) => state.tenant,
  selectCurrentWorkspaceAccess: () => null,
  selectIsCustomerAuthenticated: (state) => state.customerAuthenticated,
  selectIsWorkspaceAuthenticated: (state) => state.workspaceAuthenticated,
  selectIsSessionReadyForContext: () => (state) => state.sessionReady,
}));
vi.mock("@/lib/features/tenants/tenantApiSlice", () => ({
  useGetCurrentTenantOnboardingQuery: (...args) => mocks.onboarding(...args),
}));

import TenantSurfaceBoundary from "@/components/auth/TenantSurfaceBoundary";

const renderBoundary = () =>
  render(
    <TenantSurfaceBoundary surface="portal">
      <p>Private customer content</p>
    </TenantSurfaceBoundary>,
  );

describe("guest entry to customer Courses", () => {
  beforeEach(() => {
    mocks.pathname = "/portal/courses";
    mocks.searchParams = new URLSearchParams();
    mocks.state = {
      customerAuthenticated: false,
      workspaceAuthenticated: false,
      sessionReady: true,
      user: null,
      tenant: null,
    };
  });

  it.each([
    ["/portal/courses", "/courses"],
    ["/portal/courses/", "/courses/"],
    ["/portal/courses/wheel-basics", "/courses/wheel-basics"],
    ["/portal/courses/wheel-basics/", "/courses/wheel-basics/"],
    ["/portal/vouchers", "/vouchers"],
    ["/portal/vouchers/", "/vouchers"],
  ])(
    "redirects guests from %s to its public course route",
    (pathname, target) => {
      mocks.pathname = pathname;
      mocks.searchParams = new URLSearchParams(
        "location=vaclavska&courseSessionId=session-42&quantity=2",
      );
      renderBoundary();

      expect(mocks.replace).toHaveBeenCalledWith(
        `${target}?location=vaclavska&courseSessionId=session-42&quantity=2`,
      );
      expect(
        screen.queryByText("Private customer content"),
      ).not.toBeInTheDocument();
      expect(mocks.onboarding).toHaveBeenCalledWith(undefined, { skip: true });
      expect(mocks.dispatch).not.toHaveBeenCalled();
    },
  );

  it.each(["vouchers", "VOUCHERS"])(
    "opens the public voucher shop from legacy tab %s without requiring an account",
    (tab) => {
      mocks.pathname = "/portal";
      mocks.searchParams = new URLSearchParams({
        tab,
        location: "vaclavska",
        voucher: "wheel-course",
      });
      renderBoundary();
      expect(mocks.replace).toHaveBeenCalledWith(
        "/vouchers?location=vaclavska&voucher=wheel-course",
      );
      expect(
        screen.queryByText("Private customer content"),
      ).not.toBeInTheDocument();
    },
  );

  it("keeps signed-in voucher shoppers inside the tenant portal", () => {
    mocks.pathname = "/portal/vouchers";
    mocks.state.customerAuthenticated = true;
    mocks.state.tenant = { slug: "atelier-klei" };
    mocks.state.user = { id: "customer-a", platformRole: "none" };
    renderBoundary();
    expect(screen.getByText("Private customer content")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it.each([
    "/portal",
    "/portal/account",
    "/portal/work",
    "/portal/lost-found",
    "/portal/bookings",
    "/portal/credits",
    "/portal/notifications",
    "/portal/waitlists",
    "/portal/courses-private",
    "/portal/courses/wheel-basics/checkout",
    "/portal/courses//wheel-basics",
    "/portal/vouchers-private",
    "/portal/vouchers/history",
  ])("keeps %s private and retains the login return path", (pathname) => {
    mocks.pathname = pathname;
    mocks.searchParams = new URLSearchParams("location=vaclavska");
    renderBoundary();

    expect(mocks.replace).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent(`${pathname}?location=vaclavska`)}`,
    );
    expect(
      screen.queryByText("Private customer content"),
    ).not.toBeInTheDocument();
  });

  it("waits for restoration before deciding to leave the portal", () => {
    mocks.state.sessionReady = false;
    const { rerender } = renderBoundary();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Private customer content"),
    ).not.toBeInTheDocument();

    mocks.state.sessionReady = true;
    mocks.state.customerAuthenticated = true;
    mocks.state.tenant = { slug: "atelier-klei" };
    mocks.state.user = { id: "customer-a", platformRole: "none" };
    rerender(
      <TenantSurfaceBoundary surface="portal">
        <p>Private customer content</p>
      </TenantSurfaceBoundary>,
    );
    expect(screen.getByText("Private customer content")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("does not use a workspace-only session to enter customer Courses", () => {
    mocks.state.workspaceAuthenticated = true;
    mocks.state.tenant = { slug: "atelier-klei" };
    mocks.state.user = { id: "workspace-owner" };
    renderBoundary();

    expect(mocks.replace).toHaveBeenCalledWith("/courses");
    expect(
      screen.queryByText("Private customer content"),
    ).not.toBeInTheDocument();
  });

  it("still clears mismatched customer identity and requests sign-in on the requested tenant", () => {
    mocks.state.customerAuthenticated = true;
    mocks.state.tenant = { slug: "different-tenant" };
    mocks.state.user = { id: "customer-a" };
    mocks.pathname = "/portal/courses/wheel-basics";
    mocks.searchParams = new URLSearchParams(
      "location=vaclavska&courseSessionId=session-42",
    );
    renderBoundary();

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: "auth/logOut",
      payload: { authContext: "customer" },
    });
    expect(mocks.replace).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent("/portal/courses/wheel-basics?location=vaclavska&courseSessionId=session-42")}`,
    );
    expect(
      screen.queryByText("Private customer content"),
    ).not.toBeInTheDocument();
  });
});
