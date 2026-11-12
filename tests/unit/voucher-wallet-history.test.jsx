import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import ApplyVouchers from "@/components/views/voucher/ApplyVouchers";
import VoucherForm from "@/components/forms/vouchers/VoucherForm";
import messages from "@/messages/en.json";

vi.mock("react-redux", () => ({
  useSelector: (selector) =>
    selector({
      auth: {
        userInfo: { id: "customer-1" },
        tenant: {
          name: "Studio",
          settings: { currency: "CZK", timezone: "Europe/Prague" },
        },
      },
      language: { language: "EN" },
    }),
}));
vi.mock("@/components/modals/ConformationModal", () => ({
  default: () => null,
}));
vi.mock("@/components/public-tenant/PublicTenantProvider", () => ({
  useOptionalPublicTenant: () => null,
}));
vi.mock("@/lib/features/coupons/couponsApiSlice", () => ({
  useRedeemPromoCodeMutation: () => [vi.fn(), {}],
  useGetUserRedeemedCouponsQuery: () => ({
    data: [
      {
        _id: "partial-code",
        promoCode: "ABC-123-DEF",
        productNameSnapshot: "Wheel course voucher",
        product: { name: "Changed offering", price: 9999, currency: "EUR" },
        originalValueMinor: 150000,
        walletRedeemedValueMinor: 40000,
        currency: "CZK",
        redeemedAt: "2026-10-01T12:00:00Z",
        status: "redeemed",
      },
    ],
    refetch: vi.fn(),
  }),
}));

describe("voucher wallet history", () => {
  it.each([
    ["customer portal", ApplyVouchers],
    ["legacy voucher form", VoucherForm],
  ])(
    "shows only the actual credited remaining value in the %s",
    (_, Component) => {
      render(
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
          <Component />
        </NextIntlClientProvider>,
      );
      const table = within(screen.getByRole("table"));
      expect(
        table.getByRole("columnheader", { name: "Credits received" }),
      ).toBeVisible();
      expect(table.getByText("CZK 400")).toBeVisible();
      expect(table.getByText("Wheel course voucher")).toBeVisible();
      expect(
        table.queryByText(/1,500|9,999|Changed offering/),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/permanently consumes the code/)).toBeVisible();
      expect(
        screen.getByText(/Archiving a code does not prevent redemption/),
      ).toBeVisible();
    },
  );
});
