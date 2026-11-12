import { WAITLIST_STATES } from "@/lib/features/waitlists/waitlistsApiSlice";

export const WAITLIST_REFUNDED_PRESENTATION_STATE = "refunded";

export const getWaitlistPresentationState = (entry) =>
  entry?.refund ? WAITLIST_REFUNDED_PRESENTATION_STATE : entry?.state;

const STATE_STYLES = Object.freeze({
  [WAITLIST_STATES.WAITING]: "border-amber-200 bg-amber-50 text-amber-800",
  [WAITLIST_STATES.OFFERED]:
    "border-emerald-200 bg-emerald-50 text-emerald-800",
  [WAITLIST_STATES.PAYMENT_PENDING]: "border-sky-200 bg-sky-50 text-sky-800",
  [WAITLIST_STATES.CONFIRMED]:
    "border-emerald-200 bg-emerald-50 text-emerald-800",
  [WAITLIST_STATES.DECLINED]:
    "border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-text)]",
  [WAITLIST_STATES.EXPIRED]:
    "border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-text)]",
  [WAITLIST_STATES.WITHDRAWN]:
    "border-[var(--tenant-border)] bg-[var(--tenant-background)] text-[var(--tenant-text)]",
  [WAITLIST_STATES.CANCELLED]: "border-rose-200 bg-rose-50 text-rose-800",
  [WAITLIST_REFUNDED_PRESENTATION_STATE]:
    "border-violet-200 bg-violet-50 text-violet-800",
});

export default function WaitlistStatusBadge({ state, label }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        STATE_STYLES[state] || STATE_STYLES[WAITLIST_STATES.EXPIRED]
      }`}
      data-waitlist-state={state}
    >
      {label}
    </span>
  );
}
