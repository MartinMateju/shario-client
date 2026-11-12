import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProductEditPage from "@/components/products/ProductEditPage";

const state = vi.hoisted(() => ({
  params: { productId: "class-1" },
  searchParams: new URLSearchParams("category=openStudio"),
  replace: vi.fn(),
  guided: false,
  refreshAndContinue: vi.fn(),
  query: null,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => (key) => {
    const labels = {
      eyebrow: "Catalog management",
      loading: "Loading products…",
      loadError: "We couldn’t load your products.",
      retry: "Try again",
      "form.editTitle": "Edit product",
      "form.editDescription": "Update catalog details.",
      "form.kinds.classes.editTitle": "Edit class",
      "form.kinds.classes.editDescription": "Update class details.",
      "form.requiredNote": "Fields marked with * are required.",
      "form.backToCatalog": "Back to products & classes",
      "form.editNotFoundTitle": "Product unavailable",
      "form.editNotFoundDescription": "This product could not be found.",
    };
    return labels[key] || key;
  },
}));

vi.mock("next/navigation", () => ({
  useParams: () => state.params,
  useSearchParams: () => state.searchParams,
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
    stepId: state.guided ? "bookable_offer" : "",
    refreshAndContinue: state.refreshAndContinue,
  }),
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetAllProductsQuery: () => state.query,
}));

vi.mock("@/components/products/ProductFormDialog", () => ({
  default: ({ catalogKind, onClose, onSaved, product, surface }) => (
    <section
      data-testid="product-edit-form"
      data-category={catalogKind}
      data-guided-form="product"
      data-surface={surface}
    >
      <span>{product.classCategory}</span>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
      <button type="button" onClick={() => onSaved(product, "updated")}>
        Save changes
      </button>
    </section>
  ),
}));

const classProduct = {
  id: "class-1",
  name: "Wheel basics",
  kind: "class",
  type: "course",
  classCategory: "Wheel throwing",
  price: 1200,
  maxNumberOfParticipants: 8,
};

describe("product edit page", () => {
  beforeEach(() => {
    state.params = { productId: "class-1" };
    state.searchParams = new URLSearchParams("category=openStudio");
    state.replace.mockReset();
    state.guided = false;
    state.refreshAndContinue.mockReset();
    state.query = {
      data: [classProduct],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    };
  });

  it("renders an existing class on a dedicated page with its category", () => {
    render(<ProductEditPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Edit class" }),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("product-edit-form")).toHaveAttribute(
      "data-surface",
      "page",
    );
    expect(screen.getByTestId("product-edit-form")).toHaveAttribute(
      "data-category",
      "classes",
    );
    expect(screen.getByText("Wheel throwing")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Back to products & classes" }),
    ).toHaveAttribute("href", "/app/products?category=classes");
  });

  it("returns to the canonical catalog with an update notice after saving", async () => {
    render(<ProductEditPage />);

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(state.replace).toHaveBeenCalledWith(
        "/app/products?category=classes&updated=1",
      ),
    );
  });

  it("keeps guided edits in the setup flow", async () => {
    state.guided = true;
    state.searchParams = new URLSearchParams(
      "category=classes&setupStep=bookable_offer",
    );

    render(<ProductEditPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(state.refreshAndContinue).toHaveBeenCalledWith({
        metadata: { form: "product", action: "updated" },
      }),
    );
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("shows a loading state before mounting the initialized form", () => {
    state.query = {
      data: undefined,
      isLoading: true,
      isFetching: true,
      isError: false,
      refetch: vi.fn(),
    };

    render(<ProductEditPage />);

    expect(screen.getByText("Loading products…")).toBeInTheDocument();
    expect(screen.queryByTestId("product-edit-form")).toBeNull();
  });

  it("keeps the initialized form mounted during a background refetch", () => {
    state.query = {
      ...state.query,
      isFetching: true,
    };

    render(<ProductEditPage />);

    expect(screen.getByTestId("product-edit-form")).toBeVisible();
    expect(screen.queryByText("Loading products…")).toBeNull();
  });

  it("surfaces a load failure and retries the workspace query", () => {
    const refetch = vi.fn();
    state.query = {
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch,
    };

    render(<ProductEditPage />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn’t load your products.",
    );
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("does not fall back to another product when the route id is missing", () => {
    state.params = { productId: "missing" };

    render(<ProductEditPage />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Product unavailable",
      }),
    ).toBeVisible();
    expect(screen.queryByTestId("product-edit-form")).toBeNull();
  });
});
