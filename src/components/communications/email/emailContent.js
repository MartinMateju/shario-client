export const EMAIL_LOCALES = ["cs", "en"];
export const DEFAULT_EMAIL_LOCALE = "cs";
export const EMAIL_CONTENT_FORMAT = {
  PLAIN: "plain",
  HTML: "html",
};
export const UNSUPPORTED_EMAIL_AUTOMATION_PURPOSES = ["marketing"];
export const EMAIL_SCHEDULE_TYPES = [
  "afterBookingCreated",
  "beforeBooking",
  "afterBooking",
  "afterRegistration",
  "oneTimeEmail",
  "daily",
  "weekly",
  "monthly",
];

// Reject schedules from the legacy specialist application.
export const UNSUPPORTED_EMAIL_SCHEDULE_TYPES = [
  "afterItemRegistered",
  "afterBisqueFiring",
  "afterFinalFiring",
];
export const BOOKING_EMAIL_SCHEDULE_TYPES = [
  "afterBookingCreated",
  "beforeBooking",
  "afterBooking",
];
export const LOCATION_SCOPED_EMAIL_SCHEDULE_TYPES = [
  ...BOOKING_EMAIL_SCHEDULE_TYPES,
];
export const EVENT_EMAIL_SCHEDULE_TYPES = ["afterRegistration"];
export const OFFSET_EMAIL_SCHEDULE_TYPES = [
  ...BOOKING_EMAIL_SCHEDULE_TYPES,
  ...EVENT_EMAIL_SCHEDULE_TYPES,
];
export const BOOKING_CONNECTED_PRODUCT_TYPES = [
  "all",
  "booking",
  "workshop",
  "course",
  "private-session",
];
export const EMAIL_VARIABLE_GROUPS = [
  {
    id: "customer",
    label: {
      cs: "Zákazník",
      en: "Customer",
    },
    variables: [
      {
        token: "{{firstName}}",
        label: {
          cs: "Křestní jméno",
          en: "First name",
        },
      },
      {
        token: "{{lastName}}",
        label: {
          cs: "Příjmení",
          en: "Last name",
        },
      },
      {
        token: "{{fullName}}",
        label: {
          cs: "Celé jméno",
          en: "Full name",
        },
      },
      {
        token: "{{email}}",
        label: {
          cs: "E-mail",
          en: "Email",
        },
      },
      {
        token: "{{customId}}",
        label: {
          cs: "Zákaznické ID",
          en: "Customer ID",
        },
      },
    ],
  },
  {
    id: "studio",
    label: {
      cs: "Studio a čas",
      en: "Studio and time",
    },
    variables: [
      {
        token: "{{studioName}}",
        label: {
          cs: "Název studia",
          en: "Studio name",
        },
      },
      {
        token: "{{logo}}",
        label: {
          cs: "Logo studia",
          en: "Studio logo",
        },
      },
      {
        token: "{{studioAddress}}",
        label: {
          cs: "Adresa studia",
          en: "Studio address",
        },
      },
      {
        token: "{{studioEmail}}",
        label: {
          cs: "Kontaktní e-mail",
          en: "Contact email",
        },
      },
      {
        token: "{{studioPhone}}",
        label: {
          cs: "Telefon",
          en: "Phone",
        },
      },
      {
        token: "{{date}}",
        label: {
          cs: "Datum události",
          en: "Event date",
        },
      },
      {
        token: "{{time}}",
        label: {
          cs: "Čas události",
          en: "Event time",
        },
      },
    ],
  },
  {
    id: "commerce",
    label: {
      cs: "Rezervace a nákup",
      en: "Booking and purchase",
    },
    variables: [
      {
        token: "{{bookingDate}}",
        label: {
          cs: "Datum rezervace",
          en: "Booking date",
        },
      },
      {
        token: "{{bookingTime}}",
        label: {
          cs: "Čas rezervace",
          en: "Booking time",
        },
      },
      {
        token: "{{productName}}",
        label: {
          cs: "Produkt",
          en: "Product",
        },
      },
      {
        token: "{{orderNumber}}",
        label: {
          cs: "Číslo objednávky",
          en: "Order number",
        },
      },
      {
        token: "{{totalPrice}}",
        label: {
          cs: "Celková cena",
          en: "Total price",
        },
      },
    ],
  },
];
export const EMAIL_PREVIEW_VALUES = {
  firstName: "Anna",
  lastName: "Nováková",
  fullName: "Anna Nováková",
  email: "anna@example.com",
  customId: "SH-1042",
  studioName: "Together Space",
  logo: "https://example.com/studio-logo.png",
  studioAddress: "Example Street 1",
  studioEmail: "hello@example.com",
  studioPhone: "+420 777 000 000",
  date: "18. 9. 2026",
  time: "18:30",
  bookingDate: "18. 9. 2026",
  bookingTime: "18:30",
  productName: "Workshop booking",
  orderNumber: "SH-2026-1042",
  totalPrice: "2 400 Kč",
};
export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
export function stripHtml(value = "") {
  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export function plainTextToHtml(value = "") {
  const escaped = escapeHtml(String(value).trim());
  if (!escaped) return "";
  return escaped
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;">${paragraph.replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}
export function htmlToPlainText(value = "") {
  return stripHtml(value);
}
export function isHtmlLike(value = "") {
  return /<\/?[a-z][\s\S]*>/i.test(String(value));
}
export function createEmptyEmailVariant(overrides = {}) {
  return {
    subject: "",
    format: EMAIL_CONTENT_FORMAT.PLAIN,
    bodyText: "",
    bodyHtml: "",
    ...overrides,
  };
}
export function normalizeEmailVariant(value = {}) {
  const explicitFormat = value?.format;
  const hasExplicitHtml =
    value?.bodyHtml !== undefined ||
    value?.htmlContent !== undefined ||
    value?.content !== undefined;
  const hasExplicitText =
    value?.bodyText !== undefined || value?.body !== undefined;
  const sourceHtml = String(
    value?.bodyHtml ?? value?.htmlContent ?? value?.content ?? "",
  );
  const sourceText = String(value?.bodyText ?? value?.body ?? "");
  const format =
    explicitFormat === EMAIL_CONTENT_FORMAT.HTML ||
    (!explicitFormat && isHtmlLike(sourceHtml || sourceText))
      ? EMAIL_CONTENT_FORMAT.HTML
      : EMAIL_CONTENT_FORMAT.PLAIN;
  return createEmptyEmailVariant({
    subject: String(value?.subject ?? ""),
    format,
    bodyText:
      format === EMAIL_CONTENT_FORMAT.PLAIN && hasExplicitText
        ? sourceText
        : sourceText || htmlToPlainText(sourceHtml),
    bodyHtml:
      format === EMAIL_CONTENT_FORMAT.HTML && hasExplicitHtml
        ? sourceHtml
        : format === EMAIL_CONTENT_FORMAT.PLAIN
          ? plainTextToHtml(
              hasExplicitText ? sourceText : htmlToPlainText(sourceHtml),
            )
          : sourceHtml,
  });
}
export function normalizeContentVariants(resource = {}) {
  const defaultLocale = EMAIL_LOCALES.includes(resource?.defaultLocale)
    ? resource.defaultLocale
    : EMAIL_LOCALES.includes(resource?.language)
      ? resource.language
      : DEFAULT_EMAIL_LOCALE;
  const source = resource?.contentVariants ?? resource?.variants ?? {};
  const legacy = normalizeEmailVariant({
    subject: resource?.subject,
    htmlContent: resource?.htmlContent ?? resource?.body,
    body: resource?.body,
    format: resource?.format ?? resource?.contentFormat,
  });
  const variants = Object.fromEntries(
    EMAIL_LOCALES.map((locale) => {
      const localized = source?.[locale];
      if (localized) {
        const normalized = normalizeEmailVariant(localized);
        // Empty schema defaults must not hide a legacy message stored at the
        // top level. Authored localized content remains authoritative.
        if (locale !== defaultLocale || !isEmailVariantEmpty(normalized)) {
          return [locale, normalized];
        }
      }
      if (locale === defaultLocale) return [locale, legacy];
      return [locale, createEmptyEmailVariant()];
    }),
  );
  return {
    defaultLocale,
    variants,
  };
}

// Keep inline drafts separate from resolved template content. The server merges
// localized overrides first, then resolves requested/default/cs/en/top-level.
const toAutomationContentSource = (resource = {}) => {
  if (resource?.variants && !resource?.contentVariants) {
    return buildLocalizedContentPayload(resource);
  }
  return {
    defaultLocale: normalizeContentVariants(resource).defaultLocale,
    ...serializeEmailVariant(resource),
    contentVariants: Object.fromEntries(
      Object.entries(resource?.contentVariants ?? {}).map(
        ([locale, variant]) => [locale, serializeEmailVariant(variant)],
      ),
    ),
  };
};

/** Resolve delivery content without copying inherited text into the draft. */
export function normalizeAutomationContent(automation = {}, template) {
  const referencedTemplate =
    template ??
    (typeof automation?.templateId === "object" ? automation.templateId : null);
  if (!referencedTemplate) return normalizeContentVariants(automation);
  const inline = toAutomationContentSource(automation);
  const fallback = toAutomationContentSource(referencedTemplate);
  const hasBody = (variant) => Boolean(variant?.htmlContent || variant?.body);
  const hasContent = (variant) => Boolean(variant?.subject || hasBody(variant));
  const inlineMessages = [inline, ...Object.values(inline.contentVariants)];
  const defaultLocale = inlineMessages.some(hasContent)
    ? inline.defaultLocale
    : fallback.defaultLocale;
  const format = inlineMessages.some(hasBody) ? inline.format : fallback.format;
  const source = {
    subject: inline.subject || fallback.subject,
    htmlContent: inline.htmlContent || fallback.htmlContent,
    body: inline.body || fallback.body,
    format,
  };
  const merged = Object.fromEntries(
    [
      ...new Set([
        ...Object.keys(fallback.contentVariants),
        ...Object.keys(inline.contentVariants),
      ]),
    ].map((locale) => {
      const base = fallback.contentVariants[locale] ?? {};
      const override = inline.contentVariants[locale] ?? {};
      return [
        locale,
        {
          ...base,
          ...override,
          htmlContent: override.htmlContent || base.htmlContent,
        },
      ];
    }),
  );
  const topOrigin = (field) =>
    inline[field] ? inline.defaultLocale : fallback.defaultLocale;
  const fallbackLocales = [];
  const variants = Object.fromEntries(
    EMAIL_LOCALES.map((locale) => {
      const selectedLocale = [locale, defaultLocale, ...EMAIL_LOCALES].find(
        (candidate) => hasContent(merged[candidate]),
      );
      const selected = selectedLocale ? merged[selectedLocale] : {};
      const subject = selected.subject || source.subject;
      const htmlContent =
        selected.htmlContent ||
        source.htmlContent ||
        selected.body ||
        source.body;
      const body = selected.body || source.body || htmlContent;
      const selectedFormat = selected.format || source.format;
      const htmlOrigin = selected.htmlContent
        ? selectedLocale
        : source.htmlContent
          ? topOrigin("htmlContent")
          : selected.body
            ? selectedLocale
            : topOrigin("body");
      const bodyOrigin = selected.body
        ? selectedLocale
        : source.body
          ? topOrigin("body")
          : htmlOrigin;
      const subjectOrigin = selected.subject
        ? selectedLocale
        : topOrigin("subject");
      if (
        subjectOrigin !== locale ||
        (selectedFormat === EMAIL_CONTENT_FORMAT.PLAIN
          ? bodyOrigin
          : htmlOrigin) !== locale
      ) {
        fallbackLocales.push(locale);
      }
      return [
        locale,
        normalizeEmailVariant({
          subject,
          htmlContent,
          body,
          format: selectedFormat,
        }),
      ];
    }),
  );
  return {
    defaultLocale,
    variants,
    fallbackLocales,
  };
}

/** Templates supply missing subject/body fields at delivery time. */
export function getInvalidEmailContentLocales(form = {}) {
  if (getResourceId(form.templateId)) return [];
  const defaultLocale = EMAIL_LOCALES.includes(form.defaultLocale)
    ? form.defaultLocale
    : DEFAULT_EMAIL_LOCALE;
  return EMAIL_LOCALES.filter((locale) => {
    const variant = form.variants?.[locale];
    return (
      (locale === defaultLocale || !isEmailVariantEmpty(variant)) &&
      !isEmailVariantComplete(variant)
    );
  });
}
export function serializeEmailVariant(variant = {}) {
  const normalized = normalizeEmailVariant(variant);
  const isHtml = normalized.format === EMAIL_CONTENT_FORMAT.HTML;
  const body = isHtml
    ? htmlToPlainText(normalized.bodyHtml)
    : normalized.bodyText.trim();
  const htmlContent = isHtml
    ? normalized.bodyHtml.trim()
    : plainTextToHtml(normalized.bodyText);
  return {
    subject: normalized.subject.trim(),
    format: normalized.format,
    htmlContent,
    body,
  };
}
export function buildLocalizedContentPayload({
  defaultLocale = DEFAULT_EMAIL_LOCALE,
  variants = {},
} = {}) {
  const safeDefaultLocale = EMAIL_LOCALES.includes(defaultLocale)
    ? defaultLocale
    : DEFAULT_EMAIL_LOCALE;
  const contentVariants = Object.fromEntries(
    EMAIL_LOCALES.map((locale) => [
      locale,
      serializeEmailVariant(variants?.[locale]),
    ]).filter(
      ([, variant]) => variant.subject || variant.htmlContent || variant.body,
    ),
  );
  const fallback =
    contentVariants[safeDefaultLocale] ??
    contentVariants[EMAIL_LOCALES.find((locale) => contentVariants[locale])] ??
    serializeEmailVariant();
  return {
    defaultLocale: safeDefaultLocale,
    contentVariants,
    subject: fallback.subject,
    format: fallback.format,
    htmlContent: fallback.htmlContent,
    body: fallback.body,
  };
}
export function isEmailVariantComplete(variant = {}) {
  const serialized = serializeEmailVariant(variant);
  return Boolean(
    serialized.subject && (serialized.htmlContent || serialized.body),
  );
}
export function isEmailVariantEmpty(variant = {}) {
  const normalized = normalizeEmailVariant(variant);
  return !(
    normalized.subject.trim() ||
    normalized.bodyText.trim() ||
    normalized.bodyHtml.trim()
  );
}
export function hasIncompleteEmailVariant(variants = {}) {
  return EMAIL_LOCALES.some((locale) => {
    const variant = variants?.[locale];
    return !isEmailVariantEmpty(variant) && !isEmailVariantComplete(variant);
  });
}
export function getVariantCompletion(variants = {}) {
  return Object.fromEntries(
    EMAIL_LOCALES.map((locale) => [
      locale,
      isEmailVariantComplete(variants[locale]),
    ]),
  );
}
export function extractEmailVariables(...values) {
  const variables = new Set();
  const pattern = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g;
  values.flat(Infinity).forEach((value) => {
    const source = String(value ?? "");
    for (const match of source.matchAll(pattern)) variables.add(match[1]);
  });
  return [...variables].sort();
}
export function normalizeScheduleType(value) {
  if (value === "beforePurchase") return "beforeBooking";
  if (value === "afterPurchase") return "afterBooking";
  if (UNSUPPORTED_EMAIL_SCHEDULE_TYPES.includes(value)) return value;
  return EMAIL_SCHEDULE_TYPES.includes(value) ? value : "afterBooking";
}
export function normalizeConnectedProductType(scheduleType, value) {
  const normalizedSchedule = normalizeScheduleType(scheduleType);
  if (BOOKING_EMAIL_SCHEDULE_TYPES.includes(normalizedSchedule)) {
    return BOOKING_CONNECTED_PRODUCT_TYPES.includes(value) ? value : "all";
  }
  return "all";
}
export function getResourceId(value) {
  if (typeof value === "string") return value;
  return value?._id ?? value?.id ?? "";
}
export function buildAutomationPayload(form = {}) {
  const localized = buildLocalizedContentPayload(form);
  const scheduleType = normalizeScheduleType(form.scheduleType);
  const requiresOffset = OFFSET_EMAIL_SCHEDULE_TYPES.includes(scheduleType);
  const minutesOffset = Number(form.minutesOffset ?? 0);
  const appliesToAllLocations = form.appliesToAllLocations === true;
  const location = getResourceId(form.location ?? form.locationId);
  return {
    name: String(form.name ?? "").trim(),
    scheduleType,
    connectedProductType: normalizeConnectedProductType(
      scheduleType,
      form.connectedProductType,
    ),
    minutesOffset:
      requiresOffset && Number.isFinite(minutesOffset) ? minutesOffset : 0,
    sendTime: form.sendTime || "09:00",
    oneTimeSendAt: toIsoInstant(
      scheduleType === "oneTimeEmail" ? form.oneTimeSendAt : null,
    ),
    dayOfWeek: form.dayOfWeek || "monday",
    dayOfMonth: Number(form.dayOfMonth || 1),
    senderEmail: getResourceId(form.senderEmail),
    sendToAllRecipients: Boolean(form.sendToAllRecipients),
    recipients: form.sendToAllRecipients
      ? []
      : (form.recipients ?? []).map((recipient) => ({
          user: getResourceId(recipient.user) || null,
          email: String(recipient.email ?? "").trim(),
          customId: String(recipient.customId ?? "").trim(),
          name: String(recipient.name ?? "").trim(),
          locale: EMAIL_LOCALES.includes(recipient.locale)
            ? recipient.locale
            : undefined,
        })),
    appliesToAllLocations,
    location: appliesToAllLocations ? null : location || null,
    templateId: getResourceId(form.templateId) || null,
    purpose: form.purpose === "marketing" ? "marketing" : "transactional",
    respectQuietHours: form.respectQuietHours !== false,
    cancelOnReschedule: form.cancelOnReschedule !== false,
    isActive: Boolean(form.isActive),
    automationStatus:
      form.automationStatus ||
      (form.isActive ? "active" : "waiting_to_activate"),
    ...localized,
  };
}
export function validateAutomationForm(form = {}) {
  const errors = {};
  const payload = buildAutomationPayload(form);
  if (UNSUPPORTED_EMAIL_SCHEDULE_TYPES.includes(payload.scheduleType)) {
    errors.scheduleType = "scheduleType";
  }
  if (!payload.name) errors.name = "name";
  if (!payload.senderEmail) errors.senderEmail = "senderEmail";
  if (UNSUPPORTED_EMAIL_AUTOMATION_PURPOSES.includes(payload.purpose)) {
    errors.purpose = "purpose";
  }
  if (!payload.appliesToAllLocations && !payload.location) {
    errors.location = "location";
  }
  if (
    OFFSET_EMAIL_SCHEDULE_TYPES.includes(payload.scheduleType) &&
    (!Number.isInteger(payload.minutesOffset) ||
      payload.minutesOffset < 0 ||
      payload.minutesOffset > 525_600)
  ) {
    errors.minutesOffset = "minutesOffset";
  }
  if (
    ["oneTimeEmail", "daily", "weekly", "monthly"].includes(
      payload.scheduleType,
    ) &&
    !payload.sendToAllRecipients &&
    payload.recipients.length === 0
  ) {
    errors.recipients = "recipients";
  }
  if (getInvalidEmailContentLocales(form).length > 0) {
    errors.content = "content";
  }
  if (
    payload.scheduleType === "oneTimeEmail" &&
    (!payload.oneTimeSendAt ||
      new Date(payload.oneTimeSendAt).getTime() <= Date.now())
  ) {
    errors.oneTimeSendAt = "oneTimeSendAt";
  }
  return errors;
}
export function normalizeAutomationForm(automation = {}) {
  const content = normalizeContentVariants(automation);
  const scheduleType = normalizeScheduleType(automation?.scheduleType);
  const location = getResourceId(
    automation?.location ?? automation?.locationId,
  );
  const appliesToAllLocations =
    automation?.appliesToAllLocations === undefined
      ? !location
      : Boolean(automation.appliesToAllLocations);
  return {
    name: String(automation?.name ?? ""),
    scheduleType,
    connectedProductType: normalizeConnectedProductType(
      scheduleType,
      automation?.connectedProductType,
    ),
    minutesOffset: Number(automation?.minutesOffset ?? 0),
    sendTime: automation?.sendTime || "09:00",
    oneTimeSendAt: automation?.oneTimeSendAt
      ? toDateTimeLocalValue(automation.oneTimeSendAt)
      : "",
    dayOfWeek: automation?.dayOfWeek || "monday",
    dayOfMonth: Number(automation?.dayOfMonth || 1),
    senderEmail: getResourceId(automation?.senderEmail),
    sendToAllRecipients: Boolean(automation?.sendToAllRecipients),
    recipients: Array.isArray(automation?.recipients)
      ? automation.recipients.map((recipient) => ({
          ...recipient,
        }))
      : [],
    appliesToAllLocations,
    location: appliesToAllLocations ? "" : location,
    templateId: getResourceId(automation?.templateId),
    purpose:
      automation?.purpose === "marketing" ? "marketing" : "transactional",
    respectQuietHours: automation?.respectQuietHours !== false,
    cancelOnReschedule: automation?.cancelOnReschedule !== false,
    isActive: Boolean(automation?.isActive),
    automationStatus:
      automation?.automationStatus ||
      (automation?.isActive ? "active" : "waiting_to_activate"),
    ...content,
  };
}
export function normalizeTemplateForm(template = {}) {
  return {
    name: String(template?.name ?? ""),
    description: String(template?.description ?? ""),
    category:
      template?.category === "layout"
        ? "general"
        : template?.category || "general",
    isDefault: Boolean(template?.isDefault),
    isActive: template?.isActive !== false,
    headerHtml: String(template?.headerHtml ?? ""),
    footerHtml: String(template?.footerHtml ?? ""),
    logoUrl: String(template?.logoUrl ?? ""),
    primaryColor: template?.primaryColor || "#1f1a17",
    ...normalizeContentVariants(template),
  };
}
export function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}
export function toIsoInstant(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
export function buildTemplatePayload(form = {}) {
  const localized = buildLocalizedContentPayload(form);
  const variableSources = Object.values(localized.contentVariants).flatMap(
    (variant) => [variant.subject, variant.htmlContent, variant.body],
  );
  return {
    name: String(form.name ?? "").trim(),
    description: String(form.description ?? "").trim(),
    category: form.category || "general",
    isDefault: Boolean(form.isDefault),
    isActive: form.isActive !== false,
    headerHtml: String(form.headerHtml ?? ""),
    footerHtml: String(form.footerHtml ?? ""),
    logoUrl: String(form.logoUrl ?? "").trim(),
    primaryColor: form.primaryColor || "#1f1a17",
    variables: extractEmailVariables(variableSources),
    ...localized,
  };
}
export function validateTemplateForm(form = {}) {
  const errors = {};
  if (!String(form.name ?? "").trim()) errors.name = "name";
  if (!isEmailVariantComplete(form.variants?.[form.defaultLocale])) {
    errors.content = "content";
  }
  if (hasIncompleteEmailVariant(form.variants)) errors.content = "content";
  return errors;
}
export function applyPreviewVariables(
  value = "",
  values = EMAIL_PREVIEW_VALUES,
) {
  return String(value).replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (token, name) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? escapeHtml(values[name])
      : token,
  );
}
export function buildEmailPreviewDocument({
  variant,
  headerHtml = "",
  footerHtml = "",
  primaryColor = "#1f1a17",
  subjectLabel = "Subject",
  emptyText = "Start writing to preview the email.",
} = {}) {
  const content = serializeEmailVariant(variant);
  const safeColor = /^#[0-9a-f]{6}$/i.test(primaryColor)
    ? primaryColor
    : "#1f1a17";
  const subject = applyPreviewVariables(escapeHtml(content.subject));
  const body = applyPreviewVariables(content.htmlContent);
  const safeSubjectLabel = escapeHtml(subjectLabel);
  const safeEmptyText = escapeHtml(emptyText);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src data:; connect-src 'none'; media-src 'none'; form-action 'none'; base-uri 'none'" />
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; color: #1f1a17; background: #f7f3ee; font: 14px/1.65 Arial, sans-serif; }
      .mail { max-width: 680px; margin: 0 auto; overflow: hidden; border: 1px solid #e7ded5; border-radius: 24px; background: #fff; box-shadow: 0 18px 50px rgba(31,26,23,.08); }
      .subject { padding: 14px 24px; color: #7f756d; border-bottom: 1px solid #eee7df; font-size: 12px; }
      .subject strong { color: ${safeColor}; }
      .content { padding: 28px; overflow-wrap: anywhere; }
      a { color: ${safeColor}; }
      img { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>
    <article class="mail">
      <div class="subject"><strong>${safeSubjectLabel}:</strong> ${subject || "—"}</div>
      <div class="content">
        ${applyPreviewVariables(headerHtml)}
        ${body || `<p>${safeEmptyText}</p>`}
        ${applyPreviewVariables(footerHtml)}
      </div>
    </article>
  </body>
</html>`;
}
