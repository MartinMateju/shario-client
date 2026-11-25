import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  router: { refresh: vi.fn() },
  pathname: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));

vi.mock("@/i18n/navigation", () => ({ usePathname: mocks.pathname }));

import TenantSiteRefresh from "@/components/public-tenant/TenantSiteRefresh";
import { notifyPublicSitePublished } from "@/lib/publicTenant/publicationEvents";

describe("published studio branding refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.pathname.mockReturnValue("/courses");
    mocks.router.refresh.mockReset();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("refreshes server metadata for this studio, without a reload", () => {
    render(<TenantSiteRefresh tenantSlug="studio-alpha" />);
    act(() => notifyPublicSitePublished("studio-alpha"));
    act(() => vi.runAllTimers());
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
    act(() => vi.runAllTimers());
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
    act(() => vi.runAllTimers());
    expect(mocks.router.refresh).toHaveBeenCalledOnce();
  });

  it.each([
    "/app/settings/public-site",
    "/app/bookings",
    "/public-site-preview",
  ])("does not refresh %s on a local or cross-tab publication", (path) => {
    mocks.pathname.mockReturnValue(path);
    render(<TenantSiteRefresh tenantSlug="studio-alpha" />);
    act(() => {
      notifyPublicSitePublished("studio-alpha");
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "shario:public-site-published:studio-alpha",
          newValue: "1",
        }),
      );
      vi.runAllTimers();
    });
    expect(mocks.router.refresh).not.toHaveBeenCalled();
  });

  it("refreshes once when a background public tab is shown after repeated publications", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    render(<TenantSiteRefresh tenantSlug="studio-alpha" />);
    act(() => {
      notifyPublicSitePublished("studio-alpha");
      notifyPublicSitePublished("studio-alpha");
      vi.runAllTimers();
    });
    expect(mocks.router.refresh).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mocks.router.refresh).toHaveBeenCalledOnce();
    act(() => {
      notifyPublicSitePublished("studio-alpha");
      notifyPublicSitePublished("studio-alpha");
      vi.runAllTimers();
    });
    expect(mocks.router.refresh).toHaveBeenCalledTimes(2);
  });

  it("removes old subscriptions when switching studios or leaving tenant pages", () => {
    const view = render(<TenantSiteRefresh tenantSlug="studio-alpha" />);
    view.rerender(<TenantSiteRefresh tenantSlug="studio-beta" />);
    act(() => notifyPublicSitePublished("studio-alpha"));
    expect(mocks.router.refresh).not.toHaveBeenCalled();
    act(() => notifyPublicSitePublished("studio-beta"));
    act(() => vi.runAllTimers());
    expect(mocks.router.refresh).toHaveBeenCalledOnce();
    view.unmount();
    act(() => notifyPublicSitePublished("studio-beta"));
    act(() => vi.runAllTimers());
    expect(mocks.router.refresh).toHaveBeenCalledOnce();
  });
});
