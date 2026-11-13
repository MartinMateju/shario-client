import { formatDuration } from "@/utils/locationBookingUtils";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatDateTime,
  formatRelativeTime,
} from "@/components/communications/communications.utils";
import { formatInvoiceDate } from "@/components/invoices/invoice.utils";
import { formatFullDate } from "@/components/sales/sales.utils";
import { formatSalesPeriod } from "@/components/sales/sales-period.utils";
import { formatRelativeDate } from "@/components/tables/people/people-table.utils";
import { formatBookingDateTime } from "@/components/tables/bookings/booking-table.utils";
import { ALL_LOCALE_CODES } from "@/i18n/locales";
import {
  getProductName as getCatalogProductName,
  getProductDescription,
} from "@/components/products/products.utils";
import { getProductName as getSessionProductName } from "@/components/bookings/bookingSessionComposer.utils";
import { getProductName as getSalesProductName } from "@/components/sales/sales.utils";
import { getLocalizedBookingProductName } from "@/components/sidebars/openStudioBooking.utils";

afterEach(() => vi.useRealTimers());

describe("product date and relative-time localization", () => {
  it.each(ALL_LOCALE_CODES)(
    "selects merchant-authored %s content across catalog, sales and booking",
    (locale) => {
      const name = Object.fromEntries(
        ALL_LOCALE_CODES.map((code) => [code, `Product ${code}`]),
      );
      const product = { name, description: name };
      const expected = `Product ${locale}`;
      expect(getCatalogProductName(product, locale)).toBe(expected);
      expect(getProductDescription(product, locale)).toBe(expected);
      expect(getSessionProductName(product, locale)).toBe(expected);
      expect(getSalesProductName({ product }, locale)).toBe(expected);
      expect(getLocalizedBookingProductName(product, locale)).toBe(expected);
    },
  );

  it.each(["el", "tr", "fi", "pl", "fr"])(
    "uses localized duration units in %s",
    (locale) => {
      const expected = [
        new Intl.NumberFormat(locale, {
          style: "unit",
          unit: "hour",
          unitDisplay: "short",
        }).format(1),
        new Intl.NumberFormat(locale, {
          style: "unit",
          unit: "minute",
          unitDisplay: "short",
        }).format(30),
      ].join(" ");
      expect(formatDuration(90, locale)).toBe(expected);
      expect(formatDuration(90, locale)).not.toBe("1 h 30 min");
    },
  );

  it.each([
    ["de", /Dez|16\.12\.2026/],
    ["fr", /déc/],
    ["pl", /gru/],
    ["el", /Δεκ/],
    ["tr", /Ara/],
  ])("keeps dates in %s across operational screens", (locale, month) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-02-01T12:00:00Z"));
    const date = "2026-12-16T12:00:00Z";
    const t = (key) => key;
    expect(formatDateTime(date, locale)).toMatch(month);
    expect(formatInvoiceDate(date, locale, "Europe/Prague")).toMatch(month);
    expect(formatFullDate(date, locale)).toMatch(month);
    expect(
      formatSalesPeriod({ from: "2026-12-01", to: "2026-12-16" }, locale),
    ).toMatch(month);
    expect(formatRelativeDate(date, locale, t)).toMatch(month);
    expect(
      formatBookingDateTime(
        { start: date, end: "2026-12-16T13:00:00Z" },
        locale,
        t,
      ),
    ).toMatch(month);
  });

  it("localizes relative timestamps instead of selecting English for every non-Czech locale", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-16T12:00:00Z"));
    expect(formatRelativeTime("2026-12-16T11:55:00Z", "de")).toBe(
      "vor 5 Minuten",
    );
    expect(formatRelativeTime("2026-12-16T11:55:00Z", "fr")).toBe(
      "il y a 5 minutes",
    );
  });

  it("preserves invoice calendar dates across timezone boundaries", () => {
    expect(formatInvoiceDate("2026-12-16", "de", "America/Los_Angeles")).toBe(
      "16.12.2026",
    );
    expect(
      formatInvoiceDate("2026-12-16T00:30:00Z", "de", "America/Los_Angeles"),
    ).toBe("15.12.2026");
  });
});
