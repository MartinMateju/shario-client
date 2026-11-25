import { describe, expect, it } from "vitest";
import {
  buildDoorAccessTemplatePayload,
  validateDoorAccessTemplate,
  DOOR_ACCESS_PREVIEW_VALUES,
} from "@/components/communications/email/doorAccessEmailContent";
import {
  buildEmailPreviewDocument,
  EMAIL_VARIABLE_GROUPS,
} from "@/components/communications/email/emailContent";

const form = (variant = {}, extra = {}) => ({
  defaultLocale: "en",
  variants: {
    en: {
      subject: "Welcome to {{studioName}}",
      format: "plain",
      bodyText: "Your code: {{entryCode}}",
      ...variant,
    },
    ...extra,
  },
});

describe("door-code template editing", () => {
  it("keeps link destinations and decoded text in the HTML email's plain alternative", () => {
    const bodyHtml =
      '<p>Your code: <span>{{entryCode}}</span> &amp; welcome.</p><p><a href="{{bookingUrl}}">Manage booking</a></p>';
    const payload = buildDoorAccessTemplatePayload(
      form({ format: "html", bodyHtml }),
    );
    expect(payload.contentVariants.en.htmlContent).toBe(bodyHtml);
    expect(payload.contentVariants.en.body).toContain(
      "{{entryCode}} & welcome.",
    );
    expect(payload.contentVariants.en.body).toContain(
      "Manage booking ({{bookingUrl}})",
    );
  });

  it("requires the code in each supplied language and preserves a blank secondary language", () => {
    expect(validateDoorAccessTemplate(form())).toEqual({});
    expect(
      validateDoorAccessTemplate(
        form(
          {},
          { cs: { subject: "Kód", format: "plain", bodyText: "Bez kódu" } },
        ),
      ),
    ).toEqual({ cs: "missingCode" });
    expect(
      buildDoorAccessTemplatePayload(form()).contentVariants,
    ).not.toHaveProperty("cs");
  });

  it.each([
    "<p>Welcome</p><!-- {{entryCode}} -->",
    "<style>.foo {content: '{{entryCode}}'}</style><p>Welcome</p>",
    "<script>{{entryCode}}</script><p>Welcome</p>",
  ])(
    "does not treat hidden-only placeholder content as a visible code: %s",
    (bodyHtml) => {
      expect(
        validateDoorAccessTemplate(form({ format: "html", bodyHtml })),
      ).toEqual({ en: "missingCode" });
    },
  );

  it("rejects code-bearing subjects, attributes and URLs", () => {
    expect(
      validateDoorAccessTemplate(form({ subject: "Code {{entryCode}}" })),
    ).toEqual({ en: "codePlacement" });
    expect(
      validateDoorAccessTemplate(
        form({
          format: "html",
          bodyHtml:
            '<p>{{entryCode}}</p><a href="https://example.test/{{entryCode}}">Open</a>',
        }),
      ),
    ).toEqual({ en: "codePlacement" });
    expect(
      validateDoorAccessTemplate(
        form({
          bodyText: "Code {{entryCode}} https://example.test/{{entryCode}}",
        }),
      ),
    ).toEqual({ en: "codePlacement" });
  });

  it("rejects unsupported and malformed placeholders without widening generic automation variables", () => {
    expect(
      validateDoorAccessTemplate(
        form({ bodyText: "{{entryCode}} {{firstName}}" }),
      ),
    ).toEqual({ en: "unknownVariable" });
    expect(
      validateDoorAccessTemplate(
        form({ bodyText: "{{entryCode}} {{ broken token }}" }),
      ),
    ).toEqual({ en: "unknownVariable" });
    expect(
      EMAIL_VARIABLE_GROUPS.flatMap((group) => group.variables).map(
        (variable) => variable.token,
      ),
    ).not.toContain("{{entryCode}}");
  });

  it("creates a sample preview and escapes location names", () => {
    const html = buildEmailPreviewDocument({
      variant: form().variants.en,
      previewValues: {
        ...DOOR_ACCESS_PREVIEW_VALUES,
        studioName: '<img src=x onerror="alert(1)">',
      },
    });
    expect(html).toContain("123456");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("default-src 'none'");
  });
});
