import { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  search: "",
  tenantSlug: "klei",
  query: { currentData: undefined },
  status: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock("next-intl", () => ({ useTranslations: () => (key) => key }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: { slug: mocks.tenantSlug } }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useGetGuestCheckoutOrderStatusQuery: (...args) => {
    mocks.status(...args);
    return { ...mocks.query, refetch: mocks.refetch };
  },
}));
import GuestCourseCheckoutResult from "@/components/courses/GuestCourseCheckoutResult";
import { getGuestCheckoutAccessKey } from "@/components/courses/guestCheckoutAccess";

const orderId = "507f1f77bcf86cd799439011";
const otherOrderId = "507f1f77bcf86cd799439012";
const token = "a".repeat(43);
const processed = {
  orderId,
  status: "processed_order",
  isPaid: true,
  terminal: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.tenantSlug = "klei";
  mocks.search = `orderId=${orderId}&productId=wheel&courseSessionId=date-a&location=vaclavska&quantity=2`;
  history.replaceState(
    null,
    "",
    `/checkout/success?${mocks.search}#access_token=${token}`,
  );
  mocks.query = { currentData: undefined };
  mocks.refetch.mockResolvedValue({ data: { orderId, terminal: false } });
});

describe("guest course payment return verification", () => {
  it("captures proof before querying, reports pending honestly and stops polling only after confirmed fulfillment", async () => {
    const view = render(<GuestCourseCheckoutResult />);
    expect(mocks.status.mock.calls[0][1].skip).toBe(true);
    await waitFor(() =>
      expect(mocks.status).toHaveBeenLastCalledWith(
        { tenantSlug: "klei", orderId, accessToken: token },
        expect.objectContaining({ skip: false, pollingInterval: 2000 }),
      ),
    );
    expect(location.hash).toBe("");
    expect(screen.getByRole("heading")).toHaveTextContent("verifyingTitle");
    mocks.query = {
      currentData: { orderId, status: "paid", isPaid: true, terminal: false },
    };
    view.rerender(<GuestCourseCheckoutResult />);
    expect(screen.getByRole("heading")).toHaveTextContent("verifyingTitle");
    mocks.query = { currentData: processed };
    view.rerender(<GuestCourseCheckoutResult />);
    expect(screen.getByRole("heading")).toHaveTextContent("confirmedTitle");
    expect(mocks.status.mock.lastCall[1]).toMatchObject({
      pollingInterval: 0,
      refetchOnFocus: false,
    });
    expect(screen.queryByRole("button", { name: "retry" })).toBeNull();
  });

  it("ignores retained data for another order and scopes proof when the return order changes", async () => {
    const view = render(<GuestCourseCheckoutResult />);
    await waitFor(() => expect(mocks.status.mock.lastCall[1].skip).toBe(false));
    mocks.search = `orderId=${otherOrderId}`;
    mocks.query = { data: processed, currentData: undefined };
    view.rerender(<GuestCourseCheckoutResult />);
    expect(screen.getByRole("heading")).toHaveTextContent("verifyingTitle");
    await waitFor(() =>
      expect(mocks.status).toHaveBeenLastCalledWith(
        { tenantSlug: "klei", orderId: otherOrderId, accessToken: undefined },
        expect.objectContaining({ skip: false }),
      ),
    );
    expect(screen.queryByText(orderId, { exact: false })).toBeNull();
  });

  it("never confirms a mismatched response and stops polling after a rejection", async () => {
    mocks.query = { currentData: { ...processed, orderId: otherOrderId } };
    render(<GuestCourseCheckoutResult />);
    await waitFor(() =>
      expect(screen.getByRole("heading")).toHaveTextContent("unconfirmedTitle"),
    );
    expect(mocks.status.mock.lastCall[1].pollingInterval).toBe(0);
  });

  it("does not query with a malformed explicit proof or silently reuse stored access", async () => {
    sessionStorage.setItem(getGuestCheckoutAccessKey("klei", orderId), token);
    history.replaceState(null, "", "/checkout/success#access_token=bad");
    render(<GuestCourseCheckoutResult />);
    await waitFor(() =>
      expect(screen.getByRole("heading")).toHaveTextContent("unconfirmedTitle"),
    );
    expect(mocks.status.mock.calls.every(([, options]) => options.skip)).toBe(
      true,
    );
    expect(screen.queryByRole("button", { name: "retry" })).toBeNull();
  });

  it("keeps fragment proof across StrictMode replay with unavailable storage", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <StrictMode>
        <GuestCourseCheckoutResult />
      </StrictMode>,
    );
    await waitFor(() =>
      expect(mocks.status.mock.lastCall[0].accessToken).toBe(token),
    );
    expect(mocks.status.mock.lastCall[1].skip).toBe(false);
  });

  it("waits for tenant hydration before consuming the fragment when storage is unavailable", async () => {
    mocks.tenantSlug = "";
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const view = render(<GuestCourseCheckoutResult />);
    expect(location.hash).toBe(`#access_token=${token}`);
    expect(mocks.status.mock.calls.every(([, options]) => options.skip)).toBe(
      true,
    );
    mocks.tenantSlug = "klei";
    view.rerender(<GuestCourseCheckoutResult />);
    await waitFor(() =>
      expect(mocks.status).toHaveBeenLastCalledWith(
        { tenantSlug: "klei", orderId, accessToken: token },
        expect.objectContaining({ skip: false }),
      ),
    );
    expect(location.hash).toBe("");
  });

  it("stops on network errors and lets an explicit retry resume pending verification", async () => {
    mocks.query = { isError: true, currentData: undefined };
    const view = render(<GuestCourseCheckoutResult />);
    await waitFor(() => expect(mocks.status.mock.lastCall[1].skip).toBe(false));
    expect(screen.getByRole("heading")).toHaveTextContent("unconfirmedTitle");
    expect(mocks.status.mock.lastCall[1].pollingInterval).toBe(0);
    mocks.query = { currentData: { orderId, terminal: false } };
    view.rerender(<GuestCourseCheckoutResult />);
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await waitFor(() =>
      expect(mocks.status.mock.lastCall[1].pollingInterval).toBe(2000),
    );
  });

  it("checks cancellation once and restores only the validated course selection", async () => {
    render(<GuestCourseCheckoutResult cancelled />);
    await waitFor(() => expect(mocks.status.mock.lastCall[1].skip).toBe(false));
    expect(mocks.status.mock.lastCall[1]).toMatchObject({
      pollingInterval: 0,
      refetchOnFocus: false,
    });
    expect(screen.getByRole("heading")).toHaveTextContent("cancelledTitle");
    expect(screen.getByRole("link", { name: "backToCourse" })).toHaveAttribute(
      "href",
      "/courses/wheel?courseSessionId=date-a&quantity=2&location=vaclavska",
    );
  });

  it("recognizes a confirmed payment even on a cancellation URL", async () => {
    mocks.query = { currentData: processed };
    render(<GuestCourseCheckoutResult cancelled />);
    await waitFor(() =>
      expect(screen.getByRole("heading")).toHaveTextContent("confirmedTitle"),
    );
  });

  it("never starts status lookup for an invalid order", async () => {
    mocks.search = "orderId=bad";
    render(<GuestCourseCheckoutResult />);
    await waitFor(() =>
      expect(screen.getByRole("heading")).toHaveTextContent("unconfirmedTitle"),
    );
    expect(mocks.status.mock.calls.every(([, options]) => options.skip)).toBe(
      true,
    );
  });
});
