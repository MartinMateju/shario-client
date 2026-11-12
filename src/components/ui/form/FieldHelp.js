"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { QuestionMarkCircleIcon } from "@heroicons/react/20/solid";

const cx = (...values) => values.filter(Boolean).join(" ");

/**
 * Accessible, touch-friendly help for form labels and section headings.
 *
 * The trigger is a real button, so the explanation works with a mouse,
 * keyboard and touch. Headless UI manages focus, Escape and outside-click
 * dismissal as well as the expanded/control relationship.
 */
export default function FieldHelp({
  children,
  className,
  label,
  panelClassName,
  triggerText,
}) {
  return (
    <Popover className={cx("relative inline-flex shrink-0", className)}>
      <PopoverButton
        type="button"
        aria-label={label}
        className={cx(
          "group/help inline-flex items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/35 focus-visible:ring-offset-2",
          triggerText
            ? "min-h-9 gap-1.5 border border-cobalt-100 bg-cobalt-50 px-3 text-[11px] font-semibold text-cobalt-700 hover:border-cobalt-200 hover:bg-cobalt-100"
            : "size-8 text-ink-muted hover:bg-cobalt-50 hover:text-cobalt-700",
        )}
      >
        <QuestionMarkCircleIcon
          aria-hidden="true"
          className="size-[18px] transition-transform group-hover/help:scale-105 motion-reduce:transform-none"
        />
        {triggerText ? <span>{triggerText}</span> : null}
      </PopoverButton>

      <PopoverPanel
        transition
        className={cx(
          "absolute left-1/2 top-[calc(100%+8px)] z-50 w-[min(280px,calc(100vw-32px))] -translate-x-1/2 rounded-[14px] border border-line bg-surface-raised px-3.5 py-3 text-left text-xs font-normal leading-5 text-ink-muted shadow-floating outline-none transition duration-150 ease-out data-closed:-translate-y-1 data-closed:opacity-0 motion-reduce:transform-none motion-reduce:transition-none sm:left-0 sm:translate-x-0",
          panelClassName,
        )}
      >
        {children}
      </PopoverPanel>
    </Popover>
  );
}

export { FieldHelp };
