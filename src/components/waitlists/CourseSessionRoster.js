"use client";

import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ArrowUpIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  QueueListIcon,
  TrashIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

import {
  WAITLIST_STATES,
  useCancelCourseOrderParticipantsMutation,
  useGetAdminWaitlistRosterQuery,
  usePromoteAdminWaitlistEntryMutation,
  useRemoveAdminWaitlistEntryMutation,
  useResendAdminWaitlistOfferMutation,
} from "@/lib/features/waitlists/waitlistsApiSlice";

import AdminWaitlistSettings from "./AdminWaitlistSettings";
import WaitlistStatusBadge from "./WaitlistStatusBadge";
import { isActiveBookingParticipant } from "@/utils/bookingAttendance";

const formatDateTime = (value, locale) => {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "cs" ? "cs-CZ" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getBookedIdentity = (entry) => ({
  name: entry?.customer?.name || entry?.customerName || entry?.name || "—",
  email: entry?.customer?.email || entry?.email || "",
});

export default function CourseSessionRoster({
  sessionId,
  bookedEntries = [],
  canView = false,
  canPromote = false,
  canCancel = false,
  canRefundParticipants = false,
  canConfigure = false,
  modules = {},
}) {
  const t = useTranslations("Waitlists.admin");
  const sharedT = useTranslations("Waitlists");
  const locale = useLocale();
  const enabled = canView && modules?.courses !== false;
  const commerceEnabled = modules?.payments !== false;
  const canOffer = canPromote && commerceEnabled;
  const [tab, setTab] = useState("booked");
  const tabsetId = useId();
  const tabRefs = useRef({});
  const query = useGetAdminWaitlistRosterQuery(
    { sessionId },
    { skip: !sessionId || !enabled },
  );
  const [promote, promoteState] = usePromoteAdminWaitlistEntryMutation();
  const [resend, resendState] = useResendAdminWaitlistOfferMutation();
  const [remove, removeState] = useRemoveAdminWaitlistEntryMutation();
  const [cancelParticipants, cancelParticipantsState] =
    useCancelCourseOrderParticipantsMutation();
  const [action, setAction] = useState(null);
  const [error, setError] = useState("");
  const [participantAction, setParticipantAction] = useState(null);
  const [participantError, setParticipantError] = useState("");
  const [participantStatus, setParticipantStatus] = useState("");
  const [removedOrderIds, setRemovedOrderIds] = useState(() => new Set());
  const roster = query.data ?? {
    entries: [],
    summary: {
      booked: bookedEntries.filter(isActiveBookingParticipant).length,
      capacity: 0,
      waiting: 0,
      offered: 0,
    },
  };
  const liveEntries = roster.entries.filter((entry) =>
    [
      WAITLIST_STATES.WAITING,
      WAITLIST_STATES.OFFERED,
      WAITLIST_STATES.PAYMENT_PENDING,
    ].includes(entry.state),
  );
  const firstWaitingId = liveEntries.find(
    (entry) => entry.state === WAITLIST_STATES.WAITING,
  )?.id;
  const actionBusy =
    promoteState.isLoading || resendState.isLoading || removeState.isLoading;
  const visibleBookedEntries = bookedEntries
    .filter((entry) => !entry?.orderId || !removedOrderIds.has(entry.orderId))
    .sort(
      (a, b) =>
        Number(!isActiveBookingParticipant(a)) -
        Number(!isActiveBookingParticipant(b)),
    );

  if (!enabled) return null;

  const submitAction = async (event) => {
    event.preventDefault();
    if (!action?.reason.trim()) return;
    setError("");
    try {
      const base = {
        sessionId,
        entryId: action.entry.id,
        reason: action.reason.trim(),
      };
      if (action.type === "promote") {
        await promote({ ...base, overrideFifo: action.overrideFifo }).unwrap();
      } else if (action.type === "resend") {
        await resend(base).unwrap();
      } else {
        await remove(base).unwrap();
      }
      setAction(null);
    } catch (requestError) {
      const code = String(requestError?.data?.code || "").toUpperCase();
      setError(
        code === "WAITLIST_FIFO_CONFLICT"
          ? t("errors.fifo")
          : requestError?.data?.message || t("errors.generic"),
      );
    }
  };

  const openAction = (entry, type) => {
    setError("");
    setAction({
      entry,
      type,
      reason: "",
      overrideFifo: false,
    });
  };

  const openParticipantAction = (entry, index) => {
    setParticipantError("");
    setParticipantStatus("");
    setParticipantAction({
      entry,
      key: `${entry.orderId}:${index}`,
      reason: "",
      confirmed: false,
    });
  };

  const submitParticipantCancellation = async (event) => {
    event.preventDefault();
    const reason = participantAction?.reason.trim() || "";
    if (!participantAction?.confirmed || !reason) return;

    setParticipantError("");
    setParticipantStatus("");
    try {
      const result = await cancelParticipants({
        sessionId,
        orderId: participantAction.entry.orderId,
        reason,
      }).unwrap();
      const removedOrderId = participantAction.entry.orderId;
      setRemovedOrderIds((current) => {
        const next = new Set(current);
        next.add(removedOrderId);
        return next;
      });
      setParticipantStatus(
        result?.idempotent
          ? t("bookedActions.alreadyProcessed")
          : t("bookedActions.refunded"),
      );
      setParticipantAction(null);
      query.refetch?.();
    } catch (requestError) {
      const code = String(requestError?.data?.code || "").toUpperCase();
      setParticipantError(
        [
          "COURSE_PARTICIPANT_MEMBERSHIP_REFUND_REVIEW",
          "COURSE_PARTICIPANT_REFUND_SNAPSHOT_MISSING",
          "COURSE_PARTICIPANT_REFUND_SNAPSHOT_INVALID",
        ].includes(code)
          ? t("bookedActions.errors.manualReview")
          : requestError?.data?.message || t("bookedActions.errors.generic"),
      );
    }
  };

  const tabs = [
    [
      "booked",
      t("tabs.booked"),
      visibleBookedEntries.filter(isActiveBookingParticipant).length,
    ],
    ["waitlist", t("tabs.waitlist"), liveEntries.length],
  ];
  const handleTabKeyDown = (event, value) => {
    const currentIndex = tabs.findIndex(([candidate]) => candidate === value);
    let nextIndex = currentIndex;

    if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (["ArrowRight", "ArrowDown"].includes(event.key)) {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex][0];
    setTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <section
      className="rounded-[26px] border border-[#E5E1DA] bg-white shadow-[0_18px_54px_rgba(17,17,15,0.06)]"
      data-course-session-roster
    >
      <div className="flex flex-col gap-4 border-b border-[#ECE8E1] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-text">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            {t("title")}
          </h2>
        </div>
        <div
          className="grid grid-cols-2 gap-2"
          role="tablist"
          aria-label={t("tabs.label")}
        >
          {tabs.map(([value, label, count]) => (
            <button
              key={value}
              id={`${tabsetId}-${value}-tab`}
              ref={(node) => {
                tabRefs.current[value] = node;
              }}
              type="button"
              role="tab"
              tabIndex={tab === value ? 0 : -1}
              aria-selected={tab === value}
              aria-controls={`${tabsetId}-${value}-panel`}
              onClick={() => setTab(value)}
              onKeyDown={(event) => handleTabKeyDown(event, value)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 ${
                tab === value
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-[#D8D3CA] bg-white text-[#55524E]"
              }`}
            >
              {label}
              <span className="rounded-full bg-current/10 px-2 py-0.5 tabular-nums">
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {tab === "booked" ? (
          <div
            id={`${tabsetId}-booked-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsetId}-booked-tab`}
          >
            {visibleBookedEntries.length ? (
              <ul className="space-y-2">
                {visibleBookedEntries.map((entry, index) => {
                  const identity = getBookedIdentity(entry);
                  const actionKey = `${entry.orderId}:${index}`;
                  const actionId = `${tabsetId}-participant-action-${index}`;
                  return (
                    <li
                      key={`${entry.id || entry._id || "participant"}-${entry.orderId || "no-order"}-${index}`}
                      className="rounded-[16px] border border-[#E8E4DD] bg-[#FAF9F6] px-4 py-3"
                    >
                      <div className="flex min-h-11 items-center gap-3">
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${isActiveBookingParticipant(entry) ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}
                        >
                          <UserGroupIcon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold">
                            {identity.name}
                          </span>
                          {identity.email ? (
                            <span className="mt-0.5 block truncate text-[10px] text-[#777771]">
                              {identity.email}
                            </span>
                          ) : null}
                          {!isActiveBookingParticipant(entry) ? (
                            <span className="mt-1 inline-flex rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">
                              {t("bookedActions.removedAttendance")}
                            </span>
                          ) : null}
                        </span>
                        {canRefundParticipants && entry.orderId ? (
                          <button
                            type="button"
                            aria-expanded={participantAction?.key === actionKey}
                            aria-controls={actionId}
                            onClick={() => openParticipantAction(entry, index)}
                            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 text-[10px] font-semibold text-rose-800 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                          >
                            <ArrowUturnLeftIcon
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            {t("bookedActions.removeAndRefund")}
                          </button>
                        ) : null}
                      </div>

                      {participantAction?.key === actionKey ? (
                        <form
                          id={actionId}
                          aria-label={t("bookedActions.confirmationLabel")}
                          onSubmit={submitParticipantCancellation}
                          className="mt-3 rounded-[15px] border border-rose-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex gap-3 rounded-[12px] bg-rose-50 p-3 text-[11px] leading-5 text-rose-900">
                            <ExclamationTriangleIcon
                              className="mt-0.5 h-5 w-5 shrink-0"
                              aria-hidden="true"
                            />
                            <p>{t("bookedActions.warning")}</p>
                          </div>
                          <label className="mt-4 block text-[10px] font-semibold text-[#2D2C29]">
                            {t("bookedActions.reason")}
                            <textarea
                              value={participantAction.reason}
                              onChange={(event) =>
                                setParticipantAction((current) => ({
                                  ...current,
                                  reason: event.target.value,
                                }))
                              }
                              required
                              maxLength={500}
                              rows={3}
                              className="mt-1.5 w-full resize-none rounded-[12px] border border-[#D8D3CA] px-3 py-2 text-xs focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                            />
                          </label>
                          <label className="mt-3 flex items-start gap-2 text-[10px] leading-4 text-[#4F4D48]">
                            <input
                              type="checkbox"
                              checked={participantAction.confirmed}
                              onChange={(event) =>
                                setParticipantAction((current) => ({
                                  ...current,
                                  confirmed: event.target.checked,
                                }))
                              }
                              required
                              className="mt-0.5"
                            />
                            {t("bookedActions.confirmRefund")}
                          </label>
                          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={() => setParticipantAction(null)}
                              className="min-h-11 rounded-full border border-[#D8D3CA] px-4 text-[10px] font-semibold"
                            >
                              {t("bookedActions.cancel")}
                            </button>
                            <button
                              type="submit"
                              disabled={
                                cancelParticipantsState.isLoading ||
                                !participantAction.reason.trim() ||
                                !participantAction.confirmed
                              }
                              className="min-h-11 rounded-full bg-rose-700 px-4 text-[10px] font-semibold text-white transition-colors hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {cancelParticipantsState.isLoading
                                ? t("bookedActions.refunding")
                                : t("bookedActions.confirm")}
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-[17px] border border-dashed border-[#D8D3CA] px-5 py-10 text-center text-sm text-[#686762]">
                {t("emptyBooked")}
              </p>
            )}
            {participantError ? (
              <p
                className="mt-3 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
                role="alert"
              >
                {participantError}
              </p>
            ) : null}
            {participantStatus ? (
              <p
                className="mt-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"
                role="status"
              >
                {participantStatus}
              </p>
            ) : null}
          </div>
        ) : (
          <div
            id={`${tabsetId}-waitlist-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsetId}-waitlist-tab`}
          >
            {query.isLoading ? (
              <div
                className="flex min-h-40 items-center justify-center text-xs text-[#686762]"
                role="status"
              >
                <ArrowPathIcon
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                {t("loading")}
              </div>
            ) : query.isError ? (
              <div
                className="rounded-[16px] border border-red-200 bg-red-50 p-4 text-xs text-red-700"
                role="alert"
              >
                {t("loadError")}
                <button
                  type="button"
                  onClick={query.refetch}
                  className="ml-2 font-semibold underline"
                >
                  {t("retry")}
                </button>
              </div>
            ) : liveEntries.length ? (
              <ol className="space-y-2" aria-label={t("orderedList")}>
                {liveEntries.map((entry, index) => {
                  const isFirstWaiting = entry.id === firstWaitingId;
                  return (
                    <li
                      key={entry.id}
                      className="rounded-[17px] border border-[#E8E4DD] bg-[#FAF9F6] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <span
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold tabular-nums text-primary-text shadow-sm"
                            aria-label={t("position", { position: index + 1 })}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">
                              {entry.customer.name || t("customerFallback")}
                            </p>
                            <p className="mt-0.5 truncate text-[10px] text-[#777771]">
                              {entry.customer.email || "—"}
                            </p>
                            <p className="mt-1 text-[10px] text-[#777771]">
                              {formatDateTime(entry.joinedAt, locale)}
                            </p>
                          </div>
                        </div>
                        <WaitlistStatusBadge
                          state={entry.state}
                          label={sharedT(`states.${entry.state}`)}
                        />
                      </div>

                      {canOffer || canCancel ? (
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E8E4DD] pt-3">
                          {canOffer &&
                          entry.state === WAITLIST_STATES.WAITING ? (
                            <button
                              type="button"
                              onClick={() => openAction(entry, "promote")}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-[10px] font-semibold text-emerald-800"
                            >
                              <ArrowUpIcon
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              {isFirstWaiting
                                ? t("actions.promote")
                                : t("actions.promoteOutOfOrder")}
                            </button>
                          ) : null}
                          {canOffer &&
                          entry.state === WAITLIST_STATES.OFFERED ? (
                            <button
                              type="button"
                              onClick={() => openAction(entry, "resend")}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 text-[10px] font-semibold text-sky-800"
                            >
                              <EnvelopeIcon
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              {t("actions.resend")}
                            </button>
                          ) : null}
                          {[
                            WAITLIST_STATES.WAITING,
                            WAITLIST_STATES.OFFERED,
                          ].includes(entry.state) && canCancel ? (
                            <button
                              type="button"
                              onClick={() => openAction(entry, "remove")}
                              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 text-[10px] font-semibold text-rose-800"
                            >
                              <TrashIcon
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              {t("actions.remove")}
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {action?.entry.id === entry.id ? (
                        <form
                          onSubmit={submitAction}
                          className="mt-4 rounded-[15px] border border-[#D8D3CA] bg-white p-4"
                        >
                          <label className="block text-[10px] font-semibold">
                            {t("auditReason")}
                            <input
                              value={action.reason}
                              onChange={(event) =>
                                setAction((current) => ({
                                  ...current,
                                  reason: event.target.value,
                                }))
                              }
                              required
                              maxLength={500}
                              className="mt-1.5 min-h-11 w-full rounded-[12px] border border-[#D8D3CA] px-3 text-xs"
                            />
                          </label>
                          {action.type === "promote" && !isFirstWaiting ? (
                            <label className="mt-3 flex items-start gap-2 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-[10px] leading-4 text-amber-900">
                              <input
                                type="checkbox"
                                checked={action.overrideFifo}
                                onChange={(event) =>
                                  setAction((current) => ({
                                    ...current,
                                    overrideFifo: event.target.checked,
                                  }))
                                }
                                required
                                className="mt-0.5"
                              />
                              {t("fifoOverride")}
                            </label>
                          ) : null}
                          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={() => setAction(null)}
                              className="min-h-11 rounded-full border border-[#D8D3CA] px-4 text-[10px] font-semibold"
                            >
                              {t("actions.cancel")}
                            </button>
                            <button
                              type="submit"
                              disabled={
                                actionBusy ||
                                !action.reason.trim() ||
                                (action.type === "promote" &&
                                  !isFirstWaiting &&
                                  !action.overrideFifo)
                              }
                              className="min-h-11 rounded-full bg-brand-primary px-4 text-[10px] font-semibold text-white disabled:opacity-55"
                            >
                              {actionBusy
                                ? t("actions.saving")
                                : t("actions.confirm")}
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="rounded-[17px] border border-dashed border-[#D8D3CA] px-5 py-10 text-center text-[#686762]">
                <QueueListIcon className="mx-auto h-7 w-7" aria-hidden="true" />
                <p className="mt-3 text-sm">{t("emptyWaitlist")}</p>
              </div>
            )}
          </div>
        )}

        {error ? (
          <p
            className="mt-4 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          <AdminWaitlistSettings
            sessionId={sessionId}
            canManage={canConfigure && commerceEnabled}
            modules={modules}
          />
        </div>
      </div>
    </section>
  );
}
