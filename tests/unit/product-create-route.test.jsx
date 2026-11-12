import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/PermissionBoundary", () => ({
  default: ({ children, permission }) => (
    <div data-testid="permission" data-permission={permission}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/products/ProductCreatePage", () => ({
  default: () => <div data-testid="product-create-page" />,
}));

import NewProductPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/products/new/page";

describe("new product route", () => {
  it("requires product management permission and renders a full page", () => {
    render(<NewProductPage />);

    expect(screen.getByTestId("permission")).toHaveAttribute(
      "data-permission",
      "products.manage",
    );
    expect(screen.getByTestId("product-create-page")).toBeInTheDocument();
  });
});
