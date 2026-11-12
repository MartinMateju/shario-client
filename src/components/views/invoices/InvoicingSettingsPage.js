"use client";

import { useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import {
  useGetInvoiceSettingsQuery,
  useUpdateInvoiceSettingsMutation,
} from "@/lib/features/invoices/invoicesApiSlice";

import { getInvoiceError } from "@/components/invoices/invoice.utils";

const EMPTY_FORM = {
  legalName: "",
  tradingName: "",
  registrationNumber: "",
  taxId: "",
  vatId: "",
  address: {
    line1: "",
    line2: "",
    city: "",
    postalCode: "",
    country: "",
    countryCode: "",
  },
  contact: { email: "", phone: "" },
  bank: { accountName: "", accountNumber: "", iban: "", bic: "" },
  locale: "cs",
  defaultDueDays: 14,
  pricesIncludeTax: true,
  defaultTaxRate: 0,
  invoicePrefix: "INV",
  creditNotePrefix: "CN",
  autoCreatePaidOrderInvoices: true,
  autoFinalizePaidOrderInvoices: false,
  autoSendPaidOrderInvoices: false,
};

const normalizeSettings = (value) => ({
  ...EMPTY_FORM,
  ...(value || {}),
  address: { ...EMPTY_FORM.address, ...(value?.address || {}) },
  contact: { ...EMPTY_FORM.contact, ...(value?.contact || {}) },
  bank: { ...EMPTY_FORM.bank, ...(value?.bank || {}) },
  defaultTaxRate: Number(value?.defaultTaxRateBps || 0) / 100,
  pricesIncludeTax: true,
});

const Field = ({ label, hint, ...props }) => (
  <label className="block min-w-0">
    <span className="mb-1.5 block text-[11px] font-semibold text-[#393936]">
      {label}
    </span>
    <input
      {...props}
      className="h-11 w-full min-w-0 rounded-[12px] border border-line bg-white px-3.5 text-xs text-[#292925] outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
    />
    {hint && (
      <span className="mt-1.5 block text-[10px] text-[#969691]">{hint}</span>
    )}
  </label>
);

function Toggle({ checked, onChange, title, description, disabled = false }) {
  return (
    <label className="flex min-w-0 items-start gap-3 rounded-[14px] border border-line bg-white p-4">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 shrink-0 rounded border-line text-cobalt-600 disabled:opacity-40"
      />
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[#292925]">
          {title}
        </span>
        <span className="mt-1 block text-[10px] leading-4 text-[#777773]">
          {description}
        </span>
      </span>
    </label>
  );
}

export default function InvoicingSettingsPage({ showPageHeader = true }) {
  const t = useTranslations("InvoicingSettings");
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetInvoiceSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] =
    useUpdateInvoiceSettingsMutation();
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState(null);
  const form = draft ?? normalizeSettings(data?.settings);

  const setField = (key, value) => {
    setDraft((current) => ({
      ...(current ?? normalizeSettings(data?.settings)),
      [key]: value,
    }));
  };

  const setNested = (group, key, value) => {
    setDraft((current) => {
      const source = current ?? normalizeSettings(data?.settings);

      return {
        ...source,
        [group]: { ...source[group], [key]: value },
      };
    });
  };

  const handleAutoCreate = (checked) => {
    setDraft((current) => {
      const source = current ?? normalizeSettings(data?.settings);

      return {
        ...source,
        autoCreatePaidOrderInvoices: checked,
        ...(!checked
          ? {
              autoFinalizePaidOrderInvoices: false,
              autoSendPaidOrderInvoices: false,
            }
          : {}),
      };
    });
  };

  const handleAutoFinalize = (checked) => {
    setDraft((current) => {
      const source = current ?? normalizeSettings(data?.settings);

      return {
        ...source,
        autoFinalizePaidOrderInvoices: checked,
        ...(!checked ? { autoSendPaidOrderInvoices: false } : {}),
      };
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);

    const body = {
      legalName: form.legalName.trim(),
      tradingName: form.tradingName.trim(),
      registrationNumber: form.registrationNumber.trim(),
      taxId: form.taxId.trim(),
      vatId: form.vatId.trim(),
      address: Object.fromEntries(
        Object.entries(form.address).map(([key, value]) => [
          key,
          String(value || "").trim(),
        ]),
      ),
      contact: {
        email: form.contact.email.trim(),
        phone: form.contact.phone.trim(),
      },
      bank: Object.fromEntries(
        Object.entries(form.bank).map(([key, value]) => [
          key,
          String(value || "").trim(),
        ]),
      ),
      locale: form.locale,
      defaultDueDays: Number(form.defaultDueDays),
      pricesIncludeTax: true,
      defaultTaxRateBps: Math.round(Number(form.defaultTaxRate || 0) * 100),
      invoicePrefix: form.invoicePrefix.trim().toUpperCase(),
      creditNotePrefix: form.creditNotePrefix.trim().toUpperCase(),
      autoCreatePaidOrderInvoices: Boolean(form.autoCreatePaidOrderInvoices),
      autoFinalizePaidOrderInvoices: Boolean(
        form.autoFinalizePaidOrderInvoices,
      ),
      autoSendPaidOrderInvoices: Boolean(form.autoSendPaidOrderInvoices),
    };

    try {
      await updateSettings(body).unwrap();
      setDraft(null);
      setNotice({ type: "success", message: t("messages.saved") });
      await refetch();
    } catch (mutationError) {
      setNotice({
        type: "error",
        message: getInvoiceError(mutationError, t("messages.saveError")),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-xs text-[#777773]">
        <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-[20px] border border-danger/20 bg-danger-soft p-6 text-center">
        <ExclamationTriangleIcon className="mx-auto h-6 w-6 text-danger" />
        <p className="mt-3 text-[12px] font-semibold text-danger">
          {getInvoiceError(error, t("loadError"))}
        </p>
        <button
          type="button"
          onClick={refetch}
          className="mt-4 rounded-full bg-[#111111] px-4 py-2 text-[11px] font-semibold text-white"
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const configured = data?.configured ?? data?.settings?.configured ?? false;

  return (
    <section className="mx-auto max-w-[1100px] pb-8">
      {showPageHeader ? (
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-terracotta-600">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#171717]">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-[12px] leading-6 text-[#777773]">
            {t("description")}
          </p>
        </header>
      ) : null}

      <div
        className={
          configured
            ? "mt-6 flex gap-3 rounded-[16px] border border-success/20 bg-success-soft p-4 text-success"
            : "mt-6 flex gap-3 rounded-[16px] border border-warning/20 bg-warning-soft p-4 text-warning"
        }
      >
        {configured ? (
          <CheckCircleIcon className="h-5 w-5 shrink-0" />
        ) : (
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
        )}
        <div>
          <p className="text-xs font-semibold">
            {configured ? t("configured.title") : t("incomplete.title")}
          </p>
          <p className="mt-1 text-[10px] leading-4">
            {configured
              ? t("configured.description")
              : t("incomplete.description")}
          </p>
        </div>
      </div>

      {notice && (
        <p
          className={
            notice.type === "success"
              ? "mt-5 rounded-[13px] bg-success-soft px-4 py-3 text-xs text-success"
              : "mt-5 rounded-[13px] bg-danger-soft px-4 py-3 text-xs text-danger"
          }
          role="status"
        >
          {notice.message}
        </p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-5">
        <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.025em] text-[#292925]">
            {t("legal.title")}
          </h2>
          <p className="mt-1 text-[11px] text-[#858580]">
            {t("legal.description")}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              required
              label={t("fields.legalName")}
              value={form.legalName}
              onChange={(event) => setField("legalName", event.target.value)}
            />
            <Field
              label={t("fields.tradingName")}
              value={form.tradingName}
              onChange={(event) => setField("tradingName", event.target.value)}
            />
            <Field
              label={t("fields.registrationNumber")}
              value={form.registrationNumber}
              onChange={(event) =>
                setField("registrationNumber", event.target.value)
              }
            />
            <Field
              label={t("fields.taxId")}
              value={form.taxId}
              onChange={(event) => setField("taxId", event.target.value)}
            />
            <Field
              label={t("fields.vatId")}
              value={form.vatId}
              onChange={(event) => setField("vatId", event.target.value)}
            />
          </div>
        </section>

        <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.025em] text-[#292925]">
            {t("address.title")}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(EMPTY_FORM.address).map((key) => (
              <Field
                key={key}
                required={["line1", "city", "country"].includes(key)}
                maxLength={key === "countryCode" ? 2 : undefined}
                label={t(`fields.address.${key}`)}
                value={form.address[key]}
                onChange={(event) =>
                  setNested("address", key, event.target.value)
                }
              />
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.025em] text-[#292925]">
              {t("contact.title")}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                type="email"
                label={t("fields.contact.email")}
                value={form.contact.email}
                onChange={(event) =>
                  setNested("contact", "email", event.target.value)
                }
              />
              <Field
                label={t("fields.contact.phone")}
                value={form.contact.phone}
                onChange={(event) =>
                  setNested("contact", "phone", event.target.value)
                }
              />
            </div>
          </section>

          <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-[-0.025em] text-[#292925]">
              {t("bank.title")}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {Object.keys(EMPTY_FORM.bank).map((key) => (
                <Field
                  key={key}
                  label={t(`fields.bank.${key}`)}
                  value={form.bank[key]}
                  onChange={(event) =>
                    setNested("bank", key, event.target.value)
                  }
                />
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.025em] text-[#292925]">
            {t("defaults.title")}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-[11px] font-semibold text-[#393936]">
                {t("fields.locale")}
              </span>
              <select
                value={form.locale}
                onChange={(event) => setField("locale", event.target.value)}
                className="h-11 w-full min-w-0 rounded-[12px] border border-line bg-white px-3.5 text-xs"
              >
                <option value="cs">Čeština</option>
                <option value="en">English</option>
              </select>
            </label>
            <Field
              required
              type="number"
              min="0"
              max="365"
              label={t("fields.defaultDueDays")}
              value={form.defaultDueDays}
              onChange={(event) =>
                setField("defaultDueDays", event.target.value)
              }
            />
            <Field
              required
              type="number"
              min="0"
              max="100"
              step="0.01"
              label={t("fields.defaultTaxRate")}
              value={form.defaultTaxRate}
              onChange={(event) =>
                setField("defaultTaxRate", event.target.value)
              }
            />
            <label className="flex min-h-11 min-w-0 items-center gap-3 self-end rounded-[12px] border border-line px-3.5 text-[11px] font-medium text-[#555553]">
              <input
                type="checkbox"
                checked
                disabled
                readOnly
                className="shrink-0 rounded border-line text-cobalt-600"
              />
              {t("fields.pricesIncludeTax")}
            </label>
            <Field
              required
              pattern="[A-Za-z0-9_-]{1,20}"
              label={t("fields.invoicePrefix")}
              value={form.invoicePrefix}
              onChange={(event) =>
                setField("invoicePrefix", event.target.value.toUpperCase())
              }
            />
            <Field
              required
              pattern="[A-Za-z0-9_-]{1,20}"
              label={t("fields.creditNotePrefix")}
              value={form.creditNotePrefix}
              onChange={(event) =>
                setField("creditNotePrefix", event.target.value.toUpperCase())
              }
            />
          </div>
        </section>

        <section className="rounded-[20px] border border-line bg-[#FAF9F6] p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold tracking-[-0.025em] text-[#292925]">
            {t("automation.title")}
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-[#858580]">
            {t("automation.description")}
          </p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <Toggle
              checked={form.autoCreatePaidOrderInvoices}
              onChange={handleAutoCreate}
              title={t("automation.create.title")}
              description={t("automation.create.description")}
            />
            <Toggle
              checked={form.autoFinalizePaidOrderInvoices}
              disabled={!form.autoCreatePaidOrderInvoices}
              onChange={handleAutoFinalize}
              title={t("automation.finalize.title")}
              description={t("automation.finalize.description")}
            />
            <Toggle
              checked={form.autoSendPaidOrderInvoices}
              disabled={!form.autoFinalizePaidOrderInvoices}
              onChange={(checked) =>
                setField("autoSendPaidOrderInvoices", checked)
              }
              title={t("automation.send.title")}
              description={t("automation.send.description")}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving || isFetching}
            className="inline-flex min-h-11 items-center gap-2 rounded-[13px] bg-[#111111] px-5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {(isSaving || isFetching) && (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            )}
            {isSaving ? t("saving") : t("save")}
          </button>
        </div>
      </form>
    </section>
  );
}
