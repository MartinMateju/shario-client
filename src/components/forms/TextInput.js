"use client";

import { forwardRef, useId } from "react";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const baseInputStyles =
  "block h-[58px] w-full appearance-none rounded-none border-0 border-b bg-transparent px-0 py-3 font-sans text-[17px] outline-none transition-colors duration-200 focus:ring-0 disabled:cursor-not-allowed disabled:text-[#8d8076] disabled:placeholder:text-[#b7aa9e] disabled:opacity-60";

const variants = {
  underline:
    "border-[#cfc5bb] text-[#1f1b18] placeholder:text-[#74675d] focus:border-[#925136]",
  error:
    "border-red-300 text-[#1f1b18] placeholder:text-red-300 focus:border-red-500",
};

const labelStyles =
  "mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.28em] text-[#74675d]";

const helperStyles = "mt-2 text-sm leading-6 text-[#665b52]";
const errorStyles = "mt-2 text-sm leading-6 text-red-700";

const TextInput = forwardRef(function TextInput(
  {
    id,
    label,
    helperText,
    error,
    className = "",
    inputClassName = "",
    labelClassName = "",
    helperClassName = "",
    errorClassName = "",
    leftElement,
    rightElement,
    variant = "underline",
    disabled = false,
    required = false,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hasError = Boolean(error);

  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = hasError ? `${inputId}-error` : undefined;
  const describedBy =
    [helperId, errorId].filter(Boolean).join(" ") || undefined;

  const selectedVariant = variants[variant] || variants.underline;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className={cx(labelStyles, labelClassName)}>
          {label}
          {required && <span className="ml-1 text-[#925136]">*</span>}
        </label>
      )}

      <div className="relative">
        {leftElement && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            {leftElement}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          className={cx(
            baseInputStyles,
            hasError ? variants.error : selectedVariant,
            leftElement && "pl-10",
            rightElement && "pr-12",
            inputClassName,
          )}
          aria-invalid={hasError || undefined}
          aria-disabled={disabled || undefined}
          aria-describedby={describedBy}
          data-invalid={hasError ? "true" : undefined}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>

      {helperText && (
        <p id={helperId} className={cx(helperStyles, helperClassName)}>
          {helperText}
        </p>
      )}

      {hasError && (
        <p id={errorId} className={cx(errorStyles, errorClassName)}>
          {error}
        </p>
      )}
    </div>
  );
});

TextInput.displayName = "TextInput";

export default TextInput;
