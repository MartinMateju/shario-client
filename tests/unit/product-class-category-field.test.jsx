import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ClassCategoryField from "@/components/products/ClassCategoryField";

const categoryApi = vi.hoisted(() => ({
  query: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetProductClassCategoriesQuery: (...args) => categoryApi.query(...args),
  useCreateProductClassCategoryMutation: () => [
    categoryApi.create,
    { isLoading: false },
  ],
  useDeleteProductClassCategoryMutation: () => [
    categoryApi.remove,
    { isLoading: false },
  ],
}));

const labels = {
  "form.classCategory": "Class category",
  "form.classCategoryHelp": "Customers browse with this category",
  "form.classCategoryNone": "No category",
  "form.classCategoryLegacy": "Legacy category",
  "form.classCategoryManage": "Manage categories",
  "form.classCategoryManageClose": "Done",
  "form.classCategoryManagerTitle": "Class categories",
  "form.classCategoryManagerHelp": "Manage reusable categories",
  "form.classCategoryNew": "New category name",
  "form.classCategoryPlaceholder": "For example, Wheel throwing",
  "form.classCategoryAdd": "Add category",
  "form.classCategoryAdding": "Adding…",
  "form.classCategoryLoading": "Loading categories…",
  "form.classCategoryLoadError": "Categories could not be loaded",
  "form.classCategoryRetry": "Try again",
  "form.classCategoryEmpty": "No categories yet",
  "form.classCategoryList": "Managed class categories",
  "form.classCategoryProductCount": "Usage count",
  "form.classCategoryDelete": "Delete category",
  "form.classCategoryDeleteTitle": "Delete class category?",
  "form.classCategoryDeleteMessage": "Delete this category?",
  "form.classCategoryDeleteConfirm": "Delete category",
  "form.classCategoryInUse": "Category in use",
  "form.classCategoryNameRequired": "Enter a category name",
  "form.classCategoryDuplicate": "Category already exists",
  "form.classCategoryRequestError": "Category request failed",
  "form.cancel": "Cancel",
};

const t = (key) => labels[key] || key;

describe("ClassCategoryField", () => {
  beforeEach(() => {
    categoryApi.query.mockReset();
    categoryApi.create.mockReset();
    categoryApi.remove.mockReset();
    categoryApi.query.mockReturnValue({
      data: [
        { id: "wheel", name: "Wheel throwing", productCount: 2 },
        { id: "modeling", name: "Modeling", productCount: 0 },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    categoryApi.create.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          id: "glazing",
          name: "Glazing",
          productCount: 0,
        }),
    }));
    categoryApi.remove.mockImplementation(() => ({
      unwrap: () => Promise.resolve({ id: "modeling", name: "Modeling" }),
    }));
  });

  it("creates a managed category and selects its canonical name", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ClassCategoryField value="" onChange={onChange} t={t} />);

    await user.click(screen.getByRole("button", { name: "Manage categories" }));
    await user.type(screen.getByLabelText("New category name"), "  Glazing  ");
    await user.click(screen.getByRole("button", { name: "Add category" }));

    await waitFor(() =>
      expect(categoryApi.create).toHaveBeenCalledWith({ name: "Glazing" }),
    );
    expect(onChange).toHaveBeenCalledWith("Glazing");
  });

  it("shows the managed option for a legacy-equivalent category spelling", () => {
    render(
      <ClassCategoryField value="WHEEL THROWING" onChange={vi.fn()} t={t} />,
    );

    expect(screen.getByLabelText("Class category")).toHaveValue(
      "Wheel throwing",
    );
  });

  it("surfaces a collapsed load failure, disables category controls, and retries", async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    categoryApi.query.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });

    render(<ClassCategoryField value="" onChange={vi.fn()} t={t} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Categories could not be loaded",
    );
    expect(screen.getByLabelText("Class category")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Manage categories" }));
    expect(screen.getByLabelText("New category name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add category" })).toBeDisabled();
  });

  it("protects categories in use and confirms deletion of an unused category", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ClassCategoryField value="Modeling" onChange={onChange} t={t} />);

    await user.click(screen.getByRole("button", { name: "Manage categories" }));
    const categoryRows = screen.getAllByRole("listitem");
    const inUseDelete = within(categoryRows[0]).getByRole("button", {
      name: "Delete category",
    });
    const unusedDelete = within(categoryRows[1]).getByRole("button", {
      name: "Delete category",
    });

    expect(inUseDelete).toHaveAttribute("aria-disabled", "true");
    expect(inUseDelete).toHaveAccessibleDescription("Category in use");
    expect(within(categoryRows[0]).getByText("Category in use")).toBeVisible();
    await user.click(inUseDelete);
    expect(categoryApi.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(unusedDelete);
    expect(
      screen.getByRole("alertdialog", { name: "Delete class category?" }),
    ).toBeVisible();
    await user.click(
      within(
        screen.getByRole("alertdialog", { name: "Delete class category?" }),
      ).getByRole("button", { name: "Delete category" }),
    );

    await waitFor(() =>
      expect(categoryApi.remove).toHaveBeenCalledWith("modeling"),
    );
    expect(onChange).toHaveBeenCalledWith("");
  });
});
