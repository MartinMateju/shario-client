import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ router: { refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));

import TenantSiteRefresh from "@/components/public-tenant/TenantSiteRefresh";
import { notifyPublicSitePublished } from "@/lib/publicTenant/publicationEvents";

describe("published studio branding refresh", () => {
  beforeEach(() => {
    mocks.router.refresh.mockReset();
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("refreshes server metadata immediately for this studio, without a reload", () => {
    render(<TenantSiteRefresh tenantSlug="studio-alpha" />);
    act(() => notifyPublicSitePublished("studio-alpha"));
    expect(mocks.router.refresh).toHaveBeenCalledOnce();
    expect(
      localStorage.getItem("shario:public-site-published:studio-alpha"),
    ).toBeTruthy();
  });

  it("refreshes another open tab after publication, ignoring other tenants and storage keys", () => {
    render(<TenantSiteRefresh tenantSlug="studio-alpha" />);
    for (const key of [
      "unrelated",
      "shario:public-site-published:studio-beta",
    ]) {
      act(() =>
        window.dispatchEvent(
          new StorageEvent("storage", { key, newValue: "1" }),
        ),
      );
    }
    act(() => notifyPublicSitePublished("studio-beta"));
    expect(mocks.router.refresh).not.toHaveBeenCalled();
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "shario:public-site-published:studio-alpha",
          oldValue: "1",
          newValue: "2",
        }),
      ),
    );
    expect(mocks.router.refresh).toHaveBeenCalledOnce();
  });

  it("does not refresh for storage deletion or unchanged values", () => {
    render(<TenantSiteRefresh tenantSlug="studio-alpha" />);
    for (const newValue of [null, "1"]) {
      act(() =>
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "shario:public-site-published:studio-alpha",
            oldValue: "1",
            newValue,
          }),
        ),
      );
    }
    expect(mocks.router.refresh).not.toHaveBeenCalled();
  });

  it("still refreshes the publishing tab when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(<TenantSiteRefresh tenantSlug="studio-alpha" />);
    act(() => notifyPublicSitePublished("studio-alpha"));
    expect(mocks.router.refresh).toHaveBeenCalledOnce();
  });

  it("removes old subscriptions when switching studios or leaving tenant pages", () => {
    const view = render(<TenantSiteRefresh tenantSlug="studio-alpha" />);
    view.rerender(<TenantSiteRefresh tenantSlug="studio-beta" />);
    act(() => notifyPublicSitePublished("studio-alpha"));
    expect(mocks.router.refresh).not.toHaveBeenCalled();
    act(() => notifyPublicSitePublished("studio-beta"));
    expect(mocks.router.refresh).toHaveBeenCalledOnce();
    view.unmount();
    act(() => notifyPublicSitePublished("studio-beta"));
    expect(mocks.router.refresh).toHaveBeenCalledOnce();
  });
});
