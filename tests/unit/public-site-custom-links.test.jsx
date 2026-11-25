import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  normalizePublicTenant,
  getPublicTenantNavigation,
} from "@/components/public-tenant/publicTenant.config";
import {
  normalizePublicSiteCustomLinks,
  resolvePublicSiteCustomLinks,
  isValidPublicSiteCustomLinks,
  publicNavigationNeedsMenu,
} from "@/components/public-tenant/publicTenantCustomLinks";
import {
  buildPublicSiteDraftPatch,
  normalizePublicSiteEditorDraft,
  replacePublicSiteValue,
  isValidPublicSiteEditorDraft,
} from "@/components/public-site-editor/publicSiteEditor.utils";
import { CustomLinksFields } from "@/components/public-site-editor/PublicSiteEditorFields";
import DesktopNavTenant from "@/components/headers/DesktopNavTenant";

// Editor custom-link copy comes from the catalogue; other namespaces echo keys.
vi.mock("next-intl", async () => {
  const { createTranslator } = await vi.importActual("next-intl");
  const { default: messages } = await import("@/messages/en.json");
  return {
    useLocale: () => "en",
    useTranslations: (namespace) =>
      namespace === "PublicSiteEditor.customLinks"
        ? createTranslator({ locale: "en", messages, namespace })
        : (key) => key,
  };
});
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }) => (
    <a {...props} href={`/en${href}`} data-router-link>
      {children}
    </a>
  ),
}));

const link = (id = "commissions") => ({
  id,
  label: { cs: "Zakázky", en: "Commissions" },
  href: {
    cs: "https://www.commonground.example/zakazky/",
    en: "https://www.commonground.example/en/commissions/",
  },
});

describe("public-site custom links", () => {
  it("preserves links through normalized editor drafts and patches, including locale-specific destinations", () => {
    const tenant = normalizePublicTenant({
      slug: "klei",
      publicSite: {
        header: { customLinks: [link()] },
        footer: { customLinks: [link("about")] },
      },
    });
    const draft = normalizePublicSiteEditorDraft({
      publicSite: tenant.publicSite,
    });
    const patch = buildPublicSiteDraftPatch(draft);
    expect(patch.header.customLinks).toEqual([link()]);
    expect(patch.footer.customLinks).toEqual([link("about")]);
    expect(isValidPublicSiteEditorDraft(draft)).toBe(true);
  });
  it("keeps built-in visibility and appends ordered custom links in the requested language", () => {
    const items = getPublicTenantNavigation(
      {
        slug: "klei",
        publicCapabilities: { courses: true },
        publicSite: {
          header: {
            hiddenItems: ["courses"],
            customLinks: [link("one"), link("two")],
          },
        },
      },
      "en",
    );
    expect(items.map((item) => item.key)).toEqual(["custom-one", "custom-two"]);
    expect(items[0]).toMatchObject({
      label: "Commissions",
      href: "https://www.commonground.example/en/commissions/",
      custom: true,
    });
  });
  it("falls back as a label-and-destination pair and omits unusable entries", () => {
    expect(
      resolvePublicSiteCustomLinks(
        [{ ...link(), href: { cs: "/cs/courses?location=vaclavska", en: "" } }],
        "en",
      )[0],
    ).toMatchObject({
      label: "Zakázky",
      href: "/cs/courses?location=vaclavska",
    });
    expect(
      resolvePublicSiteCustomLinks(
        [{ ...link(), href: { cs: "javascript:alert(1)", en: "//evil.test" } }],
        "en",
      ),
    ).toEqual([]);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "http://example.com",
    "//example.com",
    "/\\evil.test",
    "https://user:pass@example.com",
    "https://example.com:444/path",
    "https://exa\nmple.com",
  ])("rejects unsafe href %s", (href) => {
    const links = [{ id: "link-1", label: { en: "Test" }, href: { en: href } }];
    expect(isValidPublicSiteCustomLinks(links, 8)).toBe(false);
    expect(resolvePublicSiteCustomLinks(links, "en")).toEqual([]);
  });
  it("requires complete translations, bounded labels/count and unique ids", () => {
    expect(isValidPublicSiteCustomLinks([link()], 8)).toBe(true);
    expect(
      isValidPublicSiteCustomLinks(
        [{ ...link(), href: { cs: "/courses" } }],
        8,
      ),
    ).toBe(false);
    expect(isValidPublicSiteCustomLinks([link(), link()], 8)).toBe(false);
    expect(
      isValidPublicSiteCustomLinks(
        [{ ...link(), label: { en: "x".repeat(81) } }],
        8,
      ),
    ).toBe(false);
    expect(
      isValidPublicSiteCustomLinks(
        Array.from({ length: 9 }, (_, i) => link(`link-${i}`)),
        8,
      ),
    ).toBe(false);
    expect(normalizePublicSiteCustomLinks([link(), link()], 8)).toHaveLength(1);
  });
  it("preserves exact external and root hrefs in desktop links without router localization", () => {
    render(
      <DesktopNavTenant
        items={[
          {
            key: "custom-course",
            custom: true,
            label: "Course",
            href: "/cs/courses?location=vaclavska",
          },
          {
            key: "custom-external",
            custom: true,
            label: "Commissions",
            href: "https://www.commonground.example/zakazky/",
          },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Course" })).toHaveAttribute(
      "href",
      "/cs/courses?location=vaclavska",
    );
    expect(
      screen.getByRole("link", { name: "Commissions" }),
    ).not.toHaveAttribute("data-router-link");
  });
  it("adds, edits, reorders and removes custom links without changing other header settings", () => {
    function Editor() {
      const [draft, setDraft] = useState({
        header: {
          primaryCta: "courses",
          customLinks: [link("one"), link("two")],
        },
      });
      return (
        <>
          <CustomLinksFields
            section="header"
            links={draft.header.customLinks}
            onChange={(path, value) =>
              setDraft((current) =>
                replacePublicSiteValue(current, path, value),
              )
            }
          />
          <output data-testid="draft">{JSON.stringify(draft)}</output>
        </>
      );
    }
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Move link down: 1" }));
    expect(
      JSON.parse(
        screen.getByTestId("draft").textContent,
      ).header.customLinks.map((item) => item.id),
    ).toEqual(["two", "one"]);
    fireEvent.change(screen.getAllByLabelText("Link text · English")[0], {
      target: { value: "New label" },
    });
    fireEvent.change(screen.getAllByLabelText("Destination URL · English")[0], {
      target: { value: "/en/courses?location=vaclavska" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove link: 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    const result = JSON.parse(screen.getByTestId("draft").textContent);
    expect(result.header.primaryCta).toBe("courses");
    expect(result.header.customLinks).toHaveLength(2);
    expect(result.header.customLinks[0]).toMatchObject({
      id: "two",
      label: { en: "New label" },
      href: { en: "/en/courses?location=vaclavska" },
    });
    expect(isValidPublicSiteCustomLinks(result.header.customLinks, 8)).toBe(
      false,
    );
  });
  it("switches excessive navigation to the accessible menu instead of overflowing", () => {
    expect(
      publicNavigationNeedsMenu(
        Array.from({ length: 13 }, () => ({ custom: true, label: "Test" })),
      ),
    ).toBe(true);
    expect(
      publicNavigationNeedsMenu([
        { custom: true, label: "x".repeat(80) },
        { custom: true, label: "x".repeat(80) },
      ]),
    ).toBe(true);
    expect(
      publicNavigationNeedsMenu([{ custom: true, label: "Zakázky" }]),
    ).toBe(false);
  });
});
