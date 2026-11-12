"use client";

import { CheckIcon, PlusIcon } from "@heroicons/react/20/solid";

const cx = (...values) => values.filter(Boolean).join(" ");

export function ChoiceCard({
  compact = false,
  description,
  icon,
  label,
  mode = "radio",
  onClick,
  selected = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "group relative flex w-full rounded-xl border text-left",
        "transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary",
        "active:translate-y-px",
        compact
          ? "min-h-14 items-center justify-center gap-2 px-3 text-center"
          : "min-h-[76px] items-center gap-3 p-4 pr-14",
        selected
          ? "border-brand-primary bg-brand-primary/[0.045] text-primary-text shadow-[0_0_0_1px_var(--color-brand-primary)]"
          : "border-line bg-surface-raised text-[#1F1F1F] hover:border-brand-primary hover:bg-surface-muted",
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={cx(
            "grid size-8 shrink-0 place-items-center rounded-full",
            selected ? "bg-brand-primary/10" : "bg-surface",
          )}
        >
          {icon}
        </span>
      )}

      <span>
        <strong className="block text-sm font-semibold">{label}</strong>
        {description && (
          <span className="mt-0.5 block text-xs leading-5 text-[#7D7D7D]">
            {description}
          </span>
        )}
      </span>

      {!compact && (
        <span
          aria-hidden="true"
          className={cx(
            "absolute right-4 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full border",
            selected
              ? "border-brand-primary bg-brand-primary text-white"
              : "border-line-strong bg-surface-raised text-[#7D7D7D]",
          )}
        >
          {mode === "checkbox" ? (
            selected ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <PlusIcon className="size-3.5" />
            )
          ) : (
            <span
              className={cx("size-2 rounded-full", selected && "bg-white")}
            />
          )}
        </span>
      )}
    </button>
  );
}
