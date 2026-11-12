import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProductFormDialog from "@/components/products/ProductFormDialog";
const productApi = vi.hoisted(() => ({
  dispatch: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  uploadAsset: vi.fn(),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),
  categoriesQuery: vi.fn(),
  productsQuery: vi.fn(),
  refetchProducts: vi.fn(),
  preview: vi.fn(() => ({
    unwrap: () =>
      Promise.resolve({
        svg: '<svg xmlns="http://www.w3.org/2000/svg" />',
      }),
    abort: vi.fn(),
  })),
  design: {
    version: 1,
    layout: "split",
    colors: {
      background: "#F5EEE6",
      text: "#242C28",
      accent: "#405747",
    },
    typography: {
      font: "sans",
      titleWeight: "bold",
    },
    content: {
      brandName: "Studio",
      title: "Gift voucher",
      subtitle: "",
      message: "",
      footer: "",
    },
    assets: {
      logoKey: null,
      imageKey: null,
    },
    imageFit: "cover",
  },
}));
const profileApi = vi.hoisted(() => ({
  available: vi.fn(),
}));
const locationApi = vi.hoisted(() => ({
  locations: [],
}));
const authState = vi.hoisted(() => ({
  tenant: {
    settings: {
      currency: "CZK",
    },
  },
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key, values) =>
    key === "guided.saveAndContinue"
      ? "Save and continue"
      : key === "assets.removeLabel"
        ? `Remove ${values.asset}`
        : key,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }) => <a {...props}>{children}</a>,
}));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(),
  useDispatch: () => productApi.dispatch,
}));
vi.mock("@/lib/features/auth/authSlice", () => ({
  selectCurrentTenant: () => authState.tenant,
  selectCurrentWorkspaceAccess: () => ({
    roleKey: "owner",
    status: "active",
  }),
  selectCurrentUser: () => ({
    tenantId: "507f1f77bcf86cd799439099",
  }),
}));
vi.mock("@/lib/features/studio/studioContextSlice", () => ({
  selectActiveStudioId: () => "507f1f77bcf86cd799439022",
  setActiveStudioId: (payload) => ({
    type: "studio/select",
    payload,
  }),
}));
vi.mock("@/lib/features/locations/locationApiSlice", () => ({
  useGetLocationsQuery: () => ({
    data: {
      locations: locationApi.locations,
    },
  }),
}));
vi.mock("@/lib/features/products/productsApiSlice", () => ({
  useGetAllProductsQuery: (...args) => productApi.productsQuery(...args),
  useGetVoucherDesignDefaultsQuery: () => ({
    data: {
      design: productApi.design,
    },
    isLoading: false,
  }),
  useUploadVoucherDesignAssetMutation: () => [
    productApi.uploadAsset,
    {
      isLoading: false,
    },
  ],
  usePreviewVoucherDesignMutation: () => [
    productApi.preview,
    {
      isLoading: false,
    },
  ],
  useDownloadVoucherDesignPdfMutation: () => [
    vi.fn(),
    {
      isLoading: false,
    },
  ],
  useAddNewProductMutation: () => [
    productApi.create,
    {
      isLoading: false,
    },
  ],
  useUpdateProductMutation: () => [
    productApi.update,
    {
      isLoading: false,
    },
  ],
  useGetProductClassCategoriesQuery: (...args) =>
    productApi.categoriesQuery(...args),
  useCreateProductClassCategoryMutation: () => [
    productApi.createCategory,
    {
      isLoading: false,
    },
  ],
  useDeleteProductClassCategoryMutation: () => [
    productApi.deleteCategory,
    {
      isLoading: false,
    },
  ],
}));
vi.mock("@/lib/features/studioFlowProfiles/studioFlowProfilesApiSlice", () => ({
  useGetAvailablePiecePricingProfilesQuery: (...args) => {
    const result = profileApi.available(...args);
    return {
      currentData: result.data,
      ...result,
    };
  },
}));
vi.mock("@/components/modals/ConformationModal", () => ({
  default: () => null,
}));
const labels = {
  retry: "Try again",
  "openStudioLimit.title": "One Open Studio per location",
  "openStudioLimit.existing":
    "This location already has an Open Studio product. Edit or reactivate it instead of creating another.",
  "openStudioLimit.edit": "Edit Open Studio",
  "openStudioLimit.checking": "Checking this location’s Open Studio product…",
  "openStudioLimit.checkError":
    "We could not check this location’s Open Studio product. Try again before saving.",
  eyebrow: "Catalog management",
  "form.close": "Close",
  "form.name": "Product name",
  "form.location": "Studio location",
  "form.type": "Product kind",
  "form.price": "Price",
  "form.currency": "Currency",
  "form.currencyHelp": "Workspace currency",
  "form.bookingMode": "Open Studio booking mode",
  "form.bookingModeHelp": "Choose whether people share the time slot.",
  "form.bookingModes.public.label": "Shared",
  "form.bookingModes.public.description":
    "Bookings may overlap up to capacity.",
  "form.bookingModes.private.label": "Exclusive",
  "form.bookingModes.private.description": "One booking reserves the studio.",
  "form.bookingModes.customer-choice.label": "Customer choice",
  "form.bookingModes.customer-choice.description":
    "Customers choose public or private.",
  "form.openStudioPolicy.publicCapacityMode": "Public booking capacity",
  "form.openStudioPolicy.activity": "Use activity capacity",
  "form.openStudioPolicy.fixed": "Set a maximum total",
  "form.openStudioPolicy.publicCapacityLimit":
    "Maximum people in a public booking",
  "form.openStudioPolicy.publicCapacityLimitHelp":
    "Includes the original customer and their group.",
  "form.openStudioPolicy.privateBookingSurcharge": "Private booking surcharge",
  "form.openStudioPolicy.privateBookingSurchargeHelp":
    "Charged once per private booking.",
  "form.openStudioPolicy.invalid": "Invalid sharing options",
  "form.capacity": "Maximum capacity",
  "form.capacityHelp": "Class capacity",
  "form.openStudioCapacity": "Maximum people per booking",
  "form.openStudioCapacityHelp": "People allowed in one booking",
  "form.openStudioLocationCapacity":
    "Location limit: {count} people across all bookings",
  "form.classCategory": "Class category",
  "form.classCategoryHelp": "Browse classes by category",
  "form.classCategoryNone": "No category",
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
  "form.classCategoryProductCount": "1 class",
  "form.classCategoryDelete": "Delete category",
  "form.classCategoryDeleteTitle": "Delete class category?",
  "form.classCategoryDeleteMessage": "Delete category?",
  "form.classCategoryDeleteConfirm": "Delete category",
  "form.classCategoryInUse": "Category in use",
  "form.classCategoryNameRequired": "Enter a category name",
  "form.classCategoryDuplicate": "Category already exists",
  "form.classCategoryRequestError": "Category request failed",
  "form.courseContent.title": "Course page content",
  "form.courseContent.language": "Content language",
  "form.courseContent.locations": "Available at these studios",
  "form.courseContent.name": "Course title",
  "form.courseContent.description": "Short description",
  "form.courseContent.details": "Course details",
  "form.courseContent.durationLabel": "Duration label",
  "form.courseContent.imageUrl": "New gallery image URL",
  "form.courseContent.addImage": "Add image",
  "form.courseContent.useProductImage": "Use current product image",
  "form.courseContent.moveEarlier": "Move image {number} earlier",
  "form.courseContent.moveLater": "Move image {number} later",
  "form.courseContent.removeImage": "Remove image {number}",
  "form.courseContent.invalidImage": "Enter a valid gallery URL",
  "form.courseContent.invalidText": "Use plain text within the field limits",
  "form.image": "Product image",
  "form.imageDropTitle": "Drop an image here or choose a file",
  "form.imageFormats": "JPEG, PNG or WebP · maximum 8 MB",
  "form.imageUpload": "Upload image",
  "form.imageReplace": "Replace image",
  "form.imageRemove": "Remove image",
  "form.imagePreviewAlt": "Product image preview",
  "form.imageInvalidType": "Choose a JPEG, PNG or WebP image.",
  "form.imageTooLarge": "Choose an image no larger than 8 MB.",
  "form.description": "Description",
  "form.advanced": "Advanced settings",
  "form.advancedHelp": "Internal fields",
  "form.sku": "SKU",
  "form.skuPlaceholder": "Optional",
  "form.sortOrder": "Display order",
  "form.label": "Internal label",
  "form.studioFlow": "Operations instructions",
  "form.studioFlowSummary": "Included",
  "form.studioFlowHelp": "Operations help",
  "form.changeStudioFlowSettings": "Change instructions",
  "form.hideStudioFlowSettings": "Hide settings",
  "form.firingBilling": "Firing",
  "form.firingIncluded": "Firing included",
  "form.firingSeparate": "Firing separate",
  "form.pieceRegistration": "Piece registration",
  "form.registrationOptional": "Optional",
  "form.registrationRequired": "Required",
  "form.piecePricingProfile": "Piece pricing profile",
  "form.piecePricingAllInclusive": "All-inclusive",
  "form.piecePricingProfilesLoading": "Loading pricing profiles…",
  "form.piecePricingCurrentUnavailable": "Current profile unavailable",
  "form.piecePricingProfileHelp": "Calculate a price for each piece",
  "form.piecePricingProfilesError": "Profiles failed to load",
  "form.pdf": "Voucher PDF template",
  "form.pdfHelp": "Optional PDF",
  "form.online": "Available online",
  "form.onlineHelp": "Visible to customers",
  "form.internal": "Active internally",
  "form.internalHelp": "Used only in tenant operations and calendars",
  "form.cancel": "Cancel",
  "form.save": "Save changes",
  "form.saving": "Saving…",
  "form.requiredError": "Required",
  "form.requestError": "Request failed",
  "form.kinds.openStudio.createTitle": "Add Open Studio",
  "form.kinds.openStudio.createDescription":
    "Create shared or exclusive access",
  "form.kinds.openStudio.createAction": "Create Open Studio",
  "form.kinds.classes.createTitle": "Create class",
  "form.kinds.classes.createDescription": "Create a scheduled class",
  "form.kinds.classes.createAction": "Create class",
  "form.kinds.vouchers.createTitle": "Create voucher",
  "form.kinds.vouchers.createDescription": "Create a voucher",
  "form.kinds.vouchers.createAction": "Create voucher",
  "form.kinds.privateStudio.createTitle": "Add Private Studio",
  "form.kinds.privateStudio.createDescription":
    "Create an internal studio entry",
  "form.kinds.privateStudio.createAction": "Create Private Studio",
  "form.kinds.legacy.editTitle": "Edit legacy product",
  "form.kinds.legacy.editDescription": "Migrate this mapped product",
  "types.openStudio": "Open Studio",
  "types.class": "Class",
  "types.voucher": "Voucher",
  "types.privateStudio": "Private Studio",
};
const t = (key, values = {}) =>
  Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    labels[key] || key,
  );
const renderDialog = (catalogKind, props = {}) => {
  const onClose = props.onClose || vi.fn();
  const onSaved = props.onSaved || vi.fn();
  const view = render(
    <ProductFormDialog
      open
      catalogKind={catalogKind}
      locale="en"
      onClose={onClose}
      onSaved={onSaved}
      t={t}
      {...props}
      product={
        props.product
          ? {
              locationId: "507f1f77bcf86cd799439021",
              ...props.product,
            }
          : undefined
      }
    />,
  );
  return {
    onClose,
    onSaved,
    ...view,
  };
};
const submittedForm = (mutation = productApi.create) => {
  const body = mutation.mock.calls[0][0];
  return Object.fromEntries(body.entries());
};
const completePricedProduct = async (user, name, price = "650") => {
  await user.type(screen.getByLabelText("Product name"), name);
  await user.clear(screen.getByLabelText("Price"));
  await user.type(screen.getByLabelText("Price"), price);
};
describe("canonical product kind dialogs", () => {
  beforeEach(() => {
    authState.tenant = {
      settings: {
        currency: "CZK",
      },
    };
    locationApi.locations = [
      {
        id: "507f1f77bcf86cd799439021",
        name: "Grohova",
        isPrimary: true,
      },
      {
        id: "507f1f77bcf86cd799439022",
        name: "Second studio",
      },
    ];
    productApi.create.mockReset();
    productApi.update.mockReset();
    productApi.uploadAsset.mockReset();
    productApi.uploadAsset.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          key: "tenants/one/voucher-design/uploaded-photo.webp",
        }),
      abort: vi.fn(),
    }));
    productApi.createCategory.mockReset();
    productApi.deleteCategory.mockReset();
    productApi.categoriesQuery.mockReset();
    productApi.productsQuery.mockReset();
    productApi.refetchProducts.mockReset();
    productApi.refetchProducts.mockResolvedValue({
      data: [],
    });
    productApi.productsQuery.mockReturnValue({
      currentData: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: productApi.refetchProducts,
    });
    productApi.create.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          product: {
            id: "created",
          },
        }),
    }));
    productApi.update.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          product: {
            id: "updated",
          },
        }),
    }));
    productApi.categoriesQuery.mockReturnValue({
      data: [
        {
          id: "category-wheel",
          name: "Wheel throwing",
          productCount: 1,
        },
        {
          id: "category-modeling",
          name: "Modeling",
          productCount: 0,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    profileApi.available.mockReturnValue({
      data: {
        profiles: [
          {
            id: "piece-profile-1",
            name: "Community studio pieces",
          },
        ],
      },
      isLoading: false,
      isError: false,
    });
  });
  it("creates a public Open Studio using kind and an explicit booking mode", async () => {
    const user = userEvent.setup();
    renderDialog("openStudio");
    expect(
      screen.getByRole("dialog", {
        name: "Add Open Studio",
      }),
    ).toBeVisible();
    expect(screen.queryByLabelText("Product kind")).not.toBeInTheDocument();
    expect(
      screen.getByRole("radio", {
        name: /Shared/,
      }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", {
        name: /Exclusive/,
      }),
    ).not.toBeChecked();
    expect(screen.getByLabelText("Maximum people per booking")).toBeVisible();
    await completePricedProduct(user, "Open Studio");
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(submittedForm()).toMatchObject({
      name: "Open Studio",
      kind: "open-studio",
      locationId: "507f1f77bcf86cd799439022",
      bookingMode: "public",
      price: "650",
      maxNumberOfParticipants: "1",
      currency: "CZK",
    });
    expect(submittedForm()).not.toHaveProperty("type");
  });
  it("blocks a direct or duplicate Open Studio form on Starter V3 before any mutation", () => {
    authState.tenant = {
      ...authState.tenant,
      plan: "starter",
      planVersion: 3,
      modules: {
        bookings: true,
      },
    };
    renderDialog("openStudio", {
      duplicate: true,
      product: {
        _id: "old-open-studio",
        kind: "open-studio",
        name: "Open Studio",
        price: 650,
        isActive: true,
      },
    });
    expect(
      screen.getByRole("heading", {
        name: "openStudioPlan.title",
      }),
    ).toBeVisible();
    fireEvent.submit(screen.getByLabelText("Product name").closest("form"));
    expect(productApi.create).not.toHaveBeenCalled();
    expect(productApi.update).not.toHaveBeenCalled();
  });
  it("allows saving an existing inactive Open Studio after a Starter V3 downgrade", async () => {
    authState.tenant = {
      ...authState.tenant,
      plan: "starter",
      planVersion: 3,
    };
    renderDialog("openStudio", {
      product: {
        _id: "old-open-studio",
        kind: "open-studio",
        name: "Old Open Studio",
        price: 650,
        maxNumberOfParticipants: 4,
        isActive: false,
      },
    });
    fireEvent.submit(screen.getByLabelText("Product name").closest("form"));
    await waitFor(() => expect(productApi.update).toHaveBeenCalledOnce());
    expect(submittedForm(productApi.update).isActive).toBe("false");
  });
  it.each([true, false])(
    "blocks direct page creation when the location has an Open Studio with isActive=%s",
    async (isActive) => {
      const user = userEvent.setup();
      productApi.productsQuery.mockReturnValue({
        currentData: [
          {
            id: "existing-open-studio",
            kind: "open-studio",
            locationId: "507f1f77bcf86cd799439022",
            isActive,
          },
        ],
        refetch: productApi.refetchProducts,
      });
      renderDialog("openStudio", {
        surface: "page",
      });
      await completePricedProduct(user, "Another Open Studio");
      expect(screen.getByRole("alert")).toHaveTextContent(
        labels["openStudioLimit.existing"],
      );
      expect(
        screen.getByRole("link", {
          name: "Edit Open Studio",
        }),
      ).toHaveAttribute(
        "href",
        "/app/products/existing-open-studio/edit?category=openStudio",
      );
      expect(
        screen.getByRole("button", {
          name: "Create Open Studio",
        }),
      ).toBeDisabled();
      fireEvent.submit(screen.getByLabelText("Product name").closest("form"));
      expect(productApi.create).not.toHaveBeenCalled();
      expect(productApi.productsQuery).toHaveBeenLastCalledWith(
        {
          locationId: "507f1f77bcf86cd799439022",
        },
        {
          skip: false,
          refetchOnMountOrArgChange: true,
        },
      );
    },
  );
  it("ignores archived products, other locations and other kinds when claiming a location", async () => {
    const user = userEvent.setup();
    productApi.productsQuery.mockReturnValue({
      currentData: [
        {
          id: "archived",
          kind: "open-studio",
          locationId: "507f1f77bcf86cd799439022",
          isArchived: true,
        },
        {
          id: "other-location",
          kind: "open-studio",
          locationId: "507f1f77bcf86cd799439021",
        },
        {
          id: "class",
          kind: "class",
          locationId: "507f1f77bcf86cd799439022",
        },
      ],
    });
    renderDialog("openStudio");
    await completePricedProduct(user, "Open Studio");
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
  });
  it("does not reuse the prior location's result while the newly selected location loads", async () => {
    const user = userEvent.setup();
    productApi.productsQuery.mockImplementation(({ locationId }) => ({
      data: [],
      currentData: locationId === "507f1f77bcf86cd799439022" ? [] : undefined,
      isFetching: locationId !== "507f1f77bcf86cd799439022",
      refetch: productApi.refetchProducts,
    }));
    renderDialog("openStudio");
    await completePricedProduct(user, "Open Studio");
    expect(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    ).toBeEnabled();
    await user.selectOptions(
      screen.getByLabelText("Studio location"),
      "507f1f77bcf86cd799439021",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      labels["openStudioLimit.checking"],
    );
    expect(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    ).toBeDisabled();
    fireEvent.submit(screen.getByLabelText("Product name").closest("form"));
    expect(productApi.create).not.toHaveBeenCalled();
  });
  it("fails closed while cached availability refreshes and when the availability check fails", async () => {
    const user = userEvent.setup();
    productApi.productsQuery.mockReturnValue({
      currentData: [],
      isFetching: true,
      refetch: productApi.refetchProducts,
    });
    const view = renderDialog("openStudio");
    await completePricedProduct(user, "Open Studio");
    expect(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    ).toBeDisabled();
    fireEvent.submit(screen.getByLabelText("Product name").closest("form"));
    expect(productApi.create).not.toHaveBeenCalled();
    productApi.productsQuery.mockReturnValue({
      currentData: [],
      isError: true,
      refetch: productApi.refetchProducts,
    });
    view.rerender(
      <ProductFormDialog
        open
        locale="en"
        onClose={view.onClose}
        onSaved={view.onSaved}
        t={t}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      labels["openStudioLimit.checkError"],
    );
    await user.click(
      screen.getByRole("button", {
        name: "Try again",
      }),
    );
    expect(productApi.refetchProducts).toHaveBeenCalledTimes(1);
    fireEvent.submit(screen.getByLabelText("Product name").closest("form"));
    expect(productApi.create).not.toHaveBeenCalled();
  });
  it("blocks duplicate creation and legacy location assignment when the destination is occupied", async () => {
    const user = userEvent.setup();
    productApi.productsQuery.mockReturnValue({
      currentData: [
        {
          id: "existing",
          kind: "open-studio",
          locationId: "507f1f77bcf86cd799439022",
          isActive: false,
        },
      ],
    });
    const duplicateView = renderDialog("openStudio", {
      duplicate: true,
      product: {
        id: "source",
        kind: "open-studio",
        name: "Source studio",
        price: 125,
        maxNumberOfParticipants: 4,
      },
    });
    await user.selectOptions(
      screen.getByLabelText("Studio location"),
      "507f1f77bcf86cd799439022",
    );
    expect(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    ).toBeDisabled();
    fireEvent.submit(screen.getByLabelText("Product name").closest("form"));
    expect(productApi.create).not.toHaveBeenCalled();
    duplicateView.unmount();
    renderDialog("openStudio", {
      product: {
        id: "unassigned",
        kind: "open-studio",
        locationId: null,
        name: "Legacy studio",
        price: 125,
        maxNumberOfParticipants: 4,
      },
    });
    await user.selectOptions(
      screen.getByLabelText("Studio location"),
      "507f1f77bcf86cd799439022",
    );
    expect(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    ).toBeDisabled();
    fireEvent.submit(screen.getByLabelText("Product name").closest("form"));
    expect(productApi.update).not.toHaveBeenCalled();
  });
  it("allows normal edits to assigned Open Studio products despite existing duplicates or a failed catalog query", async () => {
    const user = userEvent.setup();
    productApi.productsQuery.mockReturnValue({
      currentData: [
        {
          id: "same",
          kind: "open-studio",
          locationId: "507f1f77bcf86cd799439021",
        },
        {
          id: "legacy-duplicate",
          kind: "open-studio",
          locationId: "507f1f77bcf86cd799439021",
        },
      ],
      isError: true,
    });
    renderDialog("openStudio", {
      product: {
        id: "same",
        kind: "open-studio",
        name: "Existing studio",
        price: 125,
        maxNumberOfParticipants: 4,
      },
    });
    expect(productApi.productsQuery).toHaveBeenLastCalledWith(
      {
        locationId: "507f1f77bcf86cd799439021",
      },
      {
        skip: true,
        refetchOnMountOrArgChange: true,
      },
    );
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
  });
  it("refreshes and keeps a failed duplicate request blocked after a server conflict", async () => {
    const user = userEvent.setup();
    locationApi.locations.push({
      id: "507f1f77bcf86cd799439023",
      name: "Third studio",
    });
    productApi.create.mockImplementation(() => ({
      unwrap: () =>
        Promise.reject({
          status: 409,
          data: {
            code: "OPEN_STUDIO_ALREADY_EXISTS",
            message: "Server message",
            details: {
              existingProductId: "concurrent-product",
              locationId: "507f1f77bcf86cd799439022",
            },
          },
        }),
    }));
    const { onSaved, onClose } = renderDialog("openStudio", {
      duplicate: true,
      product: {
        id: "source",
        kind: "open-studio",
        name: "Source studio",
        price: 125,
        maxNumberOfParticipants: 4,
      },
    });
    await user.selectOptions(
      screen.getByLabelText("Studio location"),
      "507f1f77bcf86cd799439022",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() =>
      expect(productApi.refetchProducts).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      labels["openStudioLimit.existing"],
    );
    expect(
      screen.getByRole("link", {
        name: "Edit Open Studio",
      }),
    ).toHaveAttribute(
      "href",
      "/app/products/concurrent-product/edit?category=openStudio",
    );
    await user.type(screen.getByLabelText("Product name"), " edited");
    expect(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    ).toBeDisabled();
    fireEvent.submit(screen.getByLabelText("Product name").closest("form"));
    expect(productApi.create).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await user.selectOptions(
      screen.getByLabelText("Studio location"),
      "507f1f77bcf86cd799439023",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    ).toBeEnabled();
    productApi.create.mockImplementation(() => ({
      unwrap: () =>
        Promise.resolve({
          product: {
            id: "created",
          },
        }),
    }));
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(2));
    expect(productApi.create.mock.calls[1][0].get("locationId")).toBe(
      "507f1f77bcf86cd799439023",
    );
  });
  it("creates an exclusive Open Studio without conflating it with Private Studio", async () => {
    const user = userEvent.setup();
    renderDialog("openStudio");
    await user.click(
      screen.getByRole("radio", {
        name: /Exclusive/,
      }),
    );
    await completePricedProduct(user, "Exclusive wheel room", "900");
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(submittedForm()).toMatchObject({
      kind: "open-studio",
      bookingMode: "private",
      price: "900",
    });
  });
  it("starts a new Open Studio with the selected location limit and saves it as a per-booking limit", async () => {
    locationApi.locations[1].booking = {
      globalCapacity: 14,
    };
    const user = userEvent.setup();
    renderDialog("openStudio");
    expect(screen.getByLabelText("Maximum people per booking")).toHaveValue(14);
    expect(
      screen.getByText("Location limit: 14 people across all bookings"),
    ).toBeVisible();
    await completePricedProduct(user, "Shared studio");
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledOnce());
    expect(submittedForm().maxNumberOfParticipants).toBe("14");
  });
  it("keeps an explicit per-booking limit when the selected location changes", async () => {
    locationApi.locations[0].booking = {
      globalCapacity: 6,
    };
    locationApi.locations[1].booking = {
      globalCapacity: 14,
    };
    const user = userEvent.setup();
    renderDialog("openStudio");
    const capacity = screen.getByLabelText("Maximum people per booking");
    await user.clear(capacity);
    await user.type(capacity, "3");
    await user.selectOptions(
      screen.getByLabelText("Studio location"),
      "507f1f77bcf86cd799439021",
    );
    expect(capacity).toHaveValue(3);
    expect(
      screen.getByText("Location limit: 6 people across all bookings"),
    ).toBeVisible();
    await completePricedProduct(user, "Small group");
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledOnce());
    expect(submittedForm()).toMatchObject({
      locationId: "507f1f77bcf86cd799439021",
      maxNumberOfParticipants: "3",
    });
  });
  it.each([false, true])(
    "preserves an existing product limit when duplicate=%s",
    (duplicate) => {
      locationApi.locations.forEach((location) => {
        location.booking = {
          globalCapacity: 14,
        };
      });
      renderDialog("openStudio", {
        duplicate,
        product: {
          id: "existing-studio",
          kind: "open-studio",
          bookingMode: "public",
          maxNumberOfParticipants: 3,
        },
      });
      expect(screen.getByLabelText("Maximum people per booking")).toHaveValue(
        3,
      );
    },
  );
  it("keeps Class capacity semantics and defaults separate from the location limit", () => {
    locationApi.locations[1].booking = {
      globalCapacity: 14,
    };
    renderDialog("classes");
    expect(screen.getByLabelText("Maximum capacity")).toHaveValue(1);
    expect(
      screen.queryByLabelText("Maximum people per booking"),
    ).not.toBeInTheDocument();
  });
  it("saves and reloads a fixed total public capacity and private surcharge", async () => {
    const user = userEvent.setup();
    const { unmount } = renderDialog("openStudio");
    await user.clear(screen.getByLabelText("Maximum people per booking"));
    await user.type(screen.getByLabelText("Maximum people per booking"), "8");
    await user.click(
      screen.getByRole("radio", {
        name: /Customer choice/,
      }),
    );
    expect(screen.getByLabelText("Public booking capacity")).toHaveValue(
      "activity",
    );
    await user.selectOptions(
      screen.getByLabelText("Public booking capacity"),
      "fixed",
    );
    await user.clear(
      screen.getByLabelText(/Maximum people in a public booking/),
    );
    await user.type(
      screen.getByLabelText(/Maximum people in a public booking/),
      "2",
    );
    await user.clear(screen.getByLabelText(/Private booking surcharge/));
    await user.type(screen.getByLabelText(/Private booking surcharge/), "150");
    await completePricedProduct(user, "Choose your studio visit", "125");
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    const saved = submittedForm();
    expect(saved.bookingMode).toBe("customer-choice");
    expect(JSON.parse(saved.openStudioPolicy)).toEqual({
      publicCapacityMode: "fixed",
      publicCapacityLimit: 2,
      privateBookingSurcharge: 150,
    });
    unmount();
    renderDialog("openStudio", {
      product: {
        ...saved,
        id: "choice-studio",
        type: "workshop",
        openStudioPolicy: JSON.parse(saved.openStudioPolicy),
      },
    });
    expect(
      screen.getByRole("radio", {
        name: /Customer choice/,
      }),
    ).toBeChecked();
    expect(screen.getByLabelText("Public booking capacity")).toHaveValue(
      "fixed",
    );
    expect(
      screen.getByLabelText(/Maximum people in a public booking/),
    ).toHaveValue(2);
    expect(screen.getByLabelText(/Private booking surcharge/)).toHaveValue(150);
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
    expect(
      JSON.parse(submittedForm(productApi.update).openStudioPolicy),
    ).toEqual(JSON.parse(saved.openStudioPolicy));
  });
  it("clears the fixed total when using activity capacity and omits policy when switching to Shared", async () => {
    const user = userEvent.setup();
    renderDialog("openStudio", {
      product: {
        id: "choice-studio",
        name: "Choose your visit",
        kind: "open-studio",
        type: "workshop",
        bookingMode: "customer-choice",
        price: 125,
        maxNumberOfParticipants: 8,
        isActive: true,
        openStudioPolicy: {
          publicCapacityMode: "fixed",
          publicCapacityLimit: 2,
          privateBookingSurcharge: 150,
        },
      },
    });
    await user.selectOptions(
      screen.getByLabelText("Public booking capacity"),
      "activity",
    );
    expect(
      screen.queryByLabelText(/Maximum people in a public booking/),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
    expect(
      JSON.parse(submittedForm(productApi.update).openStudioPolicy),
    ).toEqual({
      publicCapacityMode: "activity",
      publicCapacityLimit: null,
      privateBookingSurcharge: 150,
    });
    productApi.update.mockClear();
    await user.click(
      screen.getByRole("radio", {
        name: /Shared/,
      }),
    );
    expect(
      screen.queryByLabelText("Public booking capacity"),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
    expect(submittedForm(productApi.update).bookingMode).toBe("public");
    expect(submittedForm(productApi.update)).not.toHaveProperty(
      "openStudioPolicy",
    );
  });
  it("blocks a zero public limit before submitting a customer-choice product", async () => {
    const user = userEvent.setup();
    renderDialog("openStudio");
    await user.click(
      screen.getByRole("radio", {
        name: /Customer choice/,
      }),
    );
    await user.selectOptions(
      screen.getByLabelText("Public booking capacity"),
      "fixed",
    );
    await user.clear(
      screen.getByLabelText(/Maximum people in a public booking/),
    );
    await user.type(
      screen.getByLabelText(/Maximum people in a public booking/),
      "0",
    );
    await completePricedProduct(user, "Invalid capacity", "125");
    fireEvent.submit(screen.getByRole("dialog").querySelector("form"));
    expect(await screen.findByText("Invalid sharing options")).toBeVisible();
    expect(productApi.create).not.toHaveBeenCalled();
  });
  it("creates the single canonical Class kind", async () => {
    const user = userEvent.setup();
    renderDialog("classes");
    expect(screen.queryByLabelText("Product kind")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Maximum capacity")).toBeVisible();
    expect(screen.getByLabelText("Class category")).toBeVisible();
    await user.selectOptions(
      screen.getByLabelText("Class category"),
      "Wheel throwing",
    );
    await completePricedProduct(user, "Wheel class", "1200");
    await user.click(
      screen.getByRole("button", {
        name: "Create class",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(submittedForm()).toMatchObject({
      name: "Wheel class",
      kind: "class",
      classCategory: "Wheel throwing",
      price: "1200",
    });
    expect(submittedForm()).not.toHaveProperty("bookingMode");
    expect(submittedForm()).not.toHaveProperty("type");
  });
  it("hydrates and updates an existing class category assignment", async () => {
    const user = userEvent.setup();
    renderDialog("classes", {
      product: {
        id: "class-1",
        name: "Wheel basics",
        description: "",
        classCategory: "Wheel throwing",
        sku: "",
        type: "course",
        kind: "class",
        price: 1200,
        maxNumberOfParticipants: 8,
        currency: "CZK",
        imageSrc: "https://cdn.example.com/wheel-basics.webp",
        isActive: true,
        sortOrder: 0,
      },
    });
    expect(screen.getByLabelText("Class category")).toHaveValue(
      "Wheel throwing",
    );
    expect(
      screen.getByRole("img", {
        name: "Product image preview",
      }),
    ).toHaveAttribute("src", "https://cdn.example.com/wheel-basics.webp");
    await user.selectOptions(
      screen.getByLabelText("Class category"),
      "Modeling",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
    expect(submittedForm(productApi.update)).toMatchObject({
      id: "class-1",
      kind: "class",
      classCategory: "Modeling",
      imageSrc: "https://cdn.example.com/wheel-basics.webp",
    });
  });
  it("uploads a class image instead of asking for an image URL", async () => {
    const user = userEvent.setup();
    renderDialog("classes");
    const image = new File(["image-bytes"], "wheel-class.webp", {
      type: "image/webp",
    });
    expect(screen.queryByPlaceholderText("https://…")).not.toBeInTheDocument();
    await user.upload(screen.getByLabelText("Product image"), image);
    await completePricedProduct(user, "Wheel class", "1200");
    await user.click(
      screen.getByRole("button", {
        name: "Create class",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(productApi.create.mock.calls[0][0].get("image")).toEqual(image);
    expect(productApi.create.mock.calls[0][0].get("imageSrc")).toBe("");
  });
  it("edits course translations and gallery order without changing canonical fields or other languages", async () => {
    const user = userEvent.setup();
    const content = {
      name: {
        en: "Wheel basics",
        cs: "Základy točení",
        de: "Drehen",
      },
      description: {
        en: "English summary",
        cs: "Český popis",
      },
      details: {
        en: "First line\nSecond line",
        cs: "Podrobnosti",
      },
      durationLabel: {
        en: "2 hours",
        cs: "2 hodiny",
      },
      images: ["/courses/one.webp", "https://cdn.example.com/two.webp"],
      locationIds: ["507f1f77bcf86cd799439021"],
    };
    renderDialog("classes", {
      product: {
        id: "class-content",
        name: "Canonical product",
        description: "Canonical description",
        kind: "class",
        price: 1200,
        maxNumberOfParticipants: 8,
        imageSrc: "https://cdn.example.com/cover.webp",
        courseContent: content,
      },
    });
    await user.click(screen.getByText("Course page content"));
    expect(
      screen.getByRole("checkbox", {
        name: "Grohova",
      }),
    ).toBeChecked();
    await user.click(
      screen.getByRole("checkbox", {
        name: "Second studio",
      }),
    );
    expect(screen.getByLabelText("Course title")).toHaveValue("Wheel basics");
    expect(screen.getByLabelText("Course details")).toHaveValue(
      "First line\nSecond line",
    );
    await user.selectOptions(screen.getByLabelText("Content language"), "cs");
    await user.clear(screen.getByLabelText("Course title"));
    await user.type(screen.getByLabelText("Course title"), "Kurz točení");
    await user.clear(screen.getByLabelText("Short description"));
    await user.click(
      screen.getByRole("button", {
        name: "Move image 2 earlier",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Use current product image",
      }),
    );
    await user.selectOptions(screen.getByLabelText("Content language"), "en");
    expect(screen.getByLabelText("Course title")).toHaveValue("Wheel basics");
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
    const submitted = submittedForm(productApi.update);
    expect(submitted).toMatchObject({
      name: "Canonical product",
      description: "Canonical description",
      imageSrc: "https://cdn.example.com/cover.webp",
      price: "1200",
    });
    expect(JSON.parse(submitted.courseContent)).toEqual({
      ...content,
      name: {
        ...content.name,
        cs: "Kurz točení",
      },
      description: {
        ...content.description,
        cs: "",
      },
      images: [
        "https://cdn.example.com/two.webp",
        "/courses/one.webp",
        "https://cdn.example.com/cover.webp",
      ],
      locationIds: ["507f1f77bcf86cd799439021", "507f1f77bcf86cd799439022"],
    });
  });
  it("adds safe gallery URLs, removes images and rejects unsafe URLs before saving", async () => {
    const user = userEvent.setup();
    renderDialog("classes");
    await user.click(screen.getByText("Course page content"));
    const imageUrl = screen.getByLabelText("New gallery image URL");
    await user.type(imageUrl, "javascript:alert(1)");
    await user.click(
      screen.getByRole("button", {
        name: "Add image",
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid gallery URL",
    );
    expect(
      screen.queryByRole("button", {
        name: "Remove image 1",
      }),
    ).not.toBeInTheDocument();
    await user.clear(imageUrl);
    await user.type(imageUrl, "/courses/new.webp{Enter}");
    expect(productApi.create).not.toHaveBeenCalled();
    await user.type(imageUrl, "https://cdn.example.com/second.webp");
    await user.click(
      screen.getByRole("button", {
        name: "Add image",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Remove image 1",
      }),
    );
    await completePricedProduct(user, "Class with gallery");
    await user.click(
      screen.getByRole("button", {
        name: "Create class",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(JSON.parse(submittedForm().courseContent)).toEqual({
      name: {},
      description: {},
      details: {},
      durationLabel: {},
      images: ["https://cdn.example.com/second.webp"],
      locationIds: [],
    });
  });
  it("keeps the optional course editor out of Open Studio and blocks HTML in course text", async () => {
    const user = userEvent.setup();
    const view = renderDialog("openStudio");
    expect(screen.queryByText("Course page content")).not.toBeInTheDocument();
    await completePricedProduct(user, "Open Studio");
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(submittedForm()).not.toHaveProperty("courseContent");
    view.unmount();
    productApi.create.mockClear();
    renderDialog("classes");
    await user.click(screen.getByText("Course page content"));
    await user.type(
      screen.getByLabelText("Course details"),
      "<b>Course details</b>",
    );
    await completePricedProduct(user, "Class");
    await user.click(
      screen.getByRole("button", {
        name: "Create class",
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Use plain text within the field limits",
    );
    expect(productApi.create).not.toHaveBeenCalled();
  });
  it("creates a canonical Voucher with its dedicated PDF field", async () => {
    const user = userEvent.setup();
    renderDialog("vouchers");
    await user.click(
      screen.getByRole("radio", {
        name: /modePdf/,
      }),
    );
    expect(screen.queryByLabelText("Maximum capacity")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Class category")).not.toBeInTheDocument();
    const template = new File(["voucher"], "voucher.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText("Voucher PDF template"), template);
    await completePricedProduct(user, "Gift voucher", "1500");
    await user.click(
      screen.getByRole("button", {
        name: "Create voucher",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(submittedForm()).toMatchObject({
      name: "Gift voucher",
      kind: "voucher",
      price: "1500",
      label: "voucher",
    });
    expect(productApi.create.mock.calls[0][0].get("file")).toEqual(template);
    expect(JSON.parse(submittedForm().voucherSettings)).toEqual({
      version: 1,
      type: "value",
      validity: {
        mode: "months",
        months: 12,
      },
      physicalDelivery: {
        enabled: false,
        postageFeeMinor: 0,
      },
    });
  });
  it("saves optional postage in minor units without increasing the voucher face value", async () => {
    const user = userEvent.setup();
    renderDialog("vouchers");
    expect(
      screen.getByRole("checkbox", {
        name: "enable",
      }),
    ).not.toBeChecked();
    await completePricedProduct(user, "Printed course voucher", "1500");
    await user.click(
      screen.getByRole("checkbox", {
        name: "enable",
      }),
    );
    fireEvent.change(screen.getByLabelText(/postage/), {
      target: {
        value: "75.50",
      },
    });
    await user.click(
      screen.getByRole("button", {
        name: "Create voucher",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledOnce());
    expect(submittedForm().price).toBe("1500");
    expect(
      JSON.parse(submittedForm().voucherSettings).physicalDelivery,
    ).toEqual({
      enabled: true,
      postageFeeMinor: 7550,
    });
  });
  it("hydrates postal settings for editing and can turn postal delivery off", async () => {
    const user = userEvent.setup();
    renderDialog("vouchers", {
      product: {
        id: "voucher-postal",
        kind: "voucher",
        name: "Printed voucher",
        price: 500,
        currency: "JPY",
        voucherSettings: {
          version: 1,
          type: "value",
          validity: {
            mode: "months",
            months: 12,
          },
          physicalDelivery: {
            enabled: true,
            postageFeeMinor: 750,
          },
        },
      },
    });
    expect(
      screen.getByRole("checkbox", {
        name: "enable",
      }),
    ).toBeChecked();
    expect(screen.getByLabelText(/postage/)).toHaveValue(750);
    expect(screen.getByLabelText(/postage/)).toHaveAttribute("step", "1");
    await user.click(
      screen.getByRole("checkbox", {
        name: "enable",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledOnce());
    expect(
      JSON.parse(submittedForm(productApi.update).voucherSettings)
        .physicalDelivery,
    ).toEqual({
      enabled: false,
      postageFeeMinor: 0,
    });
  });
  it("creates an editor voucher with persisted design JSON and no uploaded PDF", async () => {
    const user = userEvent.setup();
    renderDialog("vouchers");
    expect(
      screen.getByRole("radio", {
        name: /modeEditor/,
      }),
    ).toBeChecked();
    expect(
      screen.queryByLabelText("Voucher PDF template"),
    ).not.toBeInTheDocument();
    await completePricedProduct(user, "Gift voucher", "1500");
    await user.clear(screen.getByLabelText("content.title"));
    await user.type(
      screen.getByLabelText("content.title"),
      "An afternoon with clay",
    );
    await user.selectOptions(
      screen.getByLabelText("typography.font"),
      "editorial-serif-v1",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Create voucher",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledOnce());
    expect(JSON.parse(submittedForm().voucherDesign)).toMatchObject({
      version: 1,
      layout: "split",
      typography: {
        font: "editorial-serif-v1",
      },
      content: {
        title: "An afternoon with clay",
      },
    });
    expect(submittedForm()).not.toHaveProperty("file");
  });
  it.each(["upload", "replace", "remove", "failed replacement"])(
    "persists voucher photo %s without changing the logo, fit or financial value",
    async (action) => {
      const user = userEvent.setup();
      const oldKey =
        action === "upload"
          ? null
          : "tenants/one/voucher-design/original-photo.png";
      const design = {
        ...productApi.design,
        assets: {
          logoKey: "tenants/one/voucher-design/logo.png",
          imageKey: oldKey,
        },
        imageFit: "contain",
      };
      renderDialog("vouchers", {
        product: {
          id: "photo-voucher",
          kind: "voucher",
          name: "Studio gift",
          price: 1500,
          currency: "CZK",
          voucherDesign: design,
          voucherSettings: {
            version: 1,
            type: "value",
            validity: {
              mode: "months",
              months: 12,
            },
          },
        },
      });
      if (action === "remove") {
        await user.click(
          screen.getByRole("button", {
            name: "Remove assets.image",
          }),
        );
      } else {
        if (action === "failed replacement") {
          productApi.uploadAsset.mockImplementationOnce(() => ({
            unwrap: () =>
              Promise.reject({
                data: {
                  message: "Upload failed",
                },
              }),
          }));
        }
        const file = new File(["photo"], "studio.webp", {
          type: "image/webp",
        });
        await user.upload(screen.getByLabelText("assets.image"), file);
        await waitFor(() =>
          expect(screen.getByLabelText("assets.image")).toBeEnabled(),
        );
        expect(productApi.uploadAsset.mock.calls[0][0].get("purpose")).toBe(
          "image",
        );
        expect(productApi.uploadAsset.mock.calls[0][0].get("file")).toBe(file);
        if (action === "failed replacement")
          expect(screen.getByRole("alert")).toHaveTextContent("Upload failed");
      }
      await user.click(
        screen.getByRole("button", {
          name: "Save changes",
        }),
      );
      await waitFor(() => expect(productApi.update).toHaveBeenCalledOnce());
      const saved = submittedForm(productApi.update);
      expect(JSON.parse(saved.voucherDesign)).toEqual({
        ...design,
        assets: {
          ...design.assets,
          imageKey:
            action === "remove"
              ? null
              : action === "failed replacement"
                ? oldKey
                : "tenants/one/voucher-design/uploaded-photo.webp",
        },
      });
      expect(saved).toMatchObject({
        price: "1500",
        currency: "CZK",
      });
      expect(saved).not.toHaveProperty("file");
      expect(JSON.parse(saved.voucherSettings).validity).toEqual({
        mode: "months",
        months: 12,
      });
    },
  );
  it("preserves legacy PDF selection and template until the tenant explicitly switches", async () => {
    const user = userEvent.setup();
    const product = {
      id: "voucher-old",
      kind: "voucher",
      name: "Original gift",
      price: 1000,
      voucherTemplate: "tenants/one/original.pdf",
    };
    const { unmount } = renderDialog("vouchers", {
      product,
    });
    expect(
      screen.getByRole("radio", {
        name: /modePdf/,
      }),
    ).toBeChecked();
    expect(screen.queryByLabelText("content.title")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledOnce());
    expect(submittedForm(productApi.update)).toMatchObject({
      voucherTemplate: "tenants/one/original.pdf",
      voucherDesign: "null",
    });
    unmount();
    productApi.update.mockClear();
    renderDialog("vouchers", {
      product,
    });
    await user.click(
      screen.getByRole("radio", {
        name: /modeEditor/,
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledOnce());
    expect(JSON.parse(submittedForm(productApi.update).voucherDesign)).toEqual(
      productApi.design,
    );
    expect(submittedForm(productApi.update).voucherTemplate).toBe(
      "tenants/one/original.pdf",
    );
  });
  it.each([
    ["1700", 170000],
    ["1699.98", 169998],
  ])(
    "previews and creates a voucher at the entered %s CZK",
    async (price, amountMinor) => {
      const user = userEvent.setup();
      renderDialog("vouchers");
      await completePricedProduct(user, "Gift voucher", price);
      await waitFor(() =>
        expect(productApi.preview).toHaveBeenLastCalledWith(
          expect.objectContaining({
            productName: "Gift voucher",
            amountMinor,
            currency: "CZK",
          }),
        ),
      );
      await user.click(
        screen.getByRole("button", {
          name: "Create voucher",
        }),
      );
      await waitFor(() => expect(productApi.create).toHaveBeenCalledOnce());
      expect(submittedForm()).toMatchObject({
        price,
        currency: "CZK",
      });
    },
  );
  it("preserves an existing voucher's fractional price when saving its design", async () => {
    const user = userEvent.setup();
    renderDialog("vouchers", {
      product: {
        id: "fractional-voucher",
        kind: "voucher",
        name: "Gift voucher",
        price: 1699.98,
        currency: "CZK",
        voucherDesign: productApi.design,
      },
    });
    expect(screen.getByLabelText("Price")).toHaveValue(1699.98);
    await user.clear(screen.getByLabelText("content.title"));
    await user.type(screen.getByLabelText("content.title"), "A gift of clay");
    await waitFor(() =>
      expect(productApi.preview).toHaveBeenLastCalledWith(
        expect.objectContaining({
          amountMinor: 169998,
          currency: "CZK",
        }),
      ),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledOnce());
    expect(submittedForm(productApi.update)).toMatchObject({
      id: "fractional-voucher",
      price: "1699.98",
      currency: "CZK",
    });
  });
  it("requires an explicit PDF upload when switching a design-only voucher to PDF", async () => {
    const user = userEvent.setup();
    renderDialog("vouchers", {
      product: {
        id: "editor-voucher",
        kind: "voucher",
        name: "Gift",
        price: 1000,
        voucherDesign: productApi.design,
      },
    });
    await user.click(
      screen.getByRole("radio", {
        name: /modePdf/,
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("pdfRequired");
    expect(productApi.update).not.toHaveBeenCalled();
    const pdf = new File(["pdf"], "new.pdf", {
      type: "application/pdf",
    });
    await user.upload(screen.getByLabelText("Voucher PDF template"), pdf);
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledOnce());
    expect(submittedForm(productApi.update).voucherDesign).toBe("null");
    expect(submittedForm(productApi.update).file).toBe(pdf);
  });
  it("protects unsaved voucher edits when closing and before unloading", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog("vouchers");
    await user.type(screen.getByLabelText("content.title"), " customized");
    const unload = new Event("beforeunload", {
      cancelable: true,
    });
    window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    await user.click(
      screen.getByRole("button", {
        name: "Close",
      }),
    );
    expect(
      screen.getByRole("dialog", {
        name: "unsavedTitle",
      }),
    ).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", {
        name: "keepEditing",
      }),
    );
    expect(screen.getByLabelText("content.title")).toHaveValue(
      "Gift voucher customized",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Cancel",
      }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "discard",
      }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
  it.each(["3", "6", "8", "12"])(
    "saves a %s-month voucher validity",
    async (months) => {
      const user = userEvent.setup();
      renderDialog("vouchers");
      await user.selectOptions(
        screen.getByLabelText("validity.period"),
        months,
      );
      await completePricedProduct(user, "Gift voucher");
      await user.click(
        screen.getByRole("button", {
          name: "Create voucher",
        }),
      );
      await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
      expect(JSON.parse(submittedForm().voucherSettings).validity).toEqual({
        mode: "months",
        months: Number(months),
      });
    },
  );
  it("hydrates and saves custom validity without changing purchased terms settings", async () => {
    const user = userEvent.setup();
    renderDialog("vouchers", {
      product: {
        id: "voucher-1",
        kind: "voucher",
        name: "Gift voucher",
        price: 1000,
        voucherSettings: {
          version: 1,
          type: "value",
          eligibleProductIds: ["class-1"],
          validity: {
            mode: "months",
            months: 18,
          },
        },
      },
    });
    expect(screen.getByLabelText("validity.period")).toHaveValue("custom");
    expect(screen.getByLabelText("validity.monthCount")).toHaveValue(18);
    await user.clear(screen.getByLabelText("validity.monthCount"));
    await user.type(screen.getByLabelText("validity.monthCount"), "24");
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
    expect(
      JSON.parse(submittedForm(productApi.update).voucherSettings),
    ).toEqual({
      version: 1,
      type: "value",
      eligibleProductIds: ["class-1"],
      validity: {
        mode: "months",
        months: 24,
      },
      physicalDelivery: {
        enabled: false,
        postageFeeMinor: 0,
      },
    });
  });
  it("saves a calendar date and preserves it after a rejected save", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    productApi.create.mockImplementation(() => ({
      unwrap: () =>
        Promise.reject({
          data: {
            message: "Expiry date must be in the future",
          },
        }),
    }));
    renderDialog("vouchers", {
      onClose,
    });
    await user.selectOptions(screen.getByLabelText("validity.period"), "date");
    await user.type(screen.getByLabelText("validity.date"), "2029-12-31");
    await completePricedProduct(user, "Gift voucher");
    await user.click(
      screen.getByRole("button", {
        name: "Create voucher",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(JSON.parse(submittedForm().voucherSettings).validity).toEqual({
      mode: "date",
      date: "2029-12-31",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Expiry date must be in the future",
    );
    expect(screen.getByLabelText("validity.date")).toHaveValue("2029-12-31");
    expect(onClose).not.toHaveBeenCalled();
  });
  it("explicitly saves vouchers with no expiration", async () => {
    const user = userEvent.setup();
    renderDialog("vouchers");
    await user.selectOptions(screen.getByLabelText("validity.period"), "none");
    await completePricedProduct(user, "Gift voucher");
    await user.click(
      screen.getByRole("button", {
        name: "Create voucher",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(JSON.parse(submittedForm().voucherSettings).validity).toEqual({
      mode: "none",
    });
  });
  it("creates Private Studio as internal-only with no sellable fields", async () => {
    const user = userEvent.setup();
    renderDialog("privateStudio");
    expect(screen.getByLabelText("Active internally")).toBeVisible();
    expect(screen.queryByLabelText("Available online")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Price")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Currency")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Maximum capacity")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Product name"), "Staff maintenance");
    await user.click(
      screen.getByRole("button", {
        name: "Create Private Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(submittedForm()).toMatchObject({
      name: "Staff maintenance",
      kind: "private-studio",
      price: "0",
      maxNumberOfParticipants: "",
      isActive: "true",
    });
    expect(submittedForm()).not.toHaveProperty("bookingMode");
    expect(submittedForm()).not.toHaveProperty("type");
  });
  it("migrates a mapped legacy workshop update to Open Studio kind", async () => {
    const user = userEvent.setup();
    renderDialog("legacy", {
      product: {
        id: "workshop-1",
        name: "Old exclusive workshop",
        type: "private-workshop",
        price: 500,
        maxNumberOfParticipants: 3,
        currency: "CZK",
      },
    });
    expect(
      screen.getByRole("radio", {
        name: /Exclusive/,
      }),
    ).toBeChecked();
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
    expect(submittedForm(productApi.update)).toMatchObject({
      id: "workshop-1",
      kind: "open-studio",
      bookingMode: "private",
    });
    expect(submittedForm(productApi.update)).not.toHaveProperty("type");
  });
  it("keeps the dialog open and surfaces a rejected create request", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    productApi.create.mockImplementation(() => ({
      unwrap: () =>
        Promise.reject({
          data: {
            message: "Price conflict",
          },
        }),
    }));
    renderDialog("classes", {
      onClose,
    });
    await completePricedProduct(user, "Wheel class");
    await user.click(
      screen.getByRole("button", {
        name: "Create class",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Price conflict",
    );
    expect(
      screen.getByRole("dialog", {
        name: "Create class",
      }),
    ).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
  });
  it("keeps an existing studio location fixed when another workspace location is selected", async () => {
    const user = userEvent.setup();
    renderDialog("openStudio", {
      product: {
        id: "original",
        name: "Grohova access",
        kind: "open-studio",
        price: 125,
        maxNumberOfParticipants: 4,
      },
    });
    expect(screen.getByLabelText("Studio location")).toBeDisabled();
    expect(screen.getByLabelText("Studio location")).toHaveValue(
      "507f1f77bcf86cd799439021",
    );
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
    expect(submittedForm(productApi.update)).toMatchObject({
      id: "original",
      locationId: "507f1f77bcf86cd799439021",
    });
  });
  it("requires an explicit location assignment for unbound legacy studio products", async () => {
    const user = userEvent.setup();
    renderDialog("openStudio", {
      product: {
        id: "legacy",
        name: "Legacy access",
        kind: "open-studio",
        locationId: null,
        price: 125,
        maxNumberOfParticipants: 4,
      },
    });
    const location = screen.getByLabelText("Studio location");
    expect(location).toHaveValue("");
    fireEvent.submit(location.closest("form"));
    expect(productApi.update).not.toHaveBeenCalled();
    await user.selectOptions(location, "507f1f77bcf86cd799439021");
    await user.click(
      screen.getByRole("button", {
        name: "Save changes",
      }),
    );
    await waitFor(() => expect(productApi.update).toHaveBeenCalledTimes(1));
    expect(submittedForm(productApi.update).locationId).toBe(
      "507f1f77bcf86cd799439021",
    );
  });
  it("duplicates to another location as an independent draft without reusing the ID or SKU", async () => {
    const user = userEvent.setup();
    renderDialog("openStudio", {
      duplicate: true,
      product: {
        id: "original",
        name: "Grohova access",
        kind: "open-studio",
        sku: "unique-original",
        isActive: true,
        price: 125,
        extraCharge: 35,
        maxNumberOfParticipants: 4,
      },
    });
    const location = screen.getByLabelText("Studio location");
    expect(location).toHaveValue("");
    expect(
      location.querySelector('option[value="507f1f77bcf86cd799439021"]'),
    ).toBeNull();
    await user.selectOptions(location, "507f1f77bcf86cd799439022");
    await user.click(
      screen.getByRole("button", {
        name: "Create Open Studio",
      }),
    );
    await waitFor(() => expect(productApi.create).toHaveBeenCalledTimes(1));
    expect(productApi.update).not.toHaveBeenCalled();
    expect(submittedForm()).toMatchObject({
      locationId: "507f1f77bcf86cd799439022",
      sku: "",
      isActive: "false",
      price: "125",
      extraCharge: "35",
    });
    expect(productApi.dispatch).toHaveBeenCalledWith({
      type: "studio/select",
      payload: {
        tenantId: "507f1f77bcf86cd799439099",
        studioId: "507f1f77bcf86cd799439022",
      },
    });
    expect(submittedForm()).not.toHaveProperty("id");
  });
});
