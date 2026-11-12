"use client";

import { memo } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";

import CalendarTooltip, { useCalendarTooltip } from "./CalendarTooltip";
import { cx } from "./calendar.utils";

function SlotSurface({ model, showLabel, top, height, onSelect, t }) {
  const { slot, availability, surfaceAvailability, availabilityLabel, range } =
    model;
  const { triggerProps, tooltipProps, close } = useCalendarTooltip();
  const bookable = availability.isBookable;
  const limited = availability.state === "limited";
  const surface = surfaceAvailability || availability;
  const heading = bookable
    ? t(limited ? "availability.limited" : "availability.available")
    : availabilityLabel;
  const label = `${range}, ${availabilityLabel}`;
  const tooltip = (
    <CalendarTooltip {...tooltipProps}>
      <p className="font-semibold tabular-nums">{range}</p>
      <p className="mt-1 font-medium">{heading}</p>
      {bookable && availability.remaining != null && <p>{availabilityLabel}</p>}
      {bookable && onSelect && (
        <p className="mt-2 border-t border-current/10 pt-2 text-[11px] opacity-70">
          {t("availability.select")}
        </p>
      )}
    </CalendarTooltip>
  );

  return (
    <div
      {...triggerProps}
      onPointerDown={close}
      data-calendar-slot-state={availability.state}
      data-calendar-slot-surface-state={surface.state}
      data-calendar-slot-bookable={bookable ? "true" : "false"}
      role="group"
      aria-label={label}
      className={cx(
        "absolute inset-x-0 z-[1]",
        bookable ? "cursor-crosshair" : "cursor-not-allowed",
      )}
      style={{ top, height }}
    >
      {showLabel && bookable && (
        <button
          aria-describedby={triggerProps["aria-describedby"]}
          onBlur={triggerProps.onBlur}
          type="button"
          disabled={!onSelect}
          data-calendar-slot-control="true"
          data-tenant-hover="preserve"
          data-calendar-slot-availability-label="true"
          aria-label={`${label}, ${t("availability.select")}`}
          className={cx(
            "relative m-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded-md px-1.5 py-1 text-left text-[10px] font-medium leading-tight outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-current disabled:cursor-default",
            limited
              ? "text-[#855500] hover:bg-[#F6E7BD]"
              : "text-[#316544] hover:bg-[#DCEFE2]",
          )}
          onPointerDown={(event) => {
            event.stopPropagation();
            close();
          }}
          onFocus={(event) => {
            event.stopPropagation();
            triggerProps.onFocus(event);
          }}
          onClick={(event) => {
            event.stopPropagation();
            close();
            onSelect?.(slot, event.currentTarget);
          }}
        >
          <PlusIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
          <span className="min-w-0 line-clamp-2">{availabilityLabel}</span>
        </button>
      )}
      {tooltip}
    </div>
  );
}

export default memo(function CustomerSlotSurfaces({
  slotModels,
  calendarStartMinute,
  stepMinutes,
  pixelsPerMinute,
  onSelect,
  t,
}) {
  let lastLabelMinute = -Infinity;
  return slotModels.map((model, index) => {
    const previous = slotModels[index - 1];
    const changed =
      !previous ||
      previous.availability.state !== model.availability.state ||
      previous.availability.remaining !== model.availability.remaining ||
      previous.availability.activityId !== model.availability.activityId;
    const showLabel = changed || model.slot.minute - lastLabelMinute >= 120;
    if (showLabel) lastLabelMinute = model.slot.minute;
    return (
      <SlotSurface
        key={model.slot.minute}
        model={model}
        showLabel={showLabel}
        top={(model.slot.minute - calendarStartMinute) * pixelsPerMinute}
        height={stepMinutes * pixelsPerMinute}
        onSelect={onSelect}
        t={t}
      />
    );
  });
});
