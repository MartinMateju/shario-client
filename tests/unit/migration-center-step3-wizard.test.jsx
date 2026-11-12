import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  upload: vi.fn(),
  validate: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    () =>
    (key, values = {}) =>
      values.count === undefined ? key : `${key}:${values.count}`,
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
}));

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: { util: { invalidateTags: vi.fn() } },
}));

vi.mock("@/lib/features/data-import/dataImportApiSlice", () => ({
  useGetDataImportSessionQuery: () => ({ data: null, error: null }),
  useGetDataImportRowsQuery: () => ({ data: null, error: null }),
  useUploadDataImportMutation: () => [mocks.upload, { isLoading: false }],
  useValidateDataImportMutation: () => [mocks.validate, { isLoading: false }],
  useExecuteDataImportMutation: () => [vi.fn(), { isLoading: false }],
  useLazyDownloadDataImportTemplateQuery: () => [
    vi.fn(),
    { isFetching: false },
  ],
  useLazyDownloadDataImportReportQuery: () => [vi.fn(), { isFetching: false }],
}));

import { DataImportWizard } from "@/components/migration/CustomerImportWizard";

const cases = [
  {
    entity: "membership-plans",
    headers: ["Plan", "Price", "Billing"],
    mapping: { name: "Plan", price: "Price", billingType: "Billing" },
  },
  {
    entity: "memberships",
    headers: ["Email", "Plan", "Started", "Ends"],
    mapping: {
      customerEmail: "Email",
      planName: "Plan",
      startedAt: "Started",
      periodEnd: "Ends",
    },
  },
  {
    entity: "credits",
    headers: ["Email", "Balance"],
    mapping: { customerEmail: "Email", balance: "Balance" },
  },
  {
    entity: "voucher-products",
    headers: ["Name", "Value"],
    mapping: { name: "Name", value: "Value" },
  },
  {
    entity: "vouchers",
    headers: ["Code", "Product", "Value"],
    mapping: {
      promoCode: "Code",
      productName: "Product",
      value: "Value",
    },
  },
];

describe("Step 3 shared import wizard", () => {
  beforeEach(() => {
    mocks.upload.mockReset();
    mocks.validate.mockReset();
    mocks.dispatch.mockReset();
  });

  it.each(cases)(
    "runs a no-write validation flow for $entity",
    async ({ entity, headers, mapping }) => {
      const user = userEvent.setup();
      const uploaded = {
        id: `${entity}-1`,
        entityType: entity,
        status: "uploaded",
        headers,
        suggestedMapping: mapping,
        sampleRows: [
          Object.fromEntries(headers.map((header) => [header, "x"])),
        ],
        totalRows: 1,
      };
      const validated = {
        ...uploaded,
        status: "validated",
        mapping,
        duplicateStrategy: "skip",
        validationRevision: "revision-1",
        summary: { total: 1, valid: 1, toCreate: 1 },
      };

      mocks.upload.mockReturnValue({
        unwrap: () => Promise.resolve({ data: uploaded }),
      });
      mocks.validate.mockReturnValue({
        unwrap: () => Promise.resolve({ data: validated }),
      });

      const { container } = render(<DataImportWizard entity={entity} />);
      const file = new File([`${headers.join(",")}\nrow`], `${entity}.csv`, {
        type: "text/csv",
      });

      await user.upload(container.querySelector('input[type="file"]'), file);
      await user.click(
        screen.getByRole("button", { name: "actions.continue" }),
      );

      await waitFor(() =>
        expect(mocks.upload).toHaveBeenCalledWith({ entity, file }),
      );
      await user.click(
        await screen.findByRole("button", { name: "actions.validate" }),
      );

      expect(mocks.validate).toHaveBeenCalledWith({
        id: `${entity}-1`,
        mapping,
        duplicateStrategy: "skip",
      });
      expect(
        await screen.findByText("validation.confirmTitle"),
      ).toBeInTheDocument();
    },
  );

  it("keeps Period start optional at mapping time for closed legacy memberships", async () => {
    const user = userEvent.setup();
    const mapping = {
      customerExternalId: "Customer ID",
      planExternalId: "Plan ID",
      startedAt: "Started",
      periodEnd: "Ended",
    };
    mocks.upload.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            id: "membership-legacy",
            status: "uploaded",
            headers: Object.values(mapping),
            suggestedMapping: mapping,
            sampleRows: [],
            totalRows: 1,
          },
        }),
    });

    const { container } = render(<DataImportWizard entity="memberships" />);
    await user.upload(
      container.querySelector('input[type="file"]'),
      new File(["legacy"], "memberships.csv", { type: "text/csv" }),
    );
    await user.click(screen.getByRole("button", { name: "actions.continue" }));

    expect(
      await screen.findByRole("button", { name: "actions.validate" }),
    ).toBeEnabled();
  });
});
