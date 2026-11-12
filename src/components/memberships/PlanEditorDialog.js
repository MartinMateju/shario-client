"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { getProductName } from "@/components/products/products.utils";
import { normalizePublicTenantLocaleSettings } from "@/components/public-tenant/publicTenant.config";
import { getLocaleDefinition } from "@/i18n/locales";

import {
  getMajorCurrencyInputStep,
  getStripeMinorUnitDigits,
  minorUnitsToMajor,
} from "@/utils/money";
import {
  getEntityId,
  getPlanBenefits,
  getPlanLocations,
  getPlanPrices,
  getPlanVersion,
} from "./membership.utils";

const SIMPLE_BENEFIT_KINDS = [
  "studio_hours",
  "course_discount",
  "monthly_credits",
  "product_discount",
  "custom_perk",
];

const slugify = (value) =>
  String(value || "benefit")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "benefit";

const majorToMinor = (amount, currency) =>
  Math.round(Number(amount || 0) * 10 ** getStripeMinorUnitDigits(currency));

const createPrice = (currency = "CZK") => ({ currency, amount: "" });

const createBenefit = (kind, label = "") => ({
  key: `${kind}_${Date.now()}`,
  editorKey: `${kind}_${Date.now()}`,
  label,
  translations: {},
  kind,
  quantity: "1",
  rolloverPercent: "0",
  eligibleProductIds: [],
  quantityMajor: "",
  currency: "CZK",
  expiresAfterDays: "",
  adjustable: true,
  percentage: "",
  limit: "",
  enabled: true,
  originalBenefit: null,
  autoKey: true,
});

const inferBenefitKind = (benefit) => {
  if (benefit?.type === "percentage") {
    if (
      benefit.appliesTo === "products" &&
      benefit.productScope === "courses" &&
      benefit.memberOnly === true
    )
      return "course_discount";
    return benefit.appliesTo === "products" ? "product_discount" : "legacy";
  }
  if (benefit?.type === "boolean" && benefit.enabled !== false) {
    return "custom_perk";
  }
  if (benefit?.type === "allowance" && benefit.unit === "credit") {
    return "monthly_credits";
  }
  if (
    benefit?.type === "allowance" &&
    benefit.unit === "minute" &&
    benefit.usageScope === "open_studio" &&
    benefit.memberOnly === true
  )
    return "studio_hours";
  return "legacy";
};

const textForPrimaryLanguage = (
  source,
  fields,
  primaryLanguage,
  sourceLanguage,
) => {
  const base = Object.fromEntries(
    fields.map((field) => [field, source?.[field] || ""]),
  );
  const translations = source?.translations || {};
  if (
    !primaryLanguage ||
    !sourceLanguage ||
    primaryLanguage === sourceLanguage
  ) {
    return { ...base, translations };
  }
  return {
    ...Object.fromEntries(
      fields.map((field) => [
        field,
        translations[primaryLanguage]?.[field]?.trim() || base[field],
      ]),
    ),
    translations: {
      ...translations,
      [sourceLanguage]: { ...translations[sourceLanguage], ...base },
    },
  };
};

const benefitToForm = (benefit, primaryLanguage, sourceLanguage) => {
  const kind = inferBenefitKind(benefit);
  const currency = benefit.currency || "CZK";
  return {
    key: benefit.key || slugify(benefit.label),
    editorKey: benefit.key || slugify(benefit.label),
    ...textForPrimaryLanguage(
      benefit,
      ["label"],
      primaryLanguage,
      sourceLanguage,
    ),
    kind,
    quantity:
      kind === "studio_hours"
        ? Number(benefit.quantity || 0) / 60
        : (benefit.quantity ?? ""),
    rolloverPercent: benefit.rolloverPercent ?? 0,
    eligibleProductIds: benefit.eligibleProductIds || [],
    quantityMajor:
      kind === "money_minor"
        ? minorUnitsToMajor(benefit.quantity ?? 0, currency)
        : "",
    currency,
    expiresAfterDays: benefit.expiresAfterDays ?? "",
    adjustable: benefit.adjustable !== false,
    percentage:
      benefit.type === "percentage"
        ? Number(benefit.percentageBps || 0) / 100
        : "",
    limit: benefit.type === "limit" ? (benefit.limit ?? "") : "",
    enabled: benefit.type === "boolean" ? benefit.enabled === true : true,
    originalBenefit: benefit,
    autoKey: false,
  };
};

const createEmptyForm = (defaultCurrency = "CZK") => ({
  name: "",
  description: "",
  terms: "",
  translations: {},
  sortOrder: 0,
  billingType: "recurring",
  interval: "month",
  intervalCount: 1,
  durationDays: 30,
  locationType: "all",
  locationIds: [],
  prices: [createPrice(defaultCurrency)],
  benefits: [],
});

const planToForm = (plan, defaultCurrency, primaryLanguage) => {
  const version = getPlanVersion(plan);
  const billing = version?.billing || {};
  const prices = getPlanPrices(plan);
  const sourceLanguage = version?.sourceLanguage || primaryLanguage;
  const priceFields = prices.map((price) => ({
    currency: price.currency,
    amount: minorUnitsToMajor(price.amountMinor, price.currency),
    originalAmountMinor: price.amountMinor,
  }));
  if (!priceFields.some((price) => price.currency === defaultCurrency)) {
    priceFields.push(createPrice(defaultCurrency));
  }
  return {
    ...textForPrimaryLanguage(
      { ...version, name: version?.name || plan?.name || "" },
      ["name", "description", "terms"],
      primaryLanguage,
      sourceLanguage,
    ),
    sortOrder: plan?.sortOrder ?? version?.sortOrder ?? 0,
    billingType: billing.type || (billing.durationDays ? "fixed" : "recurring"),
    interval: billing.interval || "month",
    intervalCount: billing.intervalCount || 1,
    durationDays: billing.durationDays || 30,
    locationType:
      (version?.locationScope ?? plan?.locationScope)?.type || "all",
    locationIds: getPlanLocations(plan),
    prices: priceFields,
    benefits: getPlanBenefits(plan).map((benefit) =>
      benefitToForm(benefit, primaryLanguage, sourceLanguage),
    ),
  };
};

const trimTranslations = (translations) =>
  Object.fromEntries(
    Object.entries(translations).map(([language, fields]) => [
      language,
      Object.fromEntries(
        Object.entries(fields).map(([field, value]) => [field, value.trim()]),
      ),
    ]),
  );

const translationsForSave = (source, fields, primaryLanguage) => {
  const translations = trimTranslations(source.translations);
  if (primaryLanguage && translations[primaryLanguage]) {
    translations[primaryLanguage] = {
      ...translations[primaryLanguage],
      ...Object.fromEntries(
        fields.map((field) => [field, source[field].trim()]),
      ),
    };
  }
  return Object.keys(translations).length ? { translations } : {};
};

const benefitPayload = (benefit, primaryLanguage) => {
  const base = {
    key: benefit.autoKey ? slugify(benefit.key || benefit.label) : benefit.key,
    label: benefit.label.trim(),
    ...translationsForSave(benefit, ["label"], primaryLanguage),
  };

  if (benefit.kind === "legacy") {
    return {
      ...benefit.originalBenefit,
      label: base.label,
      ...(base.translations ? { translations: base.translations } : {}),
    };
  }

  if (benefit.kind === "studio_hours") {
    return {
      ...base,
      type: "allowance",
      unit: "minute",
      quantity: Math.round(Number(benefit.quantity) * 60),
      usageScope: "open_studio",
      memberOnly: true,
      rolloverPercent: Number(benefit.rolloverPercent || 0),
    };
  }

  if (benefit.kind === "course_discount") {
    return {
      ...base,
      type: "percentage",
      percentageBps: Math.round(Number(benefit.percentage || 0) * 100),
      appliesTo: "products",
      productScope: "courses",
      eligibleProductIds: benefit.eligibleProductIds,
      memberOnly: true,
    };
  }

  if (benefit.kind === "product_discount") {
    return {
      ...base,
      type: "percentage",
      percentageBps: Math.round(Number(benefit.percentage || 0) * 100),
      appliesTo: "products",
    };
  }

  if (benefit.kind === "custom_perk") {
    return {
      ...base,
      type: "boolean",
      enabled: true,
    };
  }

  return {
    ...base,
    type: "allowance",
    unit: "credit",
    quantity: Math.round(Number(benefit.quantity || 0)),
    adjustable: true,
  };
};

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-[#4F4F4B]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[10px] leading-4 text-[#858580]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

const inputClass =
  "min-h-11 w-full rounded-[13px] border border-line bg-white px-3.5 text-[12px] text-[#292925] outline-none transition focus:border-cobalt-500 focus:ring-2 focus:ring-cobalt-500/10";

function LocalizedField({
  label,
  hint,
  field,
  value,
  translations,
  languages,
  onChange,
  onTranslationChange,
  multiline = false,
  required = false,
  maxLength,
}) {
  const Input = multiline ? "textarea" : "input";
  const languageCodes = languages.length ? languages : [null];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {languageCodes.map((language, index) => (
        <div
          key={language || "primary"}
          className={languageCodes.length === 1 ? "sm:col-span-2" : ""}
        >
          <Field
            label={
              language
                ? `${label} · ${getLocaleDefinition(language)?.nativeName || language}`
                : label
            }
            hint={index === 0 ? hint : undefined}
          >
            <Input
              className={`${inputClass}${multiline ? " min-h-24 py-3" : ""}`}
              lang={language || undefined}
              required={index === 0 && required}
              pattern={!multiline && required ? ".*\\S.*" : undefined}
              maxLength={maxLength}
              value={
                index === 0 ? value : translations?.[language]?.[field] || ""
              }
              onChange={(event) =>
                index === 0
                  ? onChange(event.target.value)
                  : onTranslationChange(language, event.target.value)
              }
            />
          </Field>
        </div>
      ))}
    </div>
  );
}

export default function PlanEditorDialog({
  open,
  plan,
  locations,
  courses = [],
  defaultCurrency = "CZK",
  languageSettings,
  saving,
  requestError,
  guided = false,
  onClose,
  onSave,
}) {
  const t = useTranslations("Memberships.owner.planForm");
  const setupT = useTranslations("SetupCenter");
  const locale = useLocale();
  const languages = languageSettings
    ? normalizePublicTenantLocaleSettings(languageSettings)
        .supportedPublicLanguages
    : [];
  const primaryLanguage = languages[0];
  const [form, setForm] = useState(() =>
    plan
      ? planToForm(plan, defaultCurrency, primaryLanguage)
      : createEmptyForm(defaultCurrency),
  );
  const [validationError, setValidationError] = useState("");
  const updateText = (field, value) =>
    setForm((current) => ({ ...current, [field]: value }));
  const updateTranslation = (language, field, value) =>
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [language]: { ...current.translations[language], [field]: value },
      },
    }));
  const primaryPrice = form.prices.find(
    (price) => price.currency === defaultCurrency,
  );
  const monthlyBilling =
    form.billingType === "recurring" &&
    form.interval === "month" &&
    Number(form.intervalCount) === 1;

  const addSimpleBenefit = (kind) => {
    setForm((current) => ({
      ...current,
      benefits: [
        ...current.benefits,
        createBenefit(kind, t(`benefitDefaults.${kind}`)),
      ],
    }));
  };

  const updateBenefit = (index, patch) => {
    setForm((current) => ({
      ...current,
      benefits: current.benefits.map((benefit, benefitIndex) =>
        benefitIndex === index ? { ...benefit, ...patch } : benefit,
      ),
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const prices = form.prices.map((price) => ({
      currency: price.currency,
      amountMinor:
        price.currency === defaultCurrency
          ? majorToMinor(price.amount, price.currency)
          : price.originalAmountMinor,
    }));

    if (prices.some((price) => price.amountMinor <= 0)) {
      setValidationError(t("positivePriceRequired"));
      return;
    }

    if (form.locationType !== "all" && !form.locationIds.length) {
      setValidationError(t("locationRequired"));
      return;
    }

    if (
      form.benefits.filter((benefit) =>
        ["product_discount", "course_discount"].includes(benefit.kind),
      ).length > 1
    ) {
      setValidationError(t("oneProductDiscount"));
      return;
    }

    for (const benefit of form.benefits.filter(
      (value) => value.kind === "studio_hours",
    )) {
      const minutes = Number(benefit.quantity) * 60;
      if (
        !Number.isFinite(minutes) ||
        minutes <= 0 ||
        Math.abs(minutes - Math.round(minutes)) > 0.000001
      ) {
        setValidationError(t("hoursValidation"));
        return;
      }
      const rollover = Number(benefit.rolloverPercent || 0);
      if (
        !Number.isFinite(rollover) ||
        rollover < 0 ||
        rollover > 25 ||
        (rollover > 0 && !monthlyBilling)
      ) {
        setValidationError(t("rolloverHint"));
        return;
      }
    }

    setValidationError("");
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      terms: form.terms.trim(),
      ...(primaryLanguage ? { sourceLanguage: primaryLanguage } : {}),
      ...translationsForSave(
        form,
        ["name", "description", "terms"],
        primaryLanguage,
      ),
      sortOrder: Number(form.sortOrder || 0),
      prices,
      billing:
        form.billingType === "fixed"
          ? { type: "fixed", durationDays: Number(form.durationDays) }
          : {
              type: "recurring",
              interval: form.interval,
              intervalCount: Number(form.intervalCount),
            },
      locationScope:
        form.locationType !== "all"
          ? { type: form.locationType, locationIds: form.locationIds }
          : { type: "all", locationIds: [] },
      benefits: form.benefits.map((benefit) =>
        benefitPayload(benefit, primaryLanguage),
      ),
    };
    onSave(payload);
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? () => {} : onClose}
      className="relative z-[90]"
    >
      <DialogBackdrop
        data-dialog-backdrop
        className="fixed inset-0 bg-[#171717]/35 backdrop-blur-[2px]"
      />
      <div className="fixed inset-0 overflow-y-auto p-0 sm:p-5">
        <div className="flex min-h-full items-end justify-center sm:items-center">
          <DialogPanel
            data-dialog-layout="form"
            className="h-dvh max-h-dvh w-full overflow-hidden rounded-none bg-surface-raised pt-[env(safe-area-inset-top)] shadow-floating sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-4xl sm:rounded-[24px] sm:pt-0"
          >
            <header className="flex items-start justify-between border-b border-line bg-white px-5 py-5 sm:px-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-terracotta-600">
                  {plan ? t("editEyebrow") : t("createEyebrow")}
                </p>
                <DialogTitle className="mt-1.5 text-xl font-semibold tracking-[-0.03em] text-[#20201E]">
                  {plan ? t("editTitle") : t("createTitle")}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                aria-label={t("close")}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-[#686762] hover:border-line-strong disabled:opacity-50"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </header>

            <form
              onSubmit={submit}
              data-guided-form={guided ? "membership" : undefined}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:max-h-[calc(100dvh-8rem)]"
            >
              <div className="space-y-7 px-5 py-6 sm:px-7">
                {languages.length > 1 ? (
                  <p className="rounded-[14px] border border-cobalt-100 bg-cobalt-50 px-4 py-3 text-[12px] leading-5 text-cobalt-800">
                    {t("translationsHint")}
                  </p>
                ) : null}
                <section className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <LocalizedField
                      label={t("name")}
                      field="name"
                      required
                      maxLength={160}
                      value={form.name}
                      translations={form.translations}
                      languages={languages}
                      onChange={(value) => updateText("name", value)}
                      onTranslationChange={(language, value) =>
                        updateTranslation(language, "name", value)
                      }
                    />
                  </div>
                  {!guided ? (
                    <div className="sm:col-span-2">
                      <LocalizedField
                        label={t("description")}
                        field="description"
                        multiline
                        maxLength={2000}
                        value={form.description}
                        translations={form.translations}
                        languages={languages}
                        onChange={(value) => updateText("description", value)}
                        onTranslationChange={(language, value) =>
                          updateTranslation(language, "description", value)
                        }
                      />
                    </div>
                  ) : null}
                </section>

                <section>
                  <h3 className="text-[12px] font-semibold text-[#292925]">
                    {t("pricingTitle")}
                  </h3>
                  <p className="mt-1 text-[12px] leading-5 text-[#858580]">
                    {t("primaryCurrencyHint", { currency: defaultCurrency })}
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label={t("currency")}>
                      <input
                        className={`${inputClass} bg-surface-muted`}
                        value={defaultCurrency}
                        readOnly
                      />
                    </Field>
                    <Field label={t("amount")}>
                      <input
                        className={inputClass}
                        type="number"
                        min={getMajorCurrencyInputStep(defaultCurrency)}
                        step={getMajorCurrencyInputStep(defaultCurrency)}
                        required
                        value={primaryPrice?.amount ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            prices: current.prices.map((item) =>
                              item.currency === defaultCurrency
                                ? { ...item, amount: event.target.value }
                                : item,
                            ),
                          }))
                        }
                      />
                    </Field>
                  </div>
                </section>

                <section className="grid gap-4 rounded-[18px] border border-line bg-white p-4 sm:grid-cols-3">
                  <Field label={t("billingType")}>
                    <select
                      className={inputClass}
                      value={form.billingType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          billingType: event.target.value,
                        }))
                      }
                    >
                      <option value="recurring">{t("recurring")}</option>
                      <option value="fixed">{t("fixed")}</option>
                    </select>
                  </Field>
                  {form.billingType === "recurring" ? (
                    <>
                      <Field label={t("interval")}>
                        <select
                          className={inputClass}
                          value={form.interval}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              interval: event.target.value,
                            }))
                          }
                        >
                          <option value="month">{t("monthly")}</option>
                          <option value="year">{t("yearly")}</option>
                        </select>
                      </Field>
                      <Field label={t("intervalCount")}>
                        <input
                          className={inputClass}
                          type="number"
                          min="1"
                          max="12"
                          step="1"
                          required
                          value={form.intervalCount}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              intervalCount: event.target.value,
                            }))
                          }
                        />
                      </Field>
                    </>
                  ) : (
                    <Field label={t("durationDays")}>
                      <input
                        className={inputClass}
                        type="number"
                        min="1"
                        max="3650"
                        step="1"
                        required
                        value={form.durationDays}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            durationDays: event.target.value,
                          }))
                        }
                      />
                    </Field>
                  )}
                </section>

                <section>
                  <h3 className="text-[12px] font-semibold text-[#292925]">
                    {t("locationsTitle")}
                  </h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="flex min-h-12 items-center gap-3 rounded-[14px] border border-line bg-white px-4 text-[12px] font-medium">
                      <input
                        type="radio"
                        name="locationType"
                        checked={form.locationType === "all"}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            locationType: "all",
                          }))
                        }
                      />
                      {t("allLocations")}
                    </label>
                    <label className="flex min-h-12 items-center gap-3 rounded-[14px] border border-line bg-white px-4 text-[12px] font-medium">
                      <input
                        type="radio"
                        name="locationType"
                        checked={form.locationType === "selected"}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            locationType: "selected",
                          }))
                        }
                      />
                      {t("selectedLocations")}
                    </label>
                    <label className="flex min-h-12 items-center gap-3 rounded-[14px] border border-line bg-white px-4 text-[12px] font-medium sm:col-span-2">
                      <input
                        type="radio"
                        name="locationType"
                        checked={form.locationType === "shared_selected"}
                        onChange={() =>
                          setForm((current) => ({
                            ...current,
                            locationType: "shared_selected",
                          }))
                        }
                      />
                      {t("sharedSelectedLocations")}
                    </label>
                  </div>
                  {form.locationType !== "all" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {locations.map((location) => {
                        const id = getEntityId(location);
                        return (
                          <label
                            key={id}
                            className="flex min-h-11 items-center gap-3 rounded-[13px] border border-line bg-white px-3.5 text-[12px]"
                          >
                            <input
                              type="checkbox"
                              checked={form.locationIds.includes(id)}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  locationIds: event.target.checked
                                    ? [...current.locationIds, id]
                                    : current.locationIds.filter(
                                        (value) => value !== id,
                                      ),
                                }))
                              }
                            />
                            {location.name}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </section>

                {!guided ? (
                  <section>
                    <div>
                      <h3 className="text-[12px] font-semibold text-[#292925]">
                        {t("benefitsTitle")}
                      </h3>
                      <p className="mt-1 max-w-2xl text-[12px] leading-5 text-[#858580]">
                        {t("benefitsHint")}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {SIMPLE_BENEFIT_KINDS.map((kind) => {
                        const disabled = [
                          "product_discount",
                          "course_discount",
                        ].includes(kind)
                          ? form.benefits.some((benefit) =>
                              ["product_discount", "course_discount"].includes(
                                benefit.kind,
                              ),
                            )
                          : kind !== "custom_perk" &&
                            form.benefits.some(
                              (benefit) => benefit.kind === kind,
                            );

                        return (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => addSimpleBenefit(kind)}
                            disabled={disabled}
                            className="group min-h-32 rounded-[18px] border border-line bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-cobalt-300 hover:shadow-[0_12px_30px_rgb(var(--skab-blue-rgb)/0.08)] disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:border-line disabled:hover:shadow-none"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cobalt-50 text-cobalt-700 group-hover:bg-cobalt-700 group-hover:text-white group-disabled:bg-[#E3E0D9] group-disabled:text-[#858580]">
                              <PlusIcon className="h-4 w-4" />
                            </span>
                            <span className="mt-3 block text-[12px] font-semibold text-[#292925]">
                              {t(`benefitTypes.${kind}.title`)}
                            </span>
                            <span className="mt-1 block text-[12px] leading-5 text-[#858580]">
                              {disabled
                                ? t("alreadyAdded")
                                : t(`benefitTypes.${kind}.description`)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 space-y-3">
                      {form.benefits.map((benefit, index) => (
                        <BenefitEditor
                          key={`${benefit.editorKey}-${index}`}
                          benefit={benefit}
                          courses={courses}
                          locale={locale}
                          languages={languages}
                          monthlyBilling={monthlyBilling}
                          t={t}
                          onChange={(patch) => updateBenefit(index, patch)}
                          onRemove={() =>
                            setForm((current) => ({
                              ...current,
                              benefits: current.benefits.filter(
                                (_, benefitIndex) => benefitIndex !== index,
                              ),
                            }))
                          }
                        />
                      ))}
                      {!form.benefits.length ? (
                        <p className="rounded-[16px] border border-dashed border-line bg-white/70 px-4 py-6 text-center text-[12px] text-[#858580]">
                          {t("noBenefits")}
                        </p>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {!guided ? (
                  <section>
                    <LocalizedField
                      label={t("terms")}
                      hint={t("termsHint")}
                      field="terms"
                      multiline
                      maxLength={10000}
                      value={form.terms}
                      translations={form.translations}
                      languages={languages}
                      onChange={(value) => updateText("terms", value)}
                      onTranslationChange={(language, value) =>
                        updateTranslation(language, "terms", value)
                      }
                    />
                  </section>
                ) : null}

                {validationError || requestError ? (
                  <p
                    className="rounded-[14px] border border-danger/20 bg-danger-soft px-4 py-3 text-[12px] text-danger"
                    role="alert"
                  >
                    {validationError || t("requestError")}
                  </p>
                ) : null}
              </div>

              <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-line bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="min-h-11 rounded-full border border-line px-5 text-[12px] font-semibold disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 rounded-full bg-[#171717] px-6 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? t("saving")
                    : guided
                      ? setupT("guided.saveAndContinue")
                      : t("save")}
                </button>
              </footer>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

function BenefitEditor({
  benefit,
  courses,
  locale,
  languages,
  monthlyBilling,
  t,
  onChange,
  onRemove,
}) {
  const isLegacy = benefit.kind === "legacy";
  const labelField = (
    <LocalizedField
      label={t("benefitLabel")}
      field="label"
      required
      maxLength={120}
      value={benefit.label}
      translations={benefit.translations}
      languages={languages}
      onChange={(value) =>
        onChange({
          label: value,
          key: benefit.autoKey ? slugify(value) : benefit.key,
        })
      }
      onTranslationChange={(language, value) =>
        onChange({
          translations: {
            ...benefit.translations,
            [language]: { ...benefit.translations[language], label: value },
          },
        })
      }
    />
  );

  return (
    <article className="rounded-[18px] border border-line bg-white p-4 shadow-[0_8px_22px_rgba(17,17,15,0.025)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-terracotta-600">
            {isLegacy
              ? t("legacyBenefit.title")
              : t(`benefitTypes.${benefit.kind}.title`)}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[#858580]">
            {isLegacy
              ? t("legacyBenefit.description")
              : t(`benefitTypes.${benefit.kind}.editorHint`)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-[12px] font-semibold text-danger hover:bg-danger-soft"
        >
          <TrashIcon className="h-4 w-4" /> {t("removeBenefit")}
        </button>
      </div>

      {isLegacy ? (
        <div className="mt-4 rounded-[14px] bg-[#F7F5F1] px-4 py-3">
          {labelField}
          <p className="mt-1 text-[10px] text-[#777773]">
            {t("legacyBenefit.preserved")}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">{labelField}</div>

          {benefit.kind === "monthly_credits" ? (
            <Field
              label={t("monthlyCreditQuantity")}
              hint={t("monthlyCreditResetHint")}
            >
              <input
                className={inputClass}
                required
                type="number"
                min="1"
                max="1000000"
                step="1"
                value={benefit.quantity}
                onChange={(event) => onChange({ quantity: event.target.value })}
              />
            </Field>
          ) : null}

          {benefit.kind === "studio_hours" ? (
            <>
              <Field label={t("hourQuantity")} hint={t("hoursValidation")}>
                <input
                  className={inputClass}
                  required
                  type="number"
                  min="0.016666666666666666"
                  max="16666"
                  step="any"
                  value={benefit.quantity}
                  onChange={(event) =>
                    onChange({ quantity: event.target.value })
                  }
                />
              </Field>
              <Field label={t("rolloverPercent")} hint={t("rolloverHint")}>
                <input
                  className={inputClass}
                  required
                  type="number"
                  min="0"
                  max={monthlyBilling ? "25" : "0"}
                  step="1"
                  value={benefit.rolloverPercent}
                  onChange={(event) =>
                    onChange({ rolloverPercent: event.target.value })
                  }
                />
              </Field>
            </>
          ) : null}

          {["product_discount", "course_discount"].includes(benefit.kind) ? (
            <Field label={t("percentage")} hint={t("productDiscountHint")}>
              <input
                className={inputClass}
                required
                type="number"
                min="0.01"
                max="99"
                step="0.01"
                value={benefit.percentage}
                onChange={(event) =>
                  onChange({ percentage: event.target.value })
                }
              />
            </Field>
          ) : null}
          {benefit.kind === "course_discount" ? (
            <fieldset className="sm:col-span-2">
              <legend className="text-[11px] font-semibold text-[#4F4F4B]">
                {t("eligibleCourses")}
              </legend>
              <p className="mt-1 text-[10px] leading-4 text-[#858580]">
                {t("eligibleCoursesHint")}
              </p>
              <div className="mt-3 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                {Array.from(
                  new Map([
                    ...courses.map((course) => [getEntityId(course), course]),
                    ...benefit.eligibleProductIds
                      .filter(
                        (id) =>
                          !courses.some((course) => getEntityId(course) === id),
                      )
                      .map((id) => [id, { id, name: id }]),
                  ]).values(),
                ).map((course) => {
                  const id = getEntityId(course);
                  return (
                    <label
                      key={id}
                      className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[11px]"
                    >
                      <input
                        type="checkbox"
                        checked={benefit.eligibleProductIds.includes(id)}
                        onChange={(event) =>
                          onChange({
                            eligibleProductIds: event.target.checked
                              ? [...benefit.eligibleProductIds, id]
                              : benefit.eligibleProductIds.filter(
                                  (value) => value !== id,
                                ),
                          })
                        }
                      />
                      {getProductName(course, locale)}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
        </div>
      )}
    </article>
  );
}
