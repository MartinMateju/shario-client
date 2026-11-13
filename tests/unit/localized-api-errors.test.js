import { describe, expect, it } from "vitest";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";
import { getAiErrorMessage } from "@/components/ai/ai.utils";
import { getImportErrorMessage } from "@/components/migration/customerImport.utils";
import { getInvoiceError } from "@/components/invoices/invoice.utils";
import { getPublicSiteEditorError } from "@/components/public-site-editor/publicSiteEditor.utils";
import { getReportErrorMessage } from "@/components/views/statistics/reports.utils";
import { getSetupErrorMessage } from "@/components/setup-center/setupCenter.utils";

describe("localized API errors", () => {
  it.each([
    { data: { code: "EMAIL_IN_USE", message: "Email already exists" } },
    { data: { errorCode: "EMAIL_IN_USE" } },
    { data: { error: { code: "EMAIL_IN_USE" } } },
    { code: "email_in_use" },
  ])("keeps actionable translated messages for known API codes", (error) => {
    expect(
      getLocalizedApiErrorMessage(error, "Erneut versuchen", {
        EMAIL_IN_USE: "Diese E-Mail-Adresse wird bereits verwendet.",
      }),
    ).toBe("Diese E-Mail-Adresse wird bereits verwendet.");
  });

  it.each([
    { data: { message: "Internal English API message" } },
    { data: { error: { message: "Internal English API message" } } },
    { error: "TypeError: Failed to fetch" },
    new Error("Network request failed"),
    { data: "Bad Gateway" },
    { code: "toString" },
    { code: "UNRECOGNIZED_CODE" },
    null,
  ])("uses screen copy instead of untranslated diagnostic prose", (error) => {
    expect(getLocalizedApiErrorMessage(error, "Opnieuw proberen")).toBe(
      "Opnieuw proberen",
    );
  });

  it.each([
    ["AI", getAiErrorMessage],
    ["imports", getImportErrorMessage],
    ["invoices", getInvoiceError],
    ["website editor", getPublicSiteEditorError],
    ["reports", getReportErrorMessage],
    ["setup", getSetupErrorMessage],
  ])("keeps the %s error path in the selected language", (_area, resolve) => {
    const error = {
      data: { message: "Request failed", error: "Request failed" },
      message: "Request failed",
    };
    expect(resolve(error, "Zkuste to znovu.")).toBe("Zkuste to znovu.");
    expect(resolve(error, "Veuillez réessayer.")).toBe("Veuillez réessayer.");
  });
});
