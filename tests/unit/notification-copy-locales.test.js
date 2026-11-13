import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { ALL_LOCALE_CODES } from "@/i18n/locales";
import { getNotificationLocaleText } from "@/components/notifications/notificationCopy";
import {
  getCustomerNotificationTitle,
  getCustomerNotificationMessage,
} from "@/components/notifications/customerNotification.utils";
import {
  getNotificationTitle,
  getNotificationMessage,
} from "@/components/notifications/workspaceNotification.utils";

const t = createTranslator({
  locale: "de",
  messages: {
    events: {
      booking_created: {
        title: "Buchung bestätigt",
        message: "Deine Buchung ist bestätigt.",
      },
    },
  },
});

describe("notification copy in product locales", () => {
  it.each(ALL_LOCALE_CODES.filter((locale) => !["en", "cs"].includes(locale)))(
    "never selects English from a bilingual payload for %s",
    (locale) => {
      expect(
        getNotificationLocaleText(
          { en: "Booking confirmed", cs: "Rezervace potvrzena" },
          locale,
          "localized fallback",
        ),
      ).toBe("localized fallback");
    },
  );

  it("recognizes region tags and historical aliases without cross-language fallback", () => {
    expect(
      getNotificationLocaleText(
        { "pt-PT": "Reserva confirmada", en: "Booking confirmed" },
        "pt",
      ),
    ).toBe("Reserva confirmada");
    expect(
      getNotificationLocaleText({ nb: "Bestilling bekreftet" }, "no-NO"),
    ).toBe("Bestilling bekreftet");
    expect(
      getNotificationLocaleText({ CZ: "Rezervace potvrzena" }, "cs-CZ"),
    ).toBe("Rezervace potvrzena");
    expect(
      getNotificationLocaleText(
        { "pt-BR": "Reserva confirmada", en: "Booking confirmed" },
        "pt-PT",
        "Atualização",
      ),
    ).toBe("Atualização");
  });

  it.each([
    [getCustomerNotificationTitle, getCustomerNotificationMessage],
    [getNotificationTitle, getNotificationMessage],
  ])(
    "renders historical system events from the active catalog",
    (title, message) => {
      const notification = {
        eventType: "booking.created",
        title: { en: "Booking confirmed", cs: "Rezervace potvrzena" },
        message: {
          en: "Your booking is confirmed",
          cs: "Vaše rezervace je potvrzena",
        },
      };
      expect(title(notification, "de", "Aktualisierung", t)).toBe(
        "Buchung bestätigt",
      );
      expect(message(notification, "de", "", t)).toBe(
        "Deine Buchung ist bestätigt.",
      );
      expect(title(notification, "cs", "Aktualizace", t)).toBe(
        "Rezervace potvrzena",
      );
      expect(
        message({ ...notification, eventType: "unknown.event" }, "de", "", t),
      ).toBe("");
    },
  );

  it("preserves tenant-authored text and explicitly localized details", () => {
    expect(getNotificationLocaleText("  Evening Workshop  ", "fr")).toBe(
      "Evening Workshop",
    );
    const notification = {
      eventType: "booking.created",
      title: { de: "Buchung für den 3. Mai bestätigt" },
    };
    expect(getNotificationTitle(notification, "de", "Aktualisierung", t)).toBe(
      "Buchung für den 3. Mai bestätigt",
    );
  });
});
