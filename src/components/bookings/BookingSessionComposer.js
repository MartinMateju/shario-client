"use client";

import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { Link, useRouter } from "@/i18n/navigation";
import { useAddNewBookingMutation } from "@/lib/features/bookings/bookingsApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import { useGetProductsQuery } from "@/lib/features/products/productsApiSlice";
import { isProductAvailableAtLocation } from "@/lib/features/products/products.contract.mjs";
import { selectActiveStudioId } from "@/lib/features/studio/studioContextSlice";
import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import {
  buildDurationOptions,
  buildStartTimeOptions,
  formatDuration,
  formatWallDate,
  formatWallTime,
  getLocationTimeZone,
} from "@/utils/locationBookingUtils";

import {
  addMinutesToTime,
  buildBookingSessionPayload,
  filterSchedulableProducts,
  getBookingSessionPayloadError,
  getBookingSessionPrefillIssue,
  getBookingSessionReturnPath,
  getEntityId,
  getLocationsFromResponse,
  getPrefillDurationMinutes,
  getProductName,
  getSchedulableProductType,
  isCourseSessionProduct,
  normalizeSessionDates,
  parseBookingSessionPrefill,
} from "./bookingSessionComposer.utils";

const controlClass =
  "mt-2 min-h-11 w-full rounded-[13px] border border-line bg-white px-3.5 text-[12px] text-ink outline-none transition hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle";

const getErrorMessage = (error, fallback) =>
  String(
    error?.data?.message ||
      error?.data?.error ||
      error?.error ||
      error?.message ||
      fallback,
  );

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1.5 block text-[11px] leading-4 text-ink-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function LoadingState({ label }) {
  return (
    <div
      className="flex min-h-[360px] items-center justify-center rounded-[22px] border border-line bg-white"
      role="status"
    >
      <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-cobalt-200 border-t-cobalt-500" />
      <span className="text-[11px] text-ink-muted">{label}</span>
    </div>
  );
}

function EmptyState({ title, description, href, action }) {
  return (
    <div className="rounded-[22px] border border-dashed border-line-strong bg-white px-6 py-12 text-center">
      <CalendarDaysIcon className="mx-auto h-8 w-8 text-coral-500" />
      <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.035em] text-ink">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[11px] leading-5 text-ink-muted">
        {description}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-10 items-center justify-center rounded-full bg-cobalt-500 px-5 text-[10px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600"
      >
        {action}
      </Link>
    </div>
  );
}

export default function BookingSessionComposer() {
  const locale = useLocale();
  const t = useTranslations("BookingComposer");
  const setupT = useTranslations("SetupCenter");
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStudioId = useSelector(selectActiveStudioId);
  const prefill = useMemo(
    () => parseBookingSessionPrefill(searchParams),
    [searchParams],
  );
  const guidedSetup = useGuidedSetupStep("bookable_offer");

  const locationsQuery = useGetLocationsQuery({
    isActive: true,
    bookingEnabled: true,
    limit: 100,
  });
  const [createSessions, createState] = useAddNewBookingMutation();

  const locations = useMemo(
    () => getLocationsFromResponse(locationsQuery.data),
    [locationsQuery.data],
  );

  const [productChoice, setProductChoice] = useState(prefill.productId);
  const [locationChoice, setLocationChoice] = useState(prefill.locationId);
  const [dateChoice, setDateChoice] = useState("");
  const [startChoice, setStartChoice] = useState("");
  const [durationChoice, setDurationChoice] = useState(0);
  const [dateEdited, setDateEdited] = useState(false);
  const [startEdited, setStartEdited] = useState(false);
  const [durationEdited, setDurationEdited] = useState(false);
  const [additionalDate, setAdditionalDate] = useState("");
  const [additionalDates, setAdditionalDates] = useState([]);
  const [language, setLanguage] = useState(locale === "cs" ? "cs" : "en");
  const [lecturer, setLecturer] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [isRoot, setIsRoot] = useState(prefill.isRoot);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [composerOpenedAt] = useState(() => Date.now());

  const activeLocationCandidate = String(activeStudioId || "");
  const locationRequested = Boolean(prefill.locationId);
  const locationChoiceAvailable = locations.some(
    (location) => getEntityId(location) === locationChoice,
  );
  const selectedLocationId = locationChoiceAvailable
    ? locationChoice
    : locationRequested
      ? ""
      : locations.some(
            (location) => getEntityId(location) === activeLocationCandidate,
          )
        ? activeLocationCandidate
        : getEntityId(locations[0]);
  const selectedLocation =
    locations.find(
      (location) => getEntityId(location) === selectedLocationId,
    ) || null;
  const timezone = getLocationTimeZone(selectedLocation);
  const productsQuery = useGetProductsQuery(
    { isActive: true, limit: 100, locationId: selectedLocationId },
    { skip: !selectedLocationId },
  );
  const products = useMemo(
    () =>
      filterSchedulableProducts(productsQuery.data).filter((product) =>
        isProductAvailableAtLocation(product, selectedLocationId),
      ),
    [productsQuery.data, selectedLocationId],
  );
  const productRequested = Boolean(prefill.productId);
  const productChoiceAvailable = products.some(
    (product) => getEntityId(product) === productChoice,
  );
  const selectedProductId = productChoiceAvailable
    ? productChoice
    : productRequested || productChoice
      ? ""
      : getEntityId(products[0]);
  const selectedProduct =
    products.find((product) => getEntityId(product) === selectedProductId) ||
    null;

  const scheduleRequested = Boolean(prefill.start || prefill.end);
  const prefillStart = useMemo(() => new Date(prefill.start), [prefill.start]);
  const hasValidPrefillStart = !Number.isNaN(prefillStart.getTime());
  const today = formatWallDate(new Date(composerOpenedAt), timezone);
  const prefillDate = hasValidPrefillStart
    ? formatWallDate(prefillStart, timezone)
    : "";
  const prefillDateAvailable = Boolean(
    prefillDate &&
    prefillDate >= today &&
    hasValidPrefillStart &&
    prefillStart.getTime() > composerOpenedAt,
  );
  const primaryDate =
    dateChoice ||
    (scheduleRequested && !dateEdited
      ? prefillDateAvailable
        ? prefillDate
        : ""
      : today);
  const startOptions = buildStartTimeOptions(selectedLocation, primaryDate);
  const prefillStartTime = hasValidPrefillStart
    ? formatWallTime(prefillStart, timezone)
    : "";
  const prefillStartAvailable =
    prefillDateAvailable && startOptions.includes(prefillStartTime);
  const startTime = startOptions.includes(startChoice)
    ? startChoice
    : scheduleRequested && !startEdited
      ? prefillStartAvailable
        ? prefillStartTime
        : ""
      : startOptions[0] || "";
  const durationOptions = buildDurationOptions(
    selectedLocation,
    primaryDate,
    startTime,
  );
  const prefillDuration = getPrefillDurationMinutes(prefill.start, prefill.end);
  const prefillDurationAvailable =
    prefillStartAvailable && durationOptions.includes(prefillDuration);
  const durationMinutes = durationOptions.includes(durationChoice)
    ? durationChoice
    : scheduleRequested && !durationEdited
      ? prefillDurationAvailable
        ? prefillDuration
        : 0
      : durationOptions[0] || 0;
  const endTime = addMinutesToTime(startTime, durationMinutes);
  const dates = normalizeSessionDates([primaryDate, ...additionalDates]);
  const isCourse = isCourseSessionProduct(selectedProduct);
  const returnPath = getBookingSessionReturnPath(prefill);
  const prefillIssue = getBookingSessionPrefillIssue({
    productRequested,
    productAvailable: productChoiceAvailable,
    locationRequested,
    locationAvailable: locationChoiceAvailable,
    scheduleRequested,
    scheduleAvailable:
      (dateEdited || prefillDateAvailable) &&
      (startEdited || prefillStartAvailable),
    durationAvailable: durationEdited || prefillDurationAvailable,
  });

  const addDate = () => {
    if (!additionalDate || additionalDate === primaryDate) return;
    setAdditionalDates((current) =>
      normalizeSessionDates([...current, additionalDate]),
    );
    setAdditionalDate("");
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const payload = buildBookingSessionPayload({
      dates,
      startTime,
      durationMinutes,
      productId: selectedProductId,
      locationId: selectedLocationId,
      productKind: getSchedulableProductType(selectedProduct),
      lecturer: isCourse ? lecturer : "",
      language: isCourse ? language : locale,
      description,
      note,
      isRoot: isCourse && isRoot,
    });
    const validationError = getBookingSessionPayloadError(payload);
    if (validationError) {
      setError(t(`errors.${validationError}`));
      return;
    }

    try {
      const result = await createSessions(payload).unwrap();
      if (guidedSetup.guided) {
        await guidedSetup.refreshAndContinue({
          metadata: { form: "booking_session" },
        });
        return;
      }
      setSuccess({
        count: Array.isArray(result?.ids) ? result.ids.length : dates.length,
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError, t("errors.request")));
    }
  };

  if (productsQuery.isLoading || locationsQuery.isLoading) {
    return <LoadingState label={t("loading")} />;
  }

  if (productsQuery.isError || locationsQuery.isError) {
    return (
      <EmptyState
        title={t("loadError.title")}
        description={t("loadError.description")}
        href="/app/bookings"
        action={t("actions.backToBookings")}
      />
    );
  }

  if (!products.length) {
    return (
      <EmptyState
        title={t("emptyProducts.title")}
        description={t("emptyProducts.description")}
        href="/app/products/new?category=openStudio"
        action={t("actions.createProduct")}
      />
    );
  }

  if (!locations.length) {
    return (
      <EmptyState
        title={t("emptyLocations.title")}
        description={t("emptyLocations.description")}
        href="/app/settings/locations/new"
        action={t("actions.createLocation")}
      />
    );
  }

  if (success) {
    return (
      <section className="mx-auto max-w-3xl rounded-[24px] border border-[#CFE0C8] bg-white px-6 py-12 text-center shadow-card sm:px-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircleIcon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-[30px] font-semibold tracking-[-0.05em] text-ink">
          {t("success.title")}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-[12px] leading-6 text-ink-muted">
          {t("success.description", { count: success.count })}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {returnPath !== "/app/bookings" ? (
            <button
              type="button"
              onClick={() => router.replace(returnPath)}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-cobalt-500 px-5 text-[10px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600"
            >
              {t("actions.continue")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.replace("/app/bookings")}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-[10px] font-semibold text-ink transition hover:border-line-strong"
          >
            {t("actions.viewBookings")}
          </button>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-surface px-5 text-[10px] font-semibold text-ink transition hover:bg-white"
          >
            {t("actions.createAnother")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <Link
        href={returnPath}
        className="inline-flex items-center gap-2 text-[10px] font-semibold text-ink-muted transition hover:text-ink"
      >
        <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
        {returnPath === "/app/bookings"
          ? t("actions.backToBookings")
          : t("actions.back")}
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-cobalt-600">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.055em] text-ink sm:text-[36px]">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-ink-muted">
            {t("description")}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cobalt-100 bg-cobalt-50 px-3 py-2 text-[10px] font-semibold text-cobalt-700">
          <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {t("timezone", { timezone })}
        </span>
      </div>

      {prefill.setupStep ? (
        <div className="mt-5 flex gap-3 rounded-[16px] border border-cobalt-200 bg-cobalt-50/60 px-4 py-3 text-cobalt-900">
          <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-[10px] leading-5">{t("guided")}</p>
        </div>
      ) : null}

      {prefillIssue ? (
        <div
          className="mt-5 rounded-[16px] border border-coral-200 bg-coral-50 px-4 py-3 text-[11px] leading-5 text-terracotta-800"
          role="alert"
        >
          {t(`errors.${prefillIssue}`)}
        </div>
      ) : null}

      <form
        onSubmit={submit}
        data-guided-form={guidedSetup.guided ? "bookable_offer" : undefined}
        className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="space-y-5">
          <section className="rounded-[22px] border border-line bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-start gap-3 border-b border-line pb-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-coral-100 text-terracotta-700">
                <CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-ink">
                  {t("sections.offer")}
                </h2>
                <p className="mt-1 text-[10px] leading-5 text-ink-muted">
                  {t("sections.offerHint")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.product")}>
                <select
                  value={selectedProductId}
                  onChange={(event) => {
                    setProductChoice(event.target.value);
                    setError("");
                  }}
                  className={controlClass}
                  required
                >
                  {!selectedProductId ? (
                    <option value="">{t("fields.chooseProduct")}</option>
                  ) : null}
                  {products.map((product) => (
                    <option
                      key={getEntityId(product)}
                      value={getEntityId(product)}
                    >
                      {getProductName(product, locale)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("fields.location")}>
                <select
                  value={selectedLocationId}
                  onChange={(event) => {
                    setLocationChoice(event.target.value);
                    setProductChoice("");
                    setStartChoice("");
                    setDurationChoice(0);
                    setAdditionalDates([]);
                    setError("");
                  }}
                  className={controlClass}
                  required
                >
                  {!selectedLocationId ? (
                    <option value="">{t("fields.chooseLocation")}</option>
                  ) : null}
                  {locations.map((location) => (
                    <option
                      key={getEntityId(location)}
                      value={getEntityId(location)}
                    >
                      {location.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-[22px] border border-line bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-start gap-3 border-b border-line pb-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-cobalt-50 text-cobalt-600">
                <ClockIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-ink">
                  {t("sections.schedule")}
                </h2>
                <p className="mt-1 text-[10px] leading-5 text-ink-muted">
                  {t("sections.scheduleHint")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.date")}>
                <input
                  type="date"
                  value={primaryDate}
                  min={today}
                  onChange={(event) => {
                    setDateChoice(event.target.value);
                    setDateEdited(true);
                    setStartEdited(true);
                    setDurationEdited(true);
                    setStartChoice("");
                    setDurationChoice(0);
                    setError("");
                  }}
                  className={controlClass}
                  required
                />
              </Field>

              <Field
                label={t("fields.start")}
                hint={!startOptions.length ? t("errors.closed") : ""}
              >
                <select
                  value={startTime}
                  onChange={(event) => {
                    setStartChoice(event.target.value);
                    setStartEdited(true);
                    setDurationEdited(true);
                    setDurationChoice(0);
                    setError("");
                  }}
                  className={controlClass}
                  disabled={!startOptions.length}
                  required
                >
                  {!startOptions.length ? (
                    <option value="">{t("errors.closed")}</option>
                  ) : null}
                  {startOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <fieldset className="mt-5">
              <legend className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
                {t("fields.duration")}
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {durationOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setDurationChoice(value);
                      setDurationEdited(true);
                      setError("");
                    }}
                    aria-pressed={durationMinutes === value}
                    className={`min-h-10 rounded-[12px] border px-3 text-[10px] font-semibold transition ${
                      durationMinutes === value
                        ? "border-cobalt-500 bg-cobalt-500 text-white shadow-cobalt"
                        : "border-line bg-white text-ink-muted hover:border-line-strong hover:text-ink"
                    }`}
                  >
                    {formatDuration(value, locale === "cs" ? "CZ" : "EN")}
                  </button>
                ))}
              </div>
            </fieldset>

            {!guidedSetup.guided ? (
              <div className="mt-5 rounded-[14px] border border-line bg-surface/55 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
                  {t("fields.repeat")}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="date"
                    value={additionalDate}
                    min={today}
                    onChange={(event) => setAdditionalDate(event.target.value)}
                    aria-label={t("fields.additionalDate")}
                    className="min-h-10 flex-1 rounded-[12px] border border-line bg-white px-3 text-[11px] outline-none focus:border-cobalt-500"
                  />
                  <button
                    type="button"
                    onClick={addDate}
                    disabled={!additionalDate || additionalDate === primaryDate}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-line bg-white px-4 text-[10px] font-semibold text-ink transition hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    {t("actions.addDate")}
                  </button>
                </div>
                {additionalDates.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {additionalDates.map((date) => (
                      <li
                        key={date}
                        className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-3 pr-1.5 text-[10px] text-ink"
                      >
                        {date}
                        <button
                          type="button"
                          onClick={() =>
                            setAdditionalDates((current) =>
                              current.filter((item) => item !== date),
                            )
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full text-ink-subtle transition hover:bg-coral-100 hover:text-terracotta-700"
                          aria-label={t("actions.removeDate", { date })}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </section>

          {!guidedSetup.guided ? (
            <section className="rounded-[22px] border border-line bg-white p-5 shadow-card sm:p-6">
              <h2 className="text-[17px] font-semibold tracking-[-0.035em] text-ink">
                {t("sections.details")}
              </h2>
              <p className="mt-1 text-[10px] leading-5 text-ink-muted">
                {t("sections.detailsHint")}
              </p>

              {isCourse ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label={t("fields.language")}>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className={controlClass}
                    >
                      <option value="cs">{t("languages.cs")}</option>
                      <option value="en">{t("languages.en")}</option>
                    </select>
                  </Field>
                  <Field label={t("fields.lecturer")}>
                    <input
                      type="text"
                      value={lecturer}
                      onChange={(event) => setLecturer(event.target.value)}
                      maxLength={160}
                      className={controlClass}
                      placeholder={t("fields.lecturerPlaceholder")}
                    />
                  </Field>
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label={t("fields.description")}>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    className={`${controlClass} py-3`}
                  />
                </Field>
                <Field label={t("fields.note")}>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    className={`${controlClass} py-3`}
                  />
                </Field>
              </div>

              {isCourse ? (
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[14px] border border-line bg-surface/45 p-4">
                  <input
                    type="checkbox"
                    checked={isRoot}
                    onChange={(event) => setIsRoot(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-[11px] font-semibold text-ink">
                      {t("fields.root")}
                    </span>
                    <span className="mt-1 block text-[11px] leading-4 text-ink-muted">
                      {t("fields.rootHint")}
                    </span>
                  </span>
                </label>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="h-fit rounded-[22px] border border-line bg-[#FFFDF9] p-5 shadow-card xl:sticky xl:top-[108px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-cobalt-600">
            {t("summary.eyebrow")}
          </p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-ink">
            {t("summary.title")}
          </h2>

          <dl className="mt-5 divide-y divide-line">
            {[
              [
                t("summary.type"),
                t(`types.${getSchedulableProductType(selectedProduct)}`),
              ],
              [t("summary.product"), getProductName(selectedProduct, locale)],
              [t("summary.location"), selectedLocation?.name || "—"],
              [t("summary.sessions"), String(dates.length)],
              [
                t("summary.time"),
                startTime && endTime ? `${startTime}–${endTime}` : "—",
              ],
              [t("summary.timezone"), timezone],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 py-3"
              >
                <dt className="text-[10px] text-ink-muted">{label}</dt>
                <dd className="max-w-[180px] text-right text-[10px] font-semibold text-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-cobalt-100 bg-cobalt-50/55 p-3 text-cobalt-900">
            <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-[11px] leading-4">{t("summary.serverNote")}</p>
          </div>

          {error ? (
            <div
              className="mt-4 rounded-[12px] border border-coral-200 bg-coral-50 px-3 py-2.5 text-[10px] leading-5 text-terracotta-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={
              createState.isLoading ||
              Boolean(prefillIssue) ||
              !selectedProduct ||
              !selectedLocation ||
              !startTime ||
              !durationMinutes
            }
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-cobalt-500 px-5 text-[11px] font-semibold text-white shadow-cobalt transition hover:-translate-y-0.5 hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:bg-ink-subtle disabled:shadow-none"
          >
            {createState.isLoading
              ? t("actions.creating")
              : guidedSetup.guided
                ? setupT("guided.saveAndContinue")
                : t("actions.create")}
          </button>
          <Link
            href={returnPath}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-full text-[10px] font-semibold text-ink-muted transition hover:bg-surface hover:text-ink"
          >
            {t("actions.cancel")}
          </Link>
        </aside>
      </form>
    </div>
  );
}
