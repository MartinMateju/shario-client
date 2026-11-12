import { SKAB_BRAND_COLORS } from "@/config/brandPalette";

import { UserIcon } from "@heroicons/react/24/solid";

import { cx } from "./calendar.utils";

export const ownBookingOutlineStyle = {
  borderColor: SKAB_BRAND_COLORS.primary,
  boxShadow: "inset 0 0 0 1px #FFFFFF",
};

export default function CalendarOwnBookingBadge({
  label,
  tight = false,
  iconOnly = false,
  collapseLabel = false,
}) {
  return (
    <span
      data-calendar-own-booking-badge="true"
      className={cx(
        "inline-flex min-w-0 max-w-full items-center gap-1 rounded px-1 text-[9px] font-semibold leading-[12px]",
        !tight && "min-h-3.5",
      )}
      style={{
        backgroundColor: SKAB_BRAND_COLORS.primary,
        color: "#FFFFFF",
        boxShadow: "0 0 0 1px #FFFFFF",
      }}
    >
      <UserIcon
        data-calendar-own-booking-icon="true"
        className="h-2.5 w-2.5 shrink-0"
        aria-hidden="true"
      />
      <span
        className={cx(
          "min-w-0 truncate",
          iconOnly
            ? "sr-only"
            : collapseLabel && "hidden @[84px]/calendar-card:inline",
        )}
      >
        {label}
      </span>
    </span>
  );
}
