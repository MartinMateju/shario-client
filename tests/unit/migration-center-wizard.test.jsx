import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  downloadTemplate: vi.fn(),
  execute: vi.fn(),
  invalidateTags: vi.fn((tags) => ({ type: "invalidate", payload: tags })),
  rowsData: null,
  sessionData: null,
  upload: vi.fn(),
  validate: vi.fn(),
}));

const labels = {
  "steps.label": "Customer import progress",
  "steps.upload": "Upload",
  "steps.mapping": "Map fields",
  "steps.validation": "Review",
  "steps.import": "Import",
  "steps.report": "Report",
  "upload.eyebrow": "Step 1",
  "upload.title": "Choose your customer file",
  "upload.description": "Choose an export.",
  "upload.dropTitle": "Drop a CSV or Excel file here",
  "upload.dropDescription": "or click to choose a file",
  "upload.replace": "Click to replace",
  "upload.privacy": "Private to this workspace.",
  "actions.downloadTemplate": "Download customer template",
  "actions.continue": "Upload and continue",
  "actions.uploading": "Uploading",
  "actions.back": "Back",
  "actions.validate": "Validate file",
  "actions.validating": "Validating",
  "actions.changeMapping": "Change mapping",
  "actions.downloadReport": "Download CSV report",
  "actions.startingImport": "Starting import",
  "actions.startAnother": "Start another import",
  "mapping.eyebrow": "Step 2",
  "mapping.title": "Match columns to shario.io",
  "mapping.description": "Review suggestions.",
  "mapping.columnsFound": "2 columns found",
  "mapping.tableCaption": "Mappings",
  "mapping.sourceColumn": "Your column",
  "mapping.sample": "Example values",
  "mapping.skabField": "shario.io field",
  "mapping.selectLabel": "Map column",
  "mapping.ignore": "Do not import",
  "mapping.nameRequired": "Map at least one name field.",
  "mapping.fields.fullName": "Full name",
  "mapping.fields.firstName": "First name",
  "mapping.fields.lastName": "Last name",
  "mapping.fields.email": "Email",
  "mapping.fields.phone": "Phone",
  "mapping.fields.memberNumber": "Member number",
  "mapping.fields.externalId": "Previous-system ID",
  "mapping.fields.passwordHash": "Legacy password hash (bcrypt)",
  "mapping.passwordHashHidden": "Securely provided",
  "mapping.creditHandoff": "Handled in the Credits step",
  "mapping.passwordHashTitle": "Secure legacy credential transfer",
  "mapping.passwordHashDescription": "Only bcrypt hashes are accepted.",
  "mapping.passwordHashConfirmation":
    "I confirm that this column contains securely exported bcrypt hashes.",
  "mapping.memberNumberTitle": "Preserve imported member numbers",
  "mapping.memberNumberDescription":
    "Conflicting existing customers receive a new number.",
  "mapping.memberNumberConfirmation":
    "Preserve imported numbers and reassign conflicts.",
  "duplicates.title": "How should existing customers be handled?",
  "duplicates.description": "Match duplicates.",
  "duplicates.skip.title": "Skip existing (recommended)",
  "duplicates.skip.description": "Keep existing data.",
  "duplicates.update.title": "Update existing",
  "duplicates.update.description": "Update profile fields.",
  "validation.eyebrow": "Step 3",
  "validation.title": "Review before importing",
  "validation.description": "Dry run.",
  "validation.cleanTitle": "Every previewed row looks ready",
  "validation.cleanDescription": "No issues.",
  "validation.tableCaption": "Findings",
  "validation.row": "Row",
  "validation.customer": "Customer",
  "validation.finding": "Finding",
  "validation.duplicate": "Duplicate",
  "validation.unknownIssue": "Needs attention",
  "validation.issueCodes.memberNumberOwnerWillBeReassigned":
    "Another customer will receive the next available number.",
  "validation.findingsTitle": "Warnings and excluded rows",
  "validation.strategyTitle": "Duplicate strategy",
  "validation.strategy.skip": "Matching customers remain unchanged.",
  "validation.strategy.update": "Matching customers are updated.",
  "validation.confirmTitle": "I reviewed this import",
  "validation.confirmDescription": "Import valid rows.",
  "validation.nothingToImport": "Nothing to import.",
  "status.uploaded": "Uploaded",
  "status.validated": "Ready",
  "status.queued": "Queued",
  "status.processing": "Importing",
  "status.completed": "Completed",
  "status.failed": "Failed",
  "summary.total": "Rows found",
  "summary.valid": "Valid",
  "summary.warnings": "Warnings",
  "summary.invalid": "Invalid",
  "summary.duplicates": "Duplicates",
  "summary.memberNumberCollisions": "Member number collisions",
  "summary.memberNumberReassignments": "Existing customers renumbered",
  "summary.toCreate": "Will create",
  "summary.toUpdate": "Will update",
  "summary.toSkip": "Will skip",
  "summary.created": "Created",
  "summary.updated": "Updated",
  "summary.skipped": "Skipped",
  "summary.failed": "Failed",
  "progress.eyebrow": "Step 4",
  "progress.title": "Your customers are being imported",
  "progress.description": "Runs in the background.",
  "progress.label": "Import progress",
  "progress.processed": "0 rows processed",
  "progress.safeToLeave": "You can leave this page.",
  "report.title": "Customer import complete",
  "report.description": "Valid rows were processed.",
  "report.failedTitle": "The import needs attention",
  "report.failedDescription": "Review the error.",
  "errors.execute": "The import could not be completed.",
  "report.file": "Source file",
  "report.completedAt": "Completed",
  "report.strategy": "Duplicate strategy",
  "MigrationCenter.importers.products.upload.title":
    "Choose your products and services file",
  "MigrationCenter.importers.products.upload.description":
    "Choose a catalog export.",
  "MigrationCenter.importers.products.mapping.tableCaption": "Product mappings",
  "MigrationCenter.importers.products.mapping.required":
    "Map name and category.",
  "MigrationCenter.importers.products.mapping.fields.name": "Name",
  "MigrationCenter.importers.products.mapping.fields.kind": "Category",
  "MigrationCenter.importers.products.mapping.fields.price": "Price",
  "MigrationCenter.importers.products.duplicates.title":
    "How should existing products be handled?",
  "MigrationCenter.importers.products.duplicates.description":
    "Match products.",
  "MigrationCenter.importers.products.duplicates.skip.description":
    "Keep products.",
  "MigrationCenter.importers.products.duplicates.update.description":
    "Update products.",
  "MigrationCenter.importers.products.validation.description":
    "Review products.",
  "MigrationCenter.importers.products.validation.tableCaption":
    "Product findings",
  "MigrationCenter.importers.products.validation.subject": "Product",
  "MigrationCenter.importers.products.validation.strategy.skip":
    "Matching products are skipped.",
  "MigrationCenter.importers.products.progress.title":
    "Your products and services are being imported",
  "MigrationCenter.importers.products.progress.label":
    "Product import progress",
  "MigrationCenter.importers.products.report.title":
    "Product and service import complete",
  "MigrationCenter.importers.products.report.description": "Products imported.",
  "MigrationCenter.importers.bookings.upload.title": "Choose your booking file",
  "MigrationCenter.importers.bookings.upload.description":
    "Choose a booking export.",
  "MigrationCenter.importers.bookings.mapping.tableCaption": "Booking mappings",
  "MigrationCenter.importers.bookings.mapping.required":
    "Map booking dependencies.",
  "MigrationCenter.importers.bookings.mapping.fields.start": "Start",
  "MigrationCenter.importers.bookings.mapping.fields.end": "End",
  "MigrationCenter.importers.bookings.mapping.fields.customerEmail":
    "Customer email",
  "MigrationCenter.importers.bookings.mapping.fields.productSku": "Product SKU",
  "MigrationCenter.importers.bookings.mapping.fields.locationCode":
    "Location code",
  "MigrationCenter.importers.bookings.duplicates.title":
    "How should existing bookings be handled?",
  "MigrationCenter.importers.bookings.duplicates.description":
    "Match bookings.",
  "MigrationCenter.importers.bookings.duplicates.skip.description":
    "Keep bookings.",
  "MigrationCenter.importers.bookings.duplicates.update.description":
    "Update bookings.",
};

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations:
    (namespace) =>
    (key, values = {}) => {
      if (key === "actions.importRows") {
        return `Import ${values.count} valid rows`;
      }

      return labels[`${namespace}.${key}`] ?? labels[key] ?? key;
    },
}));

vi.mock("react-redux", () => ({
  useDispatch: () => mocks.dispatch,
}));

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    util: { invalidateTags: mocks.invalidateTags },
  },
}));

vi.mock("@/lib/features/data-import/dataImportApiSlice", () => ({
  useGetDataImportSessionQuery: () => ({
    data: mocks.sessionData,
    error: null,
  }),
  useGetDataImportRowsQuery: () => ({
    data: mocks.rowsData,
    error: null,
  }),
  useUploadDataImportMutation: () => [mocks.upload, { isLoading: false }],
  useValidateDataImportMutation: () => [mocks.validate, { isLoading: false }],
  useExecuteDataImportMutation: () => [mocks.execute, { isLoading: false }],
  useLazyDownloadDataImportTemplateQuery: () => [
    mocks.downloadTemplate,
    { isFetching: false },
  ],
  useLazyDownloadDataImportReportQuery: () => [vi.fn(), { isFetching: false }],
}));

import CustomerImportWizard, {
  DataImportWizard,
} from "@/components/migration/CustomerImportWizard";

describe("CustomerImportWizard", () => {
  beforeEach(() => {
    mocks.rowsData = null;
    mocks.sessionData = null;
    mocks.upload.mockReset();
    mocks.validate.mockReset();
    mocks.execute.mockReset();
    mocks.dispatch.mockReset();
    mocks.downloadTemplate.mockReset();
    mocks.invalidateTags.mockClear();
  });

  it("uses localized failure copy instead of the API diagnostic in a failed report", async () => {
    render(
      <CustomerImportWizard
        initialSession={{
          id: "failed-import-1",
          status: "failed",
          originalFileName: "customers.csv",
          lastError: {
            code: "IMPORT_EXECUTION_FAILED",
            message: "Internal English database failure",
          },
        }}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "The import needs attention",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The import could not be completed."),
    ).toBeVisible();
    expect(
      screen.queryByText("Internal English database failure"),
    ).not.toBeInTheDocument();
  });

  it("downloads the customer template without putting a Blob in RTK Query", async () => {
    const user = userEvent.setup();
    const csv = "Full Name,Email\r\nAda Lovelace,ada@example.com\r\n";
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    let clickedAnchor;
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function captureDownload() {
        clickedAnchor = this;
      });
    mocks.downloadTemplate.mockReturnValue({
      unwrap: () => Promise.resolve(csv),
    });

    render(<CustomerImportWizard />);
    await user.click(
      screen.getByRole("button", { name: "Download customer template" }),
    );

    await waitFor(() =>
      expect(mocks.downloadTemplate).toHaveBeenCalledWith({
        entity: "customers",
      }),
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    const [downloadBlob] = createObjectURL.mock.calls.at(-1);
    expect(downloadBlob.type).toBe("text/csv;charset=utf-8");
    const downloadBytes = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        resolve(new Uint8Array(reader.result)),
      );
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsArrayBuffer(downloadBlob);
    });
    expect(Array.from(downloadBytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(clickedAnchor.download).toBe("shario-customers-import-template.csv");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows template download errors without starting a browser download", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.spyOn(URL, "createObjectURL");
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click");
    mocks.downloadTemplate.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: "Template unavailable" } }),
    });

    render(<CustomerImportWizard />);
    await user.click(
      screen.getByRole("button", { name: "Download customer template" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "errors.template",
    );
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(anchorClick).not.toHaveBeenCalled();
  });

  it("completes upload, mapping, validation, execution and report states", async () => {
    const user = userEvent.setup();
    const uploadedSession = {
      id: "import-1",
      status: "uploaded",
      originalFileName: "customers.csv",
      headers: ["First Name", "Mail"],
      suggestedMapping: { firstName: "First Name", email: "Mail" },
      sampleRows: [{ "First Name": "Ada", Mail: "ada@example.com" }],
      totalRows: 2,
    };
    const validatedSession = {
      ...uploadedSession,
      status: "validated",
      mapping: uploadedSession.suggestedMapping,
      duplicateStrategy: "skip",
      validationRevision: "revision-1",
      summary: {
        total: 2,
        valid: 2,
        warnings: 0,
        invalid: 0,
        duplicates: 0,
        toCreate: 2,
        toUpdate: 0,
        toSkip: 0,
      },
    };
    const queuedSession = { ...validatedSession, status: "queued" };

    mocks.upload.mockReturnValue({
      unwrap: () => Promise.resolve({ data: uploadedSession }),
    });
    mocks.validate.mockReturnValue({
      unwrap: () => Promise.resolve({ data: validatedSession }),
    });
    mocks.execute.mockReturnValue({
      unwrap: () => Promise.resolve({ data: queuedSession }),
    });
    mocks.rowsData = { data: { rows: [] } };

    const { container, rerender } = render(<CustomerImportWizard />);

    expect(
      screen.getByRole("heading", { name: "Choose your customer file" }),
    ).toBeInTheDocument();

    const file = new File(
      ["First Name,Mail\nAda,ada@example.com"],
      "customers.csv",
      {
        type: "text/csv",
      },
    );
    await user.upload(container.querySelector('input[type="file"]'), file);
    await user.click(
      screen.getByRole("button", { name: "Upload and continue" }),
    );

    expect(mocks.upload).toHaveBeenCalledWith({
      entity: "customers",
      file,
    });
    expect(
      await screen.findByRole("heading", {
        name: "Match columns to shario.io",
      }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("First name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Email")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Validate file" }));

    expect(mocks.validate).toHaveBeenCalledWith({
      id: "import-1",
      mapping: { firstName: "First Name", email: "Mail" },
      duplicateStrategy: "skip",
      preserveImportedMemberNumbers: false,
    });
    expect(
      await screen.findByRole("heading", { name: "Review before importing" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", { name: /I reviewed this import/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Import 2 valid rows" }),
    );

    expect(mocks.execute).toHaveBeenCalledWith({
      id: "import-1",
      validationRevision: "revision-1",
    });
    expect(
      await screen.findByRole("heading", {
        name: "Your customers are being imported",
      }),
    ).toBeInTheDocument();

    mocks.sessionData = {
      data: {
        ...queuedSession,
        status: "completed",
        completedAt: "2026-08-05T16:00:00.000Z",
        summary: {
          ...validatedSession.summary,
          created: 2,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
      },
    };
    rerender(<CustomerImportWizard />);

    expect(
      await screen.findByRole("heading", { name: "Customer import complete" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "invalidate" }),
      ),
    );
  });

  it("masks legacy hashes and requires explicit bcrypt confirmation", async () => {
    const user = userEvent.setup();
    const passwordHash = `$2b$12$${"A".repeat(53)}`;
    const passwordHeader = "Legacy Password Hash (bcrypt)";
    const uploadedSession = {
      id: "credential-import-1",
      status: "uploaded",
      originalFileName: "customers.csv",
      headers: ["Full Name", "Email", passwordHeader],
      suggestedMapping: {
        fullName: "Full Name",
        email: "Email",
        passwordHash: passwordHeader,
      },
      credentialRowCount: 1,
      sampleRows: [
        {
          "Full Name": "Ada Lovelace",
          Email: "ada@example.com",
          [passwordHeader]: passwordHash,
        },
      ],
    };
    mocks.upload.mockReturnValue({
      unwrap: () => Promise.resolve({ data: uploadedSession }),
    });
    mocks.validate.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            ...uploadedSession,
            status: "validated",
            mapping: uploadedSession.suggestedMapping,
            credentialImportConfirmed: true,
            validationRevision: "credential-revision-1",
            summary: { total: 1, valid: 1, toCreate: 1 },
          },
        }),
    });

    const { container } = render(<CustomerImportWizard />);
    const file = new File(["customer import"], "customers.csv", {
      type: "text/csv",
    });
    await user.upload(container.querySelector('input[type="file"]'), file);
    await user.click(
      screen.getByRole("button", { name: "Upload and continue" }),
    );

    expect(container).not.toHaveTextContent(passwordHash);
    expect(screen.getByText("Securely provided")).toBeInTheDocument();
    const validateButton = screen.getByRole("button", {
      name: "Validate file",
    });
    expect(validateButton).toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", {
        name: /I confirm that this column contains securely exported bcrypt hashes/,
      }),
    );
    expect(validateButton).toBeEnabled();
    await user.click(validateButton);

    expect(mocks.validate).toHaveBeenCalledWith({
      id: "credential-import-1",
      mapping: uploadedSession.suggestedMapping,
      duplicateStrategy: "skip",
      confirmPasswordHashImport: true,
      preserveImportedMemberNumbers: false,
    });
  });

  it("requires an explicit opt-in before preserving imported member numbers", async () => {
    const user = userEvent.setup();
    const uploadedSession = {
      id: "member-number-import-1",
      status: "uploaded",
      originalFileName: "customers.csv",
      headers: ["Full Name", "Member Number"],
      suggestedMapping: {
        fullName: "Full Name",
        memberNumber: "Member Number",
      },
      sampleRows: [{ "Full Name": "Ada Lovelace", "Member Number": "234" }],
    };
    mocks.upload.mockReturnValue({
      unwrap: () => Promise.resolve({ data: uploadedSession }),
    });
    mocks.validate.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            ...uploadedSession,
            status: "validated",
            mapping: uploadedSession.suggestedMapping,
            preserveImportedMemberNumbers: true,
            validationRevision: "member-number-revision-1",
            sampleRows: [
              {
                rowNumber: 2,
                normalized: { fullName: "Ada Lovelace", memberNumber: 234 },
                issues: [
                  {
                    code: "CUSTOMER_MEMBER_NUMBER_OWNER_WILL_BE_REASSIGNED",
                    field: "memberNumber",
                    severity: "warning",
                  },
                ],
              },
            ],
            summary: {
              total: 1,
              valid: 1,
              warnings: 1,
              toCreate: 1,
              memberNumberCollisions: 1,
              memberNumberReassignments: 1,
            },
          },
        }),
    });

    const { container } = render(<CustomerImportWizard />);
    const file = new File(["customer import"], "customers.csv", {
      type: "text/csv",
    });
    await user.upload(container.querySelector('input[type="file"]'), file);
    await user.click(
      screen.getByRole("button", { name: "Upload and continue" }),
    );

    const preserveControl = screen.getByRole("checkbox", {
      name: "Preserve imported numbers and reassign conflicts.",
    });
    expect(preserveControl).not.toBeChecked();
    await user.click(preserveControl);
    await user.click(screen.getByRole("button", { name: "Validate file" }));

    expect(mocks.validate).toHaveBeenCalledWith({
      id: "member-number-import-1",
      mapping: uploadedSession.suggestedMapping,
      duplicateStrategy: "skip",
      preserveImportedMemberNumbers: true,
    });
    expect(
      await screen.findByText("Member number collisions"),
    ).toBeInTheDocument();
    expect(screen.getByText("Existing customers renumbered")).toBeVisible();
    expect(
      screen.getByText(
        "Another customer will receive the next available number.",
      ),
    ).toBeVisible();
  });

  it("requires a supported non-empty file before upload", async () => {
    const user = userEvent.setup();
    const { container } = render(<CustomerImportWizard />);
    const file = new File(["not a sheet"], "customers.txt", {
      type: "text/plain",
    });

    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [file] },
    });
    await user.click(
      screen.getByRole("button", { name: "Upload and continue" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("errors.file.type");
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("runs the shared mapping flow for products and services", async () => {
    const user = userEvent.setup();
    const uploadedSession = {
      id: "product-import-1",
      entityType: "products",
      status: "uploaded",
      originalFileName: "products.csv",
      headers: ["Service", "Type", "Price"],
      suggestedMapping: {
        name: "Service",
        kind: "Type",
        price: "Price",
      },
      sampleRows: [
        { Service: "Open studio", Type: "Open Studio", Price: "300" },
      ],
    };
    const validatedSession = {
      ...uploadedSession,
      status: "validated",
      mapping: uploadedSession.suggestedMapping,
      validationRevision: "product-revision-1",
      summary: { total: 1, valid: 1, toCreate: 1 },
    };
    mocks.upload.mockReturnValue({
      unwrap: () => Promise.resolve({ data: uploadedSession }),
    });
    mocks.validate.mockReturnValue({
      unwrap: () => Promise.resolve({ data: validatedSession }),
    });

    mocks.execute.mockReturnValue({
      unwrap: () =>
        Promise.resolve({ data: { ...validatedSession, status: "queued" } }),
    });

    const { container, rerender } = render(
      <DataImportWizard entity="products" />,
    );
    expect(
      screen.getByRole("heading", {
        name: "Choose your products and services file",
      }),
    ).toBeInTheDocument();

    const file = new File(["Service,Type,Price"], "products.csv", {
      type: "text/csv",
    });
    await user.upload(container.querySelector('input[type="file"]'), file);
    await user.click(
      screen.getByRole("button", { name: "Upload and continue" }),
    );

    expect(mocks.upload).toHaveBeenCalledWith({ entity: "products", file });
    expect(await screen.findByDisplayValue("Name")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Category")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Validate file" }));
    expect(mocks.validate).toHaveBeenCalledWith({
      id: "product-import-1",
      mapping: uploadedSession.suggestedMapping,
      duplicateStrategy: "skip",
    });

    await user.click(
      screen.getByRole("checkbox", { name: /I reviewed this import/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Import 1 valid rows" }),
    );
    expect(mocks.execute).toHaveBeenCalledWith({
      id: "product-import-1",
      validationRevision: "product-revision-1",
    });
    expect(
      await screen.findByRole("heading", {
        name: "Your products and services are being imported",
      }),
    ).toBeInTheDocument();

    mocks.sessionData = {
      data: {
        ...validatedSession,
        status: "completed",
        completedAt: "2026-08-05T18:00:00.000Z",
        summary: {
          ...validatedSession.summary,
          created: 1,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
      },
    };
    rerender(<DataImportWizard entity="products" />);
    expect(
      await screen.findByRole("heading", {
        name: "Product and service import complete",
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.invalidateTags).toHaveBeenCalledWith(
        expect.arrayContaining(["Product", "SetupCenter"]),
      ),
    );
  });

  it("runs the shared mapping flow for booking dependencies", async () => {
    const user = userEvent.setup();
    const suggestedMapping = {
      start: "Start",
      end: "End",
      customerEmail: "Email",
      productSku: "SKU",
      locationCode: "Location",
    };
    const uploadedSession = {
      id: "booking-import-1",
      entityType: "bookings",
      status: "uploaded",
      originalFileName: "bookings.csv",
      headers: ["Start", "End", "Email", "SKU", "Location"],
      suggestedMapping,
      sampleRows: [
        {
          Start: "2026-08-10T10:00:00+02:00",
          End: "2026-08-10T12:00:00+02:00",
          Email: "ada@example.com",
          SKU: "OPEN-2H",
          Location: "BRNO",
        },
      ],
    };
    mocks.upload.mockReturnValue({
      unwrap: () => Promise.resolve({ data: uploadedSession }),
    });
    mocks.validate.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            ...uploadedSession,
            status: "validated",
            mapping: suggestedMapping,
            validationRevision: "booking-revision-1",
            summary: { total: 1, valid: 1, toCreate: 1 },
          },
        }),
    });

    const { container } = render(<DataImportWizard entity="bookings" />);
    const file = new File(["Start,End,Email,SKU,Location"], "bookings.csv", {
      type: "text/csv",
    });
    await user.upload(container.querySelector('input[type="file"]'), file);
    await user.click(
      screen.getByRole("button", { name: "Upload and continue" }),
    );
    await user.click(screen.getByRole("button", { name: "Validate file" }));

    expect(mocks.validate).toHaveBeenCalledWith({
      id: "booking-import-1",
      mapping: suggestedMapping,
      duplicateStrategy: "skip",
    });
  });
});
