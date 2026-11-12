import fs from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EMAIL_CONTENT_FORMAT,
  LOCATION_SCOPED_EMAIL_SCHEDULE_TYPES,
  EMAIL_SCHEDULE_TYPES,
  buildAutomationPayload,
  buildEmailPreviewDocument,
  buildLocalizedContentPayload,
  buildTemplatePayload,
  normalizeAutomationContent,
  getInvalidEmailContentLocales,
  normalizeAutomationForm,
  normalizeContentVariants,
  normalizeScheduleType,
  plainTextToHtml,
  serializeEmailVariant,
  validateAutomationForm,
} from "../../src/components/communications/email/emailContent";

const completeVariants = {
  cs: {
    subject: "Ahoj {{firstName}}",
    format: EMAIL_CONTENT_FORMAT.PLAIN,
    bodyText: "Vaše rezervace platí.",
    bodyHtml: "",
  },
  en: {
    subject: "Hello {{firstName}}",
    format: EMAIL_CONTENT_FORMAT.HTML,
    bodyText: "",
    bodyHtml: "<p>Your booking is confirmed.</p>",
  },
};

const completeAutomation = (overrides = {}) => ({
  name: "Booking reminder",
  scheduleType: "afterBooking",
  senderEmail: "sender-1",
  appliesToAllLocations: true,
  defaultLocale: "cs",
  variants: completeVariants,
  ...overrides,
});

const flattenKeys = (value, prefix = "", result = []) => {
  Object.entries(value ?? {}).forEach(([key, child]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      flattenKeys(child, fullKey, result);
    } else {
      result.push(fullKey);
    }
  });
  return result.sort();
};

afterEach(() => {
  vi.useRealTimers();
});

describe("localized email content", () => {
  it("normalizes legacy content into the default language", () => {
    const content = normalizeContentVariants({
      subject: "Legacy subject",
      htmlContent: "<p>Legacy body</p>",
    });

    expect(content.defaultLocale).toBe("cs");
    expect(content.variants.cs).toMatchObject({
      subject: "Legacy subject",
      format: "html",
      bodyHtml: "<p>Legacy body</p>",
    });
    expect(content.variants.en.subject).toBe("");
  });

  it("retains legacy content when localized schema defaults are empty", () => {
    const content = normalizeContentVariants({
      subject: "Legacy subject",
      htmlContent: "<p>Legacy body</p>",
      contentVariants: { cs: { subject: "", htmlContent: "", body: "" } },
    });

    expect(content.variants.cs).toMatchObject({
      subject: "Legacy subject",
      bodyHtml: "<p>Legacy body</p>",
    });
  });

  it("inherits template content without changing a template-only automation", () => {
    const automation = normalizeAutomationForm({ templateId: "template-1" });
    const before = JSON.stringify(automation);
    const content = normalizeAutomationContent(automation, {
      defaultLocale: "en",
      subject: "Template subject",
      htmlContent: "<p>Template body</p>",
    });

    expect(content.defaultLocale).toBe("en");
    expect(content.variants.en).toMatchObject({
      subject: "Template subject",
      bodyHtml: "<p>Template body</p>",
    });
    expect(JSON.stringify(automation)).toBe(before);
    expect(buildAutomationPayload(automation).contentVariants).toEqual({});
  });

  it("keeps an inline subject override while inheriting a template body", () => {
    const content = normalizeAutomationContent(
      normalizeAutomationForm({
        templateId: "template-1",
        subject: "Finished",
        format: "html",
      }),
      { subject: "Template subject", htmlContent: "<p>Template body</p>" },
    );

    expect(content.variants.cs).toMatchObject({
      subject: "Finished",
      format: "html",
      bodyHtml: "<p>Template body</p>",
    });
  });

  it("resolves a Czech subject-only override against an English-only template", () => {
    const form = normalizeAutomationForm({
      name: "Confirmation",
      senderEmail: "sender-1",
      templateId: "template-1",
      defaultLocale: "cs",
      subject: "Finished",
      format: "html",
    });
    const template = {
      defaultLocale: "en",
      subject: "Confirmed",
      htmlContent: "<p>English body</p>",
      contentVariants: {
        en: {
          subject: "Confirmed",
          format: "html",
          htmlContent: "<p>English body</p>",
        },
      },
    };
    const effective = normalizeAutomationContent(form, template);

    expect(effective.defaultLocale).toBe("cs");
    expect(effective.variants.cs).toMatchObject({
      subject: "Finished",
      bodyHtml: "<p>English body</p>",
    });
    expect(effective.variants.en).toMatchObject({
      subject: "Confirmed",
      bodyHtml: "<p>English body</p>",
    });
    expect(effective.fallbackLocales).toEqual(["cs"]);
    expect(
      validateAutomationForm({ ...form, ...effective, templateId: null }),
    ).toEqual({});
    expect(buildAutomationPayload(form).htmlContent).toBe("");
  });

  it("uses the template default before another available language", () => {
    const effective = normalizeAutomationContent(
      { templateId: "template-1" },
      {
        defaultLocale: "en",
        contentVariants: {
          en: { subject: "English", body: "English body", format: "plain" },
        },
      },
    );
    expect(effective.variants.cs).toMatchObject({
      subject: "English",
      bodyText: "English body",
    });
    expect(effective.fallbackLocales).toEqual(["cs"]);
  });

  it("preserves authored inline content and supports populated template references", () => {
    const content = normalizeAutomationContent({
      defaultLocale: "en",
      contentVariants: {
        en: { subject: "Custom", format: "plain", body: "Custom body" },
      },
      templateId: {
        _id: "template-1",
        defaultLocale: "en",
        subject: "Template",
        htmlContent: "<p>Template body</p>",
      },
    });

    expect(content.variants.en).toMatchObject({
      subject: "Custom",
      format: "plain",
      bodyText: "Custom body",
    });
  });

  it("serializes plain text and HTML variants without losing legacy projections", () => {
    const payload = buildLocalizedContentPayload({
      defaultLocale: "cs",
      variants: completeVariants,
    });

    expect(payload.contentVariants.cs).toEqual({
      subject: "Ahoj {{firstName}}",
      format: "plain",
      body: "Vaše rezervace platí.",
      htmlContent: '<p style="margin:0 0 16px;">Vaše rezervace platí.</p>',
    });
    expect(payload.contentVariants.en).toEqual({
      subject: "Hello {{firstName}}",
      format: "html",
      body: "Your booking is confirmed.",
      htmlContent: "<p>Your booking is confirmed.</p>",
    });
    expect(payload.subject).toBe(payload.contentVariants.cs.subject);
    expect(payload.format).toBe("plain");
    expect(payload.htmlContent).toBe(payload.contentVariants.cs.htmlContent);
    expect(payload.body).toBe(payload.contentVariants.cs.body);
  });

  it("escapes plain text and renders preview content in a restrictive document", () => {
    expect(plainTextToHtml("Hello <team>\n\nSecond line")).toContain(
      "Hello &lt;team&gt;",
    );

    const document = buildEmailPreviewDocument({
      variant: {
        subject: "Hi <img src=x> {{firstName}}",
        format: "html",
        bodyHtml: "<p>Hello {{firstName}}</p><script>alert(1)</script>",
      },
      subjectLabel: "Předmět",
      emptyText: "Prázdný obsah",
    });

    expect(document).toContain("Content-Security-Policy");
    expect(document).toContain("default-src 'none'");
    expect(document).toContain("form-action 'none'");
    expect(document).toContain("<strong>Předmět:</strong>");
    expect(document).toContain("Hi &lt;img src=x&gt; Anna");
  });

  it("extracts shared variables when building a reusable template", () => {
    const payload = buildTemplatePayload({
      name: "Reminder",
      category: "booking",
      defaultLocale: "cs",
      variants: completeVariants,
    });

    expect(payload.variables).toEqual(["firstName"]);
    expect(payload.contentVariants).toHaveProperty("cs");
    expect(payload.contentVariants).toHaveProperty("en");
    expect(payload.isActive).toBe(true);
  });

  it("keeps explicit plain-text serialization deterministic", () => {
    expect(
      serializeEmailVariant({
        subject: " Plain ",
        format: "plain",
        bodyText: "Line one\nLine two",
      }),
    ).toEqual({
      subject: "Plain",
      format: "plain",
      body: "Line one\nLine two",
      htmlContent: '<p style="margin:0 0 16px;">Line one<br />Line two</p>',
    });
  });

  it("round-trips saved plain and HTML formats without changing editor mode", () => {
    const saved = buildLocalizedContentPayload({
      defaultLocale: "cs",
      variants: completeVariants,
    });
    const restored = normalizeContentVariants(saved);

    expect(restored.variants.cs).toMatchObject({
      subject: "Ahoj {{firstName}}",
      format: "plain",
      bodyText: "Vaše rezervace platí.",
    });
    expect(restored.variants.en).toMatchObject({
      subject: "Hello {{firstName}}",
      format: "html",
      bodyHtml: "<p>Your booking is confirmed.</p>",
    });
  });

  it("treats the active format as authoritative when content is cleared", () => {
    expect(
      serializeEmailVariant({
        subject: "Plain",
        format: "plain",
        bodyText: "",
        bodyHtml: "<p>Stale HTML</p>",
      }),
    ).toMatchObject({ format: "plain", body: "", htmlContent: "" });
    expect(
      serializeEmailVariant({
        subject: "HTML",
        format: "html",
        bodyText: "Stale text",
        bodyHtml: "",
      }),
    ).toMatchObject({ format: "html", body: "", htmlContent: "" });
  });
});

describe("automation payload contract", () => {
  it("emits canonical booking triggers, purpose, recipients, and location scope", () => {
    const payload = buildAutomationPayload(
      completeAutomation({
        scheduleType: "beforePurchase",
        connectedProductType: "course",
        minutesOffset: 90,
        purpose: "marketing",
        sendToAllRecipients: false,
        recipients: [
          {
            user: { _id: "user-1" },
            email: "customer@example.com",
            name: "Ada",
            locale: "en",
          },
        ],
        appliesToAllLocations: false,
        location: "507f191e810c19729de860ee",
      }),
    );

    expect(payload).toMatchObject({
      scheduleType: "beforeBooking",
      connectedProductType: "course",
      minutesOffset: 90,
      purpose: "marketing",
      appliesToAllLocations: false,
      location: "507f191e810c19729de860ee",
      recipients: [
        {
          user: "user-1",
          email: "customer@example.com",
          name: "Ada",
          locale: "en",
        },
      ],
    });
  });

  it("preserves legacy marketing drafts but blocks them until unsubscribe exists", () => {
    const form = completeAutomation({ purpose: "marketing" });

    expect(buildAutomationPayload(form).purpose).toBe("marketing");
    expect(validateAutomationForm(form)).toHaveProperty("purpose");
  });

  it("accepts legacy trigger aliases but never exposes password reset as a custom trigger", () => {
    expect(normalizeScheduleType("beforePurchase")).toBe("beforeBooking");
    expect(normalizeScheduleType("afterPurchase")).toBe("afterBooking");
    expect(EMAIL_SCHEDULE_TYPES).toContain("beforeBooking");
    expect(EMAIL_SCHEDULE_TYPES).not.toContain("passwordReset");
    expect(LOCATION_SCOPED_EMAIL_SCHEDULE_TYPES).toEqual([
      "afterBookingCreated",
      "beforeBooking",
      "afterBooking",
    ]);
    expect(LOCATION_SCOPED_EMAIL_SCHEDULE_TYPES).not.toContain("daily");
    expect(LOCATION_SCOPED_EMAIL_SCHEDULE_TYPES).not.toContain(
      "afterRegistration",
    );
  });

  it("requires a future one-time timestamp and serializes datetime-local to ISO", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T10:00:00.000Z"));

    const futureLocal = "2030-01-02T12:30";
    const valid = completeAutomation({
      scheduleType: "oneTimeEmail",
      oneTimeSendAt: futureLocal,
      sendToAllRecipients: true,
    });
    const past = { ...valid, oneTimeSendAt: "2029-12-31T12:30" };

    expect(validateAutomationForm(valid)).not.toHaveProperty("oneTimeSendAt");
    expect(buildAutomationPayload(valid).oneTimeSendAt).toBe(
      new Date(futureLocal).toISOString(),
    );
    expect(validateAutomationForm(past)).toHaveProperty("oneTimeSendAt");
    expect(
      validateAutomationForm({ ...valid, oneTimeSendAt: "" }),
    ).toHaveProperty("oneTimeSendAt");
  });

  it("normalizes and preserves legacy location scope", () => {
    const form = normalizeAutomationForm({
      name: "Legacy",
      scheduleType: "afterPurchase",
      location: { _id: "location-1" },
      appliesToAllLocations: false,
      subject: "Subject",
      body: "Body",
    });

    expect(form.scheduleType).toBe("afterBooking");
    expect(form.purpose).toBe("transactional");
    expect(form.location).toBe("location-1");
    expect(form.appliesToAllLocations).toBe(false);
  });

  it("serializes a specific location instead of coercing every automation to all locations", () => {
    const payload = buildAutomationPayload(
      completeAutomation({
        appliesToAllLocations: false,
        location: "507f191e810c19729de860ee",
      }),
    );

    expect(payload).toMatchObject({
      appliesToAllLocations: false,
      location: "507f191e810c19729de860ee",
    });
  });

  it("preserves immediate event delivery and normalizes hidden product filters", () => {
    const registration = buildAutomationPayload(
      completeAutomation({
        scheduleType: "afterRegistration",
        minutesOffset: 0,
        connectedProductType: "course",
      }),
    );
    const pottery = buildAutomationPayload(
      completeAutomation({
        scheduleType: "afterItemRegistered",
        minutesOffset: 60,
        connectedProductType: "course",
      }),
    );
    const booking = buildAutomationPayload(
      completeAutomation({
        scheduleType: "beforeBooking",
        connectedProductType: "membership",
      }),
    );

    expect(registration).toMatchObject({
      minutesOffset: 0,
      connectedProductType: "all",
    });
    expect(pottery).toMatchObject({
      minutesOffset: 0,
      connectedProductType: "all",
    });
    expect(booking.connectedProductType).toBe("all");
  });

  it("preserves but blocks legacy firing triggers owned by the firing workflow", () => {
    const form = completeAutomation({ scheduleType: "afterFinalFiring" });

    expect(buildAutomationPayload(form).scheduleType).toBe("afterFinalFiring");
    expect(validateAutomationForm(form)).toHaveProperty("scheduleType");
  });

  it("allows existing template-only and subject-override automations to be saved", () => {
    for (const subject of ["", "Finished"]) {
      const form = normalizeAutomationForm({
        name: "Confirmation after booking",
        scheduleType: "afterBooking",
        minutesOffset: 2,
        senderEmail: { _id: "sender-1" },
        templateId: "template-1",
        subject,
      });
      expect(validateAutomationForm(form)).toEqual({});
      expect(buildAutomationPayload(form)).toMatchObject({
        minutesOffset: 2,
        templateId: "template-1",
        subject,
      });
    }
  });

  it("identifies the invalid language without requiring unused translations", () => {
    const form = completeAutomation({
      variants: {
        cs: completeVariants.cs,
        en: { subject: "Draft", format: "plain", bodyText: "" },
      },
    });
    expect(getInvalidEmailContentLocales(form)).toEqual(["en"]);
    expect(
      getInvalidEmailContentLocales({
        ...form,
        variants: { cs: completeVariants.cs },
      }),
    ).toEqual([]);
    expect(getInvalidEmailContentLocales({ ...form, variants: {} })).toEqual([
      "cs",
    ]);
    expect(validateAutomationForm({ ...form, variants: {} })).toHaveProperty(
      "content",
    );
  });

  it("rejects a partially authored secondary language before the API does", () => {
    expect(
      validateAutomationForm({
        ...completeAutomation(),
        variants: {
          ...completeVariants,
          en: { subject: "Incomplete", format: "plain", bodyText: "" },
        },
      }),
    ).toHaveProperty("content");
  });
});

describe("translation catalogs", () => {
  it("keeps every automated-email message key in Czech and English", () => {
    const root = path.resolve(process.cwd(), "src/messages");
    const en = JSON.parse(fs.readFileSync(path.join(root, "en.json"), "utf8"));
    const cs = JSON.parse(fs.readFileSync(path.join(root, "cs.json"), "utf8"));

    expect(en.Communications.tabs.automations).toBeTruthy();
    expect(cs.Communications.tabs.automations).toBeTruthy();
    expect(en.Communications.tabs).not.toHaveProperty("knowledge");
    expect(cs.Communications.tabs).not.toHaveProperty("knowledge");
    expect(flattenKeys(cs.EmailAutomations)).toEqual(
      flattenKeys(en.EmailAutomations),
    );
  });
});
