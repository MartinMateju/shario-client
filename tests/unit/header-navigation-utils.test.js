import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/features/cart/cartSlice", () => ({
  selectCurrentCart: (state) => state?.cart || [],
}));

import { isActivePath } from "@/components/headers/header.utils";

describe("header active navigation", () => {
  it("does not treat homepage fragments as active without a matching hash", () => {
    expect(isActivePath("/", "/#product")).toBe(false);
    expect(isActivePath("/", "/#pricing")).toBe(false);
    expect(isActivePath("/", "/#faq")).toBe(false);
  });

  it("matches a fragment only when both the path and hash match", () => {
    expect(isActivePath("/#product", "/#product")).toBe(true);
    expect(isActivePath("/#solutions", "/#product")).toBe(false);
    expect(isActivePath("/about#product", "/#product")).toBe(false);
    expect(
      isActivePath(
        "/portal?tab=my-work#details",
        "/portal?tab=studio-calendar#details",
      ),
    ).toBe(false);
    expect(
      isActivePath(
        "/portal?tab=studio-calendar#details",
        "/portal?tab=studio-calendar#details",
      ),
    ).toBe(true);
  });

  it("preserves plain-path and portal-tab matching", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/portal/bookings", "/portal/bookings")).toBe(true);
    expect(
      isActivePath(
        "/portal?tab=studio-calendar",
        "/portal?tab=studio-calendar",
      ),
    ).toBe(true);
    expect(
      isActivePath("/portal?tab=my-work", "/portal?tab=studio-calendar"),
    ).toBe(false);
  });

  it("keeps compact platform geometry scoped away from tenant headers", () => {
    const headerSource = readFileSync(
      resolve(process.cwd(), "src/components/headers/Header.js"),
      "utf8",
    );
    const actionSource = readFileSync(
      resolve(process.cwd(), "src/components/headers/DesktopActions.js"),
      "utf8",
    );
    const globalStyles = readFileSync(
      resolve(process.cwd(), "src/styles/globals.css"),
      "utf8",
    );

    expect(headerSource).toContain("data-platform-header");
    expect(headerSource).toMatch(
      /isTenantRoute\s*\?\s*["']h-\[78px\]["']\s*:\s*isHomeRoute\s*\?\s*["']h-16["']\s*:\s*["']h-\[72px\]["']/,
    );
    expect(headerSource).toContain("border-line/70 bg-surface shadow-none");
    expect(globalStyles).toMatch(
      /header\[data-platform-header\]\s*~\s*#page-content\s*\{\s*padding-top:\s*var\(--platform-header-height\);/,
    );
    expect(globalStyles).toMatch(/--platform-header-height:\s*4\.5rem;/);
    expect(actionSource).toContain(
      "hover:bg-white/75 hover:shadow-[0_6px_18px_rgba(17,17,15,0.05)]",
    );
    expect(actionSource).toMatch(
      /open\s*&&\s*["']bg-white\/75 shadow-\[0_6px_18px_/,
    );
  });
});
