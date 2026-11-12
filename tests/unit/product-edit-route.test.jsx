import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/auth/PermissionBoundary", () => ({
  default: ({ children, permission }) => (
    <div data-testid="permission" data-permission={permission}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/products/ProductEditPage", () => ({
  default: () => <div data-testid="product-edit-page" />,
}));

import EditProductPage from "@/app/[locale]/tenants/[tenantSlug]/app/(workspace)/products/[productId]/edit/page";

describe("edit product route", () => {
  it("requires product management permission and renders a full page", () => {
    render(<EditProductPage />);

    expect(screen.getByTestId("permission")).toHaveAttribute(
      "data-permission",
      "products.manage",
    );
    expect(screen.getByTestId("product-edit-page")).toBeInTheDocument();
  });
});
