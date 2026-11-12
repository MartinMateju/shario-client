import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import EditBookingForm from "@/components/forms/bookings/EditBookingForm";
import {
  buildBookingSummary,
  formatMoney,
  getBookingAmount,
} from "@/components/tables/bookings/booking-table.utils";
import en from "@/messages/en.json";
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }) => <a href={href}>{children}</a>,
}));
const baseBooking = {
  _id: "booking-1",
  paymentStatus: "CONFIRMED",
  status: "processed",
  numberOfGuests: 2,
};
it("legacy editor consumers link to the dedicated attendance workflow", () => {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <EditBookingForm booking={{ id: "booking-1" }} />
    </NextIntlClientProvider>,
  );
  expect(screen.getByRole("link", { name: "Edit booking" })).toHaveAttribute(
    "href",
    "/app/bookings/booking-1/edit",
  );
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
});
describe("shared booking amount display", () => {
  it("uses recorded totals in priority order, including zero and numeric legacy snapshots", () => {
    expect(getBookingAmount({ totalPrice: 0, totalAmount: 125 })).toBe(0);
    expect(getBookingAmount({ totalPrice: "125.50" })).toBe(125.5);
    expect(getBookingAmount({ totalAmount: 250 })).toBe(250);
    expect(getBookingAmount({ paymentAmount: 75 })).toBe(75);
  });
  it("does not invent a total from unit prices, quantity, unrelated order totals or malformed fields", () => {
    expect(
      getBookingAmount(
        { price: 125, quantity: 2, order: { amount: 500 } },
        { price: 125 },
      ),
    ).toBeNull();
    expect(
      getBookingAmount({ totalPrice: "", amount: false, paymentAmount: "bad" }),
    ).toBeNull();
    expect(getBookingAmount({ totalPrice: "   " })).toBeNull();
    expect(formatMoney(getBookingAmount({}), "en", "CZK")).toBe("—");
  });
  it("does not report a complete revenue total when a paid booking amount is unknown", () => {
    const summary = buildBookingSummary({
      bookingsData: {},
      bookings: [baseBooking, { ...baseBooking, totalPrice: 125 }],
      products: [],
      totalCount: 2,
    });
    expect(summary.revenue).toBeNull();
  });
});
