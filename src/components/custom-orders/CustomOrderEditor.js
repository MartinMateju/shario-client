"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSelector } from "react-redux";
import { ArrowLeftIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { Link, useRouter } from "@/i18n/navigation";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import { STUDIO_COMMERCE_CURRENCIES } from "@/config/currencies";
import { getStripeMinorUnitDigits } from "@/utils/money";
import {
  useGetCustomOrderQuery,
  useGetCustomOrderOptionsQuery,
  useLazyFindCustomOrderCustomerQuery,
  useCreateCustomOrderMutation,
  useUpdateCustomOrderMutation,
} from "@/lib/features/customOrders/customOrdersApiSlice";
import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import {
  createOrderDraft,
  validateOrderDraft,
  orderPayload,
  orderError,
  orderId,
  formatOrderDate,
} from "./customOrders.utils";
import {
  cardClass,
  inputClass,
  primaryClass,
  secondaryClass,
  OrderField,
  OrderLoading,
  OrderFeedback,
} from "./CustomOrderShared";

export default function CustomOrderEditor({ id, defaultLocationId }) {
  const t = useTranslations("CustomOrders");
  const activeStudioId = useSelector(selectActiveStudioId);
  const options = useGetCustomOrderOptionsQuery();
  const query = useGetCustomOrderQuery(id, { skip: !id });
  const [reloadKey, setReloadKey] = useState(0);
  const reload = async () => {
    const result = await query.refetch();
    if (result.data) setReloadKey((value) => value + 1);
  };
  if (options.isLoading || (id && query.isLoading)) return <OrderLoading />;
  if (!options.data || (id && !query.data))
    return (
      <OrderLoading
        error
        retry={() => {
          options.refetch();
          if (id) query.refetch();
        }}
      />
    );
  if (query.data?.status === "closed")
    return (
      <section className={cardClass}>
        <p className="mb-4 text-sm text-ink-muted">{t("closedNotice")}</p>
        <Link className={secondaryClass} href={`/app/custom-orders/${id}`}>
          {t("view")}
        </Link>
      </section>
    );
  const requestedLocation = defaultLocationId || activeStudioId;
  const locationId = options.data.locations.some(
    (location) => location.id === requestedLocation,
  )
    ? requestedLocation
    : options.data.locations[0]?.id || "";
  return (
    <CustomOrderForm
      key={`${id || "new"}:${reloadKey}`}
      initialItem={query.data}
      options={options.data}
      defaultLocationId={locationId}
      onReload={reload}
    />
  );
}

export function CustomOrderForm({
  initialItem,
  options,
  defaultLocationId,
  onReload,
}) {
  const t = useTranslations("CustomOrders");
  const locale = useLocale();
  const router = useRouter();
  const initialRevision = useRef(initialItem?.revision);
  const [draft, setDraft] = useState(() =>
    createOrderDraft(initialItem, {
      locationId: defaultLocationId,
      currency: options.currency,
    }),
  );
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [customerMode, setCustomerMode] = useState(
    initialItem?.customerId
      ? "existing"
      : initialItem?.customer?.name
        ? "manual"
        : "none",
  );
  const [identifier, setIdentifier] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookup, lookupState] = useLazyFindCustomOrderCustomerQuery();
  const lookupSequence = useRef(0);
  const [create, createState] = useCreateCustomOrderMutation();
  const [update, updateState] = useUpdateCustomOrderMutation();
  const staff = useGetCustomOrderOptionsQuery(draft.locationId || undefined);
  const formRef = useRef(null);
  const feedbackRef = useRef(null);
  const busy = createState.isLoading || updateState.isLoading;
  const currentLocation = options.locations.find(
    (location) => location.id === draft.locationId,
  );
  const change = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: null }));
  };
  const changeContact = (field, value) => {
    setDraft((current) => ({
      ...current,
      customer: { ...current.customer, [field]: value },
    }));
    setErrors((current) => ({ ...current, [field]: null }));
  };
  const switchCustomerMode = (mode) => {
    lookupSequence.current += 1;
    setCustomerMode(mode);
    setLookupError("");
    setIdentifier("");
    setDraft((current) => ({
      ...current,
      customerId: null,
      customer: { name: "", email: "", phone: "" },
    }));
  };
  const findCustomer = async () => {
    const sequence = ++lookupSequence.current;
    setLookupError("");
    if (!identifier.trim()) {
      setLookupError(t("errors.identifier"));
      return;
    }
    try {
      const result = await lookup({
        identifier: identifier.trim(),
        locationId: draft.locationId,
      }).unwrap();
      if (sequence !== lookupSequence.current) return;
      setDraft((current) => ({
        ...current,
        customerId: result.customer.id,
        customer: {
          name: result.customer.name || "",
          email: result.customer.email || "",
          phone: result.customer.phone || "",
        },
      }));
      setErrors((current) => ({
        ...current,
        name: null,
        email: null,
        customerId: null,
      }));
    } catch {
      if (sequence === lookupSequence.current)
        setLookupError(t("errors.customer"));
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy || stale) return;
    const nextErrors = validateOrderDraft(draft);
    if (customerMode === "manual" && !draft.customer.name.trim())
      nextErrors.name = "required";
    if (customerMode === "existing" && !draft.customerId)
      nextErrors.customerId = "selectCustomer";
    setErrors(nextErrors);
    setError("");
    if (Object.keys(nextErrors).length) {
      setError(t("errors.validation"));
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector('[aria-invalid="true"]');
        (first || feedbackRef.current)?.focus();
      });
      return;
    }
    try {
      const body = orderPayload(draft);
      const saved = await (
        initialItem
          ? update({
              id: orderId(initialItem),
              revision: initialRevision.current,
              ...body,
            })
          : create(body)
      ).unwrap();
      router.push(`/app/custom-orders/${orderId(saved)}?saved=1`);
    } catch (failure) {
      setError(orderError(failure, t));
      setStale(Boolean(initialItem) && failure?.status === 409);
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  };
  const field = (
    name,
    { required = false, type = "text", multiline = false, hint, ...props } = {},
  ) => (
    <OrderField
      label={t(`fields.${name}`)}
      required={required}
      error={errors[name] ? t(`errors.${errors[name]}`) : null}
      hint={hint}
    >
      {(aria) =>
        multiline ? (
          <textarea
            {...aria}
            {...props}
            name={name}
            className={inputClass}
            rows={name === "description" ? 6 : 3}
            value={draft[name]}
            onChange={(event) => change(name, event.target.value)}
          />
        ) : (
          <input
            {...aria}
            {...props}
            name={name}
            className={inputClass}
            type={type}
            value={draft[name]}
            onChange={(event) => change(name, event.target.value)}
          />
        )
      }
    </OrderField>
  );
  return (
    <div className="space-y-6">
      <Link
        href={
          initialItem
            ? `/app/custom-orders/${orderId(initialItem)}`
            : "/app/custom-orders"
        }
        className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-muted hover:text-cobalt-600"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <WorkspaceSectionHeader
        eyebrow={initialItem?.reference || t("sales")}
        title={t(initialItem ? "editTitle" : "new")}
        description={t("formDescription")}
      />
      <form
        ref={formRef}
        noValidate
        onSubmit={submit}
        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="min-w-0 space-y-6">
          <div ref={feedbackRef} tabIndex={-1}>
            <OrderFeedback error={error} />
            {stale ? (
              <button
                type="button"
                onClick={onReload}
                className={`${secondaryClass} mt-3`}
              >
                {t("reload")}
              </button>
            ) : null}
          </div>
          <fieldset
            disabled={busy || stale}
            className={`${cardClass} space-y-5`}
          >
            <legend className="sr-only">{t("specification")}</legend>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {t("specification")}
            </h2>
            {field("title", { required: true, maxLength: 160 })}
            {field("description", {
              required: true,
              multiline: true,
              maxLength: 10000,
              hint: t("descriptionHint"),
            })}
            <div className="grid gap-5 sm:grid-cols-2">
              {field("pieceCount", {
                required: true,
                type: "number",
                min: 1,
                max: 1000000,
                step: 1,
              })}
              <OrderField
                label={t("fields.locationId")}
                required
                error={errors.locationId ? t("errors.required") : null}
              >
                {(aria) => (
                  <select
                    {...aria}
                    name="locationId"
                    className={inputClass}
                    value={draft.locationId}
                    onChange={(event) => {
                      lookupSequence.current += 1;
                      change("locationId", event.target.value);
                      change("assigneeId", "");
                      if (customerMode === "existing")
                        switchCustomerMode("existing");
                    }}
                  >
                    <option value="">{t("chooseLocation")}</option>
                    {options.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                )}
              </OrderField>
            </div>
            {field("materials", {
              required: true,
              multiline: true,
              maxLength: 4000,
            })}
            {field("finish", { multiline: true, maxLength: 4000 })}
          </fieldset>
          <fieldset
            disabled={busy || stale}
            className={`${cardClass} space-y-5`}
          >
            <legend className="sr-only">{t("planning")}</legend>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {t("planning")}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {field("startDate", { required: true, type: "date" })}
              {field("deadline", {
                required: true,
                type: "date",
                min: draft.startDate || undefined,
              })}
            </div>
            <p className="text-xs leading-5 text-ink-muted">
              {t("deadlineHint", {
                timezone: currentLocation?.timeZone || "—",
              })}
            </p>
            <OrderField
              label={t("fields.assigneeId")}
              hint={staff.isError ? t("errors.staff") : undefined}
            >
              {(aria) => (
                <select
                  {...aria}
                  className={inputClass}
                  disabled={staff.isFetching}
                  value={draft.assigneeId}
                  onChange={(event) => change("assigneeId", event.target.value)}
                >
                  <option value="">{t("unassigned")}</option>
                  {initialItem?.assignee &&
                  initialItem.assigneeId === draft.assigneeId &&
                  !(staff.data?.assignees || []).some(
                    (person) => person.id === draft.assigneeId,
                  ) ? (
                    <option value={draft.assigneeId}>
                      {initialItem.assignee.name}
                    </option>
                  ) : null}
                  {(staff.data?.assignees || []).map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              )}
            </OrderField>
          </fieldset>
          <fieldset
            disabled={busy || stale}
            className={`${cardClass} space-y-5`}
          >
            <legend className="sr-only">{t("fields.customer")}</legend>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {t("fields.customer")}
            </h2>
            <div className="flex flex-wrap gap-4">
              {["none", "manual", "existing"].map((mode) => (
                <label
                  key={mode}
                  className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink"
                >
                  <input
                    type="radio"
                    name="customerMode"
                    checked={customerMode === mode}
                    onChange={() => switchCustomerMode(mode)}
                    className="text-cobalt-500 focus:ring-cobalt-500"
                  />
                  {t(`customerModes.${mode}`)}
                </label>
              ))}
            </div>
            {customerMode === "existing" ? (
              <div className="space-y-3 rounded-2xl bg-sand-50 p-4">
                <OrderField
                  label={t("customerIdentifier")}
                  error={
                    lookupError ||
                    (errors.customerId ? t("errors.selectCustomer") : null)
                  }
                >
                  {(aria) => (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        {...aria}
                        className={`${inputClass} !mt-0 min-w-0 flex-1`}
                        value={identifier}
                        maxLength={80}
                        onChange={(event) => {
                          lookupSequence.current += 1;
                          setIdentifier(event.target.value);
                        }}
                      />
                      <button
                        type="button"
                        className={secondaryClass}
                        disabled={lookupState.isFetching || !draft.locationId}
                        onClick={findCustomer}
                      >
                        {t(lookupState.isFetching ? "loading" : "findCustomer")}
                      </button>
                    </div>
                  )}
                </OrderField>
                {draft.customerId ? (
                  <p
                    role="status"
                    className="flex items-center gap-2 text-sm font-medium text-emerald-800"
                  >
                    <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                    {t("linkedCustomer", { name: draft.customer.name })}
                  </p>
                ) : null}
              </div>
            ) : null}
            {customerMode === "manual" || draft.customerId ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {["name", "email", "phone"].map((name) => (
                  <OrderField
                    key={name}
                    label={t(`fields.${name}`)}
                    required={name === "name"}
                    error={errors[name] ? t(`errors.${errors[name]}`) : null}
                  >
                    {(aria) => (
                      <input
                        {...aria}
                        name={name}
                        className={inputClass}
                        type={
                          name === "email"
                            ? "email"
                            : name === "phone"
                              ? "tel"
                              : "text"
                        }
                        maxLength={
                          name === "phone" ? 40 : name === "name" ? 160 : 254
                        }
                        value={draft.customer[name]}
                        readOnly={Boolean(draft.customerId)}
                        onChange={(event) =>
                          changeContact(name, event.target.value)
                        }
                      />
                    )}
                  </OrderField>
                ))}
              </div>
            ) : null}
          </fieldset>
          <fieldset
            disabled={busy || stale}
            className={`${cardClass} space-y-5`}
          >
            <legend className="sr-only">{t("quotation")}</legend>
            <h2 className="text-lg font-semibold tracking-tight text-ink">
              {t("quotation")}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {field("quotedAmount", {
                type: "number",
                min: 0,
                max: 100000000,
                step:
                  getStripeMinorUnitDigits(draft.currency) === 0 ? "1" : "0.01",
              })}
              <OrderField label={t("fields.currency")}>
                {(aria) => (
                  <select
                    {...aria}
                    className={inputClass}
                    value={draft.currency}
                    onChange={(event) => change("currency", event.target.value)}
                  >
                    {STUDIO_COMMERCE_CURRENCIES.map((currency) => (
                      <option key={currency}>{currency}</option>
                    ))}
                  </select>
                )}
              </OrderField>
            </div>
            <p className="text-xs leading-5 text-ink-muted">
              {t("financialNotice")}
            </p>
          </fieldset>
        </div>
        <aside className={`${cardClass} space-y-5 xl:sticky xl:top-6`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-cobalt-600">
            {t("summary")}
          </p>
          <h2 className="break-words text-xl font-semibold text-ink">
            {draft.title || t("new")}
          </h2>
          <dl className="space-y-4 text-sm">
            {[
              ["locationId", currentLocation?.name],
              ["pieceCount", draft.pieceCount],
              ["deadline", formatOrderDate(draft.deadline, locale)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-4 border-b border-line pb-3"
              >
                <dt className="text-ink-muted">{t(`fields.${label}`)}</dt>
                <dd className="break-words text-right font-medium text-ink">
                  {value || "—"}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs leading-5 text-ink-muted">
            {t("attachmentsAfterSave")}
          </p>
          <button
            type="submit"
            disabled={busy || stale || !options.locations.length}
            className={`${primaryClass} w-full`}
          >
            {t(busy ? "saving" : initialItem ? "save" : "create")}
          </button>
          <Link
            href={
              initialItem
                ? `/app/custom-orders/${orderId(initialItem)}`
                : "/app/custom-orders"
            }
            className={`${secondaryClass} w-full`}
          >
            {t("cancel")}
          </Link>
        </aside>
      </form>
    </div>
  );
}
