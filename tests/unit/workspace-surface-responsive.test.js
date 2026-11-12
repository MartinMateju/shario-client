import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const readComponent = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), "src", relativePath), "utf8");

describe("nested workspace surfaces", () => {
  it("lets the workspace shell own the Inventory page canvas and mobile gutters", () => {
    const source = readComponent(
      "components/views/inventory/InventoryManagementPage.js",
    );

    expect(source).toContain('<section className="min-w-0">');
    expect(source).not.toContain(
      '<section className="bg-[#F7F5F2] px-4 py-6 sm:px-6 lg:px-8">',
    );
    expect(source).toContain(
      "flex w-full min-w-0 flex-col items-stretch gap-2 sm:w-auto",
    );
    expect(source).toContain("w-full min-w-0 max-w-full rounded-full border");
    expect(source).toContain("w-full max-w-full sm:w-auto");
  });

  it("lets the workspace shell own every Staff Planning state canvas", () => {
    const source = readComponent(
      "components/views/staff_tasks/StaffTasksPage.js",
    );
    const shellOwnedSurfaces = source.match(/<section className="min-w-0">/g);

    expect(shellOwnedSurfaces).toHaveLength(4);
    expect(source).not.toContain(
      '<section className="min-h-screen bg-[#F7F5F2] px-4 py-6 sm:px-6">',
    );
    expect(source).not.toContain('<section className="px-4 py-6 sm:px-6">');
    expect(source).toContain(
      '<div className="mx-auto min-w-0 max-w-[1540px]">',
    );
  });
});
