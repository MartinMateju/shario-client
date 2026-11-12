import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const readSource = (relativePath) =>
  readFileSync(join(repositoryRoot, relativePath), "utf8");

const adoptionPaths = [
  "src/components/headers/Brand.js",
  "src/components/dashboard/DashboardSidebar.js",
  "src/components/Marketing/MarketingPageShell.js",
  "src/components/public-tenant/PublicTenantNotFound.js",
];
const sharedBrandPaths = [
  "src/components/auth/PlatformAuthHeader.js",
  "src/components/onboarding/OnboardingHeader.js",
];

describe("Shario logo adoption", () => {
  it("keeps the visual wordmark implementation in one component", () => {
    for (const relativePath of adoptionPaths) {
      const source = readSource(relativePath);

      expect(source, relativePath).toContain(
        'import SkabLogo from "@/components/brand/SkabLogo";',
      );
      expect(source, relativePath).toContain("<SkabLogo");
      expect(source, relativePath).not.toMatch(
        /skab\s*<span[^>]*>[\s\S]*?\.io[\s\S]*?<\/span>/,
      );
      expect(source, relativePath).not.toMatch(
        /<span[^>]*text-accent(?:-text)?[^>]*>\.<\/span>/,
      );
    }

    for (const relativePath of sharedBrandPaths) {
      const source = readSource(relativePath);

      expect(source, relativePath).toContain(
        'import Brand from "@/components/headers/Brand";',
      );
      expect(source, relativePath).toContain("<Brand");
      expect(source, relativePath).not.toContain("<SkabLogo");
    }
  });

  it("uses the compact logo when the workspace sidebar is collapsed", () => {
    const sidebarSource = readSource(
      "src/components/dashboard/DashboardSidebar.js",
    );

    expect(sidebarSource).toMatch(
      /<SkabLogo\s+variant=\{collapsed \? "compact" : "full"\}[^>]*\/>/,
    );
    expect(sidebarSource).not.toContain("function Brand(");
  });
});
