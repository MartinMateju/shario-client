"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import {
  STUDIO_COMMERCE_CURRENCIES,
  resolveStudioCommerceCurrency,
} from "@/config/currencies";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
} from "@/lib/features/invoices/invoicesApiSlice";
import {
  formatMinorCurrencyAmount,
  getStripeMinorUnitDigits,
  isValidMajorCurrencyPrecision,
  minorUnitsToMajor,
} from "@/utils/money";
import { getLocationId } from "@/lib/features/locations/location.utils";
import { useGetInvoiceCustomersQuery } from "@/lib/features/users/usersApiSlice";

import {
  addInvoiceCalendarDaysInput,
  getInvoiceCalendarToday,
  getInvoiceCurrency,
  getInvoiceCustomer,
  getInvoiceError,
  getInvoiceId,
  getInvoiceLines,
  getInvoiceTimezone,
  toInvoiceDateInput,
} from "./invoice.utils";

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  postalCode: "",
  country: "",
  countryCode: "",
};

const EMPTY_CUSTOMER = {
  legalName: "",
  tradingName: "",
  firstname: "",
  lastname: "",
  email: "",
  phone: "",
  registrationNumber: "",
  taxId: "",
  vatId: "",
  address: EMPTY_ADDRESS,
};

const toMinor = (value, currency) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 10 ** getStripeMinorUnitDigits(currency));
};

const createIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `invoice-create-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const buildCustomer = (invoice) => {
  const source = getInvoiceCustomer(invoice);

  return {
    legalName: source?.legalName || "",
    tradingName: source?.tradingName || "",
    firstname: source?.firstname || "",
    lastname: source?.lastname || "",
    email: source?.email || "",
    phone: source?.phone || "",
    registrationNumber: source?.registrationNumber || "",
    taxId: source?.taxId || "",
    vatId: source?.vatId || "",
    address: {
      ...EMPTY_ADDRESS,
      ...(source?.address || {}),
    },
  };
};

const buildLines = (invoice) => {
  const currency = getInvoiceCurrency(invoice);
  const lines = getInvoiceLines(invoice);

  if (!lines.length) {
    return [
      {
        description: "",
        sku: "",
        quantity: "1",
        unitGross: "",
        taxRate: "0",
        locationIds: [],
      },
    ];
  }

  return lines.map((line) => ({
    description: line?.description || "",
    sku: line?.sku || "",
    quantity: String(line?.quantity || 1),
    unitGross: String(minorUnitsToMajor(line?.unitGrossMinor || 0, currency)),
    taxRate: String(Number(line?.taxRateBps || 0) / 100),
    productId:
      line?.productId ||
      line?.product?.id ||
      line?.product?._id ||
      (typeof line?.product === "string" ? line.product : undefined),
    locationIds: Array.isArray(line?.locationIds)
      ? line.locationIds.map(String)
      : [],
  }));
};

const normalizeCustomers = (data) => {
  if (Array.isArray(data)) return data;

  for (const key of ["users", "customers", "items", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
};

const getCustomerUserId = (customer) =>
  String(customer?.id ?? customer?._id ?? "");

const getCustomerUserName = (customer) =>
  [customer?.firstname, customer?.lastname].filter(Boolean).join(" ") ||
  customer?.name ||
  customer?.email ||
  "—";

const Field = ({ label, ...props }) => (
  <label className="block">
    <span className="mb-1.5 block text-[10px] font-semibold text-[#393936]">
      {label}
    </span>
    <input
      {...props}
      className="h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[11px] text-[#292925] outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
    />
  </label>
);

export default function InvoiceEditorDialog({
  invoice = null,
  locations = [],
  defaultLocationIds = [],
  settings = null,
  open,
  onClose,
  onSaved,
}) {
  const t = useTranslations("Invoices");
  const locale = useLocale();
  const tenant = useSelector(selectCurrentTenant);
  const access = useSelector(selectCurrentWorkspaceAccess);
  const isEditing = Boolean(invoice);
  const timezone = getInvoiceTimezone(invoice, tenant?.settings?.timezone);
  const initialIssueDate =
    toInvoiceDateInput(invoice?.issueDate, timezone) ||
    getInvoiceCalendarToday(timezone);
  const defaultCurrency = resolveStudioCommerceCurrency(
    tenant?.settings?.currency,
  );
  const [currency, setCurrency] = useState(
    isEditing ? getInvoiceCurrency(invoice) : defaultCurrency,
  );
  const [customer, setCustomer] = useState(() => buildCustomer(invoice));
  const [customerUserId, setCustomerUserId] = useState(
    String(invoice?.customerUserId || ""),
  );
  const [selectedCustomerOption, setSelectedCustomerOption] = useState(null);
  const [lines, setLines] = useState(() => {
    const initialLines = buildLines(invoice);

    if (!invoice && initialLines.length === 1) {
      initialLines[0].taxRate = String(
        Number(settings?.defaultTaxRateBps || 0) / 100,
      );
    }

    return initialLines;
  });
  const [locationIds, setLocationIds] = useState(() =>
    Array.isArray(invoice?.locationIds)
      ? invoice.locationIds.map(String)
      : defaultLocationIds.map(String),
  );
  const [issueDate, setIssueDate] = useState(initialIssueDate);
  const [dueDate, setDueDate] = useState(
    toInvoiceDateInput(invoice?.dueDate, timezone) ||
      addInvoiceCalendarDaysInput(
        initialIssueDate,
        settings?.defaultDueDays ?? 14,
      ),
  );
  const [taxableSupplyDate, setTaxableSupplyDate] = useState(
    toInvoiceDateInput(invoice?.taxableSupplyDate, timezone) ||
      initialIssueDate,
  );
  const [idempotencyKey] = useState(createIdempotencyKey);
  const [customerSearch, setCustomerSearch] = useState("");
  const deferredCustomerSearch = useDeferredValue(customerSearch.trim());
  const [error, setError] = useState("");
  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();
  const [updateInvoice, { isLoading: isUpdating }] = useUpdateInvoiceMutation();
  const isSaving = isCreating || isUpdating;
  const canBrowseCustomers = hasPermission(access, PERMISSIONS.CUSTOMERS_VIEW);
  const customersQuery = useGetInvoiceCustomersQuery(
    { search: deferredCustomerSearch, limit: 50 },
    { skip: isEditing || !canBrowseCustomers },
  );
  const customers = useMemo(
    () => normalizeCustomers(customersQuery.data),
    [customersQuery.data],
  );
  const customerOptions = useMemo(() => {
    if (!selectedCustomerOption) return customers;

    const selectedId = getCustomerUserId(selectedCustomerOption);
    return [
      selectedCustomerOption,
      ...customers.filter(
        (candidate) => getCustomerUserId(candidate) !== selectedId,
      ),
    ];
  }, [customers, selectedCustomerOption]);

  const estimatedTotalMinor = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total +
          toMinor(line.unitGross, currency) *
            Math.max(Number.parseInt(line.quantity, 10) || 0, 0),
        0,
      ),
    [currency, lines],
  );

  const setCustomerField = (key, value) => {
    setCustomer((current) => ({ ...current, [key]: value }));
  };

  const setAddressField = (key, value) => {
    setCustomer((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }));
  };

  const selectCustomer = (id) => {
    setCustomerUserId(id);
    const selected = customerOptions.find(
      (candidate) => getCustomerUserId(candidate) === id,
    );
    setSelectedCustomerOption(selected || null);
    if (!selected) return;

    const billing = selected?.billing || {};
    setCustomer({
      ...EMPTY_CUSTOMER,
      legalName: billing.legalName || "",
      firstname: selected.firstname || "",
      lastname: selected.lastname || "",
      email: selected.email || "",
      phone: selected.phone || "",
      registrationNumber: billing.registrationNumber || "",
      taxId: billing.taxId || "",
      vatId: billing.vatId || "",
      address: { ...EMPTY_ADDRESS, ...(billing.address || {}) },
    });
  };

  const setLine = (index, key, value) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      ),
    );
  };

  const addLine = () => {
    setLines((current) => [
      ...current,
      {
        description: "",
        sku: "",
        quantity: "1",
        unitGross: "",
        taxRate: String(Number(settings?.defaultTaxRateBps || 0) / 100),
        locationIds: [],
      },
    ]);
  };

  const removeLine = (index) => {
    setLines((current) =>
      current.filter((_, lineIndex) => lineIndex !== index),
    );
  };

  const toggleLocation = (id) => {
    setLocationIds((current) =>
      current.includes(id)
        ? current.filter((locationId) => locationId !== id)
        : [...current, id],
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const cleanLines = lines.map((line) => ({
      ...(line.productId ? { productId: String(line.productId) } : {}),
      description: line.description.trim(),
      sku: line.sku.trim(),
      quantity: Number.parseInt(line.quantity, 10),
      unitGrossMinor: toMinor(line.unitGross, currency),
      taxRateBps: Math.round(Number(line.taxRate || 0) * 100),
      locationIds,
    }));

    if (
      lines.some(
        (line) =>
          !isValidMajorCurrencyPrecision(Number(line.unitGross), currency),
      )
    ) {
      setError(t("editor.errors.precision", { currency }));
      return;
    }

    if (
      !cleanLines.length ||
      cleanLines.some(
        (line) =>
          !line.description ||
          !Number.isInteger(line.quantity) ||
          line.quantity < 1,
      )
    ) {
      setError(t("editor.errors.lines"));
      return;
    }

    if (
      !customer.legalName.trim() &&
      !customer.firstname.trim() &&
      !customer.lastname.trim() &&
      !customer.email.trim()
    ) {
      setError(t("editor.errors.customer"));
      return;
    }

    const body = {
      customer: {
        ...customer,
        legalName: customer.legalName.trim(),
        tradingName: customer.tradingName.trim(),
        firstname: customer.firstname.trim(),
        lastname: customer.lastname.trim(),
        email: customer.email.trim(),
        phone: customer.phone.trim(),
        registrationNumber: customer.registrationNumber.trim(),
        taxId: customer.taxId.trim(),
        vatId: customer.vatId.trim(),
        address: Object.fromEntries(
          Object.entries(customer.address).map(([key, value]) => [
            key,
            String(value || "").trim(),
          ]),
        ),
      },
      lines: cleanLines,
      locationIds,
      ...(issueDate ? { issueDate } : isEditing ? { issueDate: null } : {}),
      ...(dueDate ? { dueDate } : isEditing ? { dueDate: null } : {}),
      ...(taxableSupplyDate
        ? { taxableSupplyDate }
        : isEditing
          ? { taxableSupplyDate: null }
          : {}),
      locale: locale === "cs" ? "cs" : "en",
    };

    try {
      const result = isEditing
        ? await updateInvoice({ id: getInvoiceId(invoice), ...body }).unwrap()
        : await createInvoice({
            ...body,
            currency,
            ...(customerUserId ? { customerUserId } : {}),
            idempotencyKey,
          }).unwrap();

      onSaved?.(result.invoice ?? result);
      onClose();
    } catch (mutationError) {
      setError(getInvoiceError(mutationError, t("editor.errors.request")));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isSaving ? () => {} : onClose}
      className="relative z-[120]"
    >
      <DialogBackdrop
        data-dialog-backdrop
        className="fixed inset-0 bg-[#11110F]/30 backdrop-blur-[2px]"
      />
      <div className="fixed inset-0 overflow-y-auto p-0 sm:p-6">
        <div className="flex min-h-full items-stretch justify-center sm:items-center">
          <DialogPanel
            data-dialog-layout="form"
            className="h-dvh max-h-dvh w-full max-w-5xl overflow-hidden rounded-none border-0 bg-surface-raised pt-[env(safe-area-inset-top)] shadow-floating sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] sm:border"
          >
            <div className="flex items-start justify-between border-b border-line bg-white px-5 py-5 sm:px-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
                  {t("eyebrow")}
                </p>
                <DialogTitle className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#111111]">
                  {isEditing ? t("editor.editTitle") : t("editor.createTitle")}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-full p-2 text-[#777773] hover:bg-[#F4F2ED]"
                aria-label={t("editor.close")}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={submit}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:max-h-[78vh] sm:p-7"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-[18px] border border-line bg-white p-4 sm:p-5">
                  <h3 className="text-[13px] font-semibold text-[#292925]">
                    {t("editor.customer")}
                  </h3>
                  {!isEditing && canBrowseCustomers && (
                    <div className="mt-4 space-y-3">
                      <Field
                        type="search"
                        label={t("editor.fields.customerSearch")}
                        value={customerSearch}
                        maxLength={120}
                        placeholder={t(
                          "editor.fields.customerSearchPlaceholder",
                        )}
                        onChange={(event) =>
                          setCustomerSearch(event.target.value)
                        }
                      />
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] font-semibold text-[#393936]">
                          {t("editor.fields.customerAccount")}
                        </span>
                        <select
                          value={customerUserId}
                          onChange={(event) =>
                            selectCustomer(event.target.value)
                          }
                          disabled={customersQuery.isFetching}
                          className="h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[11px] disabled:bg-[#F4F2ED]"
                        >
                          <option value="">
                            {customersQuery.isFetching
                              ? t("editor.fields.loadingCustomers")
                              : t("editor.fields.noCustomerAccount")}
                          </option>
                          {customerOptions.map((customerOption) => (
                            <option
                              key={getCustomerUserId(customerOption)}
                              value={getCustomerUserId(customerOption)}
                            >
                              {getCustomerUserName(customerOption)} ·{" "}
                              {customerOption.email}
                            </option>
                          ))}
                        </select>
                      </label>
                      {customersQuery.isError && (
                        <p className="text-[10px] text-danger" role="status">
                          {t("editor.errors.customers")}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field
                      label={t("editor.fields.legalName")}
                      value={customer.legalName}
                      onChange={(event) =>
                        setCustomerField("legalName", event.target.value)
                      }
                    />
                    <Field
                      label={t("editor.fields.tradingName")}
                      value={customer.tradingName}
                      onChange={(event) =>
                        setCustomerField("tradingName", event.target.value)
                      }
                    />
                    <Field
                      label={t("editor.fields.firstname")}
                      value={customer.firstname}
                      onChange={(event) =>
                        setCustomerField("firstname", event.target.value)
                      }
                    />
                    <Field
                      label={t("editor.fields.lastname")}
                      value={customer.lastname}
                      onChange={(event) =>
                        setCustomerField("lastname", event.target.value)
                      }
                    />
                    <Field
                      type="email"
                      label={t("editor.fields.email")}
                      value={customer.email}
                      onChange={(event) =>
                        setCustomerField("email", event.target.value)
                      }
                    />
                    <Field
                      label={t("editor.fields.phone")}
                      value={customer.phone}
                      onChange={(event) =>
                        setCustomerField("phone", event.target.value)
                      }
                    />
                    <Field
                      label={t("editor.fields.registrationNumber")}
                      value={customer.registrationNumber}
                      onChange={(event) =>
                        setCustomerField(
                          "registrationNumber",
                          event.target.value,
                        )
                      }
                    />
                    <Field
                      label={t("editor.fields.vatId")}
                      value={customer.vatId}
                      onChange={(event) =>
                        setCustomerField("vatId", event.target.value)
                      }
                    />
                    <Field
                      label={t("editor.fields.taxId")}
                      value={customer.taxId}
                      onChange={(event) =>
                        setCustomerField("taxId", event.target.value)
                      }
                    />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {Object.keys(EMPTY_ADDRESS).map((key) => (
                      <Field
                        key={key}
                        label={t(`editor.fields.address.${key}`)}
                        value={customer.address[key]}
                        maxLength={key === "countryCode" ? 2 : undefined}
                        onChange={(event) =>
                          setAddressField(key, event.target.value)
                        }
                      />
                    ))}
                  </div>
                </section>

                <section className="space-y-5 rounded-[18px] border border-line bg-white p-4 sm:p-5">
                  <h3 className="text-[13px] font-semibold text-[#292925]">
                    {t("editor.document")}
                  </h3>
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-semibold text-[#393936]">
                      {t("editor.fields.currency")}
                    </span>
                    <select
                      value={currency}
                      disabled={isEditing}
                      onChange={(event) => setCurrency(event.target.value)}
                      className="h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[11px] disabled:bg-[#F4F2ED]"
                    >
                      {STUDIO_COMMERCE_CURRENCIES.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field
                      type="date"
                      label={t("editor.fields.issueDate")}
                      value={issueDate}
                      onChange={(event) => setIssueDate(event.target.value)}
                    />
                    <Field
                      type="date"
                      label={t("editor.fields.dueDate")}
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                    />
                    <Field
                      type="date"
                      label={t("editor.fields.taxableSupplyDate")}
                      value={taxableSupplyDate}
                      onChange={(event) =>
                        setTaxableSupplyDate(event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#393936]">
                      {t("editor.fields.locations")}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {locations.map((location) => {
                        const id = getLocationId(location);
                        return (
                          <label
                            key={id}
                            className="flex min-h-10 items-center gap-2 rounded-[11px] border border-line px-3 text-[10px] text-[#555553]"
                          >
                            <input
                              type="checkbox"
                              checked={locationIds.includes(id)}
                              onChange={() => toggleLocation(id)}
                              className="rounded border-line text-cobalt-600"
                            />
                            {location.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </section>
              </div>

              <section className="mt-6 rounded-[18px] border border-line bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[13px] font-semibold text-[#292925]">
                    {t("editor.items")}
                  </h3>
                  <button
                    type="button"
                    onClick={addLine}
                    className="inline-flex min-h-9 items-center gap-2 rounded-full border border-line px-3 text-[10px] font-semibold text-cobalt-600"
                  >
                    <PlusIcon className="h-4 w-4" />
                    {t("editor.addLine")}
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-[14px] bg-[#FAF9F6] p-3 sm:grid-cols-[minmax(180px,1fr)_120px_90px_130px_100px_40px] sm:items-end"
                    >
                      <Field
                        required
                        label={t("editor.fields.description")}
                        value={line.description}
                        onChange={(event) =>
                          setLine(index, "description", event.target.value)
                        }
                      />
                      <Field
                        label={t("editor.fields.sku")}
                        value={line.sku}
                        onChange={(event) =>
                          setLine(index, "sku", event.target.value)
                        }
                      />
                      <Field
                        required
                        type="number"
                        min="1"
                        step="1"
                        label={t("editor.fields.quantity")}
                        value={line.quantity}
                        onChange={(event) =>
                          setLine(index, "quantity", event.target.value)
                        }
                      />
                      <Field
                        required
                        type="number"
                        min="0"
                        step={
                          getStripeMinorUnitDigits(currency) === 0
                            ? "1"
                            : "0.01"
                        }
                        label={t("editor.fields.unitGross")}
                        value={line.unitGross}
                        onChange={(event) =>
                          setLine(index, "unitGross", event.target.value)
                        }
                      />
                      <Field
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        label={t("editor.fields.taxRate")}
                        value={line.taxRate}
                        onChange={(event) =>
                          setLine(index, "taxRate", event.target.value)
                        }
                      />
                      <button
                        type="button"
                        disabled={lines.length === 1}
                        onClick={() => removeLine(index)}
                        className="flex h-10 w-10 items-center justify-center rounded-[11px] text-terracotta-600 hover:bg-coral-100 disabled:opacity-30"
                        aria-label={t("editor.removeLine")}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-right text-[11px] font-semibold text-[#292925]">
                  {t("editor.estimatedTotal", {
                    amount: formatMinorCurrencyAmount(
                      estimatedTotalMinor,
                      currency,
                      locale,
                    ),
                  })}
                </p>
              </section>

              {error && (
                <p
                  className="mt-4 rounded-[12px] bg-danger-soft px-4 py-3 text-[11px] text-danger"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="min-h-11 rounded-[13px] border border-line bg-white px-5 text-[11px] font-semibold text-[#555553]"
                >
                  {t("editor.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-11 rounded-[13px] bg-[#111111] px-5 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {isSaving ? t("editor.saving") : t("editor.saveDraft")}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
