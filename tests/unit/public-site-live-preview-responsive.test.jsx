import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", async () => {
  const { withMessageCatalogs } = await import("@/test/withMessageCatalogs");
  return withMessageCatalogs();
});

import PublicSiteLivePreview from "@/components/public-site-editor/PublicSiteLivePreview";

const baseProps = {
  publicSite: { branding: { displayName: "Clay House" } },
  tenantName: "Clay House",
  tenantSlug: "clay-house",
  capabilities: {},
  locale: "en",
  page: "home",
  previewData: {},
};

describe("PublicSiteLivePreview responsive viewport", () => {
  it.each([
    ["desktop", "1440px"],
    ["tablet", "768px"],
    ["mobile", "390px"],
  ])("uses the real %s production width", (device, width) => {
    render(<PublicSiteLivePreview {...baseProps} device={device} />);

    expect(screen.getByTitle("Clay House production preview")).toHaveStyle({
      width,
    });
    expect(
      screen.getByTitle("Clay House production preview").parentElement,
    ).toHaveAttribute("data-preview-device", device);
  });
});
