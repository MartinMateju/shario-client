"use client";

import { CheckIcon, PlusIcon } from "@heroicons/react/20/solid";
import styles from "./onboarding.module.css";

const cx = (...values) => values.filter(Boolean).join(" ");

export function OnboardingChoiceCard({
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
        styles.choice,
        "group relative flex text-left",
        compact
          ? "min-h-12 w-auto max-w-full min-w-0 items-center gap-1.5 px-2.5 py-2 [@media(max-height:800px)]:min-h-11 [@media(max-height:800px)]:py-1.5"
          : "min-h-[76px] w-full items-center gap-3 p-4 pr-14",
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={`${styles.choiceIcon} relative grid size-7 shrink-0 place-items-center`}
          data-onboarding-choice-icon
        >
          {icon}
          {compact && selected ? (
            <span
              className={`${styles.choiceCheck} absolute -right-1 -top-1 grid size-4 place-items-center`}
              data-onboarding-choice-check
            >
              <CheckIcon className="size-2.5 stroke-[2.5]" />
            </span>
          ) : null}
        </span>
      )}

      <span className="min-w-0">
        <strong
          className={cx(
            "block text-sm font-semibold leading-5",
            compact ? "break-words sm:whitespace-nowrap" : "break-words",
          )}
        >
          {label}
        </strong>
        {description && (
          <span
            className={`${styles.choiceDescription} mt-0.5 block text-xs leading-5`}
          >
            {description}
          </span>
        )}
      </span>

      {!compact && (
        <span
          aria-hidden="true"
          className={`${styles.choiceIndicator} absolute right-4 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full border`}
        >
          {mode === "checkbox" ? (
            selected ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <PlusIcon className="size-3.5" />
            )
          ) : (
            <span
              className={cx(
                "size-2 rounded-full",
                selected && styles.selectedDot,
              )}
            />
          )}
        </span>
      )}
    </button>
  );
}
