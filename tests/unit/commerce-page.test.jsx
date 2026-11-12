import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import CommercePage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/commerce/page";

describe("legacy commerce page", () => {
  it("hands the route off to the permission-aware finance index", async () => {
    render(<CommercePage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/app/finance");
    });
  });
});
