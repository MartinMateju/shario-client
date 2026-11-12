import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProductCreatePage from "@/components/products/ProductCreatePage";

const state = vi.hoisted(() => ({
  guided: false,
  plan: null,
  planVersion: null,
  modules: { bookings: true, courses: true, vouchers: true },
  replace: vi.fn(),
  searchParams: new URLSearchParams("category=classes&productType=class"),
  refreshAndContinue: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => {
    const labels = {
      eyebrow: "Catalog management",
      "form.kinds.classes.createTitle": "Create class",
      "form.kinds.classes.createDescription":
        "Set up a class. Dates are managed in the calendar.",
      "form.requiredNote": "Fields marked with * are required.",
      "form.backToCatalog": "Back to products & classes",
      "form.moduleUnavailableTitle": "Product creation is unavailable",
      "form.moduleUnavailableDescription": "Enable the courses module.",
    };
    return labels[key] || key;
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => state.searchParams,
}));

vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
}));

vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => ({
    modules: state.modules,
    plan: state.plan,
    planVersion: state.planVersion,
  }),
  selectCurrentWorkspaceAccess: () => ({ roleKey: "owner", status: "active" }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ replace: state.replace }),
}));

vi.mock("@/components/setup-center/useGuidedSetupStep", () => ({
  default: () => ({
    guided: state.guided,
    refreshAndContinue: state.refreshAndContinue,
    stepId: state.guided ? "bookable_offer" : "",
  }),
}));

vi.mock("@/components/products/ProductFormDialog", () => ({
  default: ({ onClose, onSaved, surface }) => (
    <form data-guided-form="product" data-surface={surface}>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        onClick={() => onSaved({ id: "class-1" }, "created")}
      >
        Save product
      </button>
    </form>
  ),
}));

describe("product create page", () => {
  beforeEach(() => {
    state.guided = false;
    state.plan = null;
    state.planVersion = null;
    state.modules = { bookings: true, courses: true, vouchers: true };
    state.searchParams = new URLSearchParams(
      "category=classes&productType=class",
    );
    state.replace.mockReset();
    state.refreshAndContinue.mockReset();
  });

  it("renders class creation as a dedicated responsive page", () => {
    render(<ProductCreatePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Create class" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      document.querySelector('[data-guided-form="product"]'),
    ).toHaveAttribute("data-surface", "page");
    expect(
      screen.getByRole("link", { name: /Back to products & classes/ }),
    ).toHaveAttribute("href", "/app/products?category=classes");
  });

  it("returns to the catalog with a one-shot success notice after creation", async () => {
    render(<ProductCreatePage />);

    fireEvent.click(screen.getByRole("button", { name: "Save product" }));

    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith(
        "/app/products?category=classes&created=1",
      ),
    );
  });

  it("does not allow a direct route to bypass a disabled module", () => {
    state.modules = { bookings: true, courses: false, vouchers: true };

    render(<ProductCreatePage />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Product creation is unavailable",
      }),
    ).toBeVisible();
    expect(document.querySelector('[data-guided-form="product"]')).toBeNull();
  });

  it("blocks Starter V3 Open Studio creation even with the bookings module enabled", () => {
    state.plan = "starter";
    state.planVersion = 3;
    state.searchParams = new URLSearchParams("category=openStudio");
    render(<ProductCreatePage />);
    expect(
      screen.getByRole("heading", { name: "openStudioPlan.title" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "openStudioPlan.action" }),
    ).toHaveAttribute("href", "/app/settings/billing");
    expect(screen.queryByRole("button", { name: "Save product" })).toBeNull();
  });

  it.each([1, 2])(
    "preserves historical Starter V%s Open Studio creation",
    (version) => {
      state.plan = "starter";
      state.planVersion = version;
      state.searchParams = new URLSearchParams("category=openStudio");
      render(<ProductCreatePage />);
      expect(
        screen.getByRole("button", { name: "Save product" }),
      ).toBeVisible();
    },
  );

  it("keeps Starter V3 class creation available", () => {
    state.plan = "starter";
    state.planVersion = 3;
    render(<ProductCreatePage />);
    expect(screen.getByRole("button", { name: "Save product" })).toBeVisible();
  });
});
