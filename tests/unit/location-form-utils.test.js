import {
  ACTIVITY_SELECTION_MODE,
  buildLocationForm,
  buildLocationPayload,
  createLocationFormDefaults,
  formatDurationMinutes,
  getCountryOption,
  isValidInternationalPhone,
  normalizeCountryCode,
  normalizeInternationalPhone,
  parseInternationalPhone,
  validateLocationOpeningHours,
} from "@/components/views/locations/locationForm.utils";
describe("location form country and phone helpers", () => {
  it("normalizes ISO codes and legacy country names", () => {
    expect(normalizeCountryCode("cz")).toBe("CZ");
    expect(normalizeCountryCode("Czech Republic")).toBe("CZ");
    expect(normalizeCountryCode("Česká republika")).toBe("CZ");
    expect(normalizeCountryCode("Deutschland")).toBe("DE");
    expect(normalizeCountryCode("unknown", "SK")).toBe("SK");
    expect(normalizeCountryCode("unknown")).toBeNull();
    expect(getCountryOption("Česko")).toMatchObject({
      code: "CZ",
      dialCode: "+420",
    });
  });
  it("stores national and pasted international numbers consistently", () => {
    expect(normalizeInternationalPhone("605 989 401", "CZ")).toBe(
      "+420605989401",
    );
    expect(normalizeInternationalPhone("00421 905 123 456", "CZ")).toBe(
      "+421905123456",
    );
    expect(normalizeInternationalPhone("030 123456", "DE")).toBe("+4930123456");
    expect(normalizeInternationalPhone("02 12345678", "IT")).toBe(
      "+390212345678",
    );
  });
  it("parses the country prefix and validates structurally plausible numbers", () => {
    expect(parseInternationalPhone("+421 905 123 456", "CZ")).toEqual({
      countryCode: "SK",
      dialCode: "+421",
      nationalNumber: "905123456",
      e164: "+421905123456",
    });
    expect(isValidInternationalPhone("605 989 401", "CZ")).toBe(true);
    expect(isValidInternationalPhone("123", "CZ")).toBe(false);
    expect(isValidInternationalPhone("", "CZ")).toBe(false);
  });
});
describe("location form defaults and payload", () => {
  it.each([undefined, null, "", "unknown"])(
    "uses time pricing for an inherited or invalid pricing mode (%s)",
    (pricingMode) => {
      const form = buildLocationForm({
        pricingMode,
        effectivePricingMode: "piece",
        inheritedPricingMode: "piece",
      });
      expect(form.pricingMode).toBe("time");
      expect(buildLocationPayload(form).pricingMode).toBe("time");
      expect(
        buildLocationPayload(createLocationFormDefaults()).pricingMode,
      ).toBe("time");
    },
  );
  it("creates isolated defaults with required customer activity selection", () => {
    const first = createLocationFormDefaults();
    const second = createLocationFormDefaults();
    expect(first.booking.activitySelectionMode).toBe(
      ACTIVITY_SELECTION_MODE.REQUIRED,
    );
    expect(first.contact.phoneCountry).toBe("CZ");
    first.openingHours.monday.openTime = "10:00";
    expect(second.openingHours.monday.openTime).toBe("06:00");
  });
  it("hydrates legacy rows as optional and retains GENERAL capacity", () => {
    const form = buildLocationForm({
      name: "Legacy studio",
      address: {
        country: "Czech Republic",
      },
      contact: {
        phone: "+420 605 989 401",
      },
      booking: {
        enabled: true,
        activityCapacities: [
          {
            activity: "WORKSTATION",
            capacity: 6,
          },
          {
            activity: "GENERAL",
            capacity: 2,
          },
        ],
      },
    });
    expect(form.address.country).toBe("CZ");
    expect(form.contact).toMatchObject({
      phoneCountry: "CZ",
      phone: "605989401",
    });
    expect(form.booking.activitySelectionMode).toBe(
      ACTIVITY_SELECTION_MODE.OPTIONAL,
    );
    expect(form.booking.activityCapacities).toMatchObject({
      WORKSTATION: 6,
      SHARED_TABLE: 0,
      GENERAL: 2,
    });
  });
  it("builds a trimmed, unit-safe, server-compatible payload", () => {
    const form = createLocationFormDefaults({
      country: "DE",
    });
    form.name = "  Berlin studio  ";
    form.address.line1 = "  Hauptstraße 1 ";
    form.contact.email = " studio@example.com ";
    form.contact.phone = "030 123456";
    form.booking.enabled = true;
    form.booking.activitySelectionMode = "hidden";
    form.booking.minBookingMinutes = 90;
    form.booking.maxBookingMinutes = 30;
    form.booking.activityCapacities.WORKSTATION = 6;
    form.booking.activityCapacities.GENERAL = 0;
    const payload = buildLocationPayload(form, {
      existingBooking: {
        confirmationMode: "manual",
      },
    });
    expect(payload).toMatchObject({
      name: "Berlin studio",
      address: {
        line1: "Hauptstraße 1",
        country: "DE",
      },
      contact: {
        email: "studio@example.com",
        phone: "+4930123456",
      },
      booking: {
        confirmationMode: "manual",
        enabled: true,
        activitySelectionMode: "HIDDEN",
        minBookingMinutes: 90,
        maxBookingMinutes: 90,
        activityCapacities: [
          {
            activity: "WORKSTATION",
            capacity: 6,
          },
        ],
      },
    });
  });
});
describe("location form display and opening-hour helpers", () => {
  it("formats durations with explicit units", () => {
    expect(formatDurationMinutes(30, "en")).toBe("30 min");
    expect(formatDurationMinutes(60, "en")).toBe("1 hr");
    expect(formatDurationMinutes(90, "cs")).toBe("1 h 30 min");
  });
  it("accepts midnight closing and rejects malformed values", () => {
    expect(
      validateLocationOpeningHours({
        monday: {
          isOpen: true,
          openTime: "06:00",
          closeTime: "24:00",
        },
      }),
    ).toEqual({});
    expect(
      validateLocationOpeningHours({
        monday: {
          isOpen: false,
          openTime: "invalid",
          closeTime: "24:01",
        },
      }),
    ).toEqual({
      monday: "invalid",
    });
  });
});
