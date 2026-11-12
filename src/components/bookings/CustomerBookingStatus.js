import { getCustomerBookingState } from "@/lib/features/bookings/customerBookingState";

const COPY = {
  EN: {
    confirmed: "Confirmed",
    awaiting_payment: "Awaiting payment",
    awaiting_confirmation: "Payment received · awaiting confirmation",
    expired: "Checkout expired",
    failed: "Payment failed",
    cancelled: "Cancelled",
    completed: "Completed",
    attention: "Contact the studio to check your booking.",
  },
  CZ: {
    confirmed: "Potvrzeno",
    awaiting_payment: "Čeká na platbu",
    awaiting_confirmation: "Platba přijata · rezervace čeká na potvrzení",
    expired: "Lhůta pro zaplacení vypršela",
    failed: "Platba se nezdařila",
    cancelled: "Zrušeno",
    completed: "Dokončeno",
    attention: "Kontaktujte studio a ověřte stav rezervace.",
  },
};

export default function CustomerBookingStatus({
  booking,
  language = "EN",
  now,
}) {
  const state = getCustomerBookingState(booking, now);
  const copy = COPY[language] || COPY.EN;

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
