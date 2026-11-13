"use client";

import { useLegacyLocale } from "@/i18n/useLegacyCopy";
import { useLegacyText } from "@/i18n/useLegacyCopy";
import React, { Fragment, useMemo, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  TrashIcon,
  UserPlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { useLegacyTranslation } from "@/i18n/useLegacyTranslation";
import { formatMajorCurrencyAmount } from "@/utils/money";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const getCreatedById = (booking) => {
  const v = booking?.createdBy;
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") return v?._id || v?.id || null;
  return null;
};

const getQuantity30mBlocks = (start, end) => {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  const diffMinutes = (e.getTime() - s.getTime()) / 60000;
  if (diffMinutes <= 0) return 1;
  return Math.ceil(diffMinutes / 30);
};

export default function BookingActionButtons({
  booking,
  products = [], // ✅ needed to compute guest-increase price correctly
  onCancel,
  onIncreaseParticipants,
  isLoading = false,
}) {
  const activeLocale = useLegacyLocale();
  const legacyText = useLegacyText();
  const translation = useLegacyTranslation();
  const { id: userId } = useSelector(selectCurrentUser) || {};
  const language = useSelector(selectCurrentLanguage) || "CZ";
  const locale = activeLocale;

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showIncreaseForm, setShowIncreaseForm] = useState(false);

  const createdById = useMemo(() => getCreatedById(booking), [booking]);

  const isWorkshop = useMemo(
    () => String(booking?.tag || "").toLowerCase() === "workshop",
    [booking?.tag],
  );

  const status = useMemo(
    () => String(booking?.status || "").toLowerCase(),
    [booking?.status],
  );

  const currentTotalPeople = useMemo(() => {
    const n = Number(booking?.numberOfGuests);
    if (Number.isFinite(n) && n > 0) return n;
    return 1;
  }, [booking?.numberOfGuests]);

  const maxTotalPeopleAllowed = useMemo(() => {
    const max = Number(booking?.product?.maxNumberOfParticipants);
    if (Number.isFinite(max) && max > 0) return max;
    return 1;
  }, [booking?.product?.maxNumberOfParticipants]);

  const guestIncreaseProduct = useMemo(() => {
    return products.find((p) => p?.type === "guest-increase") || null;
  }, [products]);

  const durationBlocks = useMemo(() => {
    return getQuantity30mBlocks(booking?.start, booking?.end);
  }, [booking?.start, booking?.end]);

  // ✅ cancel: only owner + not cancelled + workshop (matches your system)
  const canCancel = useMemo(() => {
    return (
      isWorkshop &&
      String(createdById || "") === String(userId || "") &&
      status !== "cancelled"
    );
  }, [createdById, userId, status, isWorkshop]);

  // ✅ keep your intention: only processed can be modified (and only workshops)
  const canModify = useMemo(() => {
    return (
      isWorkshop &&
      String(createdById || "") === String(userId || "") &&
      status === "processed"
    );
  }, [createdById, userId, status, isWorkshop]);

  const remainingCapacity = useMemo(() => {
    return Math.max(0, maxTotalPeopleAllowed - currentTotalPeople);
  }, [maxTotalPeopleAllowed, currentTotalPeople]);

  const selectableAdds = useMemo(() => {
    // allow adding 1..remainingCapacity
    return Array.from({ length: remainingCapacity }, (_, i) => i + 1);
  }, [remainingCapacity]);

  const [additionalParticipants, setAdditionalParticipants] = useState(1);

  // keep additionalParticipants always valid when opening/when booking changes
  React.useEffect(() => {
    if (!showIncreaseForm) return;
    setAdditionalParticipants((prev) => {
      const wanted = Number(prev) || 1;
      if (remainingCapacity <= 0) return 1;
      return Math.min(Math.max(1, wanted), remainingCapacity);
    });
  }, [showIncreaseForm, remainingCapacity]);

  const additionalCost = useMemo(() => {
    // ✅ price should come from guest-increase product, not workshop product
    const unitPrice = Number(guestIncreaseProduct?.price || 0);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return 0;
    const add = Math.max(1, Number(additionalParticipants || 1));
    return unitPrice * durationBlocks * add;
  }, [guestIncreaseProduct?.price, durationBlocks, additionalParticipants]);

  const handleCancelBooking = useCallback(async () => {
    if (!onCancel || !booking?._id) return;
    await onCancel(booking._id);
    setShowCancelConfirm(false);
  }, [onCancel, booking?._id]);

  const handleIncreaseParticipants = useCallback(async () => {
    if (!onIncreaseParticipants || !booking?._id) return;

    const add = Math.max(1, Number(additionalParticipants || 1));
    if (add > remainingCapacity) return;

    // optional meta (handy for cart / server validation)
    const meta = {
      addPeople: add,
      durationBlocks,
      guestIncreaseProductId: guestIncreaseProduct?._id,
      computedAdditionalCost: additionalCost,
    };

    await onIncreaseParticipants(booking._id, add, meta);

    setShowIncreaseForm(false);
    setAdditionalParticipants(1);
  }, [
    onIncreaseParticipants,
    booking?._id,
    additionalParticipants,
    remainingCapacity,
    durationBlocks,
    guestIncreaseProduct?._id,
    additionalCost,
  ]);

  if (!canCancel && !canModify) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Cancel Booking */}
      {canCancel && (
        <>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            disabled={isLoading}
            className={classNames(
              "inline-flex h-[37px] items-center gap-2 rounded-full px-4",
              "text-xs font-medium uppercase tracking-wide",
              "border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "active:scale-95 touch-manipulation transition-all",
            )}
          >
            <TrashIcon className="h-4 w-4" />
            <span>{translation["CANCEL_BOOKING"]?.[language]}</span>
          </button>

          <Transition show={showCancelConfirm} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-[9999]"
              onClose={isLoading ? () => {} : () => setShowCancelConfirm(false)}
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
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                />
              </TransitionChild>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                  <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-2 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-2 sm:scale-95"
                  >
                    <DialogPanel
                      data-dialog-layout="compact"
                      className="w-full max-w-md overflow-hidden bg-wood-100 text-gray-900 shadow-2xl sm:rounded-xl ring-2 ring-gray-700"
                    >
                      <div className="flex items-start justify-between gap-4 px-4 sm:px-6 py-4 border-b border-gray-700">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-orange-100 p-2 ring-1 ring-orange-200">
                            <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                          </div>

                          <div>
                            <DialogTitle className="text-base sm:text-lg font-medium">
                              {translation["CONFIRM_CANCEL"]?.[language]}
                            </DialogTitle>
                            <p className="mt-1 text-sm text-gray-700 ">
                              {
                                translation["CANCEL_BOOKING_WARNING"]?.[
                                  language
                                ]
                              }
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="rounded-full p-2 text-[var(--unnamed-color-b3a292)] hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
                          onClick={() => setShowCancelConfirm(false)}
                          disabled={isLoading}
                          aria-label={legacyText(
                            "BookingActionButtons_Close_bbfa7",
                          )}
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>

                      <div className="px-4 sm:px-6 py-5 space-y-4">
                        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            <p className="text-sm text-green-800">
                              {translation["REFUND_INFO"]?.[language]}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 sm:px-6 py-4 border-t border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowCancelConfirm(false)}
                          disabled={isLoading}
                          className="w-full sm:w-auto h-[37px] rounded-full px-4 text-xs font-medium uppercase tracking-wide
                            text-gray-900 border-2 border-[var(--unnamed-color-b3a292)] bg-wood-100 hover:bg-gray-50
                            disabled:opacity-40"
                        >
                          {translation["KEEP_BOOKING"]?.[language]}
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelBooking}
                          disabled={isLoading}
                          className="w-full sm:w-auto h-[37px] rounded-full px-5 text-xs font-medium uppercase tracking-wide
                            text-white bg-red-600 hover:bg-red-700
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                              {translation["CANCELLING"]?.[language]}
                            </span>
                          ) : (
                            translation["CANCEL_BOOKING"]?.[language]
                          )}
                        </button>
                      </div>
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </div>
            </Dialog>
          </Transition>
        </>
      )}

      {/* Increase participants (only workshops + processed) */}
      {canModify && (
        <>
          <button
            type="button"
            onClick={() => setShowIncreaseForm(true)}
            disabled={isLoading || remainingCapacity <= 0}
            className={classNames(
              "inline-flex h-[37px] items-center gap-2 rounded-full px-4",
              "text-xs font-medium uppercase tracking-wide",
              "border-2 border-[var(--unnamed-color-b3a292)] bg-wood-100 text-[var(--unnamed-color-b3a292)]",
              "hover:bg-[var(--unnamed-color-b3a292)] hover:text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "active:scale-95 touch-manipulation transition-all",
            )}
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>{translation["ADD_PARTICIPANTS"]?.[language]}</span>
          </button>

          <Transition show={showIncreaseForm} as={Fragment}>
            <Dialog
              as="div"
              className="relative z-[9999]"
              onClose={isLoading ? () => {} : () => setShowIncreaseForm(false)}
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
                  className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                />
              </TransitionChild>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                  <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-2 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-2 sm:scale-95"
                  >
                    <DialogPanel
                      data-dialog-layout="compact"
                      className="w-full max-w-md overflow-hidden bg-wood-100 text-gray-900 shadow-2xl sm:rounded-xl ring-2 ring-gray-700"
                    >
                      <div className="flex items-start justify-between gap-4 px-4 sm:px-6 py-4 border-b border-gray-700">
                        <div>
                          <DialogTitle className="text-base sm:text-lg font-medium">
                            {translation["ADD_PARTICIPANTS"]?.[language]}
                          </DialogTitle>
                          <p className="mt-1 text-sm text-gray-700 ">
                            {translation["CURRENT_PARTICIPANTS"]?.[language]}:{" "}
                            <span className="font-medium">
                              {currentTotalPeople}
                            </span>{" "}
                            /{" "}
                            <span className="font-medium">
                              {maxTotalPeopleAllowed}
                            </span>
                          </p>
                        </div>

                        <button
                          type="button"
                          className="rounded-full p-2 text-[var(--unnamed-color-b3a292)] hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
                          onClick={() => setShowIncreaseForm(false)}
                          disabled={isLoading}
                          aria-label={legacyText(
                            "BookingActionButtons_Close_bbfa7",
                          )}
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>

                      <div className="px-4 sm:px-6 py-5 space-y-4">
                        {remainingCapacity <= 0 ? (
                          <p className="text-sm text-gray-700">
                            {
                              translation["CHANGE_PARTICIPANTS_INFO_LIMIT"]?.[
                                language
                              ]
                            }
                          </p>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-900">
                                {
                                  translation["ADDITIONAL_PARTICIPANTS"]?.[
                                    language
                                  ]
                                }
                              </label>

                              <select
                                value={additionalParticipants}
                                onChange={(e) =>
                                  setAdditionalParticipants(
                                    Number(e.target.value),
                                  )
                                }
                                disabled={isLoading}
                                className="mt-2 block w-full h-[44px] rounded-full border-2 border-gray-300 bg-white px-4 text-sm text-gray-900
                                  focus:outline-none focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)] disabled:opacity-60"
                              >
                                {selectableAdds.map((num) => (
                                  <option key={num} value={num}>
                                    {num}
                                  </option>
                                ))}
                              </select>

                              {!guestIncreaseProduct && (
                                <p className="mt-2 text-xs text-red-600">
                                  {legacyText(
                                    "BookingActionButtons_Additional_guests_are_unavailable_for_this_booking_c294b",
                                  )}{" "}
                                </p>
                              )}
                            </div>

                            <div className="rounded-xl border border-gray-300 bg-white p-3">
                              <p className="text-sm text-gray-700">
                                {translation["ADDITIONAL_COST"]?.[language]}:{" "}
                                <span className="font-medium text-gray-900">
                                  {formatMajorCurrencyAmount(
                                    additionalCost,
                                    guestIncreaseProduct?.currency ||
                                      booking?.currency ||
                                      booking?.product?.currency ||
                                      DEFAULT_STUDIO_COMMERCE_CURRENCY,
                                    locale,
                                  )}
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {translation["PRICE_NOTE_30MIN"]?.[language]}
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="px-4 sm:px-6 py-4 border-t border-gray-700 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowIncreaseForm(false);
                            setAdditionalParticipants(1);
                          }}
                          disabled={isLoading}
                          className="w-full sm:w-auto h-[37px] rounded-full px-4 text-xs font-medium uppercase tracking-wide
                            text-gray-900 border-2 border-[var(--unnamed-color-b3a292)] bg-wood-100 hover:bg-gray-50 disabled:opacity-40"
                        >
                          {translation["CANCEL"]?.[language]}
                        </button>

                        <button
                          type="button"
                          onClick={handleIncreaseParticipants}
                          disabled={
                            isLoading ||
                            remainingCapacity <= 0 ||
                            !guestIncreaseProduct
                          }
                          className="w-full sm:w-auto h-[37px] rounded-full px-5 text-xs font-medium uppercase tracking-wide
                            text-white bg-[var(--unnamed-color-b3a292)] border-2 border-[var(--unnamed-color-b3a292)]
                            hover:bg-wood-600 hover:border-wood-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {isLoading ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                              {translation["UPDATING"]?.[language]}
                            </span>
                          ) : (
                            translation["ADD_PARTICIPANTS"]?.[language]
                          )}
                        </button>
                      </div>
                    </DialogPanel>
                  </TransitionChild>
                </div>
              </div>
            </Dialog>
          </Transition>
        </>
      )}
    </div>
  );
}
