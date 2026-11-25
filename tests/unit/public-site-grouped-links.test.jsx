import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  normalizePublicTenant,
  getPublicTenantNavigation,
} from "@/components/public-tenant/publicTenant.config";
import {
  normalizePublicSiteHeaderLinks,
  resolvePublicSiteHeaderLinks,
  isValidPublicSiteHeaderLinks,
  isValidPublicSiteCustomLinks,
  flattenPublicSiteNavigation,
} from "@/components/public-tenant/publicTenantCustomLinks";
import {
  buildPublicSiteDraftPatch,
  normalizePublicSiteEditorDraft,
  replacePublicSiteValue,
  isValidPublicSiteEditorDraft,
} from "@/components/public-site-editor/publicSiteEditor.utils";
import {
  CustomLinksFields,
  HeaderFields,
} from "@/components/public-site-editor/PublicSiteEditorFields";
import DesktopNavTenant from "@/components/headers/DesktopNavTenant";
import CustomNavigationGroup from "@/components/headers/CustomNavigationGroup";

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

const leaf = (id, label = id) => ({
  id,
  label: { cs: label, en: label },
  href: { cs: `/cs/${id}`, en: `/en/${id}` },
});
const group = () => ({
  id: "studios",
  label: { cs: "ateliéry", en: "Studios" },
  children: [
    leaf("grohova", "Grohova"),
    { ...leaf("about", "About us"), separatorBefore: true },
  ],
});

describe("grouped public-site navigation", () => {
  it("preserves grouped links, button emphasis, layout and header-only colors through draft save", () => {
    const header = {
      layout: "website",
      backgroundColor: "#F6EADE",
      linkColor: "#2F61CC",
      buttonColor: "#ED8467",
      customLinks: [group(), { ...leaf("reserve"), emphasis: "button" }],
    };
    const tenant = normalizePublicTenant({
      slug: "test",
      publicSite: { header },
    });
    const draft = normalizePublicSiteEditorDraft({
      publicSite: tenant.publicSite,
    });
    expect(buildPublicSiteDraftPatch(draft).header).toMatchObject(header);
    expect(isValidPublicSiteEditorDraft(draft)).toBe(true);
    expect(
      isValidPublicSiteEditorDraft({
        ...draft,
        header: { ...draft.header, linkColor: "red" },
      }),
    ).toBe(false);
    expect(
      normalizePublicTenant({ slug: "legacy" }).publicSite.header.layout,
    ).toBe("default");
  });

  it("resolves group labels and child label/URL pairs independently without rewriting destinations", () => {
    const input = group();
    input.label = { cs: "ateliéry" };
    input.children[0].href.en =
      "https://www.example.com/en/grohova/?ref=booking";
    const items = resolvePublicSiteHeaderLinks([input], "en");
    expect(items[0].label).toBe("ateliéry");
    expect(items[0]).not.toHaveProperty("href");
    expect(items[0].children[0]).toMatchObject({
      label: "Grohova",
      href: "https://www.example.com/en/grohova/?ref=booking",
    });
    expect(items[0].children[1].separatorBefore).toBe(true);
    expect(flattenPublicSiteNavigation(items).map((item) => item.href)).toEqual(
      ["https://www.example.com/en/grohova/?ref=booking", "/en/about"],
    );
    expect(
      getPublicTenantNavigation(
        {
          slug: "test",
          publicSite: {
            header: {
              hiddenItems: [
                "book",
                "courses",
                "memberships",
                "vouchers",
                "help",
              ],
              customLinks: [input],
            },
          },
        },
        "en",
      ),
    ).toEqual(items);
  });

  it("allows child IDs in different groups while keeping flattened keys unique", () => {
    const links = [
      group(),
      { ...group(), id: "second" },
      leaf("studios-grohova"),
    ];
    expect(isValidPublicSiteHeaderLinks(links)).toBe(true);
    const flat = flattenPublicSiteNavigation(
      resolvePublicSiteHeaderLinks(links, "en"),
    );
    expect(new Set(flat.map((item) => item.key)).size).toBe(flat.length);
    expect(normalizePublicSiteHeaderLinks(links)[1].children).toHaveLength(2);
  });

  it.each([
    [{ ...group(), children: [] }],
    [{ ...group(), href: { en: "/wrong" } }],
    [{ ...group(), children: [group()] }],
    [{ ...group(), children: [leaf("same"), leaf("same")] }],
    [{ ...group(), children: [{ ...leaf("bad"), emphasis: "button" }] }],
    [{ ...group(), children: [{ ...leaf("bad"), separatorBefore: "true" }] }],
    [
      { ...leaf("one"), emphasis: "button" },
      { ...leaf("two"), emphasis: "button" },
    ],
    [{ ...group(), emphasis: "button" }],
    [
      {
        ...group(),
        children: Array.from({ length: 9 }, (_, i) => leaf(`child-${i}`)),
      },
    ],
  ])("rejects invalid groups or multiple primary buttons %#", (links) => {
    expect(isValidPublicSiteHeaderLinks(links)).toBe(false);
  });

  it("keeps the footer flat and rejects unsafe child URLs", () => {
    expect(isValidPublicSiteCustomLinks([group()], 12)).toBe(false);
    const input = {
      ...group(),
      children: [
        {
          ...leaf("bad"),
          href: { cs: "javascript:alert(1)", en: "//evil.test" },
        },
      ],
    };
    expect(isValidPublicSiteHeaderLinks([input])).toBe(false);
    expect(resolvePublicSiteHeaderLinks([input], "en")).toEqual([]);
  });

  it("opens default-header groups by click and closes on Escape or outside focus", () => {
    render(
      <>
        <DesktopNavTenant
          items={resolvePublicSiteHeaderLinks([group()], "en")}
        />
        <button>Outside</button>
      </>,
    );
    const trigger = screen.getByRole("button", { name: "Studios" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    const link = screen.getByRole("link", { name: "Grohova" });
    expect(link).toHaveAttribute("href", "/en/grohova");
    expect(link).not.toHaveAttribute("data-router-link");
    fireEvent.keyDown(link, { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("link", { name: "Grohova" })).toBeNull();
    fireEvent.click(trigger);
    fireEvent.focusIn(screen.getByRole("button", { name: "Outside" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("lets the default mobile accordion navigate and close its parent menu", () => {
    const onNavigate = vi.fn();
    render(
      <CustomNavigationGroup
        item={resolvePublicSiteHeaderLinks([group()], "en")[0]}
        mobile
        onNavigate={onNavigate}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Studios" }));
    const destination = screen.getByRole("link", { name: "About us" });
    destination.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(destination);
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Studios" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("edits groups, reorders/removes children and selects exactly one main button", () => {
    function Editor() {
      const [draft, setDraft] = useState({
        header: {
          customLinks: [
            group(),
            leaf("reserve"),
            { ...leaf("another"), emphasis: "button" },
          ],
        },
      });
      return (
        <>
          <CustomLinksFields
            section="header"
            links={draft.header.customLinks}
            onChange={(path, value) =>
              setDraft((old) => replacePublicSiteValue(old, path, value))
            }
          />
          <output data-testid="draft">{JSON.stringify(draft)}</output>
        </>
      );
    }
    render(<Editor />);
    const read = () =>
      JSON.parse(screen.getByTestId("draft").textContent).header.customLinks;
    fireEvent.click(
      within(screen.getByRole("group", { name: "Grohova" })).getByRole(
        "button",
        { name: "Move link down: 1" },
      ),
    );
    expect(read()[0].children.map((item) => item.id)).toEqual([
      "about",
      "grohova",
    ]);
    fireEvent.click(
      within(screen.getByRole("group", { name: "About us" })).getByRole(
        "checkbox",
        { name: "Show a divider before this link" },
      ),
    );
    expect(read()[0].children[0].separatorBefore).toBe(false);
    fireEvent.click(
      within(screen.getByRole("group", { name: "Grohova" })).getByRole(
        "button",
        { name: "Remove link: 2" },
      ),
    );
    expect(read()[0].children).toHaveLength(1);
    fireEvent.click(
      within(screen.getByRole("group", { name: "reserve" })).getByRole(
        "checkbox",
        { name: "Show as the main button" },
      ),
    );
    expect(
      read()
        .filter((item) => item.emphasis === "button")
        .map((item) => item.id),
    ).toEqual(["reserve"]);
    fireEvent.click(screen.getByRole("button", { name: "Add dropdown group" }));
    expect(read().at(-1).children).toEqual([]);
  });

  it("exposes website layout and separate header color controls", () => {
    const draft = normalizePublicSiteEditorDraft({ publicSite: {} });
    const onChange = vi.fn();
    render(<HeaderFields draft={draft} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Header layout"), {
      target: { value: "website" },
    });
    expect(onChange).toHaveBeenCalledWith("header.layout", "website");
    expect(
      document.querySelector(
        '[data-public-site-color-path="header.buttonColor"]',
      ),
    ).toBeInTheDocument();
  });
});
