import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { PageImageFields } from "@/components/public-site-editor/PublicSiteEditorFields";
import {
  applyPublicSiteMediaUpload,
  arePublicSiteDraftsEqual,
  buildPublicSiteDraftPatch,
  normalizePublicSiteEditorDraft,
  replacePublicSiteValue,
} from "@/components/public-site-editor/publicSiteEditor.utils";
import {
  PUBLIC_TENANT_PAGE_IMAGE_KEYS,
  PUBLIC_TENANT_PAGE_IMAGE_MEDIA_SLOTS,
  getCustomerPortalPageImage,
} from "@/components/public-tenant/publicTenantPageImages";
import { buildPublicSiteMediaRequest } from "@/lib/features/publicSite/publicSiteApiSlice";
import messages from "@/messages/en.json";

const normalizeDraft = (pageImages = {}) =>
  normalizePublicSiteEditorDraft({
    publicSite: {
      branding: { coverImageUrl: "https://images.example.test/cover.webp" },
      customerPortal: {
        pageImages,
        courses: {
          locations: [
            {
              locationId: "studio-a",
              heroImageUrl: "https://images.example.test/studio-a.webp",
            },
          ],
        },
      },
    },
  });

function ImageEditor({ onUpload, onPageChange }) {
  const [draft, setDraft] = useState(() =>
    normalizeDraft({
      courses: "https://images.example.test/courses.webp",
      vouchers: "https://images.example.test/vouchers.webp",
    }),
  );
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <PageImageFields
        draft={draft}
        onChange={(path, value) =>
          setDraft((current) => replacePublicSiteValue(current, path, value))
        }
        onUpload={onUpload}
        onPageChange={onPageChange}
        uploadState={{ busy: false, resetToken: 0 }}
      />
      <output data-testid="page-images">
        {JSON.stringify(draft.customerPortal.pageImages)}
      </output>
    </NextIntlClientProvider>
  );
}

describe("independent public and customer page images", () => {
  it("round-trips all supported pages, discards unsafe URLs and excludes booking calendars", () => {
    const images = Object.fromEntries(
      PUBLIC_TENANT_PAGE_IMAGE_KEYS.map((key) => [
        key,
        `https://images.example.test/${key}.webp`,
      ]),
    );
    const draft = normalizeDraft({
      ...images,
      book: "/book.webp",
      calendar: "/calendar.webp",
      unsafe: "javascript:alert(1)",
    });
    expect(Object.keys(draft.customerPortal.pageImages)).toHaveLength(
      PUBLIC_TENANT_PAGE_IMAGE_KEYS.length,
    );
    expect(buildPublicSiteDraftPatch(draft).customerPortal.pageImages).toEqual(
      images,
    );
    expect(draft.customerPortal.pageImages).not.toHaveProperty("book");
    expect(draft.customerPortal.pageImages).not.toHaveProperty("calendar");
    const invalid = normalizeDraft({
      courses: "javascript:alert(1)",
      vouchers: "https://user:password@images.example.test/a.webp",
      products: "//host.test/a.webp",
      knowledge: "/images/guide.webp",
    });
    expect(invalid.customerPortal.pageImages.courses).toBe("");
    expect(invalid.customerPortal.pageImages.vouchers).toBe("");
    expect(invalid.customerPortal.pageImages.products).toBe("");
    expect(invalid.customerPortal.pageImages.knowledge).toBe(
      "/images/guide.webp",
    );
  });

  it("clears one image without restoring a shared cover or changing another page or studio override", () => {
    const draft = normalizeDraft({
      courses: "/images/courses.webp",
      vouchers: "/images/vouchers.webp",
    });
    const cleared = replacePublicSiteValue(
      draft,
      "customerPortal.pageImages.courses",
      "",
    );
    const saved = buildPublicSiteDraftPatch(cleared);
    expect(arePublicSiteDraftsEqual(draft, cleared)).toBe(false);
    expect(getCustomerPortalPageImage({ publicSite: saved }, "courses")).toBe(
      "",
    );
    expect(getCustomerPortalPageImage({ publicSite: saved }, "vouchers")).toBe(
      "/images/vouchers.webp",
    );
    expect(getCustomerPortalPageImage({ publicSite: saved }, "book")).toBe("");
    expect(saved.customerPortal.courses).toEqual(draft.customerPortal.courses);
    expect(draft.customerPortal.pageImages.courses).toBe(
      "/images/courses.webp",
    );
  });

  it.each(PUBLIC_TENANT_PAGE_IMAGE_KEYS)(
    "binds the %s upload to its fixed page slot and preserves other draft content",
    (key) => {
      const file = new File(["photo"], "hero.webp", { type: "image/webp" });
      const request = buildPublicSiteMediaRequest({
        slot: PUBLIC_TENANT_PAGE_IMAGE_MEDIA_SLOTS[key],
        file,
        revision: 8,
      });
      expect(request.url).toBe(
        `/tenants/current/settings/public-site/media/${key}Hero`,
      );
      expect(request.body.get("revision")).toBe("8");
      expect(request.body.get("image")).toBe(file);
      expect(request.body.has("locationId")).toBe(false);
      const draft = normalizeDraft({ memberships: "/images/plans.webp" });
      const updated = applyPublicSiteMediaUpload(draft, {
        path: `customerPortal.pageImages.${key}`,
        url: "/images/new.webp",
      });
      expect(updated.customerPortal.pageImages[key]).toBe("/images/new.webp");
      expect(updated.branding).toEqual(draft.branding);
      expect(updated.customerPortal.courses).toEqual(
        draft.customerPortal.courses,
      );
      if (key !== "memberships")
        expect(updated.customerPortal.pageImages.memberships).toBe(
          "/images/plans.webp",
        );
    },
  );

  it("selects, changes and removes each page image independently and sends uploads to that page", () => {
    const onUpload = vi.fn(() => true);
    const onPageChange = vi.fn();
    const { container } = render(
      <ImageEditor onUpload={onUpload} onPageChange={onPageChange} />,
    );
    expect(screen.getAllByRole("option")).toHaveLength(
      PUBLIC_TENANT_PAGE_IMAGE_KEYS.length,
    );
    fireEvent.change(screen.getByLabelText("Page to customize"), {
      target: { value: "vouchers" },
    });
    expect(onPageChange).toHaveBeenLastCalledWith("vouchers");
    const field = container.querySelector(
      '[data-public-site-field-path="customerPortal.pageImages.vouchers"]',
    );
    expect(field).toBeInTheDocument();
    fireEvent.change(field.querySelector('input[type="url"]'), {
      target: { value: "https://images.example.test/new-voucher.webp" },
    });
    let images = JSON.parse(screen.getByTestId("page-images").textContent);
    expect(images.vouchers).toBe(
      "https://images.example.test/new-voucher.webp",
    );
    expect(images.courses).toBe("https://images.example.test/courses.webp");
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    images = JSON.parse(screen.getByTestId("page-images").textContent);
    expect(images.vouchers).toBe("");
    expect(images.courses).toBe("https://images.example.test/courses.webp");
    const file = new File(["photo"], "voucher.webp", { type: "image/webp" });
    fireEvent.change(field.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });
    expect(onUpload).toHaveBeenLastCalledWith({
      file,
      slot: "vouchersHero",
      path: "customerPortal.pageImages.vouchers",
    });
  });
});
