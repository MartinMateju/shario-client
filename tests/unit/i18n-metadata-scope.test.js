import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("localized metadata scope", () => {
  it("keeps platform-home canonical URLs out of the shared route layout", () => {
    const layout = read("src/app/[locale]/layout.js");
    const homePage = read("src/app/[locale]/page.js");

    expect(layout).not.toContain("canonical:");
    expect(layout).not.toContain("languageAlternates");
    expect(layout).not.toContain("openGraph:");

    expect(homePage).toContain("canonical:");
    expect(homePage).toContain("languageAlternates");
    expect(homePage).toContain("openGraph:");
  });
});
