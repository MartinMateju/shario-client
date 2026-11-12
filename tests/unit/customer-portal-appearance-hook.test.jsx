import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCustomerPortalAppearance } from "@/components/customer-shell/useCustomerPortalAppearance";

const mocks = vi.hoisted(() => ({ state: {}, query: vi.fn(), result: {} }));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(mocks.state),
}));
vi.mock("@/lib/features/workspace-access/workspaceAccessApiSlice", () => ({
  useGetAccountQuery: (...args) => {
    mocks.query(...args);
    return mocks.result;
  },
}));

const studio = {
  id: "studio-1",
  slug: "clay-studio",
  publicSite: {
    customerPortal: {
      appearance: { backgroundColor: "#EEEEEE", headerTextColor: "#112233" },
    },
  },
};
const props = { tenant: studio, surface: "portal", previewMode: false };
beforeEach(() => {
  mocks.state = {
    auth: {
      authContext: "customer",
      token: "token",
      userInfo: { id: "customer-1" },
      tenant: studio,
      workspaceAccessResolved: true,
      workspaceAccess: null,
    },
  };
  mocks.result = {
    currentData: {
      account: {
        id: "customer-1",
        portalAppearance: { backgroundColor: "#111827", headerTextColor: "" },
      },
    },
  };
});

describe("customer portal appearance boundaries", () => {
  it("applies saved personal colours while retaining inherited studio values", () => {
    const { result } = renderHook(() => useCustomerPortalAppearance(props));
    expect(result.current.publicSite.customerPortal.appearance).toEqual({
      backgroundColor: "#111827",
      headerTextColor: "#112233",
    });
    expect(mocks.query).toHaveBeenLastCalledWith(
      { customerId: "customer-1", tenantId: "studio-1" },
      { skip: false },
    );
    expect(studio.publicSite.customerPortal.appearance.backgroundColor).toBe(
      "#EEEEEE",
    );
  });

  it.each([
    ["editor preview", { previewMode: true }],
    ["public website", { surface: "public" }],
    ["login", { surface: "auth" }],
    ["transaction", { surface: "transaction" }],
  ])("does not fetch or apply personal colours on %s", (_name, overrides) => {
    const { result } = renderHook(() =>
      useCustomerPortalAppearance({ ...props, ...overrides }),
    );
    expect(result.current).toBe(studio);
    expect(mocks.query.mock.lastCall[1]).toEqual({ skip: true });
  });

  it.each([
    ["signed out", { token: null }],
    ["staff", { authContext: "workspace" }],
    ["another tenant ID", { tenant: { id: "studio-2", slug: "clay-studio" } }],
    [
      "another tenant slug",
      { tenant: { id: "studio-1", slug: "other-studio" } },
    ],
    ["unknown tenant", { tenant: {} }],
  ])("does not apply personal colours for %s", (_name, overrides) => {
    mocks.state.auth = { ...mocks.state.auth, ...overrides };
    const { result } = renderHook(() => useCustomerPortalAppearance(props));
    expect(result.current).toBe(studio);
    expect(mocks.query.mock.lastCall[1]).toEqual({ skip: true });
  });

  it("uses distinct account cache scopes and ignores prior account data during switching", () => {
    const { result, rerender } = renderHook(() =>
      useCustomerPortalAppearance(props),
    );
    mocks.state.auth.userInfo = { id: "customer-2" };
    rerender();
    expect(mocks.query.mock.lastCall[0]).toEqual({
      customerId: "customer-2",
      tenantId: "studio-1",
    });
    expect(result.current).toBe(studio);
    mocks.result = { data: mocks.result.currentData, currentData: undefined };
    rerender();
    expect(result.current).toBe(studio);
  });

  it("immediately inherits studio colours when the account cache receives a saved reset", () => {
    const { result, rerender } = renderHook(() =>
      useCustomerPortalAppearance(props),
    );
    expect(
      result.current.publicSite.customerPortal.appearance.backgroundColor,
    ).toBe("#111827");
    mocks.result = {
      currentData: {
        account: {
          id: "customer-1",
          portalAppearance: { backgroundColor: "", headerTextColor: "" },
        },
      },
    };
    rerender();
    expect(result.current).toBe(studio);
    expect(
      result.current.publicSite.customerPortal.appearance.headerTextColor,
    ).toBe("#112233");
  });
});
