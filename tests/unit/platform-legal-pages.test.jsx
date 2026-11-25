import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider, useLocale } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import TermsPage, {
  generateMetadata as termsMetadata,
} from "@/app/[locale]/terms/page";
import PrivacyPage, {
  generateMetadata as privacyMetadata,
} from "@/app/[locale]/privacy/page";
import { LEGAL_DOCUMENTS } from "@/content/platformLegal";
import englishMessages from "@/messages/en.json";
import czechMessages from "@/messages/cs.json";

vi.mock("next/navigation", () => ({
  usePathname: () => "/en/terms",
  notFound: () => {
    throw new Error("not found");
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: function LocalizedLink({
    children,
    href,
    locale: explicitLocale,
    ...props
  }) {
    const locale = useLocale();
    return (
      <a href={`/${explicitLocale || locale}${href}`} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock("@/content/platformLegal", () => ({
  LEGAL_VERSION: "2026-11-15",
  LEGAL_UPDATED_DATE: "2026-11-15",
  LEGAL_PROVIDER: { name: "BNO Lab s.r.o.", email: "hello@shario.io" },
  LEGAL_DOCUMENTS: Object.fromEntries(
    ["terms", "privacy"].map((key) => [
      key,
      {
        title: key === "terms" ? "Terms of Service" : "Privacy Policy",
        description: "English legal document fixture.",
        sections: [
          {
            id: "scope",
            title: "1. Scope",
            paragraphs: ['Literal <script>alert("text")</script> content.'],
          },
          {
            id: "contact",
            title: "2. Contact",
            paragraphs: ["Contact information."],
            bullets: ["A document detail."],
          },
        ],
      },
    ]),
  ),
}));

describe("public platform legal documents", () => {
  it.each([
    ["terms", TermsPage],
    ["privacy", PrivacyPage],
  ])(
    "renders every section of the actual %s document",
    async (documentKey, Page) => {
      const actual = await vi.importActual("@/content/platformLegal");
      const fixture = LEGAL_DOCUMENTS[documentKey];
      LEGAL_DOCUMENTS[documentKey] = actual.LEGAL_DOCUMENTS[documentKey];
      try {
        render(
          <NextIntlClientProvider
            locale="en"
            messages={englishMessages}
            timeZone="UTC"
          >
            <Page />
          </NextIntlClientProvider>,
        );
        const article = screen.getByRole("article", {
          name: actual.LEGAL_DOCUMENTS[documentKey].title,
        });
        for (const section of actual.LEGAL_DOCUMENTS[documentKey].sections) {
          expect(
            within(article).getByRole("heading", {
              level: 2,
              name: section.title,
            }),
          ).toBeVisible();
          for (const text of [
            ...section.paragraphs,
            ...(section.bullets || []),
          ]) {
            expect(article).toHaveTextContent(text.replace(/\s+/g, " "));
          }
        }
      } finally {
        LEGAL_DOCUMENTS[documentKey] = fixture;
      }
    },
  );

  it.each([
    ["en", "terms", TermsPage],
    ["cs", "terms", TermsPage],
    ["en", "privacy", PrivacyPage],
    ["cs", "privacy", PrivacyPage],
  ])(
    "renders the English %s/%s document with working contents and localized crosslinks",
    (locale, documentKey, Page) => {
      const messages = locale === "cs" ? czechMessages : englishMessages;
      render(
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="UTC"
        >
          <Page />
        </NextIntlClientProvider>,
      );
      const document = LEGAL_DOCUMENTS[documentKey];
      const article = screen.getByRole("article", { name: document.title });
      expect(article).toHaveAttribute("lang", "en");
      expect(
        within(article).getByRole("heading", { level: 1 }),
      ).toHaveTextContent(document.title);
      expect(within(article).getByText("English version")).toBeVisible();
      expect(article.querySelector("time")).toHaveAttribute(
        "datetime",
        "2026-11-15",
      );
      expect(article).toHaveTextContent(document.sections[0].paragraphs[0]);
      expect(article.querySelector("script")).toBeNull();
      expect(within(article).getByText("A document detail.")).toBeVisible();

      const contents = within(article).getByRole("navigation", {
        name: "Contents",
      });
      for (const section of document.sections) {
        const link = within(contents).getByRole("link", {
          name: section.title,
        });
        expect(link).toHaveAttribute("href", `#${section.id}`);
        expect(globalThis.document.getElementById(section.id)).toHaveAttribute(
          "aria-labelledby",
          `${section.id}-heading`,
        );
      }
      for (const key of ["terms", "privacy"]) {
        const links = screen.getAllByRole("link", {
          name: messages.PlatformAuth.register.form[key],
        });
        // Document crosslinks and the shared marketing footer both expose the policies.
        expect(links).toHaveLength(2);
        links.forEach((link) =>
          expect(link).toHaveAttribute("href", `/${locale}/${key}`),
        );
        if (key === documentKey)
          expect(links[0]).toHaveAttribute("aria-current", "page");
        else expect(links[0]).not.toHaveAttribute("aria-current");
      }
    },
  );

  it.each([
    ["terms", termsMetadata],
    ["privacy", privacyMetadata],
  ])(
    "canonicalizes the untranslated %s document and keeps the review draft out of search",
    async (documentKey, generateMetadata) => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: "cs" }),
      });
      expect(metadata.alternates).toEqual({ canonical: `/en/${documentKey}` });
      expect(metadata.robots).toEqual({ index: false, follow: true });
      await expect(
        generateMetadata({ params: Promise.resolve({ locale: "invalid" }) }),
      ).rejects.toThrow("not found");
    },
  );

  it("opens and closes the contents without hiding the document and offers browser printing", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider
        locale="en"
        messages={englishMessages}
        timeZone="UTC"
      >
        <TermsPage />
      </NextIntlClientProvider>,
    );
    const toggle = screen.getByRole("button", {
      name: "Contents / 2 sections",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("link", { name: "2. Contact" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("heading", { name: "2. Contact" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Print / save PDF" }));
    expect(print).toHaveBeenCalledOnce();
  });
});
