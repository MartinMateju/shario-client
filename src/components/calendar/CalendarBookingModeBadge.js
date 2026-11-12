import { LockClosedIcon, UserGroupIcon } from "@heroicons/react/24/outline";

import { cx } from "./calendar.utils";

export default function CalendarBookingModeBadge({
  isPrivate,
  label,
  compact = false,
}) {
  const Icon = isPrivate ? LockClosedIcon : UserGroupIcon;

  return (
    <span
      data-calendar-mode-badge="true"
      className={cx(
        "inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border font-semibold",
        compact
          ? "px-1 py-px text-[10px] leading-[12px]"
          : "px-2 py-0.5 text-xs leading-4",
        isPrivate
          ? "border-white/50 bg-white/15 text-white"
          : "border-[#8DAFA5] bg-[#CEE2DC] text-[#254F48]",
      )}
    >
      <Icon
        data-calendar-privacy-icon={isPrivate ? "private" : "public"}
        className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"}
        aria-hidden="true"
      />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
