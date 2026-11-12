import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import { CustomerPortalFields } from "@/components/public-site-editor/PublicSiteEditorFields";
import {
  arePublicSiteDraftsEqual,
  buildPublicSiteDraftPatch,
  normalizePublicSiteEditorDraft,
  replacePublicSiteValue,
} from "@/components/public-site-editor/publicSiteEditor.utils";
import enMessages from "@/messages/en.json";

const normalizeDraft = (customerPortal = {}) =>
  normalizePublicSiteEditorDraft({ publicSite: { customerPortal } });

function Editor({ customerPortal }) {
  const [draft, setDraft] = useState(() => normalizeDraft(customerPortal));
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <CustomerPortalFields
        draft={draft}
        onChange={(path, value) =>
          setDraft((current) => replacePublicSiteValue(current, path, value))
        }
      />
      <output data-testid="portal-settings">
        {JSON.stringify(draft.customerPortal)}
      </output>
    </NextIntlClientProvider>
  );
}

const readSettings = () =>
  JSON.parse(screen.getByTestId("portal-settings").textContent);

describe("customer portal editor visibility", () => {
  it("keeps legacy pages and the Courses page and navigation available by default", () => {
    const draft = normalizeDraft();
    expect(draft.customerPortal.pages).toEqual({
      calendar: { enabled: true },
      courses: { enabled: true },
      memberships: { enabled: true },
      vouchers: { enabled: true },
      studioGuide: { enabled: true },
      bookings: { enabled: true },
      credits: { enabled: true },
      invoices: { enabled: true },
      account: { enabled: true },
      notifications: { enabled: true },
      waitlists: { enabled: true },
    });
    expect(draft.customerPortal.navigation).toEqual({
      bookSession: { visible: true },
      courses: { visible: true },
      memberships: { visible: true },
      giftVouchers: { visible: true },
      studioGuide: { visible: true },
    });
    expect(buildPublicSiteDraftPatch(draft).customerPortal).toEqual(
      draft.customerPortal,
    );
  });

  it("round-trips explicit settings and rejects unknown configuration keys", () => {
    const configured = {
      pages: {
        calendar: { enabled: false, url: "https://unexpected.example" },
        courses: { enabled: false },
        memberships: { enabled: false },
        bookings: { enabled: true },
        unsupported: { enabled: false },
      },
      navigation: {
        bookSession: { visible: true },
        courses: { visible: false },
        memberships: { visible: false },
        unsupported: { visible: false },
      },
    };
    const draft = normalizeDraft(configured);
    const patch = buildPublicSiteDraftPatch(draft);
    expect(patch.customerPortal.pages.calendar).toEqual({ enabled: false });
    expect(patch.customerPortal.pages.courses).toEqual({ enabled: false });
    expect(patch.customerPortal.pages.memberships).toEqual({ enabled: false });
    expect(patch.customerPortal.pages).not.toHaveProperty("unsupported");
    expect(patch.customerPortal.navigation).not.toHaveProperty("unsupported");
    expect(patch.customerPortal.navigation.bookSession).toEqual({
      visible: true,
    });
    expect(patch.customerPortal.navigation.memberships).toEqual({
      visible: false,
    });
    expect(patch.customerPortal.navigation.courses).toEqual({ visible: false });
    expect(normalizeDraft(patch.customerPortal)).toEqual(draft);
    expect(arePublicSiteDraftsEqual(normalizeDraft(), draft)).toBe(false);
    expect(
      arePublicSiteDraftsEqual(draft, normalizeDraft(patch.customerPortal)),
    ).toBe(true);
  });

  it("keeps page access independent from hiding its top navigation link", () => {
    render(<Editor />);
    expect(
      screen.getByRole("heading", { name: "Customer pages" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Top navigation links" }),
    ).toBeVisible();

    const link = screen.getByRole("button", {
      name: "Show Book a session in top navigation",
    });
    fireEvent.click(link);
    expect(link).toHaveAttribute("aria-pressed", "false");
    expect(readSettings().pages.calendar.enabled).toBe(true);
    expect(readSettings().navigation.bookSession.visible).toBe(false);
  });

  it.each([true, false])(
    "retains the saved navigation preference %s while its page is disabled",
    (visible) => {
      render(
        <Editor
          customerPortal={{ navigation: { bookSession: { visible } } }}
        />,
      );
      const page = screen.getByRole("button", {
        name: "Enable Booking calendar",
      });
      const link = screen.getByRole("button", {
        name: "Show Book a session in top navigation",
      });

      fireEvent.click(page);
      expect(page).toHaveAttribute("aria-pressed", "false");
      expect(link).toBeDisabled();
      expect(link).toHaveAttribute("aria-pressed", "false");
      expect(link).toHaveAccessibleDescription(
        "Enable Booking calendar to change this link. Your previous choice is saved.",
      );
      fireEvent.click(link);
      expect(readSettings().navigation.bookSession.visible).toBe(visible);
      expect(readSettings().pages.calendar.enabled).toBe(false);

      fireEvent.click(page);
      expect(link).toBeEnabled();
      expect(link).toHaveAttribute("aria-pressed", String(visible));
      expect(readSettings().pages.calendar.enabled).toBe(true);
    },
  );
});
