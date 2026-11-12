import { describe, expect, it, vi } from "vitest";
import { findNonSerializableValue } from "@reduxjs/toolkit";

const apiContract = vi.hoisted(() => ({ definitions: null }));

vi.mock("@/lib/features/api/apiSlice", () => ({
  apiSlice: {
    injectEndpoints: vi.fn(({ endpoints }) => {
      const builder = {
        mutation: (definition) => definition,
        query: (definition) => definition,
      };

      apiContract.definitions = endpoints(builder);
      return {};
    }),
  },
}));

import { dashboardNavigation } from "@/components/dashboard/dashboard.data";
import { getWorkspaceRouteTitleKey } from "@/components/dashboard/workspaceRouteConfig";
import {
  BOOKING_IMPORT_FIELDS,
  CREDIT_IMPORT_FIELDS,
  CUSTOMER_IMPORT_FIELDS,
  CUSTOMER_IMPORT_MAX_FILE_BYTES,
  DATA_IMPORT_ENTITIES,
  MEMBERSHIP_IMPORT_FIELDS,
  MEMBERSHIP_PLAN_IMPORT_FIELDS,
  PRODUCT_IMPORT_FIELDS,
  VOUCHER_IMPORT_FIELDS,
  VOUCHER_PRODUCT_IMPORT_FIELDS,
  getCustomerImportProgress,
  getCustomerImportSummary,
  getDataImportRowLabel,
  getFieldForHeader,
  hasRequiredImportMapping,
  hasCustomerNameMapping,
  normalizeCustomerImportMapping,
  normalizeDataImportMapping,
  normalizeImportHistory,
  normalizeImportRows,
  normalizeImportSession,
  setCustomerImportColumnMapping,
  setDataImportColumnMapping,
  validateCustomerImportFile,
} from "@/components/migration/customerImport.utils";
import {
  canAccessSettingsItem,
  settingsNavigationGroups,
} from "@/components/settings/settingsNavigation";
import { DATA_IMPORT_PERMISSIONS, PERMISSIONS } from "@/config/permissions";
import { dataImportApiRoutes } from "@/lib/features/data-import/dataImportApiRoutes";
import "@/lib/features/data-import/dataImportApiSlice";

describe("data import API and navigation contract", () => {
  it("uses the authenticated imports endpoint family", () => {
    expect(dataImportApiRoutes.collection).toBe("/imports");
    expect(dataImportApiRoutes.upload("products")).toBe(
      "/imports/products/uploads",
    );
    expect(dataImportApiRoutes.template("bookings")).toBe(
      "/imports/templates/bookings.csv",
    );
    expect(dataImportApiRoutes.upload("membership-plans")).toBe(
      "/imports/membership-plans/uploads",
    );
    expect(dataImportApiRoutes.template("voucher-products")).toBe(
      "/imports/templates/voucher-products.csv",
    );
    expect(dataImportApiRoutes.customersUpload).toBe(
      "/imports/customers/uploads",
    );
    expect(dataImportApiRoutes.customerTemplate).toBe(
      "/imports/templates/customers.csv",
    );
    expect(dataImportApiRoutes.session("import 1")).toBe("/imports/import%201");
    expect(dataImportApiRoutes.rows("import 1")).toBe(
      "/imports/import%201/rows",
    );
    expect(dataImportApiRoutes.validate("import 1")).toBe(
      "/imports/import%201/validate",
    );
    expect(dataImportApiRoutes.execute("import 1")).toBe(
      "/imports/import%201/execute",
    );
    expect(dataImportApiRoutes.report("import 1")).toBe(
      "/imports/import%201/report.csv",
    );
    expect(dataImportApiRoutes.rollbackPreview("import 1")).toBe(
      "/imports/import%201/rollback-preview",
    );
    expect(dataImportApiRoutes.rollback("import 1")).toBe(
      "/imports/import%201/rollback",
    );
    expect(dataImportApiRoutes.rollbackReport("import 1")).toBe(
      "/imports/import%201/rollback-report.csv",
    );
  });

  it("builds exact list, upload, validation and execution requests", () => {
    const history = apiContract.definitions.getDataImportHistory.query();
    expect(history).toEqual({
      url: "/imports",
      params: { entityType: "customers", limit: 20 },
    });
    expect(
      apiContract.definitions.getDataImportHistory.query({
        entity: null,
        page: 2,
        limit: 10,
        status: "completed",
        rollbackStatus: "partial",
        search: " legacy.csv ",
        createdFrom: "2026-07-01",
        createdTo: "2026-08-01",
      }),
    ).toEqual({
      url: "/imports",
      params: {
        page: 2,
        limit: 10,
        status: "completed",
        rollbackStatus: "partial",
        search: "legacy.csv",
        createdFrom: "2026-07-01",
        createdTo: "2026-08-01",
      },
    });

    const file = new File(["Full Name\nAda Lovelace"], "customers.csv", {
      type: "text/csv",
    });
    const upload = apiContract.definitions.uploadCustomerImport.query(file);
    expect(upload).toMatchObject({
      url: "/imports/customers/uploads",
      method: "POST",
    });
    expect(upload.body).toBeInstanceOf(FormData);
    expect(upload.body.get("file")).toBe(file);

    const productUpload = apiContract.definitions.uploadDataImport.query({
      entity: "products",
      file,
    });
    expect(productUpload).toMatchObject({
      url: "/imports/products/uploads",
      method: "POST",
    });
    expect(productUpload.body.get("file")).toBe(file);

    expect(
      apiContract.definitions.validateDataImport.query({
        id: "product-import-1",
        mapping: { name: "Name", kind: "Category" },
        duplicateStrategy: "skip",
      }),
    ).toEqual({
      url: "/imports/product-import-1/validate",
      method: "POST",
      body: {
        mapping: { name: "Name", kind: "Category" },
        duplicateStrategy: "skip",
      },
    });
    expect(
      apiContract.definitions.validateDataImport.query({
        id: "customer-import-1",
        mapping: {
          fullName: "Full Name",
          memberNumber: "Member Number",
          passwordHash: "Legacy Password Hash (bcrypt)",
        },
        duplicateStrategy: "skip",
        confirmPasswordHashImport: true,
        preserveImportedMemberNumbers: true,
      }),
    ).toEqual({
      url: "/imports/customer-import-1/validate",
      method: "POST",
      body: {
        mapping: {
          fullName: "Full Name",
          memberNumber: "Member Number",
          passwordHash: "Legacy Password Hash (bcrypt)",
        },
        duplicateStrategy: "skip",
        preserveImportedMemberNumbers: true,
        confirmPasswordHashImport: true,
      },
    });
    expect(
      apiContract.definitions.downloadDataImportTemplate.query({
        entity: "bookings",
      }),
    ).toMatchObject({ url: "/imports/templates/bookings.csv" });
    expect(
      apiContract.definitions.downloadDataImportReport.query({
        id: "booking-import-1",
      }),
    ).toMatchObject({ url: "/imports/booking-import-1/report.csv" });
    expect(
      apiContract.definitions.getDataImportRollbackPreview.query({
        id: "booking import 1",
      }),
    ).toBe("/imports/booking%20import%201/rollback-preview");
    expect(
      apiContract.definitions.rollbackDataImport.query({
        id: "booking import 1",
        revision: "revision-2",
        previewToken: "preview-2",
        idempotencyKey: "request-1",
      }),
    ).toEqual({
      url: "/imports/booking%20import%201/rollback",
      method: "POST",
      body: { revision: "revision-2", previewToken: "preview-2" },
      headers: { "Idempotency-Key": "request-1" },
    });
    expect(
      apiContract.definitions.downloadDataImportRollbackReport.query({
        id: "booking import 1",
      }),
    ).toMatchObject({
      url: "/imports/booking%20import%201/rollback-report.csv",
    });

    expect(
      apiContract.definitions.validateCustomerImport.query({
        id: "import-1",
        mapping: { fullName: "Full Name", memberNumber: "Member Number" },
        duplicateStrategy: "update",
        preserveImportedMemberNumbers: true,
      }),
    ).toEqual({
      url: "/imports/import-1/validate",
      method: "POST",
      body: {
        mapping: { fullName: "Full Name", memberNumber: "Member Number" },
        duplicateStrategy: "update",
        preserveImportedMemberNumbers: true,
      },
    });
    expect(
      apiContract.definitions.validateCustomerImport.query({
        id: "import-2",
        mapping: { fullName: "Full Name" },
        duplicateStrategy: "skip",
      }).body.preserveImportedMemberNumbers,
    ).toBe(false);

    expect(
      apiContract.definitions.executeCustomerImport.query({
        id: "import-1",
        validationRevision: "revision-1",
        duplicateStrategy: "update",
      }),
    ).toEqual({
      url: "/imports/import-1/execute",
      method: "POST",
      body: { validationRevision: "revision-1" },
    });
  });

  it("keeps CSV downloads serializable while preserving structured errors", async () => {
    const templateRequest =
      apiContract.definitions.downloadDataImportTemplate.query({
        entity: "customers",
      });
    const templateResponse = {
      ok: true,
      text: vi.fn().mockResolvedValue("Full Name,Email\r\nAda,ada@example.com"),
    };

    const templatePayload =
      await templateRequest.responseHandler(templateResponse);

    expect(templatePayload).toBe("Full Name,Email\r\nAda,ada@example.com");
    expect(templatePayload).not.toBeInstanceOf(Blob);
    expect(findNonSerializableValue(templatePayload)).toBe(false);
    expect(templateResponse.text).toHaveBeenCalledOnce();

    const errorResponse = {
      ok: false,
      text: vi
        .fn()
        .mockResolvedValue(
          JSON.stringify({ code: "IMPORT_FORBIDDEN", message: "Forbidden" }),
        ),
    };

    const errorPayload = await templateRequest.responseHandler(errorResponse);

    expect(errorPayload).toEqual({
      code: "IMPORT_FORBIDDEN",
      message: "Forbidden",
    });
    expect(findNonSerializableValue(errorPayload)).toBe(false);
  });

  it("makes Migration Center discoverable through any import permission", () => {
    expect(PERMISSIONS.CUSTOMERS_IMPORT).toBe("customers.import");
    expect(PERMISSIONS.PRODUCTS_IMPORT).toBe("products.import");
    expect(PERMISSIONS.BOOKINGS_IMPORT).toBe("bookings.import");
    expect(PERMISSIONS.MEMBERSHIPS_IMPORT).toBe("memberships.import");
    expect(PERMISSIONS.CREDITS_IMPORT).toBe("credits.import");
    expect(PERMISSIONS.VOUCHERS_IMPORT).toBe("vouchers.import");
    expect(PERMISSIONS.DATA_IMPORTS_ROLLBACK).toBe("data-imports.rollback");
    expect(DATA_IMPORT_PERMISSIONS).toEqual([
      "customers.import",
      "products.import",
      "bookings.import",
      "memberships.import",
      "credits.import",
      "vouchers.import",
    ]);

    const migrationItem = settingsNavigationGroups
      .flatMap((group) => group.items)
      .find((item) => item.key === "migration");
    expect(migrationItem).toMatchObject({
      href: "/app/settings/migration",
    });
    expect(migrationItem.permissions).toBe(DATA_IMPORT_PERMISSIONS);
    expect(
      canAccessSettingsItem(
        migrationItem,
        { role: "custom", permissions: [PERMISSIONS.PRODUCTS_IMPORT] },
        {},
      ),
    ).toBe(true);
    expect(
      canAccessSettingsItem(
        migrationItem,
        { role: "custom", permissions: [] },
        {},
      ),
    ).toBe(false);

    const settingsItem = dashboardNavigation.find(
      (item) => item.key === "settings",
    );
    expect(settingsItem.permissions).toContain(PERMISSIONS.CUSTOMERS_IMPORT);
    expect(settingsItem.permissions).toContain(PERMISSIONS.PRODUCTS_IMPORT);
    expect(settingsItem.permissions).toContain(PERMISSIONS.BOOKINGS_IMPORT);
    expect(settingsItem.permissions).toContain(PERMISSIONS.MEMBERSHIPS_IMPORT);
    expect(settingsItem.permissions).toContain(PERMISSIONS.CREDITS_IMPORT);
    expect(settingsItem.permissions).toContain(PERMISSIONS.VOUCHERS_IMPORT);
    expect(settingsItem.activeHrefs).toContain("/app/settings");
    expect(
      getWorkspaceRouteTitleKey(
        "/app/settings/migration",
        new URLSearchParams(),
      ),
    ).toBe("routeTitles.migration");
  });
});

describe("customer import mapping and response normalization", () => {
  it("keeps only supported suggested mappings from uploaded headers", () => {
    expect(
      normalizeCustomerImportMapping(
        {
          firstName: "First Name",
          email: "Mail",
          memberNumber: "Member Number",
          phone: "Not present",
          unexpected: "Anything",
        },
        ["First Name", "Mail", "Member Number"],
      ),
    ).toEqual({
      firstName: "First Name",
      email: "Mail",
      memberNumber: "Member Number",
    });
  });

  it("keeps source and target columns unique when a mapping changes", () => {
    const initial = {
      firstName: "Name",
      email: "Mail",
    };
    const remapped = setCustomerImportColumnMapping(initial, "Name", "email");

    expect(remapped).toEqual({ email: "Name" });
    expect(getFieldForHeader(remapped, "Name")).toBe("email");
    expect(hasCustomerNameMapping(remapped)).toBe(false);
    expect(hasCustomerNameMapping({ fullName: "Customer" })).toBe(true);
  });

  it("uses the canonical #N format when a member number identifies a row", () => {
    expect(
      getDataImportRowLabel(DATA_IMPORT_ENTITIES.CUSTOMERS, {
        normalized: { memberNumber: 234 },
      }),
    ).toBe("#234");
  });

  it("unwraps every server envelope used by the import flow", () => {
    const session = normalizeImportSession({
      data: { id: "session-1", status: "uploaded" },
    });
    const history = normalizeImportHistory({
      data: { items: [{ id: "session-1" }] },
    });
    const rows = normalizeImportRows({
      data: { rows: [{ rowNumber: 2 }] },
    });

    expect(session).toMatchObject({ id: "session-1", status: "uploaded" });
    expect(history).toEqual([{ id: "session-1" }]);
    expect(rows).toEqual([{ rowNumber: 2 }]);
  });

  it("normalizes validation and execution summaries defensively", () => {
    const session = {
      status: "processing",
      summary: {
        total: "8",
        valid: 6,
        memberNumberCollisions: "2",
        memberNumberReassignments: 1,
        created: 2,
        updated: 1,
        skipped: 1,
        failed: -2,
      },
    };

    expect(getCustomerImportSummary(session)).toMatchObject({
      total: 8,
      valid: 6,
      memberNumberCollisions: 2,
      memberNumberReassignments: 1,
      created: 2,
      updated: 1,
      skipped: 1,
      failed: 0,
    });
    expect(getCustomerImportProgress(session)).toBe(67);
    expect(getCustomerImportProgress({ ...session, status: "completed" })).toBe(
      100,
    );
  });
});

describe("shared entity import mapping", () => {
  it("matches the server's safe product and booking mapping fields", () => {
    expect(PRODUCT_IMPORT_FIELDS).toEqual([
      "name",
      "kind",
      "description",
      "sku",
      "price",
      "extraCharge",
      "currency",
      "capacity",
      "bookingMode",
      "registrationPolicy",
      "isActive",
      "sortOrder",
      "externalId",
    ]);
    expect(BOOKING_IMPORT_FIELDS).toEqual([
      "externalId",
      "customerExternalId",
      "customerEmail",
      "customerPhone",
      "productExternalId",
      "productSku",
      "productName",
      "locationCode",
      "locationSlug",
      "locationName",
      "start",
      "end",
      "date",
      "startTime",
      "endTime",
      "numberOfGuests",
      "status",
      "language",
      "plannedActivity",
      "lecturer",
      "description",
      "note",
    ]);
    expect(BOOKING_IMPORT_FIELDS).not.toContain("paymentStatus");
    expect(BOOKING_IMPORT_FIELDS).not.toContain("bookingType");
  });

  it("keeps product fields unique and requires name plus category", () => {
    const mapping = normalizeDataImportMapping(
      DATA_IMPORT_ENTITIES.PRODUCTS,
      { name: "Service", kind: "Type", price: "Price", email: "Mail" },
      ["Service", "Type", "Price", "Mail"],
    );

    expect(mapping).toEqual({
      name: "Service",
      kind: "Type",
      price: "Price",
    });
    expect(hasRequiredImportMapping("products", mapping)).toBe(true);
    expect(hasRequiredImportMapping("products", { name: "Service" })).toBe(
      false,
    );
    expect(getFieldForHeader(mapping, "Type", "products")).toBe("kind");
    expect(
      setDataImportColumnMapping("products", mapping, "Service", "kind"),
    ).toEqual({ kind: "Service", price: "Price" });
  });

  it("requires time and product while customer and a single location stay row-conditional", () => {
    const complete = {
      start: "Start",
      end: "End",
      productSku: "SKU",
      locationCode: "Location",
    };

    expect(hasRequiredImportMapping("bookings", complete)).toBe(true);
    expect(
      hasRequiredImportMapping("bookings", {
        ...complete,
        locationCode: undefined,
      }),
    ).toBe(true);
    expect(
      hasRequiredImportMapping("bookings", {
        start: "Start",
        end: "End",
      }),
    ).toBe(false);

    expect(
      hasRequiredImportMapping("bookings", {
        date: "Date",
        startTime: "From",
        endTime: "Until",
        productName: "Offer",
        locationName: "Studio",
      }),
    ).toBe(true);
  });

  it("keeps split-time fields and discards unsafe booking accounting hints", () => {
    expect(
      normalizeDataImportMapping(
        "bookings",
        {
          date: "Date",
          startTime: "From",
          endTime: "Until",
          paymentStatus: "Paid",
          bookingType: "Type",
        },
        ["Date", "From", "Until", "Paid", "Type"],
      ),
    ).toEqual({
      date: "Date",
      startTime: "From",
      endTime: "Until",
    });
  });

  it("matches the five Step 3 field contracts", () => {
    expect(CUSTOMER_IMPORT_FIELDS).toEqual([
      "fullName",
      "firstName",
      "lastName",
      "email",
      "phone",
      "memberNumber",
      "externalId",
      "passwordHash",
    ]);
    expect(MEMBERSHIP_PLAN_IMPORT_FIELDS).toEqual([
      "externalId",
      "name",
      "description",
      "terms",
      "price",
      "currency",
      "billingType",
      "billingInterval",
      "intervalCount",
      "durationDays",
      "locationScope",
      "locationCodes",
      "creditAllowance",
      "discountPercent",
      "customPerk",
      "benefits",
      "status",
      "sortOrder",
    ]);
    expect(MEMBERSHIP_IMPORT_FIELDS).toEqual([
      "externalId",
      "customerExternalId",
      "customerEmail",
      "customerPhone",
      "planExternalId",
      "planName",
      "planVersion",
      "locationCode",
      "locationSlug",
      "locationName",
      "status",
      "startedAt",
      "periodStart",
      "periodEnd",
      "cancelledAt",
      "currency",
      "amount",
      "allowanceBalances",
      "note",
    ]);
    expect(CREDIT_IMPORT_FIELDS).toEqual([
      "externalId",
      "customerExternalId",
      "customerEmail",
      "customerPhone",
      "balance",
      "currency",
      "note",
    ]);
    expect(VOUCHER_PRODUCT_IMPORT_FIELDS).toEqual([
      "externalId",
      "name",
      "description",
      "sku",
      "value",
      "currency",
      "isActive",
      "sortOrder",
    ]);
    expect(VOUCHER_IMPORT_FIELDS).toEqual([
      "externalId",
      "promoCode",
      "productExternalId",
      "productSku",
      "productName",
      "value",
      "currency",
      "status",
      "expiresAt",
      "redeemedAt",
      "customerExternalId",
      "customerEmail",
      "customerPhone",
      "note",
    ]);
  });

  it("enforces Step 3 required mapping groups without over-requiring row-conditional fields", () => {
    expect(
      hasRequiredImportMapping("membership-plans", {
        name: "Plan",
        price: "Price",
        billingType: "Billing",
      }),
    ).toBe(true);
    expect(
      hasRequiredImportMapping("memberships", {
        customerEmail: "Email",
        planName: "Plan",
        startedAt: "Started",
        periodEnd: "Period end",
      }),
    ).toBe(true);
    expect(
      hasRequiredImportMapping("memberships", {
        customerEmail: "Email",
        planName: "Plan",
        startedAt: "Started",
      }),
    ).toBe(false);
    expect(
      hasRequiredImportMapping("credits", {
        customerExternalId: "Customer ID",
        balance: "Opening balance",
      }),
    ).toBe(true);
    expect(
      hasRequiredImportMapping("voucher-products", {
        name: "Voucher",
        value: "Value",
      }),
    ).toBe(true);
    expect(
      hasRequiredImportMapping("vouchers", {
        promoCode: "Code",
        productSku: "SKU",
        value: "Value",
      }),
    ).toBe(true);
  });
});

describe("customer import file guardrails", () => {
  it("accepts CSV and XLSX files within the upload limit", () => {
    expect(
      validateCustomerImportFile(new File(["name"], "customers.csv")),
    ).toBe(null);
    expect(
      validateCustomerImportFile(new File(["sheet"], "customers.XLSX")),
    ).toBe(null);
  });

  it("rejects missing, empty, unsupported and oversized files", () => {
    expect(validateCustomerImportFile(null)).toBe("required");
    expect(validateCustomerImportFile(new File([], "customers.csv"))).toBe(
      "empty",
    );
    expect(validateCustomerImportFile(new File(["x"], "customers.pdf"))).toBe(
      "type",
    );
    expect(
      validateCustomerImportFile({
        name: "customers.csv",
        size: CUSTOMER_IMPORT_MAX_FILE_BYTES + 1,
      }),
    ).toBe("size");
  });
});
