import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CalendarEventCard from "@/components/calendar/CalendarEventCard";
import CalendarLegend from "@/components/calendar/CalendarLegend";

const booking = {
  id: "booking-1",
  kind: "class",
  title: "Full",
  productId: "wheel-course",
  productName: "Wheel throwing",
  bookingMode: "public",
  customerIds: ["1042"],
  guests: 6,
  used: 8,
  capacity: 8,
  start: "2026-08-08T08:00:00.000Z",
  end: "2026-08-08T09:00:00.000Z",
};

const renderCard = (event = booking, props = {}) =>
  render(
    <CalendarEventCard
      event={event}
      studio={{ timeZone: "UTC" }}
      locale="en"
      audience="customer"
      {...props}
    />,
  );

const translate = (key, values) =>
  ({
    "events.bookingPrivate": "Private",
    "events.bookingPublic": "Public",
    "events.full": "Full",
    "events.myBooking": "My booking",
    "events.unavailable": "Studio unavailable",
    "events.booking": "Booking",
    "events.availability": `${values?.remaining} places available`,
  })[key] || key;

describe("calendar booking details", () => {
  it("shows the product, independent mode and capacity status, customer ID, and actual people", () => {
    renderCard();

    expect(screen.getByText("Wheel throwing")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
    expect(screen.getByText("#1042")).toBeInTheDocument();
    expect(screen.getByText("6 people")).toBeInTheDocument();
    expect(screen.queryByText("6/8")).not.toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveAccessibleName(
      /Wheel throwing, Public, Full, 6 people, Customer #1042/,
    );
  });

  it("uses distinct privacy colors consistently across products and capacity states", () => {
    const { container, rerender } = renderCard();
    const originalColor = screen.getByRole("article").style.backgroundColor;
    const modeAccent = () =>
      container.querySelector("[data-calendar-event-accent]").style
        .backgroundColor;
    const originalAccent = modeAccent();

    for (const overrides of [
      { used: 2 },
      { productId: "different-product", productName: "Another studio" },
    ]) {
      rerender(<CalendarEventCard event={{ ...booking, ...overrides }} />);
      expect(screen.getByRole("article").style.backgroundColor).toBe(
        originalColor,
      );
      expect(modeAccent()).toBe(originalAccent);
    }

    rerender(
      <CalendarEventCard event={{ ...booking, bookingMode: "private" }} />,
    );
    expect(screen.getByRole("article").style.backgroundColor).not.toBe(
      originalColor,
    );
    expect(modeAccent()).not.toBe(originalAccent);
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it.each(["public", "private"])(
    "retains the %s fill on owned bookings and distinguishes ownership with a badge and outline",
    (bookingMode) => {
      const event = { ...booking, bookingMode };
      const { rerender } = renderCard(event);
      const originalColor = screen.getByRole("article").style.backgroundColor;
      const originalBorder = screen.getByRole("article").style.borderColor;

      rerender(<CalendarEventCard event={{ ...event, isMine: true }} />);

      expect(screen.getByRole("article").style.backgroundColor).toBe(
        originalColor,
      );
      expect(screen.getByRole("article").style.borderColor).not.toBe(
        originalBorder,
      );
      expect(screen.getByRole("article")).toHaveStyle({
        borderColor: "#2563EB",
      });
      expect(
        screen
          .getByText("My booking")
          .closest("[data-calendar-own-booking-badge]"),
      ).toHaveStyle({ backgroundColor: "#2563EB", color: "#FFFFFF" });
      expect(screen.getByText("My booking")).toBeInTheDocument();
      expect(screen.getByRole("article")).toHaveClass("border-2");
    },
  );

  it.each([
    ["private", undefined, "Private"],
    ["privateStudio", undefined, "Private"],
    ["exclusiveOpenStudio", undefined, "Private"],
    ["sharedOpenStudio", undefined, "Public"],
    ["sharedOpenStudio", "exclusive", "Private"],
  ])(
    "matches mode labels and colors for legacy %s / %s events",
    (kind, bookingMode, label) => {
      renderCard({ ...booking, kind, bookingMode });
      const card = screen.getByRole("article");
      expect(card).toHaveAttribute(
        "data-calendar-booking-mode",
        label.toLowerCase(),
      );
      expect(card.style.backgroundColor).toBe(
        label === "Private" ? "rgb(103, 74, 100)" : "rgb(221, 238, 233)",
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      const icon = card.querySelector(
        `[data-calendar-privacy-icon="${label.toLowerCase()}"]`,
      );
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon.closest("[data-calendar-mode-badge]")).toHaveTextContent(
        label,
      );
    },
  );

  it.each(["public", "private"])(
    "keeps %s booking text at accessible contrast",
    (bookingMode) => {
      renderCard({ ...booking, bookingMode });
      const { backgroundColor, color } = screen.getByRole("article").style;
      const luminance = (rgb) => {
        const channels = rgb
          .match(/\d+/g)
          .map(Number)
          .map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      };
      const contrast = [luminance(backgroundColor), luminance(color)].sort(
        (a, b) => b - a,
      );
      expect(
        (contrast[0] + 0.05) / (contrast[1] + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("keeps closures neutral even if they carry private product metadata", () => {
    renderCard({ ...booking, bookingMode: "private", isClosure: true });
    const card = screen.getByRole("article");
    expect(card.style.backgroundColor).toBe("rgb(240, 240, 238)");
    expect(card).not.toHaveAttribute("data-calendar-booking-mode");
  });

  it.each([30, 32, 56, 76, 104])(
    "keeps ownership accessible while prioritizing time and title in a %ipx card",
    (height) => {
      const { container } = renderCard(
        { ...booking, isMine: true },
        {
          compact: true,
          style: { height, width: 74 },
          t: (key, values) =>
            key === "events.myBooking"
              ? "Moje rezervace"
              : translate(key, values),
        },
      );

      const marker = screen.getByText("Moje rezervace");
      expect(marker).toBeInTheDocument();
      expect(
        container.querySelector("[data-calendar-own-booking-icon]"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Wheel throwing").compareDocumentPosition(marker) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(screen.getByRole("article")).toHaveAccessibleName(
        /Moje rezervace/,
      );
      expect(screen.getByText("08:00")).toBeInTheDocument();
      expect(
        screen
          .getByText("08:00")
          .compareDocumentPosition(screen.getByText("Wheel throwing")) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    },
  );

  it("uses the same ownership marker on the card and in the legend", () => {
    const { container } = render(
      <>
        <CalendarEventCard event={{ ...booking, isMine: true }} t={translate} />
        <CalendarLegend
          audience="customer"
          t={translate}
          bookings={[booking]}
        />
      </>,
    );
    const markers = container.querySelectorAll(
      "[data-calendar-own-booking-badge]",
    );

    expect(markers).toHaveLength(2);
    expect(markers[0].textContent).toBe("My booking");
    expect(markers[1].textContent).toBe("My booking");
    expect(markers[0].style.backgroundColor).toBe(
      markers[1].style.backgroundColor,
    );
  });

  it("shows people rather than a resource-unit capacity fraction", () => {
    renderCard({ ...booking, bookingMode: "private", capacity: 1, used: 1 });

    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("6 people")).toBeInTheDocument();
    expect(screen.queryByText("6/1")).not.toBeInTheDocument();
    expect(screen.queryByText("Full")).not.toBeInTheDocument();
  });

  it("preserves zero attendance and multiple customer IDs", () => {
    renderCard({
      ...booking,
      customerIds: ["1042", "1077"],
      guests: 0,
      used: 0,
    });

    expect(screen.getByText("0 people")).toBeInTheDocument();
    expect(screen.getByText("#1042, #1077")).toBeInTheDocument();
    expect(screen.queryByText("Full")).not.toBeInTheDocument();
  });

  it.each(["privateStudio", "exclusiveOpenStudio", "sharedOpenStudio"])(
    "does not present an unset zero attendee count for %s as zero people",
    (kind) => {
      renderCard({ ...booking, kind, guests: 0, used: 0 });

      expect(screen.queryByText("0 people")).not.toBeInTheDocument();
      expect(screen.getByRole("article")).not.toHaveAccessibleName(/0 people/);
      expect(screen.getByText("Wheel throwing")).toBeInTheDocument();
    },
  );

  it("retains the requested details in compact month cards without fixed height", () => {
    renderCard(booking, { compact: true });

    expect(screen.getByText("#1042")).toBeInTheDocument();
    expect(screen.getByText("6 people")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it.each([72, 80])(
    "shows customer IDs and time in a standard %ipx event",
    (height) => {
      renderCard(booking, { style: { height, width: 180 } });

      expect(screen.getByText("#1042")).toBeInTheDocument();
      expect(screen.getByText("6 people")).toBeInTheDocument();
      expect(screen.getByText("08:00 – 09:00")).toBeInTheDocument();
    },
  );

  it("prioritizes time and product in short events and retains complete accessible details", () => {
    renderCard(booking, { compact: true, style: { height: 32, width: 180 } });

    expect(screen.getByText("Wheel throwing")).toBeInTheDocument();
    expect(screen.getByText("08:00")).toBeInTheDocument();
    expect(screen.queryByText("Public")).not.toBeInTheDocument();
    expect(
      screen.getByRole("article").querySelector("[data-calendar-privacy-icon]"),
    ).toBeNull();
    expect(screen.queryByText("6 people")).not.toBeInTheDocument();
    expect(screen.queryByText("#1042")).not.toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveAccessibleName(
      /Wheel throwing, Public, Full, 6 people, Customer #1042, 08:00 – 09:00/,
    );
    expect(screen.getByRole("article")).not.toHaveAttribute("title");
  });

  it.each(["0873", "#0873"])(
    "preserves leading zeros and one hash in customer reference %s",
    (reference) => {
      renderCard({ ...booking, customerIds: [reference] });

      expect(screen.getByText("#0873")).toBeInTheDocument();
      expect(screen.queryByText("Customer #0873")).not.toBeInTheDocument();
      expect(screen.getByRole("article")).toHaveAccessibleName(
        /Customer #0873/,
      );
    },
  );

  it("omits missing customer references rather than showing an unknown-customer placeholder", () => {
    const { container } = renderCard({ ...booking, customerIds: [] });

    expect(
      screen.queryByText(/Customer ID unavailable/),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector("[data-calendar-customer-reference]"),
    ).toBeNull();
    expect(screen.getByRole("article")).not.toHaveAccessibleName(
      /Customer ID unavailable/,
    );
  });

  it.each([
    { customerIds: ["U-INTERNAL-ID", "507f1f77bcf86cd799439011", "0873"] },
    { customerIds: undefined, customerId: "U-INTERNAL-ID" },
    {
      customerIds: undefined,
      customerMemberNumber: "507f1f77bcf86cd799439011",
    },
  ])(
    "keeps internal IDs out of visible and accessible card details: %j",
    (fields) => {
      const { container } = renderCard({ ...booking, ...fields });

      expect(container).not.toHaveTextContent(
        /U-INTERNAL-ID|507f1f77bcf86cd799439011/,
      );
      expect(screen.getByRole("article")).not.toHaveAccessibleName(
        /U-INTERNAL-ID|507f1f77bcf86cd799439011/,
      );
      if (fields.customerIds) {
        expect(screen.getByText("#0873")).toBeInTheDocument();
      }
    },
  );

  it.each([
    { isSuggested: true },
    { isClosure: true, title: "Studio unavailable", productName: undefined },
  ])("does not invent booking details for %j", (overrides) => {
    renderCard({ ...booking, ...overrides });

    expect(screen.queryByText("Private")).not.toBeInTheDocument();
    expect(screen.queryByText("Public")).not.toBeInTheDocument();
    expect(screen.queryByText("#1042")).not.toBeInTheDocument();
    expect(screen.queryByText("6 people")).not.toBeInTheDocument();
  });

  it("shows both privacy colors in the legend even when the calendar is empty", () => {
    const { container } = render(
      <CalendarLegend audience="customer" t={translate} bookings={[]} />,
    );

    expect(
      container.querySelector('[data-calendar-mode-legend="public"]'),
    ).toHaveTextContent("Public");
    expect(
      container.querySelector('[data-calendar-mode-legend="private"]'),
    ).toHaveTextContent("Private");
    expect(
      container.querySelectorAll("[data-calendar-mode-legend]"),
    ).toHaveLength(2);
  });

  it.each(["customer", "public", "tenant"])(
    "matches both %s legend swatches to their booking cards",
    (audience) => {
      const { container } = render(
        <>
          <CalendarEventCard event={booking} />
          <CalendarEventCard
            event={{ ...booking, id: "private-1", bookingMode: "private" }}
          />
          <CalendarLegend
            audience={audience}
            t={translate}
            bookings={[booking, { ...booking, bookingMode: "private" }]}
          />
        </>,
      );
      expect(
        container.querySelectorAll("[data-calendar-mode-legend]"),
      ).toHaveLength(2);
      for (const mode of ["public", "private"]) {
        const legend = container.querySelector(
          `[data-calendar-mode-legend="${mode}"]`,
        );
        const card = container.querySelector(
          `[data-calendar-booking-mode="${mode}"]`,
        );
        expect(legend.firstElementChild.style.backgroundColor).toBe(
          card.style.backgroundColor,
        );
      }
    },
  );
});
