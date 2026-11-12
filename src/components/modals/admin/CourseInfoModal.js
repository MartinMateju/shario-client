"use client";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { Fragment, useId, useRef } from "react";
import { useSelector } from "react-redux";

import CourseSessionRoster from "@/components/waitlists/CourseSessionRoster";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import translation from "@/translations/translation";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { getNumberOfParticipantsAsString } from "@/utils/sidebarUtils";
import {
  getDateAsString,
  getProductByBooking,
  getTimeRangeAsString,
} from "@/utils/utilityFunctions";

const getEntityId = (value) => {
  const candidate =
    value && typeof value === "object" ? (value.id ?? value._id) : value;
  return String(candidate ?? "").trim();
};

const getCourseProduct = (selectedBooking, products) => {
  if (!selectedBooking || !Array.isArray(products) || !products.length) {
    return null;
  }
  const primaryProduct = getProductByBooking(products, selectedBooking);
  if (!primaryProduct) {
    return null;
  }
  return primaryProduct;
};

const getParticipantSources = (booking) => {
  const sources = [
    booking?.bookedEntries,
    booking?.participants,
    booking?.attendees,
    booking?.customers,
  ];

  return (
    sources.find((source) => Array.isArray(source) && source.length > 0) ??
    sources.find(Array.isArray) ??
    []
  );
};

const getParticipantIdentity = (participant, users) => {
  const source =
    participant && typeof participant === "object" ? participant : null;
  const participantId = getEntityId(
    source?.customer ?? source?.user ?? participant,
  );
  const orderId = getEntityId(
    source?.order ?? source?.orderId ?? source?.bookingOrder,
  );
  const embedded =
    source?.customer && typeof source.customer === "object"
      ? source.customer
      : source?.user && typeof source.user === "object"
        ? source.user
        : source;
  const user =
    (Array.isArray(users) ? users : []).find(
      (candidate) => getEntityId(candidate) === participantId,
    ) ?? embedded;

  if (!user) return null;

  const firstName = user.firstName ?? user.firstname ?? "";
  const lastName = user.lastName ?? user.lastname ?? "";
  const name = String(
    user.name ??
      user.displayName ??
      [firstName, lastName].filter(Boolean).join(" "),
  ).trim();
  const email = String(user.email ?? "")
    .trim()
    .toLowerCase();
  const id =
    getEntityId(user) ||
    participantId ||
    [orderId, source?.customId, name, email].filter(Boolean).join(":");

  if (!id && !name && !email) return null;

  return {
    id,
    ...(orderId ? { orderId } : {}),
    ...(source?.attendanceStatus === "removed"
      ? { attendanceStatus: "removed" }
      : {}),
    customer: { name, email },
  };
};

export const getCourseParticipants = (booking, users) =>
  getParticipantSources(booking)
    .filter((participant) => {
      if (participant?.attendanceStatus !== "removed") return true;
      const orderId = getEntityId(
        participant?.order ?? participant?.orderId ?? participant?.bookingOrder,
      );
      // Keep the explicit refund action after attendance-only removal. Once
      // refunded, the order is detached while its idempotency snapshot remains.
      return (
        Boolean(orderId) &&
        (!booking.attendanceManaged ||
          (booking.orders ?? []).some(
            (order) => getEntityId(order) === orderId,
          ))
      );
    })
    .map((participant) => getParticipantIdentity(participant, users))
    .filter(Boolean);

export default function CourseInfoModal({
  open,
  setOpen,
  booking,
  products,
  users,
}) {
  const cancelButtonRef = useRef(null);
  const dialogTitleId = useId();
  const language = useSelector(selectCurrentLanguage);
  const currentTenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);

  const product = getCourseProduct(booking, products);
  const courseParticipants = getCourseParticipants(booking, users);
  const canViewWaitlist = hasPermission(
    workspaceAccess,
    PERMISSIONS.BOOKINGS_VIEW,
  );
  const canPromoteWaitlist = hasPermission(
    workspaceAccess,
    PERMISSIONS.BOOKINGS_UPDATE,
  );
  const canCancelWaitlist = hasPermission(
    workspaceAccess,
    PERMISSIONS.BOOKINGS_CANCEL,
  );
  const canRefundCourseParticipants =
    hasPermission(workspaceAccess, PERMISSIONS.BOOKINGS_CANCEL) &&
    hasPermission(workspaceAccess, PERMISSIONS.BOOKINGS_REFUND);
  const canConfigureWaitlist = hasPermission(
    workspaceAccess,
    PERMISSIONS.BOOKINGS_UPDATE,
  );
  const sessionId = getEntityId(booking);

  const clearFormOnClose = () => {
    setOpen(false);
  };
  const onCancelClicked = () => {
    setOpen(false);
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        aria-labelledby={dialogTitleId}
        initialFocus={cancelButtonRef}
        onClose={clearFormOnClose}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            data-dialog-backdrop
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          />
        </TransitionChild>
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto text-gray-900">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                data-dialog-layout="modal"
                className="relative transform overflow-hidden rounded-[26px] bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6"
              >
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-none bg-cobalt-100 sm:mx-0 sm:h-10 sm:w-10">
                    <InformationCircleIcon
                      className="h-6 w-6 text-cobalt-800"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-3 space-y-2 text-center font-medium sm:ml-4 sm:mt-0 sm:text-left">
                    <DialogTitle
                      id={dialogTitleId}
                      className="pt-2 text-lg font-medium"
                    >
                      {product?.name || `Course ${sessionId}`}
                    </DialogTitle>
                    <p>ID: {sessionId}</p>
                    <p>
                      {translation["LECTURER"][language]}: {booking?.lecturer}
                    </p>
                    <p>
                      <time dateTime={booking?.start}>
                        {translation["DATE"][language]}:{" "}
                        {getDateAsString(booking?.start)}
                      </time>
                    </p>
                    <p>
                      <time dateTime={booking?.start}>
                        {translation["TIME"][language]}:{" "}
                        {getTimeRangeAsString(booking?.start, booking?.end)}
                      </time>
                    </p>
                    <p className="pb-2">
                      {translation["PRICE"][language]}:{" "}
                      {formatMajorCurrencyAmount(
                        product?.price,
                        product?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY,
                        language === "CZ" ? "cs-CZ" : "en-GB",
                      )}
                    </p>
                    <p>
                      {translation["PARTICIPANTS"][language]}:{" "}
                      {getNumberOfParticipantsAsString(booking, products)}
                    </p>
                  </div>
                </div>

                {canViewWaitlist && sessionId ? (
                  <div className="mt-6">
                    <CourseSessionRoster
                      sessionId={sessionId}
                      bookedEntries={courseParticipants}
                      canView={canViewWaitlist}
                      canPromote={canPromoteWaitlist}
                      canCancel={canCancelWaitlist}
                      canRefundParticipants={canRefundCourseParticipants}
                      canConfigure={canConfigureWaitlist}
                      modules={currentTenant?.modules ?? {}}
                    />
                  </div>
                ) : null}

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-11 w-full justify-center rounded-full bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={onCancelClicked}
                    ref={cancelButtonRef}
                  >
                    {translation["CANCEL"][language]}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
