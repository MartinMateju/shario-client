import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  availability: vi.fn(),
  create: vi.fn(),
  push: vi.fn(),
  slots: null,
  search: "date=2026-11-10",
  productId: "product",
  productLocationId: "location",
}));
const product = {
  id: "product",
  name: "Studio booking",
  kind: "open-studio",
  locationId: "location",
  bookingMode: "customer-choice",
  price: 125,
  currency: "CZK",
  maxNumberOfParticipants: 8,
  openStudioPolicy: {
    publicCapacityMode: "fixed",
    publicCapacityLimit: 2,
    privateBookingSurcharge: 300,
  },
};
const location = {
  id: "location",
  name: "Studio",
  booking: {
    globalCapacity: 8,
    activitySelectionMode: "OPTIONAL",
    activityCapacities: [{ activity: "WORKSTATION", capacity: 4 }],
  },
};
const slot = {
  start: "2026-11-10T10:00:00Z",
  end: "2026-11-10T11:00:00Z",
  available: true,
  remainingCapacity: 8,
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key, values) =>
    key + (values ? ` ${JSON.stringify(values)}` : ""),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ tenantSlug: "studio-one", productId: mocks.productId }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href }) => <a href={href}>{children}</a>,
  usePathname: () => `/book/${mocks.productId}`,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector() }));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => null,
  selectCurrentUser: () => null,
  selectCurrentWorkspaceAccess: () => null,
  selectIsAuthenticated: () => false,
}));
vi.mock("@/utils/user-profile.utils", () => ({ getUserAccess: () => ({}) }));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetPublicProductQuery: () => ({
    data: {
      ...product,
      id: mocks.productId,
      locationId: mocks.productLocationId,
    },
  }),
}));
vi.mock("@/lib/features/publicBooking/publicBookingApiSlice", () => ({
  useGetPublicCourseLocationsQuery: () => ({ currentData: [] }),
  useGetPublicBookingLocationsQuery: () => ({
    data: [location, { ...location, id: "other-location" }],
  }),
  useGetPublicBookingAvailabilityQuery: (query) => {
    mocks.availability(query);
    return { data: { slots: mocks.slots || [slot], timeZone: "UTC" } };
  },
  useGetPublicCourseSessionsQuery: () => ({ data: [] }),
}));
vi.mock("@/lib/features/bookingIntents/bookingIntentsApiSlice", () => ({
  useCreatePublicBookingIntentMutation: () => [
    (payload) => {
      mocks.create(payload);
      return { unwrap: async () => ({ token: "intent-token-123" }) };
    },
    {},
  ],
}));
vi.mock("@/lib/features/checkout/checkoutSlice", () => ({
  useGuestCheckoutMutation: () => [vi.fn(), {}],
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  usePublicTenant: () => ({ tenant: { publicCapabilities: {} } }),
}));
vi.mock("@/components/public-tenant/publicTenant.config", () => ({
  getPublicTenantTheme: () => ({}),
  getLocalizedPublicTenantText: () => "",
}));
vi.mock("@/components/public-tenant/PublicCapabilityGate", () => ({
  default: ({ children }) => children,
}));
vi.mock("@/components/waitlists/CourseWaitlistAction", () => ({
  default: () => null,
}));

import PublicBookingProductDetailPage from "@/components/public-tenant/PublicBookingProductDetailPage";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.slots = null;
  mocks.search = "date=2026-11-10";
  mocks.productId = "product";
  mocks.productLocationId = "location";
});

describe("public customer-choice booking", () => {
  it("discards a selected slot when navigating to a product at another location", () => {
    const view = render(<PublicBookingProductDetailPage kind="book" />);
    fireEvent.click(screen.getByRole("radio"));
    expect(screen.getByRole("radio")).toBeChecked();
    mocks.productId = "another-product";
    mocks.productLocationId = "other-location";
    view.rerender(<PublicBookingProductDetailPage kind="book" />);
    expect(screen.getByRole("radio")).not.toBeChecked();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("locks studio booking to the product's own location", () => {
    render(<PublicBookingProductDetailPage kind="book" />);
    expect(screen.getByRole("combobox", { name: "location" })).toBeDisabled();
    expect(mocks.availability).toHaveBeenLastCalledWith(
      expect.objectContaining({ locationId: "location" }),
    );
  });

  it("rejects a detail link carrying another studio location", () => {
    mocks.search = "date=2026-11-10&locationId=other-location";
    render(<PublicBookingProductDetailPage kind="book" />);
    expect(
      screen.queryByRole("button", { name: "bookWithAccount" }),
    ).not.toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("keeps ID-less slots distinct and submits the selected nonfinal time", async () => {
    const laterSlot = {
      ...slot,
      start: "2026-11-10T11:00:00Z",
      end: "2026-11-10T12:00:00Z",
    };
    mocks.slots = [slot, laterSlot];
    render(<PublicBookingProductDetailPage kind="book" />);
    const [first, second] = screen.getAllByRole("radio");
    expect(first.value).toBe(`${slot.start}:${slot.end}`);
    expect(second.value).toBe(`${laterSlot.start}:${laterSlot.end}`);
    fireEvent.click(first);
    expect(first).toBeChecked();
    expect(second).not.toBeChecked();
    fireEvent.click(second);
    expect(first).not.toBeChecked();
    expect(second).toBeChecked();
    fireEvent.click(first);
    expect(
      screen.getAllByRole("radio").filter((radio) => radio.checked),
    ).toEqual([first]);
    fireEvent.click(screen.getByRole("button", { name: "bookWithAccount" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ start: slot.start, end: slot.end }),
      ),
    );
  });

  it("sends two public participants including the initial customer", async () => {
    render(<PublicBookingProductDetailPage kind="book" />);
    fireEvent.change(
      screen.getByRole("combobox", { name: "customerChoice.people" }),
      { target: { value: "2" } },
    );
    fireEvent.click(screen.getByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "bookWithAccount" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingMode: "public",
          bookingType: "public",
          quantity: 2,
          numberOfGuests: 2,
        }),
      ),
    );
  });

  it("queries and submits the chosen privacy and total party size", async () => {
    render(<PublicBookingProductDetailPage kind="book" />);
    const mode = screen.getByRole("combobox", { name: "customerChoice.mode" });
    const people = screen.getByRole("combobox", {
      name: "customerChoice.people",
    });
    expect(people.options).toHaveLength(2);
    fireEvent.change(people, { target: { value: "2" } });
    expect(mode).toHaveValue("public");
    fireEvent.click(screen.getByRole("radio"));
    fireEvent.change(mode, { target: { value: "private" } });
    expect(screen.getByRole("radio")).not.toBeChecked();
    expect(people.options).toHaveLength(8);
    fireEvent.change(people, { target: { value: "8" } });
    expect(mocks.availability).toHaveBeenLastCalledWith(
      expect.objectContaining({ bookingMode: "private", numberOfGuests: 8 }),
    );
    fireEvent.click(screen.getByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "bookWithAccount" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: "product",
          bookingMode: "private",
          bookingType: "private",
          quantity: 8,
          numberOfGuests: 8,
        }),
      ),
    );
    expect(mocks.push).toHaveBeenCalledWith(
      "/login?next=%2Fportal%2Fbooking%2Fconfirm%3Fintent%3Dintent-token-123%26location%3Dlocation",
    );
  });
});
