import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (filePath) => readFileSync(join(root, filePath), "utf8");

describe("platform auth brush integration", () => {
  it("reuses one subtle, mobile-only brush field across account pages", () => {
    const field = read("src/components/auth/PlatformAuthCanvasBrushes.js");

    expect(field).toContain("data-platform-auth-brushes");
    expect(field).toContain(
      "pointer-events-none absolute inset-0 z-0 overflow-hidden xl:hidden",
    );
    expect(field.match(/<BrushStrokeSwash\b/g) || []).toHaveLength(2);
    expect(field).toContain('texture="loaded"');
    expect(field).toContain('texture="rake"');
    expect(field).toContain('color="#263cd5"');
    expect(field).toContain('color="#ad4d32"');
    expect(field).toContain("sm:opacity-[0.12]");
    expect(field).toContain("sm:opacity-[0.10]");
    expect(field).not.toMatch(/(?:sm:|md:)?opacity-\[(?:0\.[2-9]|1)/);

    for (const path of [
      "src/app/[locale]/login/page.js",
      "src/app/[locale]/register/page.js",
    ]) {
      const page = read(path);

      expect(page, path).toContain(
        'import PlatformAuthCanvasBrushes from "@/components/auth/PlatformAuthCanvasBrushes";',
      );
      expect(page, path).toContain("<PlatformAuthCanvasBrushes />");
      expect(page, path).toContain("relative isolate");
      expect(page, path).toContain("relative z-10");
    }
  });

  it("keeps onboarding's paper styling scoped to its own surface", () => {
    const page = read(
      "src/app/[locale]/tenants/[tenantSlug]/app/onboarding/page.js",
    );
    const sidebar = read("src/components/onboarding/OnboardingSidebar.js");

    expect(page).toContain('import "@/styles/publicStudioTheme.css"');
    expect(page).toContain("data-skab-public-surface");
    expect(page).not.toContain("PlatformAuthCanvasBrushes");
    expect(sidebar).toContain('import styles from "./onboarding.module.css"');
    expect(sidebar).not.toContain("BrushStrokeSwash");
    expect(sidebar).not.toContain("data-brand-orb");
  });
});
