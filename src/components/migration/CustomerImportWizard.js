"use client";

import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TableCellsIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import {
  WorkspaceTable,
  WorkspaceTableScroller,
} from "@/components/dashboard/WorkspaceDataSurface";

import { apiSlice } from "@/lib/features/api/apiSlice";
import {
  useExecuteDataImportMutation,
  useGetDataImportRowsQuery,
  useGetDataImportSessionQuery,
  useLazyDownloadDataImportReportQuery,
  useLazyDownloadDataImportTemplateQuery,
  useUploadDataImportMutation,
  useValidateDataImportMutation,
} from "@/lib/features/data-import/dataImportApiSlice";

import {
  CUSTOMER_IMPORT_STATUS,
  DATA_IMPORT_ENTITIES,
  getDataImportEntityConfig,
  getCustomerImportProgress,
  getCustomerImportSummary,
  getDataImportRowLabel,
  getFieldForHeader,
  getImportErrorMessage,
  getImportHeaders,
  getImportId,
  getImportPreviewRows,
  hasRequiredImportMapping,
  isCustomerCreditHandoffHeader,
  isCustomerPasswordHashHeader,
  isCustomerImportRunning,
  normalizeDataImportMapping,
  normalizeImportRows,
  normalizeImportSession,
  setDataImportColumnMapping,
  triggerCsvDownload,
  validateCustomerImportFile,
} from "./customerImport.utils";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const WIZARD_STEPS = ["upload", "mapping", "validation", "import", "report"];

const STATUS_STYLES = {
  uploaded: "border-cobalt-100 bg-cobalt-50 text-cobalt-700",
  validating: "border-sand-200 bg-sand-50 text-sand-800",
  validated: "border-[#CFE0CB] bg-[#F5FAF3] text-[#47613E]",
  queued: "border-sand-200 bg-sand-50 text-sand-800",
  processing: "border-cobalt-100 bg-cobalt-50 text-cobalt-700",
  completed: "border-[#CFE0CB] bg-[#F5FAF3] text-[#47613E]",
  failed: "border-danger/20 bg-danger-soft text-danger",
};

const ISSUE_TRANSLATION_KEYS = Object.freeze({
  CUSTOMER_NAME_REQUIRED: "nameRequired",
  CUSTOMER_FIRST_NAME_TOO_LONG: "firstNameTooLong",
  CUSTOMER_LAST_NAME_TOO_LONG: "lastNameTooLong",
  CUSTOMER_EMAIL_INVALID: "emailInvalid",
  CUSTOMER_PHONE_TOO_LONG: "phoneTooLong",
  CUSTOMER_EXTERNAL_ID_TOO_LONG: "externalIdTooLong",
  CUSTOMER_EMAIL_MISSING: "emailMissing",
  CUSTOMER_DUPLICATE_IN_FILE: "duplicateInFile",
  CUSTOMER_IDENTITY_CONFLICT: "identityConflict",
  CUSTOMER_WORKSPACE_ACCOUNT_PROTECTED: "workspaceAccountProtected",
  CUSTOMER_PASSWORD_HASH_WITHOUT_EMAIL: "passwordHashWithoutEmail",
  CUSTOMER_PASSWORD_HASH_SKIPPED_EXISTING: "passwordHashSkippedExisting",
  CUSTOMER_PASSWORD_HASH_EXPIRED: "passwordHashExpired",
  CUSTOMER_MEMBER_NUMBER_INVALID: "memberNumberInvalid",
  CUSTOMER_MEMBER_NUMBER_DUPLICATE_IN_FILE: "memberNumberDuplicateInFile",
  CUSTOMER_MEMBER_NUMBER_KEPT_EXISTING: "memberNumberKeptExisting",
  CUSTOMER_MEMBER_NUMBER_OWNER_WILL_BE_REASSIGNED:
    "memberNumberOwnerWillBeReassigned",
  CUSTOMER_MEMBER_NUMBER_PROTECTED_OWNER: "memberNumberProtectedOwner",
  CUSTOMER_MEMBER_NUMBER_COLLISION: "memberNumberCollision",
  PRODUCT_NAME_REQUIRED: "nameRequired",
  PRODUCT_NAME_TOO_LONG: "nameTooLong",
  PRODUCT_DESCRIPTION_TOO_LONG: "descriptionTooLong",
  PRODUCT_SKU_TOO_LONG: "skuTooLong",
  PRODUCT_KIND_AMBIGUOUS: "kindAmbiguous",
  PRODUCT_KIND_INVALID: "kindInvalid",
  PRODUCT_KIND_UPDATE_FORBIDDEN: "kindUpdateForbidden",
  PRODUCT_DEDICATED_IMPORT_REQUIRED: "dedicatedImportRequired",
  PRODUCT_MODULE_DISABLED: "moduleDisabled",
  PRODUCT_PRICE_INVALID: "priceInvalid",
  PRODUCT_PRICE_PRECISION_INVALID: "pricePrecisionInvalid",
  PRODUCT_EXTRA_CHARGE_INVALID: "extraChargeInvalid",
  PRODUCT_CURRENCY_INVALID: "currencyInvalid",
  PRODUCT_CAPACITY_INVALID: "capacityInvalid",
  PRODUCT_CAPACITY_REQUIRED: "capacityRequired",
  PRODUCT_BOOKING_MODE_INVALID: "bookingModeInvalid",
  PRODUCT_BOOKING_MODE_REQUIRED: "bookingModeRequired",
  PRODUCT_BOOKING_MODE_UNEXPECTED: "bookingModeUnexpected",
  PRODUCT_REGISTRATION_POLICY_INVALID: "registrationPolicyInvalid",
  PRODUCT_PRIVATE_STUDIO_INVALID: "privateStudioInvalid",
  PRODUCT_ACTIVE_INVALID: "activeInvalid",
  PRODUCT_SORT_ORDER_INVALID: "sortOrderInvalid",
  PRODUCT_EXTERNAL_ID_TOO_LONG: "externalIdTooLong",
  PRODUCT_DUPLICATE_IN_FILE: "duplicateInFile",
  PRODUCT_IDENTITY_CONFLICT: "identityConflict",
  BOOKING_START_INVALID: "startInvalid",
  BOOKING_END_INVALID: "endInvalid",
  BOOKING_RANGE_INVALID: "rangeInvalid",
  BOOKING_TIME_REQUIRED: "timeRequired",
  BOOKING_LOCAL_TIME_INCOMPLETE: "localTimeIncomplete",
  BOOKING_LOCAL_TIME_INVALID: "localTimeInvalid",
  BOOKING_LOCAL_TIME_NONEXISTENT: "localTimeNonexistent",
  BOOKING_LOCAL_TIME_AMBIGUOUS: "localTimeAmbiguous",
  BOOKING_CUSTOMER_REQUIRED: "customerRequired",
  BOOKING_CUSTOMER_NOT_FOUND: "customerNotFound",
  BOOKING_CUSTOMER_AMBIGUOUS: "customerAmbiguous",
  BOOKING_PRODUCT_REQUIRED: "productRequired",
  BOOKING_PRODUCT_NOT_FOUND: "productNotFound",
  BOOKING_PRODUCT_AMBIGUOUS: "productAmbiguous",
  BOOKING_PRODUCT_NOT_BOOKABLE: "productNotBookable",
  BOOKING_PRODUCT_INACTIVE: "productInactive",
  BOOKING_CLASS_ENROLLMENT_UNSUPPORTED: "classEnrollmentUnsupported",
  BOOKING_LOCATION_REQUIRED: "locationRequired",
  BOOKING_LOCATION_NOT_FOUND: "locationNotFound",
  BOOKING_LOCATION_AMBIGUOUS: "locationAmbiguous",
  BOOKING_LOCATION_INACTIVE: "locationInactive",
  BOOKING_LOCATION_DEFAULTED: "locationDefaulted",
  BOOKING_STATUS_INVALID: "statusInvalid",
  BOOKING_STATUS_TIME_INCONSISTENT: "statusTimeInconsistent",
  BOOKING_GUESTS_INVALID: "guestsInvalid",
  BOOKING_AVAILABILITY_CONFLICT: "availabilityConflict",
  BOOKING_DURATION_OUTSIDE_CURRENT_RULES: "durationOutsideCurrentRules",
  BOOKING_ID_DERIVED: "idDerived",
  BOOKING_PRIVATE_SESSION_CUSTOMER_UNSUPPORTED:
    "privateSessionCustomerUnsupported",
  BOOKING_SESSION_GUESTS_IGNORED: "sessionGuestsIgnored",
  BOOKING_LANGUAGE_INVALID: "languageInvalid",
  BOOKING_ACTIVITY_INVALID: "activityInvalid",
  BOOKING_LECTURER_TOO_LONG: "lecturerTooLong",
  BOOKING_DESCRIPTION_TOO_LONG: "descriptionTooLong",
  BOOKING_NOTE_TOO_LONG: "noteTooLong",
  BOOKING_EXTERNAL_ID_TOO_LONG: "externalIdTooLong",
  BOOKING_DUPLICATE_IN_FILE: "duplicateInFile",
  BOOKING_IDENTITY_CONFLICT: "identityConflict",
  BOOKING_IDENTITY_AMBIGUOUS: "identityAmbiguous",
  BOOKING_KIND_UPDATE_FORBIDDEN: "kindUpdateForbidden",
  BOOKING_EXISTING_RECORD_PROTECTED: "existingRecordProtected",
  BOOKING_PRODUCT_CAPACITY_EXCEEDED: "productCapacityExceeded",
  BOOKING_FUTURE_RESCHEDULE_UNSUPPORTED: "futureRescheduleUnsupported",
  BOOKING_FUTURE_STATUS_UPDATE_UNSUPPORTED: "futureStatusUpdateUnsupported",
  MEMBERSHIP_PLAN_NAME_REQUIRED: "nameRequired",
  MEMBERSHIP_PLAN_NAME_TOO_LONG: "nameTooLong",
  MEMBERSHIP_PLAN_DESCRIPTION_TOO_LONG: "descriptionTooLong",
  MEMBERSHIP_PLAN_TERMS_TOO_LONG: "termsTooLong",
  MEMBERSHIP_PLAN_PRICE_INVALID: "priceInvalid",
  MEMBERSHIP_PLAN_PRICE_PRECISION_INVALID: "pricePrecisionInvalid",
  MEMBERSHIP_PLAN_CURRENCY_MISMATCH: "currencyInvalid",
  MEMBERSHIP_PLAN_BILLING_INVALID: "billingTypeInvalid",
  MEMBERSHIP_PLAN_LOCATION_REQUIRED: "locationCodesRequired",
  MEMBERSHIP_PLAN_LOCATION_NOT_FOUND: "locationNotFound",
  MEMBERSHIP_PLAN_LOCATION_OUT_OF_SCOPE: "locationAccessDenied",
  MEMBERSHIP_PLAN_BENEFITS_INVALID: "benefitsInvalid",
  MEMBERSHIP_PLAN_BENEFITS_MIXED: "benefitsMixed",
  MEMBERSHIP_PLAN_STATUS_INVALID: "statusInvalid",
  MEMBERSHIP_PLAN_EXTERNAL_ID_TOO_LONG: "externalIdTooLong",
  MEMBERSHIP_PLAN_DUPLICATE_IN_FILE: "duplicateInFile",
  MEMBERSHIP_PLAN_IDENTITY_CONFLICT: "identityConflict",
  MEMBERSHIP_PLAN_UPDATE_PROTECTED: "existingRecordProtected",
  MEMBERSHIP_CUSTOMER_REQUIRED: "customerRequired",
  MEMBERSHIP_CUSTOMER_NOT_FOUND: "customerNotFound",
  MEMBERSHIP_CUSTOMER_IDENTITY_CONFLICT: "customerAmbiguous",
  MEMBERSHIP_PLAN_REQUIRED: "planRequired",
  MEMBERSHIP_PLAN_NOT_FOUND: "planNotFound",
  MEMBERSHIP_PLAN_VERSION_INVALID: "planVersionInvalid",
  MEMBERSHIP_PLAN_VERSION_NOT_FOUND: "planVersionNotFound",
  MEMBERSHIP_LOCATION_NOT_FOUND: "locationNotFound",
  MEMBERSHIP_LOCATION_NOT_APPLICABLE: "locationRequired",
  MEMBERSHIP_LOCATION_OUT_OF_SCOPE: "locationAccessDenied",
  MEMBERSHIP_STATUS_INVALID: "statusInvalid",
  MEMBERSHIP_START_INVALID: "startedAtInvalid",
  MEMBERSHIP_PERIOD_INVALID: "dateRangeInvalid",
  MEMBERSHIP_ACTIVE_PERIOD_INVALID: "statusTimeInconsistent",
  MEMBERSHIP_EXPIRED_PERIOD_INVALID: "statusTimeInconsistent",
  MEMBERSHIP_CANCELLED_AT_INVALID: "cancelledAtInvalid",
  MEMBERSHIP_CANCELLED_AT_UNKNOWN: "cancelledAtUnknown",
  MEMBERSHIP_CURRENCY_NOT_OFFERED: "currencyInvalid",
  MEMBERSHIP_AMOUNT_INVALID: "amountInvalid",
  MEMBERSHIP_ALLOWANCE_BALANCES_INVALID: "allowanceBalancesInvalid",
  MEMBERSHIP_ALLOWANCE_DEFAULTED_ZERO: "allowanceZeroDefaulted",
  MEMBERSHIP_ALLOWANCE_KEY_INVALID: "allowanceKeyInvalid",
  MEMBERSHIP_TERMINAL_ALLOWANCE_NONZERO: "terminalAllowanceNonzero",
  MEMBERSHIP_NOTE_TOO_LONG: "noteTooLong",
  MEMBERSHIP_EXTERNAL_ID_TOO_LONG: "externalIdTooLong",
  MEMBERSHIP_DUPLICATE_IN_FILE: "duplicateInFile",
  MEMBERSHIP_IDENTITY_CONFLICT: "identityConflict",
  MEMBERSHIP_ALREADY_OPEN: "openMembershipConflict",
  MEMBERSHIP_UPDATE_PROTECTED: "existingRecordProtected",
  MEMBERSHIP_REOPEN_UNSUPPORTED: "statusTransitionForbidden",
  MEMBERSHIP_ALLOWANCE_DELTA_INSUFFICIENT: "allowanceUnavailable",
  MEMBERSHIP_ALLOWANCE_LEDGER_INCONSISTENT: "allowanceLedgerInconsistent",
  MEMBERSHIP_LEGACY_BALANCE_CONFLICT: "legacyBalanceConflict",
  MEMBERSHIP_PLAN_SNAPSHOT_INCONSISTENT: "planSnapshotInconsistent",
  CREDIT_CUSTOMER_REQUIRED: "customerRequired",
  CREDIT_CUSTOMER_NOT_FOUND: "customerNotFound",
  CREDIT_CUSTOMER_IDENTITY_CONFLICT: "customerAmbiguous",
  CREDIT_BALANCE_INVALID: "balanceInvalid",
  CREDIT_BALANCE_PRECISION_INVALID: "balancePrecisionInvalid",
  CREDIT_CURRENCY_MISMATCH: "currencyInvalid",
  CREDIT_LEDGER_CURRENCY_MISMATCH: "ledgerCurrencyMismatch",
  CREDIT_LEDGER_BALANCE_INVALID: "ledgerBalanceMismatch",
  CREDIT_LEDGER_BALANCE_MISMATCH: "ledgerBalanceMismatch",
  CREDIT_IMPORT_ALLOCATION_DELTA_INSUFFICIENT: "insufficientBalance",
  CREDIT_NOTE_TOO_LONG: "noteTooLong",
  CREDIT_EXTERNAL_ID_TOO_LONG: "externalIdTooLong",
  CREDIT_DUPLICATE_IN_FILE: "duplicateInFile",
  CREDIT_IMPORT_ALLOCATION_IDENTITY_CONFLICT: "identityConflict",
  VOUCHER_PRODUCT_NAME_REQUIRED: "nameRequired",
  VOUCHER_PRODUCT_NAME_TOO_LONG: "nameTooLong",
  VOUCHER_PRODUCT_DESCRIPTION_TOO_LONG: "descriptionTooLong",
  VOUCHER_PRODUCT_SKU_TOO_LONG: "skuTooLong",
  VOUCHER_PRODUCT_VALUE_INVALID: "valueInvalid",
  VOUCHER_PRODUCT_VALUE_PRECISION_INVALID: "valuePrecisionInvalid",
  VOUCHER_PRODUCT_CURRENCY_MISMATCH: "currencyInvalid",
  VOUCHER_PRODUCT_IS_ACTIVE_INVALID: "activeInvalid",
  VOUCHER_PRODUCT_SORT_ORDER_INVALID: "sortOrderInvalid",
  VOUCHER_PRODUCT_EXTERNAL_ID_TOO_LONG: "externalIdTooLong",
  VOUCHER_PRODUCT_DUPLICATE_IN_FILE: "duplicateInFile",
  VOUCHER_PRODUCT_IDENTITY_CONFLICT: "identityConflict",
  VOUCHER_PRODUCT_KIND_CONFLICT: "typeUpdateForbidden",
  VOUCHER_PRODUCT_STRIPE_UPDATE_PROTECTED: "stripeCommercialUpdateForbidden",
  VOUCHER_PRODUCT_TEMPLATE_REQUIRED: "templateRequired",
  VOUCHER_PRODUCT_UPDATE_PROTECTED: "existingRecordProtected",
  VOUCHER_CODE_INVALID: "promoCodeInvalid",
  VOUCHER_PRODUCT_REQUIRED: "productRequired",
  VOUCHER_PRODUCT_NOT_FOUND: "productNotFound",
  VOUCHER_SNAPSHOT_INVALID: "valueInvalid",
  VOUCHER_VALUE_INVALID: "valueInvalid",
  VOUCHER_EXPIRES_AT_INVALID: "expiresAtInvalid",
  VOUCHER_REDEEMED_AT_INVALID: "redeemedAtInvalid",
  VOUCHER_STATE_INVALID: "stateInvalid",
  VOUCHER_CUSTOMER_NOT_FOUND: "customerNotFound",
  VOUCHER_CUSTOMER_IDENTITY_CONFLICT: "customerAmbiguous",
  VOUCHER_DUPLICATE_IN_FILE: "duplicateInFile",
  VOUCHER_IDENTITY_CONFLICT: "identityConflict",
  VOUCHER_LEGACY_SNAPSHOT_REQUIRED: "legacySnapshotRequired",
  VOUCHER_UPDATE_PROTECTED: "existingRecordProtected",
  VOUCHER_RESURRECTION_UNSUPPORTED: "statusTransitionForbidden",
  VOUCHER_CHECKOUT_INPUT_INVALID: "stateInvalid",
  VOUCHER_NOTE_TOO_LONG: "noteTooLong",
  VOUCHER_EXTERNAL_ID_TOO_LONG: "externalIdTooLong",
});

const resolveWizardStep = (session) => {
  switch (session?.status) {
    case CUSTOMER_IMPORT_STATUS.UPLOADED:
      return "mapping";
    case CUSTOMER_IMPORT_STATUS.VALIDATING:
    case CUSTOMER_IMPORT_STATUS.VALIDATED:
      return "validation";
    case CUSTOMER_IMPORT_STATUS.QUEUED:
    case CUSTOMER_IMPORT_STATUS.PROCESSING:
      return "import";
    case CUSTOMER_IMPORT_STATUS.COMPLETED:
    case CUSTOMER_IMPORT_STATUS.FAILED:
      return "report";
    default:
      return "upload";
  }
};

const getCurrentStepIndex = (step) => WIZARD_STEPS.indexOf(step);

const formatFileSize = (size, locale) =>
  new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    style: "unit",
    unit: "kilobyte",
    maximumFractionDigits: 0,
  }).format(Math.max(1, Math.ceil(Number(size || 0) / 1024)));

const formatDate = (value, locale) => {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

function WizardProgress({ step, t }) {
  const activeIndex = getCurrentStepIndex(step);

  return (
    <nav
      aria-label={t("steps.label")}
      data-contextual-guide-target="data-import-progress"
      className="overflow-x-auto pb-1"
    >
      <ol className="flex min-w-[620px] items-center gap-2">
        {WIZARD_STEPS.map((item, index) => {
          const complete = index < activeIndex;
          const active = index === activeIndex;

          return (
            <li key={item} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cx(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-full px-2 py-1.5 text-[10px] font-semibold",
                  active
                    ? "bg-cobalt-50 text-cobalt-700"
                    : complete
                      ? "text-success"
                      : "text-ink-subtle",
                )}
              >
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px]",
                    active
                      ? "border-cobalt-500 bg-cobalt-500 text-white"
                      : complete
                        ? "border-success bg-success text-white"
                        : "border-line bg-white",
                  )}
                  aria-hidden="true"
                >
                  {complete ? (
                    <CheckCircleIcon className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate">{t(`steps.${item}`)}</span>
              </span>
              {index < WIZARD_STEPS.length - 1 ? (
                <span
                  className="h-px w-3 shrink-0 bg-line"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ErrorNotice({ children }) {
  if (!children) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[14px] border border-danger/20 bg-danger-soft px-4 py-3 text-[11px] leading-5 text-danger"
    >
      <XCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function StatusBadge({ status, t }) {
  const normalized = STATUS_STYLES[status] ? status : "uploaded";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.08em]",
        STATUS_STYLES[normalized],
      )}
    >
      {t(`status.${normalized}`)}
    </span>
  );
}

function SummaryGrid({ summary, mode = "validation", t }) {
  const baseItems =
    mode === "report"
      ? ["created", "updated", "skipped", "failed"]
      : ["total", "valid", "warnings", "invalid", "duplicates"];
  const memberNumberItems = [
    "memberNumberCollisions",
    "memberNumberReassignments",
  ].filter((item) => summary[item] > 0);
  const items = [...baseItems, ...memberNumberItems];

  const tones = {
    valid: "text-success",
    created: "text-success",
    updated: "text-cobalt-700",
    warnings: "text-amber-800",
    duplicates: "text-amber-800",
    memberNumberCollisions: "text-amber-800",
    memberNumberReassignments: "text-amber-800",
    invalid: "text-danger",
    failed: "text-danger",
  };

  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item}
          className="rounded-[15px] border border-line bg-surface-muted px-4 py-3.5"
        >
          <dt className="text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
            {t(`summary.${item}`)}
          </dt>
          <dd
            className={cx(
              "mt-1.5 text-[24px] font-semibold tracking-[-0.045em] text-ink",
              tones[item],
            )}
          >
            {summary[item] ?? 0}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function UploadStep({
  entity,
  entityT,
  error,
  file,
  locale,
  onContinue,
  onDownloadTemplate,
  onFile,
  templateLoading,
  uploading,
  t,
}) {
  const chooseFile = (nextFile) => onFile(nextFile ?? null);

  return (
    <section
      aria-labelledby={`${entity}-import-upload-title`}
      className="space-y-5"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-600">
          {t("upload.eyebrow")}
        </p>
        <h3
          id={`${entity}-import-upload-title`}
          className="mt-2 text-[22px] font-semibold tracking-[-0.045em] text-ink"
        >
          {entityT("upload.title")}
        </h3>
        <p className="mt-2 max-w-2xl text-[12px] leading-6 text-ink-muted">
          {entityT("upload.description")}
        </p>
      </div>

      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          chooseFile(event.dataTransfer.files?.[0]);
        }}
        className="group flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed border-cobalt-200 bg-cobalt-50/35 px-5 py-8 text-center transition hover:border-cobalt-400 hover:bg-cobalt-50/60 focus-within:ring-2 focus-within:ring-cobalt-500/30"
      >
        <input
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white text-cobalt-600 shadow-[0_12px_30px_rgb(var(--skab-blue-rgb)/0.12)]">
          <ArrowUpTrayIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        {file ? (
          <>
            <span className="mt-4 max-w-full truncate text-[13px] font-semibold text-ink">
              {file.name}
            </span>
            <span className="mt-1 text-[10px] text-ink-muted">
              {formatFileSize(file.size, locale)} · {t("upload.replace")}
            </span>
          </>
        ) : (
          <>
            <span className="mt-4 text-[13px] font-semibold text-ink">
              {t("upload.dropTitle")}
            </span>
            <span className="mt-1 text-[10px] leading-5 text-ink-muted">
              {t("upload.dropDescription")}
            </span>
          </>
        )}
      </label>

      <div className="flex items-start gap-3 rounded-[15px] border border-line bg-surface-muted p-4">
        <InformationCircleIcon
          className="mt-0.5 h-4 w-4 shrink-0 text-cobalt-600"
          aria-hidden="true"
        />
        <p className="text-[10px] leading-5 text-ink-muted">
          {t("upload.privacy")}
        </p>
      </div>

      <ErrorNotice>{error}</ErrorNotice>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onDownloadTemplate}
          disabled={templateLoading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-[11px] font-semibold text-ink transition hover:bg-[#F7F5F1] disabled:opacity-50"
        >
          {templateLoading ? (
            <ArrowPathIcon
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <DocumentArrowDownIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {entityT("actions.downloadTemplate")}
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!file || uploading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-600 px-5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-cobalt-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {uploading ? (
            <ArrowPathIcon
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {uploading ? t("actions.uploading") : t("actions.continue")}
        </button>
      </div>
    </section>
  );
}

function MappingStep({
  duplicateStrategy,
  entity,
  entityConfig,
  entityT,
  error,
  mapping,
  onBack,
  onChange,
  onContinue,
  onPasswordHashConfirmationChange,
  onPreserveImportedMemberNumbersChange,
  onStrategyChange,
  passwordHashConfirmed,
  preserveImportedMemberNumbers,
  session,
  t,
  validating,
}) {
  const headers = getImportHeaders(session);
  const previewRows = getImportPreviewRows(session);
  const passwordHashMapped =
    entity === DATA_IMPORT_ENTITIES.CUSTOMERS &&
    Boolean(mapping.passwordHash) &&
    Number(session?.credentialRowCount || 0) > 0;
  const memberNumberMapped =
    entity === DATA_IMPORT_ENTITIES.CUSTOMERS && Boolean(mapping.memberNumber);

  return (
    <section
      aria-labelledby={`${entity}-import-mapping-title`}
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-600">
            {t("mapping.eyebrow")}
          </p>
          <h3
            id={`${entity}-import-mapping-title`}
            className="mt-2 text-[22px] font-semibold tracking-[-0.045em] text-ink"
          >
            {t("mapping.title")}
          </h3>
          <p className="mt-2 max-w-2xl text-[12px] leading-6 text-ink-muted">
            {t("mapping.description")}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface-muted px-3 py-1.5 text-[9px] font-semibold text-ink-muted">
          <TableCellsIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {t("mapping.columnsFound", { count: headers.length })}
        </span>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-line">
        <WorkspaceTableScroller ariaLabel={entityT("mapping.tableCaption")}>
          <WorkspaceTable className="min-w-full text-left">
            <caption className="sr-only">
              {entityT("mapping.tableCaption")}
            </caption>
            <thead className="bg-[#F7F5F1] text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
              <tr>
                <th scope="col" className="px-4 py-3">
                  {t("mapping.sourceColumn")}
                </th>
                <th scope="col" className="px-4 py-3">
                  {t("mapping.sample")}
                </th>
                <th scope="col" className="min-w-[220px] px-4 py-3">
                  {t("mapping.skabField")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {headers.map((header) => {
                const selectedField = getFieldForHeader(
                  mapping,
                  header,
                  entity,
                );
                const sampleValues = previewRows
                  .slice(0, 2)
                  .map((row) => row?.raw?.[header] ?? row?.[header])
                  .filter(
                    (value) =>
                      value !== undefined && value !== null && value !== "",
                  );
                const sample =
                  entity === DATA_IMPORT_ENTITIES.CUSTOMERS &&
                  isCustomerPasswordHashHeader(header) &&
                  sampleValues.length
                    ? entityT("mapping.passwordHashHidden")
                    : sampleValues.join(", ");
                const creditHandoff =
                  entity === DATA_IMPORT_ENTITIES.CUSTOMERS &&
                  isCustomerCreditHandoffHeader(header);

                return (
                  <tr key={header}>
                    <th
                      scope="row"
                      className="max-w-[220px] px-4 py-3 text-[11px] font-semibold text-ink"
                    >
                      <span className="block truncate" title={header}>
                        {header}
                      </span>
                    </th>
                    <td className="max-w-[260px] px-4 py-3 text-[10px] text-ink-muted">
                      <span
                        className="block truncate"
                        title={sample || undefined}
                      >
                        {sample || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {creditHandoff ? (
                        <span className="inline-flex min-h-10 items-center rounded-full border border-cobalt-100 bg-cobalt-50 px-3 text-[10px] font-semibold text-cobalt-800">
                          {entityT("mapping.creditHandoff")}
                        </span>
                      ) : (
                        <>
                          <label
                            className="sr-only"
                            htmlFor={`${entity}-mapping-${header}`}
                          >
                            {t("mapping.selectLabel", { column: header })}
                          </label>
                          <select
                            id={`${entity}-mapping-${header}`}
                            value={selectedField}
                            onChange={(event) =>
                              onChange(header, event.target.value)
                            }
                            className="min-h-10 w-full rounded-[11px] border-line bg-white py-2 pl-3 pr-8 text-[10px] text-ink shadow-none focus:border-cobalt-400 focus:ring-cobalt-400/20"
                          >
                            <option value="">{t("mapping.ignore")}</option>
                            {entityConfig.fields.map((field) => (
                              <option key={field} value={field}>
                                {entityT(`mapping.fields.${field}`)}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </WorkspaceTable>
        </WorkspaceTableScroller>
      </div>

      {passwordHashMapped ? (
        <fieldset className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <legend className="px-1 text-[12px] font-semibold text-amber-950">
            {entityT("mapping.passwordHashTitle")}
          </legend>
          <p className="mt-1 text-[10px] leading-5 text-amber-900">
            {entityT("mapping.passwordHashDescription")}
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-[10px] font-medium leading-5 text-amber-950">
            <input
              type="checkbox"
              checked={passwordHashConfirmed}
              onChange={(event) =>
                onPasswordHashConfirmationChange(event.target.checked)
              }
              className="mt-0.5 rounded border-amber-300 text-cobalt-600 focus:ring-cobalt-500/25"
            />
            <span>{entityT("mapping.passwordHashConfirmation")}</span>
          </label>
        </fieldset>
      ) : null}

      {memberNumberMapped ? (
        <fieldset className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <legend className="px-1 text-[12px] font-semibold text-amber-950">
            {entityT("mapping.memberNumberTitle")}
          </legend>
          <p className="mt-1 text-[10px] leading-5 text-amber-900">
            {entityT("mapping.memberNumberDescription")}
          </p>
          <label className="mt-3 flex cursor-pointer items-start gap-3 text-[10px] font-medium leading-5 text-amber-950">
            <input
              type="checkbox"
              checked={preserveImportedMemberNumbers}
              onChange={(event) =>
                onPreserveImportedMemberNumbersChange(event.target.checked)
              }
              className="mt-0.5 rounded border-amber-300 text-cobalt-600 focus:ring-cobalt-500/25"
            />
            <span>{entityT("mapping.memberNumberConfirmation")}</span>
          </label>
        </fieldset>
      ) : null}

      <fieldset className="rounded-[18px] border border-line bg-surface-muted p-4 sm:p-5">
        <legend className="px-1 text-[12px] font-semibold text-ink">
          {entityT("duplicates.title")}
        </legend>
        <p className="mt-1 text-[10px] leading-5 text-ink-muted">
          {entityT("duplicates.description")}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {["skip", "update"].map((strategy) => (
            <label
              key={strategy}
              className={cx(
                "flex cursor-pointer items-start gap-3 rounded-[14px] border p-3.5 transition",
                duplicateStrategy === strategy
                  ? "border-cobalt-300 bg-white ring-1 ring-cobalt-100"
                  : "border-line bg-white/60 hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name={`${entity}-duplicate-strategy`}
                value={strategy}
                checked={duplicateStrategy === strategy}
                onChange={() => onStrategyChange(strategy)}
                className="mt-0.5 border-line-strong text-cobalt-600 focus:ring-cobalt-500/25"
              />
              <span>
                <span className="block text-[11px] font-semibold text-ink">
                  {t(`duplicates.${strategy}.title`)}
                </span>
                <span className="mt-1 block text-[10px] leading-5 text-ink-muted">
                  {entityT(`duplicates.${strategy}.description`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {!hasRequiredImportMapping(entity, mapping) ? (
        <div className="flex items-start gap-3 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] leading-5 text-amber-900">
          <ExclamationTriangleIcon
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          {entityT("mapping.required")}
        </div>
      ) : null}
      <ErrorNotice>{error}</ErrorNotice>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={validating}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-[11px] font-semibold text-ink transition hover:bg-[#F7F5F1] disabled:opacity-50"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          {t("actions.back")}
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={
            !hasRequiredImportMapping(entity, mapping) ||
            validating ||
            (passwordHashMapped && !passwordHashConfirmed)
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-600 px-5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-cobalt-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {validating ? (
            <ArrowPathIcon
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {validating ? t("actions.validating") : t("actions.validate")}
        </button>
      </div>
    </section>
  );
}

const getIssueMessage = (issue, entityT, t) => {
  if (issue?.code === "IMPORT_RECORD_ROLLED_BACK") {
    return t("validation.rolledBackRecord");
  }

  const translationKey = ISSUE_TRANSLATION_KEYS[issue?.code];

  return translationKey
    ? entityT(`validation.issueCodes.${translationKey}`)
    : issue?.message;
};

function ValidationRows({ entity, entityT, rows, t }) {
  const rowsWithIssues = rows.filter(
    (row) => row?.issues?.length || row?.duplicate,
  );

  if (!rowsWithIssues.length) {
    return (
      <div className="flex items-start gap-3 rounded-[15px] border border-success/20 bg-success-soft p-4 text-success">
        <CheckCircleIcon
          className="mt-0.5 h-5 w-5 shrink-0"
          aria-hidden="true"
        />
        <div>
          <p className="text-[11px] font-semibold">
            {t("validation.cleanTitle")}
          </p>
          <p className="mt-1 text-[10px] leading-5">
            {t("validation.cleanDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-line">
      <WorkspaceTableScroller ariaLabel={entityT("validation.tableCaption")}>
        <WorkspaceTable className="min-w-full text-left">
          <caption className="sr-only">
            {entityT("validation.tableCaption")}
          </caption>
          <thead className="bg-[#F7F5F1] text-[9px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
            <tr>
              <th scope="col" className="px-4 py-3">
                {t("validation.row")}
              </th>
              <th scope="col" className="px-4 py-3">
                {entityT("validation.subject")}
              </th>
              <th scope="col" className="px-4 py-3">
                {t("validation.finding")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {rowsWithIssues.slice(0, 12).map((row, index) => {
              const issues = Array.isArray(row.issues) ? row.issues : [];
              const hasError = issues.some(
                (issue) => issue.severity === "error",
              );

              return (
                <tr key={row.id ?? row._id ?? row.rowNumber ?? index}>
                  <td className="whitespace-nowrap px-4 py-3 text-[10px] font-semibold text-ink-muted">
                    {row.rowNumber ?? index + 2}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-[10px] font-semibold text-ink">
                    <span className="block truncate">
                      {getDataImportRowLabel(entity, row)}
                    </span>
                  </td>
                  <td className="min-w-[280px] px-4 py-3">
                    <div className="flex items-start gap-2">
                      {hasError ? (
                        <XCircleIcon
                          className="mt-0.5 h-4 w-4 shrink-0 text-danger"
                          aria-hidden="true"
                        />
                      ) : (
                        <ExclamationTriangleIcon
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-[10px] leading-5 text-ink-muted">
                        {issues
                          .map((issue) => getIssueMessage(issue, entityT, t))
                          .filter(Boolean)
                          .join(" · ") ||
                          (row.duplicate
                            ? entityT("validation.duplicate")
                            : t("validation.unknownIssue"))}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </WorkspaceTable>
      </WorkspaceTableScroller>
      {rowsWithIssues.length > 12 ? (
        <p className="border-t border-line bg-surface-muted px-4 py-3 text-[10px] text-ink-muted">
          {t("validation.moreRows", { count: rowsWithIssues.length - 12 })}
        </p>
      ) : null}
    </div>
  );
}

function ValidationStep({
  confirmed,
  duplicateStrategy,
  entity,
  entityT,
  error,
  executing,
  onBack,
  onConfirmChange,
  onDownloadReport,
  onExecute,
  reportLoading,
  session,
  t,
}) {
  const summary = getCustomerImportSummary(session);
  const rows = getImportPreviewRows(session);
  const importable = summary.toCreate + summary.toUpdate || summary.valid;

  return (
    <section
      aria-labelledby={`${entity}-import-validation-title`}
      className="space-y-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-600">
            {t("validation.eyebrow")}
          </p>
          <h3
            id={`${entity}-import-validation-title`}
            className="mt-2 text-[22px] font-semibold tracking-[-0.045em] text-ink"
          >
            {t("validation.title")}
          </h3>
          <p className="mt-2 max-w-2xl text-[12px] leading-6 text-ink-muted">
            {entityT("validation.description")}
          </p>
        </div>
        <StatusBadge status={session?.status} t={t} />
      </div>

      <SummaryGrid summary={summary} t={t} />

      <div className="grid gap-3 sm:grid-cols-3">
        {["toCreate", "toUpdate", "toSkip"].map((item) => (
          <div
            key={item}
            className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-white px-4 py-3"
          >
            <span className="text-[10px] font-medium text-ink-muted">
              {t(`summary.${item}`)}
            </span>
            <strong className="text-[14px] font-semibold text-ink">
              {summary[item]}
            </strong>
          </div>
        ))}
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[12px] font-semibold text-ink">
            {t("validation.findingsTitle")}
          </h4>
          <button
            type="button"
            onClick={onDownloadReport}
            disabled={reportLoading}
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[10px] font-semibold text-ink-muted transition hover:text-ink disabled:opacity-50"
          >
            {reportLoading ? (
              <ArrowPathIcon
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ArrowDownTrayIcon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {t("actions.downloadReport")}
          </button>
        </div>
        <ValidationRows entity={entity} entityT={entityT} rows={rows} t={t} />
      </div>

      <div className="rounded-[17px] border border-cobalt-100 bg-cobalt-50/45 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <InformationCircleIcon
            className="mt-0.5 h-5 w-5 shrink-0 text-cobalt-600"
            aria-hidden="true"
          />
          <div>
            <p className="text-[11px] font-semibold text-cobalt-900">
              {t("validation.strategyTitle")}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-cobalt-900/75">
              {entityT(`validation.strategy.${duplicateStrategy}`)}
            </p>
          </div>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-[16px] border border-line bg-surface-muted p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmChange(event.target.checked)}
          className="mt-0.5 rounded border-line-strong text-cobalt-600 focus:ring-cobalt-500/25"
        />
        <span>
          <span className="block text-[11px] font-semibold text-ink">
            {t("validation.confirmTitle")}
          </span>
          <span className="mt-1 block text-[10px] leading-5 text-ink-muted">
            {t("validation.confirmDescription")}
          </span>
        </span>
      </label>

      {!importable ? (
        <div className="flex items-start gap-3 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] leading-5 text-amber-900">
          <ExclamationTriangleIcon
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          {t("validation.nothingToImport")}
        </div>
      ) : null}
      <ErrorNotice>{error}</ErrorNotice>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={executing}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-[11px] font-semibold text-ink transition hover:bg-[#F7F5F1] disabled:opacity-50"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          {t("actions.changeMapping")}
        </button>
        <button
          type="button"
          onClick={onExecute}
          disabled={!confirmed || !importable || executing}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-600 px-5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-cobalt-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {executing ? (
            <ArrowPathIcon
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {executing
            ? t("actions.startingImport")
            : t("actions.importRows", { count: importable })}
        </button>
      </div>
    </section>
  );
}

function ImportProgressStep({ entity, entityT, session, t }) {
  const summary = getCustomerImportSummary(session);
  const progress = getCustomerImportProgress(session);

  return (
    <section
      aria-labelledby={`${entity}-import-progress-title`}
      aria-live="polite"
      className="py-4 text-center sm:py-10"
    >
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-cobalt-50 text-cobalt-600 ring-1 ring-inset ring-cobalt-100">
        <ArrowPathIcon className="h-7 w-7 animate-spin" aria-hidden="true" />
      </span>
      <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-600">
        {t("progress.eyebrow")}
      </p>
      <h3
        id={`${entity}-import-progress-title`}
        className="mt-2 text-[24px] font-semibold tracking-[-0.045em] text-ink"
      >
        {entityT("progress.title")}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-[11px] leading-5 text-ink-muted">
        {t("progress.description")}
      </p>

      <div className="mx-auto mt-6 max-w-xl">
        <div
          className="h-2 overflow-hidden rounded-full bg-[#EEEAE4]"
          role="progressbar"
          aria-label={entityT("progress.label")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span
            className="block h-full rounded-full bg-cobalt-500 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] font-semibold text-ink-subtle">
          <span>
            {t("progress.processed", {
              count:
                summary.created +
                summary.updated +
                summary.skipped +
                summary.failed,
            })}
          </span>
          <span>{progress}%</span>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-[15px] border border-line bg-surface-muted p-4 text-left">
        <ClockIcon
          className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
          aria-hidden="true"
        />
        <p className="text-[10px] leading-5 text-ink-muted">
          {t("progress.safeToLeave")}
        </p>
      </div>
    </section>
  );
}

function ReportStep({
  entity,
  entityT,
  error,
  onContinueToCredits,
  onDownloadReport,
  onStartAnother,
  reportLoading,
  session,
  t,
}) {
  const summary = getCustomerImportSummary(session);
  const successful = session?.status === CUSTOMER_IMPORT_STATUS.COMPLETED;
  const Icon = successful ? CheckCircleIcon : ExclamationTriangleIcon;

  return (
    <section
      aria-labelledby={`${entity}-import-report-title`}
      className="space-y-5"
    >
      <div className="rounded-[20px] border border-line bg-surface-muted p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className={cx(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px]",
              successful
                ? "bg-success-soft text-success"
                : "bg-danger-soft text-danger",
            )}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id={`${entity}-import-report-title`}
                className="text-[22px] font-semibold tracking-[-0.045em] text-ink"
              >
                {successful ? entityT("report.title") : t("report.failedTitle")}
              </h3>
              <StatusBadge status={session?.status} t={t} />
            </div>
            <p className="mt-2 max-w-2xl text-[11px] leading-5 text-ink-muted">
              {successful
                ? entityT("report.description")
                : t("report.failedDescription")}
            </p>
            {session?.lastError?.message ? (
              <p className="mt-3 rounded-[12px] border border-danger/20 bg-white px-3 py-2 text-[10px] text-danger">
                {session.lastError.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <SummaryGrid summary={summary} mode="report" t={t} />

      <dl className="grid gap-2 rounded-[17px] border border-line bg-white p-4 text-[10px] sm:grid-cols-3">
        <div>
          <dt className="font-medium text-ink-subtle">{t("report.file")}</dt>
          <dd
            className="mt-1 truncate font-semibold text-ink"
            title={session?.originalFileName}
          >
            {session?.originalFileName ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-ink-subtle">
            {t("report.completedAt")}
          </dt>
          <dd className="mt-1 font-semibold text-ink">
            {session?.formattedCompletedAt ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-ink-subtle">
            {t("report.strategy")}
          </dt>
          <dd className="mt-1 font-semibold text-ink">
            {t(
              `duplicates.${session?.duplicateStrategy === "update" ? "update" : "skip"}.title`,
            )}
          </dd>
        </div>
      </dl>

      <ErrorNotice>{error}</ErrorNotice>

      <div className="flex flex-col gap-2 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onDownloadReport}
          disabled={reportLoading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-[11px] font-semibold text-ink transition hover:bg-[#F7F5F1] disabled:opacity-50"
        >
          {reportLoading ? (
            <ArrowPathIcon
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {t("actions.downloadReport")}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          {onContinueToCredits ? (
            <button
              type="button"
              onClick={onContinueToCredits}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-600 px-5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-cobalt-700"
            >
              <CreditCardIcon className="h-4 w-4" aria-hidden="true" />
              {entityT("actions.continueToCredits")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onStartAnother}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-[11px] font-semibold text-ink transition hover:bg-[#F7F5F1]"
          >
            <ArrowUpTrayIcon className="h-4 w-4" aria-hidden="true" />
            {t("actions.startAnother")}
          </button>
        </div>
      </div>
    </section>
  );
}

function DataImportWizardSession({
  entity = DATA_IMPORT_ENTITIES.CUSTOMERS,
  initialFile = null,
  initialSession = null,
  onContinueToCredits,
  onSessionChange,
}) {
  const t = useTranslations("MigrationCenter");
  const entityT = useTranslations(`MigrationCenter.importers.${entity}`);
  const locale = useLocale();
  const dispatch = useDispatch();
  const entityConfig = getDataImportEntityConfig(entity);
  const [file, setFile] = useState(initialFile);
  const [session, setSession] = useState(() => {
    if (!initialSession) return null;

    const next = normalizeImportSession(initialSession);
    return {
      ...next,
      formattedCompletedAt: formatDate(next.completedAt, locale),
    };
  });
  const [step, setStep] = useState(() => resolveWizardStep(initialSession));
  const [mapping, setMapping] = useState(() =>
    normalizeDataImportMapping(
      entity,
      initialSession?.mapping ?? initialSession?.suggestedMapping,
      getImportHeaders(initialSession),
    ),
  );
  const [duplicateStrategy, setDuplicateStrategy] = useState(
    initialSession?.duplicateStrategy === "update" ? "update" : "skip",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [passwordHashConfirmed, setPasswordHashConfirmed] = useState(
    Boolean(initialSession?.credentialImportConfirmed),
  );
  const [preserveImportedMemberNumbers, setPreserveImportedMemberNumbers] =
    useState(initialSession?.preserveImportedMemberNumbers === true);
  const [error, setError] = useState("");
  const completionHandled = useRef("");
  const sessionId = getImportId(session);
  const shouldPoll =
    step === "import" || isCustomerImportRunning(session?.status);
  const sessionQuery = useGetDataImportSessionQuery(sessionId, {
    skip: !sessionId || (!shouldPoll && !initialSession),
    pollingInterval: shouldPoll ? 1_500 : 0,
    refetchOnMountOrArgChange: true,
  });
  const rowsQuery = useGetDataImportRowsQuery(
    { id: sessionId, page: 1, limit: 50 },
    {
      skip: !sessionId || (step !== "validation" && step !== "report"),
      refetchOnMountOrArgChange: true,
    },
  );
  const [upload, uploadState] = useUploadDataImportMutation();
  const [validate, validateState] = useValidateDataImportMutation();
  const [execute, executeState] = useExecuteDataImportMutation();
  const [downloadTemplate, templateState] =
    useLazyDownloadDataImportTemplateQuery();
  const [downloadReport, reportState] = useLazyDownloadDataImportReportQuery();

  const applySession = useCallback(
    (value, { updateStep = true } = {}) => {
      const next = normalizeImportSession(value);
      if (!getImportId(next)) return;

      const formattedCompletedAt = formatDate(next.completedAt, locale);
      const withFormatting = { ...next, formattedCompletedAt };
      setSession(withFormatting);
      onSessionChange?.(withFormatting);
      if (updateStep) setStep(resolveWizardStep(next));
    },
    [locale, onSessionChange],
  );

  useEffect(() => {
    if (!sessionQuery.data) return;

    // RTK Query is the external source of truth while an import is polling.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    applySession(sessionQuery.data);
  }, [applySession, sessionQuery.data]);

  useEffect(() => {
    const id = getImportId(session);
    if (
      !id ||
      session?.status !== CUSTOMER_IMPORT_STATUS.COMPLETED ||
      completionHandled.current === id
    ) {
      return;
    }

    completionHandled.current = id;
    dispatch(
      apiSlice.util.invalidateTags([
        ...entityConfig.invalidationTags,
        { type: "DataImport", id: "LIST" },
      ]),
    );
  }, [dispatch, entityConfig, session]);

  const selectFile = (nextFile) => {
    setFile(nextFile);
    setPasswordHashConfirmed(false);
    setPreserveImportedMemberNumbers(false);
    setError("");
  };

  const startOver = () => {
    setFile(null);
    setSession(null);
    setMapping({});
    setDuplicateStrategy("skip");
    setConfirmed(false);
    setPasswordHashConfirmed(false);
    setPreserveImportedMemberNumbers(false);
    setError("");
    setStep("upload");
    onSessionChange?.(null);
  };

  const uploadFile = async () => {
    const fileError = validateCustomerImportFile(file);
    if (fileError) {
      setError(t(`errors.file.${fileError}`));
      return;
    }

    setError("");
    try {
      const response = await upload({ entity, file }).unwrap();
      const next = normalizeImportSession(response);
      const headers = getImportHeaders(next);
      setMapping(
        normalizeDataImportMapping(
          entity,
          next.suggestedMapping ?? next.mapping,
          headers,
        ),
      );
      setDuplicateStrategy(
        next.duplicateStrategy === "update" ? "update" : "skip",
      );
      setPasswordHashConfirmed(false);
      setPreserveImportedMemberNumbers(false);
      applySession(next);
    } catch (requestError) {
      setError(getImportErrorMessage(requestError, t("errors.upload")));
    }
  };

  const validateMapping = async () => {
    if (!hasRequiredImportMapping(entity, mapping)) {
      setError(entityT("mapping.required"));
      return;
    }

    setError("");
    try {
      const response = await validate({
        id: sessionId,
        mapping,
        duplicateStrategy,
        ...(entity === DATA_IMPORT_ENTITIES.CUSTOMERS
          ? { preserveImportedMemberNumbers }
          : {}),
        ...(passwordHashConfirmed ? { confirmPasswordHashImport: true } : {}),
      }).unwrap();
      setConfirmed(false);
      applySession(response);
    } catch (requestError) {
      setError(getImportErrorMessage(requestError, t("errors.validation")));
    }
  };

  const executeImport = async () => {
    setError("");
    try {
      const response = await execute({
        id: sessionId,
        validationRevision: session?.validationRevision,
      }).unwrap();
      applySession(response);
      setStep("import");
    } catch (requestError) {
      setError(getImportErrorMessage(requestError, t("errors.execute")));
    }
  };

  const saveDownload = async ({ action, fileName, fallback }) => {
    setError("");
    try {
      const csv = await action().unwrap();
      if (!triggerCsvDownload(csv, fileName)) throw new Error(fallback);
    } catch (requestError) {
      setError(getImportErrorMessage(requestError, fallback));
    }
  };

  const downloadTemplateFile = () =>
    saveDownload({
      action: () => downloadTemplate({ entity }),
      fileName: `shario-${entity}-import-template.csv`,
      fallback: entityT("errors.template"),
    });

  const downloadReportFile = () =>
    saveDownload({
      action: () => downloadReport({ id: sessionId }),
      fileName: `shario-${entity}-import-${sessionId || "report"}.csv`,
      fallback: t("errors.report"),
    });

  const validationRows = normalizeImportRows(rowsQuery.data);
  const sessionWithRows = validationRows.length
    ? { ...session, previewRows: validationRows }
    : session;
  const visibleError =
    error ||
    (sessionQuery.error && shouldPoll
      ? getImportErrorMessage(sessionQuery.error, t("errors.refresh"))
      : "") ||
    (rowsQuery.error && (step === "validation" || step === "report")
      ? getImportErrorMessage(rowsQuery.error, t("errors.rows"))
      : "");

  const content = (() => {
    if (step === "upload") {
      return (
        <UploadStep
          entity={entity}
          entityT={entityT}
          error={visibleError}
          file={file}
          locale={locale}
          onContinue={uploadFile}
          onDownloadTemplate={downloadTemplateFile}
          onFile={selectFile}
          templateLoading={templateState.isFetching}
          uploading={uploadState.isLoading}
          t={t}
        />
      );
    }

    if (step === "mapping") {
      return (
        <MappingStep
          duplicateStrategy={duplicateStrategy}
          entity={entity}
          entityConfig={entityConfig}
          entityT={entityT}
          error={visibleError}
          mapping={mapping}
          onBack={startOver}
          onChange={(header, field) => {
            setMapping((current) =>
              setDataImportColumnMapping(entity, current, header, field),
            );
            setPasswordHashConfirmed(false);
            setPreserveImportedMemberNumbers(false);
            setError("");
          }}
          onContinue={validateMapping}
          onPasswordHashConfirmationChange={setPasswordHashConfirmed}
          onPreserveImportedMemberNumbersChange={
            setPreserveImportedMemberNumbers
          }
          onStrategyChange={setDuplicateStrategy}
          passwordHashConfirmed={passwordHashConfirmed}
          preserveImportedMemberNumbers={preserveImportedMemberNumbers}
          session={sessionWithRows}
          t={t}
          validating={validateState.isLoading}
        />
      );
    }

    if (step === "validation") {
      return (
        <ValidationStep
          confirmed={confirmed}
          duplicateStrategy={duplicateStrategy}
          entity={entity}
          entityT={entityT}
          error={visibleError}
          executing={executeState.isLoading}
          onBack={() => {
            setConfirmed(false);
            setPasswordHashConfirmed(false);
            setPreserveImportedMemberNumbers(false);
            setError("");
            setStep("mapping");
          }}
          onConfirmChange={setConfirmed}
          onDownloadReport={downloadReportFile}
          onExecute={executeImport}
          reportLoading={reportState.isFetching}
          session={sessionWithRows}
          t={t}
        />
      );
    }

    if (step === "import") {
      return (
        <ImportProgressStep
          entity={entity}
          entityT={entityT}
          session={session}
          t={t}
        />
      );
    }

    return (
      <ReportStep
        entity={entity}
        entityT={entityT}
        error={visibleError}
        onDownloadReport={downloadReportFile}
        onContinueToCredits={
          entity === DATA_IMPORT_ENTITIES.CUSTOMERS &&
          session?.status === CUSTOMER_IMPORT_STATUS.COMPLETED &&
          file &&
          onContinueToCredits
            ? () => onContinueToCredits(file)
            : null
        }
        onStartAnother={startOver}
        reportLoading={reportState.isFetching}
        session={sessionWithRows}
        t={t}
      />
    );
  })();

  return (
    <div className="overflow-hidden rounded-[24px] border border-line bg-white shadow-[0_18px_50px_rgba(17,17,15,0.055)]">
      <div className="border-b border-line bg-surface-muted px-4 py-4 sm:px-6">
        <WizardProgress step={step} t={t} />
      </div>
      <div className="p-4 sm:p-6 lg:p-7">{content}</div>
    </div>
  );
}

export function DataImportWizard({
  entity = DATA_IMPORT_ENTITIES.CUSTOMERS,
  ...props
}) {
  const sessionKey = getImportId(props.initialSession) || "new";

  return (
    <DataImportWizardSession
      key={`${entity}-${sessionKey}`}
      entity={entity}
      {...props}
    />
  );
}

export default function CustomerImportWizard(props) {
  return (
    <DataImportWizard entity={DATA_IMPORT_ENTITIES.CUSTOMERS} {...props} />
  );
}
