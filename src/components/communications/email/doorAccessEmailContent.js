import {
  buildLocalizedContentPayload,
  EMAIL_LOCALES,
  extractEmailVariables,
  htmlToPlainText,
  isEmailVariantEmpty,
  serializeEmailVariant,
} from "./emailContent";
import { visualEmailToPlainText } from "./visualEmailHtml";

export const DOOR_ACCESS_EMAIL_VARIABLES = Object.freeze([
  "entryCode",
  "studioName",
  "studioAddress",
  "bookingTime",
  "bookingUrl",
]);

export const DOOR_ACCESS_PREVIEW_VALUES = Object.freeze({
  entryCode: "123456",
  studioName: "Example studio",
  studioAddress: "Studio Street 12",
  bookingTime: "15 Nov 2026, 14:00–16:00",
  bookingUrl: "https://example.com/bookings",
});

const CODE_TOKEN = /{{\s*entryCode\s*}}/;
const ALLOWED = new Set(DOOR_ACCESS_EMAIL_VARIABLES);

export function buildDoorAccessTemplatePayload(form) {
  const { defaultLocale, contentVariants } = buildLocalizedContentPayload(form);
  for (const content of Object.values(contentVariants)) {
    if (content.format === "html") {
      // Keep booking links useful in the text alternative as well as the design.
      content.body =
        visualEmailToPlainText(content.htmlContent) ?? content.body;
    }
  }
  return { defaultLocale, contentVariants };
}

/** Immediate editor feedback. The server validates and sanitizes on save too. */
export function validateDoorAccessTemplate(form) {
  const issues = {};
  for (const locale of EMAIL_LOCALES) {
    const variant = form?.variants?.[locale];
    if (locale !== form?.defaultLocale && isEmailVariantEmpty(variant))
      continue;
    const content = serializeEmailVariant(variant);
    const visibleBody =
      content.format === "html"
        ? htmlToPlainText(content.htmlContent)
        : content.body;
    if (
      !content.subject ||
      !visibleBody.trim() ||
      content.subject.length > 200
    ) {
      issues[locale] = "incomplete";
    } else if (!CODE_TOKEN.test(visibleBody)) {
      issues[locale] = "missingCode";
    } else if (
      CODE_TOKEN.test(content.subject) ||
      (content.format === "html" &&
        /<[^>]*{{\s*entryCode\s*}}[^>]*>/i.test(content.htmlContent)) ||
      /(?:https?:\/\/|mailto:)[^\s<>]*{{\s*entryCode\s*}}/i.test(visibleBody)
    ) {
      issues[locale] = "codePlacement";
    } else if (
      extractEmailVariables(
        content.subject,
        content.htmlContent,
        content.body,
      ).some((variable) => !ALLOWED.has(variable)) ||
      [content.subject, content.htmlContent, content.body].some((value) =>
        /{{|}}/.test(value.replace(/{{\s*[a-zA-Z0-9_.-]+\s*}}/g, "")),
      )
    ) {
      issues[locale] = "unknownVariable";
    }
  }
  return issues;
}
