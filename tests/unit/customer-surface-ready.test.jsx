import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  params: { tenantSlug: "atelier-tenant" },
  state: null,
}));

vi.mock("next/navigation", () => ({
  useParams: () => mocks.params,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: (state) => state.tenant,
  selectCurrentUser: (state) => state.user,
  selectIsCustomerAuthenticated: (state) => state.customerAuthenticated,
  selectIsSessionReadyForContext: (authContext) => (state) =>
    state.readyContext === authContext,
}));

import useIsCustomerSurfaceReady from "@/components/auth/useIsCustomerSurfaceReady";
import { AUTH_CONTEXTS } from "@/lib/features/auth/authContext";

const readyState = () => ({
  customerAuthenticated: true,
  readyContext: AUTH_CONTEXTS.CUSTOMER,
  tenant: { slug: "Atelier-Tenant" },
  user: { id: "64b000000000000000000011", platformRole: "none" },
});

const isReady = () => renderHook(() => useIsCustomerSurfaceReady()).result;

describe("customer surface readiness", () => {
  beforeEach(() => {
    mocks.params = { tenantSlug: "atelier-tenant" };
    mocks.state = readyState();
  });

  it("is ready once the customer session for the routed studio is restored", () => {
    expect(isReady().current).toBe(true);
  });

  it("waits while the customer session is still being restored", () => {
    mocks.state.readyContext = null;

    expect(isReady().current).toBe(false);
  });

  it("stays closed for visitors without a customer session", () => {
    mocks.state.customerAuthenticated = false;

    expect(isReady().current).toBe(false);
  });

  it("stays closed for platform staff, whom the boundary redirects", () => {
    mocks.state.user.platformRole = "support";

    expect(isReady().current).toBe(false);
  });

  it("stays closed when the session belongs to another studio", () => {
    mocks.state.tenant = { slug: "other-studio" };

    expect(isReady().current).toBe(false);
  });
});
