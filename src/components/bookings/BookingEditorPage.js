"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Link } from "@/i18n/navigation";
import {
  useGetBookingEditorQuery,
  useLazyGetBookingEditorCustomerQuery,
  useSaveBookingEditorMutation,
} from "@/lib/features/bookings/bookingsApiSlice";
import {
  formatMoney,
  getBookingAmount,
  getBookingStatusConfig,
  getPaymentStatusConfig,
} from "@/components/tables/bookings/booking-table.utils";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { getLocationTimeZone } from "@/utils/locationBookingUtils";
import {
  buildBookingEditorPayload,
  createBookingEditorDraft,
  getBookingEditorError,
  getBookingEditorLockReason,
  isCustomerAlreadyAttending,
} from "./bookingEditor.utils";

const inputClass =
  "mt-2 min-h-11 w-full rounded-[13px] border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-sm font-semibold text-white transition hover:bg-cobalt-600 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-medium text-ink transition hover:border-cobalt-300 disabled:cursor-not-allowed disabled:opacity-50";

function Field({ label, children }) {
  return (
    <label className="block text-xs font-medium text-ink-muted">
      {label}
      {children}
    </label>
  );
}

export default function BookingEditorPage({ bookingId }) {
  const t = useTranslations("BookingEditor");
  const query = useGetBookingEditorQuery(bookingId, { skip: !bookingId });
  const [reloadNumber, setReloadNumber] = useState(0);
  const reload = async () => {
    const result = await query.refetch();
    if (result.data) setReloadNumber((value) => value + 1);
    return result;
  };

  if (query.isLoading) {
    return (
      <div
        role="status"
        className="rounded-[22px] border border-line bg-white p-10 text-ink-muted"
      >
        {t("loading")}
      </div>
    );
  }
  if (!query.data) {
    return (
      <section className="rounded-[22px] border border-line bg-white p-8">
        <p role="alert" className="mb-5 text-ink">
          {t("loadError")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/app/bookings" className={secondaryClass}>
            {t("back")}
          </Link>
          <button
            type="button"
            onClick={reload}
            disabled={query.isFetching}
            className={buttonClass}
          >
            {t("retry")}
          </button>
        </div>
      </section>
    );
  }
  return (
    <BookingEditorForm
      key={`${bookingId}:${reloadNumber}`}
      initialEditor={query.data}
      onReload={reload}
    />
  );
}

export function BookingEditorForm({ initialEditor, onReload }) {
  const t = useTranslations("BookingEditor");
  const bookingT = useTranslations("Bookings");
  const locale = useLocale();
  const [editor, setEditor] = useState(initialEditor);
  const [draft, setDraft] = useState(() =>
    createBookingEditorDraft(initialEditor),
  );
  const [saveBooking, saveState] = useSaveBookingEditorMutation();
  const [findCustomer, lookupState] = useLazyGetBookingEditorCustomerQuery();
  const lookupRequest = useRef(0);
  const participantSequence = useRef(0);
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const rosterErrorRef = useRef(null);
  const rosterErrorId = useId();
  const [mode, setMode] = useState("customer");
  const [identifier, setIdentifier] = useState("");
  const [customer, setCustomer] = useState(null);
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [rosterError, setRosterError] = useState("");
  const [invalidRosterField, setInvalidRosterField] = useState(null);
  const [success, setSuccess] = useState(false);
  const [stale, setStale] = useState(false);
  const [reloading, setReloading] = useState(false);
  const { booking, capabilities = {} } = editor;
  const canEdit = capabilities.canEdit === true && !stale;
  const busy = saveState.isLoading || reloading;
  const canChangeParticipants =
    canEdit && capabilities.canEditParticipants === true;
  const canAddParticipants =
    canChangeParticipants && capabilities.canAddParticipants !== false;
  const canReschedule = canEdit && capabilities.canReschedule === true;
  const timezone = getLocationTimeZone(editor.location);
  const product = booking.product || {};
  const isCourse = [
    "course",
    "class",
    "public-course",
    "private-course",
  ].includes(product.kind || booking.tag);
  const payment = getPaymentStatusConfig(booking.paymentStatus);
  const status = getBookingStatusConfig(booking.status);
  const recordedAmount = getBookingAmount(booking);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (success) successRef.current?.focus();
  }, [success]);
  useEffect(() => {
    if (rosterError) rosterErrorRef.current?.focus();
  }, [rosterError]);
  const participantName = (participant, index) =>
    participant.name || t("unnamed", { number: index + 1 });
  const change = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setSuccess(false);
  };

  const lookup = async () => {
    const request = ++lookupRequest.current;
    setCustomer(null);
    setRosterError("");
    setInvalidRosterField(null);
    if (!identifier.trim()) {
      setInvalidRosterField("identifier");
      setRosterError(t("errors.identifier"));
      return;
    }
    try {
      const result = await findCustomer({
        id: booking.id,
        identifier: identifier.trim(),
      }).unwrap();
      if (request !== lookupRequest.current) return;
      setCustomer(result.customer);
    } catch (requestError) {
      if (request === lookupRequest.current)
        setRosterError(getBookingEditorError(requestError, t, "customer"));
    }
  };

  const addCustomer = () => {
    if (!customer) return;
    if (isCustomerAlreadyAttending(draft.participants, customer)) {
      setRosterError(t("errors.duplicate"));
      return;
    }
    const { id, ...details } = customer;
    change("participants", [
      ...draft.participants,
      {
        ...details,
        customerId: id,
        draftKey: `customer-${++participantSequence.current}`,
      },
    ]);
    setCustomer(null);
    setIdentifier("");
    setRosterError("");
  };

  const addGuest = () => {
    if (!guest.name.trim()) {
      setInvalidRosterField("name");
      setRosterError(t("errors.name"));
      return;
    }
    if (
      guest.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim())
    ) {
      setInvalidRosterField("email");
      setRosterError(t("errors.email"));
      return;
    }
    change("participants", [
      ...draft.participants,
      {
        ...guest,
        name: guest.name.trim(),
        draftKey: `guest-${++participantSequence.current}`,
      },
    ]);
    setGuest({ name: "", email: "", phone: "" });
    setRosterError("");
    setInvalidRosterField(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canEdit || busy) return;
    setError("");
    setSuccess(false);
    const payload = buildBookingEditorPayload(editor, draft);
    if (!payload) {
      setError(t("errors.time"));
      return;
    }
    try {
      const result = await saveBooking({ id: booking.id, ...payload }).unwrap();
      setEditor(result);
      setDraft(createBookingEditorDraft(result));
      setSuccess(true);
    } catch (requestError) {
      setError(getBookingEditorError(requestError, t));
      setStale(requestError?.data?.code === "BOOKING_EDIT_STALE");
    }
  };

  const reload = async () => {
    setReloading(true);
    try {
      const result = await onReload();
      if (result.error) setError(getBookingEditorError(result.error, t));
    } catch (requestError) {
      setError(getBookingEditorError(requestError, t));
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-8">
      <Link
        href="/app/bookings"
        className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-cobalt-500"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        {t("back")}
      </Link>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">{t("subtitle")}</p>
        {product.name && (
          <p className="mt-3 font-medium text-ink">
            {typeof product.name === "string"
              ? product.name
              : product.name[locale] ||
                product.name.EN ||
                product.name.CZ ||
                ""}
          </p>
        )}
        <p className="mt-2 break-all text-xs text-ink-subtle">
          {bookingT("edit.bookingId")}: {booking.id}
        </p>
      </header>

      <form
        onSubmit={submit}
        noValidate
        className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]"
      >
        <div className="min-w-0 space-y-6">
          {error && (
            <div
              role="alert"
              ref={errorRef}
              tabIndex={-1}
              className="rounded-2xl border border-coral-200 bg-coral-50 p-4 text-sm text-terracotta-700"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              ref={successRef}
              tabIndex={-1}
              className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              {t("saved")}
            </div>
          )}
          {!capabilities.canEdit && (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm text-ink-muted">
              {t("readOnly")}
            </p>
          )}

          <section className="rounded-[22px] border border-line bg-white p-5 sm:p-7">
            <h2 className="text-lg font-semibold text-ink">{t("details")}</h2>
            <p className="mt-2 text-sm text-ink-muted">
              {t("location")}: {editor.location?.name || "—"}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label={t("start")}>
                <input
                  type="datetime-local"
                  value={draft.start}
                  onChange={(event) => change("start", event.target.value)}
                  disabled={!canReschedule || busy}
                  className={inputClass}
                />
              </Field>
              <Field label={t("end")}>
                <input
                  type="datetime-local"
                  value={draft.end}
                  onChange={(event) => change("end", event.target.value)}
                  disabled={!canReschedule || busy}
                  className={inputClass}
                />
              </Field>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {t("timezone", { timezone })}
            </p>
            {!capabilities.canReschedule && (
              <p className="mt-2 text-xs text-ink-muted">
                {getBookingEditorLockReason(
                  capabilities.scheduleReason,
                  t,
                  "scheduleLocked",
                )}
              </p>
            )}
            {capabilities.preserveDuration && capabilities.canReschedule && (
              <p className="mt-2 text-xs text-ink-muted">
                {t("preserveDuration")}
              </p>
            )}
            {isCourse &&
              capabilities.canReschedule &&
              capabilities.scheduleNotification !== "customer_email" && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                  {t("courseScheduleNotice")}
                </p>
              )}
            <div className="mt-5 space-y-4">
              <Field label={t("lecturer")}>
                <input
                  value={draft.lecturer}
                  onChange={(event) => change("lecturer", event.target.value)}
                  disabled={!canEdit || busy}
                  className={inputClass}
                />
              </Field>
              <Field label={t("note")}>
                <textarea
                  value={draft.note}
                  onChange={(event) => change("note", event.target.value)}
                  disabled={!canEdit || busy}
                  rows={4}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-[22px] border border-line bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  {t("attendance")}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {t("attendanceHint")}
                </p>
              </div>
              <span className="rounded-full bg-cobalt-50 px-4 py-2 text-sm font-semibold text-cobalt-700">
                {draft.participants.length}
              </span>
            </div>
            {!capabilities.canEditParticipants && (
              <p className="mt-3 text-xs text-ink-muted">
                {getBookingEditorLockReason(
                  capabilities.participantsReason,
                  t,
                  "participantsLocked",
                )}
              </p>
            )}
            <ul className="mt-5 space-y-3">
              {draft.participants.map((participant, index) => (
                <li
                  key={participant.draftKey}
                  className="flex items-start gap-3 rounded-2xl border border-line bg-canvas p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium text-ink">
                      {participantName(participant, index)}
                    </p>
                    {participant.unnamed && (
                      <p className="mt-1 text-xs text-ink-muted">
                        {t("unnamedHint")}
                      </p>
                    )}
                    {(participant.memberNumber || participant.customId) && (
                      <p className="mt-1 text-xs text-ink-muted">
                        {t("identifier")}:{" "}
                        {participant.memberNumber
                          ? `#${String(participant.memberNumber).padStart(4, "0")}`
                          : participant.customId}
                      </p>
                    )}
                    {(participant.email || participant.phone) && (
                      <p className="mt-1 break-words text-xs text-ink-muted">
                        {[participant.email, participant.phone]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  {canChangeParticipants && (
                    <button
                      type="button"
                      aria-label={t("remove", {
                        name: participantName(participant, index),
                      })}
                      disabled={busy}
                      onClick={() =>
                        change(
                          "participants",
                          draft.participants.filter(
                            (_, rowIndex) => rowIndex !== index,
                          ),
                        )
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-terracotta-600 hover:bg-coral-50 disabled:opacity-50"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {!draft.participants.length && (
              <p className="mt-5 rounded-2xl border border-dashed border-line p-6 text-sm text-ink-muted">
                {t("empty")}
              </p>
            )}

            {canChangeParticipants && !canAddParticipants && (
              <p className="mt-5 text-sm text-ink-muted">
                {getBookingEditorLockReason(
                  capabilities.addParticipantsReason,
                  t,
                  "participantsLocked",
                )}
              </p>
            )}
            {canAddParticipants && (
              <div className="mt-6 border-t border-line pt-5">
                <div className="flex flex-wrap gap-2">
                  {["customer", "guest"].map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={mode === value}
                      disabled={busy}
                      onClick={() => {
                        setMode(value);
                        setRosterError("");
                        setInvalidRosterField(null);
                      }}
                      className={mode === value ? buttonClass : secondaryClass}
                    >
                      {t(value === "customer" ? "registered" : "guest")}
                    </button>
                  ))}
                </div>
                {rosterError && (
                  <p
                    role="alert"
                    id={rosterErrorId}
                    ref={rosterErrorRef}
                    tabIndex={-1}
                    className="mt-4 text-sm text-terracotta-700"
                  >
                    {rosterError}
                  </p>
                )}
                {mode === "customer" ? (
                  <div className="mt-4 space-y-4">
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <Field label={t("identifier")}>
                          <input
                            value={identifier}
                            aria-invalid={invalidRosterField === "identifier"}
                            aria-describedby={
                              invalidRosterField === "identifier"
                                ? rosterErrorId
                                : undefined
                            }
                            onChange={(event) => {
                              lookupRequest.current += 1;
                              setIdentifier(event.target.value);
                              setCustomer(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                if (!busy && !lookupState.isFetching)
                                  void lookup();
                              }
                            }}
                            disabled={busy}
                            className={inputClass}
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={lookup}
                        disabled={busy || lookupState.isFetching}
                        className={secondaryClass}
                      >
                        {t(
                          lookupState.isFetching ? "searching" : "findCustomer",
                        )}
                      </button>
                    </div>
                    {customer && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cobalt-200 bg-cobalt-50 p-4">
                        <div>
                          <p className="font-medium text-ink">
                            {customer.name}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {customer.email || customer.customId}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={addCustomer}
                          className={buttonClass}
                        >
                          <PlusIcon className="h-4 w-4" />
                          {t("addCustomer")}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <Field label={`${t("name")} *`}>
                      <input
                        value={guest.name}
                        aria-required="true"
                        aria-invalid={invalidRosterField === "name"}
                        aria-describedby={
                          invalidRosterField === "name"
                            ? rosterErrorId
                            : undefined
                        }
                        onChange={(event) =>
                          setGuest((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        disabled={busy}
                        className={inputClass}
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t("email")}>
                        <input
                          type="email"
                          value={guest.email}
                          aria-invalid={invalidRosterField === "email"}
                          aria-describedby={
                            invalidRosterField === "email"
                              ? rosterErrorId
                              : undefined
                          }
                          onChange={(event) =>
                            setGuest((current) => ({
                              ...current,
                              email: event.target.value,
                            }))
                          }
                          disabled={busy}
                          className={inputClass}
                        />
                      </Field>
                      <Field label={t("phone")}>
                        <input
                          type="tel"
                          value={guest.phone}
                          onChange={(event) =>
                            setGuest((current) => ({
                              ...current,
                              phone: event.target.value,
                            }))
                          }
                          disabled={busy}
                          className={inputClass}
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={addGuest}
                      disabled={busy}
                      className={secondaryClass}
                    >
                      <PlusIcon className="h-4 w-4" />
                      {t("addGuest")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <section className="rounded-[22px] border border-line bg-white p-6">
            <Field label={t("count")}>
              <input
                readOnly
                value={draft.participants.length}
                className={`${inputClass} text-2xl font-semibold`}
              />
            </Field>
            <p className="mt-2 text-xs text-ink-muted">{t("countHint")}</p>
            <dl className="mt-5 space-y-4 border-t border-line pt-5 text-sm">
              <div>
                <dt className="text-ink-muted">{bookingT("columns.status")}</dt>
                <dd className="mt-1 font-medium text-ink">
                  {status.labelKey
                    ? bookingT(status.labelKey)
                    : status.label || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">
                  {bookingT("filters.paymentStatus")}
                </dt>
                <dd className="mt-1 font-medium text-ink">
                  {payment.labelKey
                    ? bookingT(payment.labelKey)
                    : bookingT("edit.unknownPayment")}
                </dd>
              </div>
              {recordedAmount !== null && (
                <div>
                  <dt className="text-ink-muted">{bookingT("edit.total")}</dt>
                  <dd className="mt-1 font-medium text-ink">
                    {formatMoney(
                      recordedAmount,
                      locale,
                      booking.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
                    )}
                  </dd>
                </div>
              )}
            </dl>
            <p className="mt-5 rounded-xl bg-canvas p-3 text-xs leading-5 text-ink-muted">
              {t("financialNotice")}
            </p>
            <button
              type="submit"
              disabled={!canEdit || busy}
              className={`${buttonClass} mt-5 w-full`}
            >
              {t(saveState.isLoading ? "saving" : "save")}
            </button>
            {stale && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-ink-muted">{t("reloadHint")}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={reload}
                  className={`${secondaryClass} w-full`}
                >
                  {t("reload")}
                </button>
              </div>
            )}
          </section>
        </aside>
      </form>
    </div>
  );
}
