import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { PagesFields } from "@/components/public-site-editor/PublicSiteEditorFields";
import {
  buildPublicSiteDraftPatch,
  normalizePublicSiteEditorDraft,
  replacePublicSiteValue,
} from "@/components/public-site-editor/publicSiteEditor.utils";
import {
  getPublicTenantNavigation,
  getPublicTenantPrimaryAction,
  isPublicTenantPageVisible,
  normalizePublicTenant,
} from "@/components/public-tenant/publicTenant.config";
import en from "@/messages/en.json";

const pageKeys = ["book", "courses", "memberships", "vouchers", "help"];
const capabilities = {
  bookStudio: true,
  courses: true,
  memberships: true,
  vouchers: true,
  help: true,
  registration: true,
};
const createDraft = () =>
  normalizePublicSiteEditorDraft({
    publicSite: {
      pages: Object.fromEntries(
        pageKeys.map((key) => [
          key,
          {
            title: { en: `Saved ${key} title`, cs: `Saved ${key} Czech title` },
            description: { en: `Saved ${key} introduction` },
          },
        ]),
      ),
    },
  });
function Harness({ disabled = false, initialDraft = createDraft() }) {
  const [draft, setDraft] = useState(initialDraft);
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      <PagesFields
        draft={draft}
        disabled={disabled}
        onChange={(path, value) =>
          setDraft((current) => replacePublicSiteValue(current, path, value))
        }
        onUpload={vi.fn()}
      />
      <output data-testid="saved-patch">
        {JSON.stringify(buildPublicSiteDraftPatch(draft))}
      </output>
    </NextIntlClientProvider>
  );
}
const readPatch = () =>
  JSON.parse(screen.getByTestId("saved-patch").textContent);

describe("public page visibility", () => {
  it.each(pageKeys)(
    "can hide, reload, and show %s without losing localized copy",
    (key) => {
      const { unmount } = render(<Harness />);
      const label = `${en.PublicSiteEditor.pages[key].title} visibility`;
      const toggle = screen.getByRole("button", { name: label });
      expect(toggle).toHaveAttribute("aria-pressed", "true");
      const section = toggle.closest("section");
      const title = within(section).getByLabelText("Page title · English");
      fireEvent.change(title, { target: { value: `Edited ${key} title` } });
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-pressed", "false");
      expect(
        within(section).queryByLabelText("Page title · English"),
      ).not.toBeInTheDocument();
      const saved = readPatch();
      expect(saved.pages[key]).toMatchObject({
        visible: false,
        title: { en: `Edited ${key} title`, cs: `Saved ${key} Czech title` },
        description: { en: `Saved ${key} introduction` },
      });
      expect(saved.header.hiddenItems).toEqual([]);
      unmount();
      render(
        <Harness
          initialDraft={normalizePublicSiteEditorDraft({ publicSite: saved })}
        />,
      );
      const restored = screen.getByRole("button", { name: label });
      expect(restored).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(restored);
      expect(restored).toHaveAttribute("aria-pressed", "true");
      expect(
        within(restored.closest("section")).getByLabelText(
          "Page title · English",
        ),
      ).toHaveValue(`Edited ${key} title`);
      expect(readPatch().pages[key].visible).toBe(true);
    },
  );

  it("disables all page visibility controls while the editor is busy", () => {
    render(<Harness disabled />);
    pageKeys.forEach((key) =>
      expect(
        screen.getByRole("button", {
          name: `${en.PublicSiteEditor.pages[key].title} visibility`,
        }),
      ).toBeDisabled(),
    );
  });

  it.each(pageKeys)(
    "removes hidden %s from public navigation without disabling its capability",
    (key) => {
      const tenant = normalizePublicTenant({
        publicCapabilities: capabilities,
        publicSite: { pages: { [key]: { visible: false } } },
      });
      expect(
        getPublicTenantNavigation(tenant).map((item) => item.key),
      ).not.toContain(key);
      expect(tenant.publicCapabilities).toMatchObject(capabilities);
      expect(isPublicTenantPageVisible(tenant, key)).toBe(false);
      expect(
        buildPublicSiteDraftPatch(tenant.publicSite).pages[key].visible,
      ).toBe(false);
    },
  );

  it("keeps legacy pages visible and independent from header-only hiding", () => {
    const tenant = normalizePublicTenant({
      publicCapabilities: capabilities,
      publicSite: { header: { hiddenItems: ["book"] } },
    });
    expect(
      pageKeys.every((key) => isPublicTenantPageVisible(tenant, key)),
    ).toBe(true);
    expect(getPublicTenantPrimaryAction(tenant)).toEqual({
      key: "book",
      href: "/book",
    });
    pageKeys.forEach((key) =>
      expect(tenant.publicSite.pages[key].visible).toBe(true),
    );
  });

  it("uses a visible primary action and falls back to registration when every offer page is hidden", () => {
    const tenant = {
      publicCapabilities: capabilities,
      publicSite: {
        pages: { book: { visible: false } },
        header: { primaryCta: "book" },
      },
    };
    expect(getPublicTenantPrimaryAction(tenant)).toEqual({
      key: "courses",
      href: "/courses",
    });
    tenant.publicSite.pages = Object.fromEntries(
      pageKeys.map((key) => [key, { visible: false }]),
    );
    expect(getPublicTenantNavigation(tenant)).toEqual([]);
    expect(getPublicTenantPrimaryAction(tenant)).toEqual({
      key: "register",
      href: "/register",
    });
    tenant.publicCapabilities = { ...capabilities, registration: false };
    expect(getPublicTenantPrimaryAction(tenant)).toBeNull();
  });
});
