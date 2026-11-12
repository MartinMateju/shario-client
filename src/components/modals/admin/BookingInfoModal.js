import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Fragment, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import translation from "@/translations/translation";
import { getDateAsString, getDateHourAsString } from "@/utils/utilityFunctions";
import { getBookingProductLabel } from "@/utils/productBookingLabels";
import { activeBookingParticipants } from "@/utils/bookingAttendance";

const safeText = (v, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : String(v);

export const getGuestsCount = (booking) => {
  if (booking?.attendanceManaged) {
    return activeBookingParticipants(booking).length;
  }
  // Most common field names across your codebase / legacy docs
  const candidates = [
    booking?.guestsNumber,
    booking?.numberOfGuests,
    booking?.guests,
    Array.isArray(booking?.participants)
      ? activeBookingParticipants(booking).length
      : undefined,
  ];

  for (const v of candidates) {
    const n = Number(v);
    if (v !== null && v !== undefined && Number.isFinite(n) && n >= 0) return n;
  }

  // Default if nothing is present
  return 1;
};

const getLecturerName = (booking) => {
  // Try a bunch of likely shapes (string, object, array)
  const candidates = [
    booking?.lecturer?.name,
    booking?.lecturer,
    booking?.teacher?.name,
    booking?.teacher,
    booking?.lector?.name,
    booking?.lector,
    booking?.lectors?.[0]?.name,
    booking?.lectors?.[0],
    booking?.instructor?.name,
    booking?.instructor,
  ];

  for (const v of candidates) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }

  return "—";
};

export default function BookingInfoModal({ open, setOpen, booking = {} }) {
  const language = useSelector(selectCurrentLanguage);
  const closeButtonRef = useRef(null);

  const details = useMemo(() => {
    const start = booking?.start;
    const end = booking?.end;

    const typeLabel = getBookingProductLabel(booking, language);
    const guests = getGuestsCount(booking);
    const lecturer = getLecturerName(booking);

    const rows = [
      { label: "ID", value: safeText(booking?._id) },

      // ✅ Type
      {
        label: language === "CZ" ? "Typ" : "Type",
        value: typeLabel,
      },

      // ✅ Guests
      {
        label:
          translation["NUMBER_OF_GUESTS"]?.[language] ??
          (language === "CZ" ? "Počet hostů" : "Guests"),
        value: String(guests),
      },

      // ✅ Lecturer (only if available)
      {
        label: language === "CZ" ? "Lektor" : "Lecturer",
        value: lecturer,
      },

      {
        label: translation["DATE"]?.[language] ?? "Date",
        value: start ? getDateAsString(start) : "—",
      },
      {
        label: translation["START_TIME"]?.[language] ?? "Start",
        value: start ? getDateHourAsString(start) : "—",
      },
      {
        label: translation["END_TIME"]?.[language] ?? "End",
        value: end ? getDateHourAsString(end) : "—",
      },
      {
        label: translation["FIRST_NAME"]?.[language] ?? "First name",
        value: safeText(booking?.author?.name),
      },
      { label: "Custom ID", value: safeText(booking?.author?.customId) },
    ];

    // If lecturer is unknown, you might prefer to hide it instead of showing "—"
    // Uncomment this if you want that behavior:
    // return lecturer === "—" ? rows.filter(r => r.label !== (language === "CZ" ? "Lektor" : "Lecturer")) : rows;

    return rows;
  }, [booking, language]);

  const onClose = () => setOpen(false);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[9999]"
        initialFocus={closeButtonRef}
        onClose={setOpen}
      >
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            data-dialog-backdrop
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-[9998]"
          />
        </TransitionChild>

        <div className="fixed inset-0 z-[9999] w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-3 sm:items-center sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-3 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-3 sm:translate-y-0 sm:scale-95"
            >
              <DialogPanel
                data-dialog-layout="modal"
                className="relative w-full max-w-lg overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 rounded-none sm:rounded-xl"
              >
                {/* Header */}
                <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-4 sm:px-6">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-cobalt-50 ring-1 ring-cobalt-100">
                    <InformationCircleIcon
                      className="h-5 w-5 text-cobalt-700"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <DialogTitle
                      as="h3"
                      className="font-medium text-lg sm:text-xl text-gray-900 leading-6"
                    >
                      {translation["BOOKING_DETAILS"]?.[language] ??
                        "Booking details"}
                    </DialogTitle>
                    <p className="mt-1 text-sm text-gray-500">
                      {booking?.start
                        ? `${getDateAsString(booking?.start)} • ${getDateHourAsString(
                            booking?.start,
                          )}–${booking?.end ? getDateHourAsString(booking?.end) : "—"}`
                        : "—"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    ref={closeButtonRef}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--unnamed-color-e6a684)]"
                    aria-label="Close"
                  >
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-4 py-4 sm:px-6">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {details.map((row) => (
                      <div
                        key={row.label}
                        className="rounded-lg border border-gray-100 bg-[#F7F5F2] px-3 py-2"
                      >
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {row.label}
                        </p>
                        <p className="mt-1 text-sm sm:text-base font-medium text-gray-900 break-words">
                          {row.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3 sm:px-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium
                               ring-1 ring-inset ring-[var(--unnamed-color-b3a292)] text-[var(--unnamed-color-b3a292)]
                               hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--unnamed-color-e6a684)]"
                  >
                    {translation["CANCEL"]?.[language] ?? "Close"}
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
