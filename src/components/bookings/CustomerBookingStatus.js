import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import { getCustomerBookingState } from "@/lib/features/bookings/customerBookingState";

export default function CustomerBookingStatus({
  booking,
  language = "EN",
  now,
}) {
  const state = getCustomerBookingState(booking, now);
  const copy = useLegacyCopy("bookingStatus");

  return (
    <div data-customer-booking-state={state} className="mt-2 space-y-1.5">
      <span className="inline-flex rounded-full border border-[var(--tenant-border)] bg-[var(--tenant-surface)] px-2.5 py-1 text-xs font-medium text-[var(--tenant-text-on-surface)]">
        {copy[state]}
      </span>
      {state === "awaiting_confirmation" ? (
        <p className="max-w-sm text-xs text-[var(--tenant-muted-on-surface)]">
          {copy.attention}
        </p>
      ) : null}
    </div>
  );
}
