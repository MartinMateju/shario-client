"use client";

import { cloneElement, useId } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { useTranslations } from "next-intl";

const cx = (...values) => values.filter(Boolean).join(" ");

const controlClasses = [
  "min-h-14 w-full rounded-xl border border-skab-offset-300 bg-white px-4",
  "text-[15px] text-[#1F1F1F] placeholder:text-[#6F6F69]",
  "outline-none transition-[border-color,box-shadow,background-color] duration-300 ease-out motion-reduce:transition-none",
  "hover:border-[#A9A18B]",
  "focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10",
  "disabled:cursor-not-allowed disabled:bg-surface disabled:text-[#6F6F69]",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-4 aria-[invalid=true]:ring-danger/10",
].join(" ");

export function FormField({
  children,
  className,
  error,
  help,
  hint,
  label,
  name,
  optional = false,
}) {
  const t = useTranslations("Common");
  const generatedId = useId();
  const controlId = name || generatedId;
  const descriptionId = error
    ? `${controlId}-error`
    : hint
      ? `${controlId}-hint`
      : undefined;

  return (
    <div className={className}>
      <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
        <label
          htmlFor={controlId}
          className="text-sm font-semibold text-[#1F1F1F]"
        >
          {label}
        </label>
        <div className="flex items-center gap-1">
          {optional ? (
            <span className="text-xs font-normal text-[#6F6F69]">
              {t("optional")}
            </span>
          ) : null}
          {help}
        </div>
      </div>

      {cloneElement(children, {
        id: children.props.id || controlId,
        name: children.props.name || name,
        "aria-describedby": children.props["aria-describedby"] || descriptionId,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })}

      {error ? (
        <p id={descriptionId} className="mt-2 text-xs leading-5 text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={descriptionId} className="mt-2 text-xs leading-5 text-[#6F6F69]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cx(controlClasses, className)} {...props} />;
}

export function Select({ children, className, ...props }) {
  return (
    <div className="relative">
      <select
        data-select-custom-arrow="true"
        className={cx(
          controlClasses,
          "appearance-none bg-none pr-11",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 size-[18px] -translate-y-1/2 text-[#6F6F69]"
        data-select-chevron
      />
    </div>
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cx(controlClasses, "min-h-32 resize-y py-4", className)}
      {...props}
    />
  );
}
