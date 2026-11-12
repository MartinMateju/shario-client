import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("section=suppliers"),
}));

import AdminModuleTabs from "@/components/headers/admin/AdminModuleTabs";

describe("AdminModuleTabs section aliases", () => {
  it("opens the Inventory tab for the legacy suppliers section", () => {
    render(
      <AdminModuleTabs
        tabs={[
          { id: "automations", label: "Automations" },
          { id: "inventory", label: "Inventory" },
        ]}
        defaultTab="automations"
        sectionAliases={{ suppliers: "inventory" }}
      >
        <div>Inventory content</div>
      </AdminModuleTabs>,
    );

    expect(screen.getByRole("tab", { name: "Inventory" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Automations" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });
});
