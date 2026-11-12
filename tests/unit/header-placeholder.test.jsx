import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "/", params: {} }));

vi.mock("next/navigation", () => ({
  useParams: () => route.params,
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => route.pathname,
}));

import HeaderPlaceholder from "@/components/headers/HeaderPlaceholder";

const renderPlaceholder = () =>
  render(<HeaderPlaceholder />).container.querySelector("header");

describe("HeaderPlaceholder", () => {
  beforeEach(() => {
    route.pathname = "/";
    route.params = {};
  });

  it("matches the homepage header offsets before Header mounts", () => {
    const header = renderPlaceholder();

    expect(header).toHaveAttribute("data-platform-header");
    expect(header).toHaveAttribute("data-home-header");
    expect(header).toHaveAttribute("aria-hidden", "true");
    expect(header).toBeEmptyDOMElement();
  });

  it("matches the compact platform header on marketing pages", () => {
    route.pathname = "/pricing";

    const header = renderPlaceholder();

    expect(header).toHaveAttribute("data-platform-header");
    expect(header).not.toHaveAttribute("data-home-header");
  });

  it.each(["/login", "/register"])(
    "matches the platform auth header on %s",
    (pathname) => {
      route.pathname = pathname;

      const header = renderPlaceholder();

      expect(header).toHaveAttribute("data-platform-auth-header");
      expect(header).not.toHaveAttribute("data-platform-header");
    },
  );

  it.each([
    ["tenant pages", "/", { tenantSlug: "studio-alpha" }],
    ["tenant portal", "/portal", { tenantSlug: "studio-alpha" }],
    [
      "nested tenant portal",
      "/portal/bookings",
      { tenantSlug: "studio-alpha" },
    ],
    ["the workspace", "/app/calendar", {}],
  ])("renders nothing on %s", (_label, pathname, params) => {
    route.pathname = pathname;
    route.params = params;

    expect(renderPlaceholder()).toBeNull();
  });
});
