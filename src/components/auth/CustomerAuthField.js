"use client";

import { forwardRef, useId, useState } from "react";
import {
  ArrowLongRightIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const CustomerAuthField = forwardRef(function CustomerAuthField(
  {
    error = "",
    helperText = "",
    id,
    inputClassName = "",
    compact = false,
    label,
    rightElement,
    touched = false,
    valid = false,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hasError = Boolean(error);
  const showValid = touched && valid && !hasError && Boolean(props.value);
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = hasError ? `${inputId}-error` : undefined;
  const describedBy =
    [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="min-w-0">
      <label
        htmlFor={inputId}
        className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em]"
        data-tenant-type="label"
        style={{
          color:
            "var(--tenant-page-label-color, var(--tenant-auth-form-label))",
        }}
      >
        {label}
        {props.required ? (
          <span
            aria-hidden="true"
            className="ml-1 text-[var(--tenant-page-label-color,var(--tenant-auth-form-label))]"
          >
            *
          </span>
        ) : null}
      </label>

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
          data-tenant-surface="field"
          className={cx(
            "block w-full appearance-none rounded-[16px] border bg-[var(--tenant-auth-field-surface)] px-4 py-3 text-[15px] text-[var(--tenant-auth-field-text,var(--tenant-auth-form-text))] shadow-[0_8px_24px_rgba(25,26,24,0.035)] outline-none transition duration-200 placeholder:text-[var(--tenant-auth-field-muted,var(--tenant-auth-form-muted))] focus:ring-4 disabled:cursor-not-allowed disabled:opacity-55",
            compact ? "min-h-[52px]" : "min-h-14 sm:min-h-[58px]",
            hasError
              ? "border-[var(--tenant-auth-field-error,var(--tenant-auth-field-text))] focus:border-[var(--tenant-auth-field-error,var(--tenant-auth-field-text))] focus:ring-[var(--tenant-auth-field-error,var(--tenant-auth-field-text))]/15"
              : showValid
                ? "border-[var(--tenant-auth-field-success,var(--tenant-auth-field-text))] focus:border-[var(--tenant-auth-field-success,var(--tenant-auth-field-text))] focus:ring-[var(--tenant-auth-field-success,var(--tenant-auth-field-text))]/15"
                : "border-[color-mix(in_srgb,var(--tenant-auth-field-text)_16%,transparent)] focus:border-[var(--tenant-auth-field-secondary,var(--tenant-interactive-hover))] focus:ring-[var(--tenant-auth-field-secondary,var(--tenant-interactive-hover))]/15",
            (rightElement || showValid) && "pr-12",
            inputClassName,
          )}
          {...props}
        />

        {rightElement ? (
          <div className="absolute inset-y-0 right-1 flex items-center">
            {rightElement}
          </div>
        ) : showValid ? (
          <CheckCircleIcon
            aria-hidden="true"
            className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--tenant-auth-field-success,var(--tenant-auth-field-text))]"
          />
        ) : null}
      </div>

      {helperText ? (
        <p
          id={helperId}
          className="mt-2 text-xs leading-5 text-[var(--tenant-auth-form-muted)]"
        >
          {helperText}
        </p>
      ) : null}

      {hasError ? (
        <p
          id={errorId}
          className="mt-2 text-xs leading-5 text-[var(--tenant-auth-form-error,var(--tenant-auth-form-text))]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
});

CustomerAuthField.displayName = "CustomerAuthField";

export const CustomerAuthPasswordField = forwardRef(
  function CustomerAuthPasswordField(
    { hidePasswordLabel, showPasswordLabel, ...props },
    ref,
  ) {
    const [isVisible, setIsVisible] = useState(false);
    const visibilityLabel = isVisible ? hidePasswordLabel : showPasswordLabel;

    return (
      <CustomerAuthField
        ref={ref}
        {...props}
        type={isVisible ? "text" : "password"}
        rightElement={
          <button
            type="button"
            onClick={() => setIsVisible((value) => !value)}
            className={cx(
              "inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--tenant-auth-field-muted,var(--tenant-auth-form-muted))] transition hover:bg-[color-mix(in_srgb,var(--tenant-auth-field-text)_5%,transparent)] hover:text-[var(--tenant-auth-field-text,var(--tenant-auth-form-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-auth-field-secondary,var(--tenant-interactive-hover))]/30",
              isVisible &&
                "text-[var(--tenant-auth-field-secondary,var(--tenant-interactive-hover))]",
            )}
            aria-label={visibilityLabel}
            aria-pressed={isVisible}
          >
            {isVisible ? (
              <EyeSlashIcon aria-hidden="true" className="h-5 w-5" />
            ) : (
              <EyeIcon aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        }
      />
    );
  },
);

CustomerAuthPasswordField.displayName = "CustomerAuthPasswordField";

export const CustomerAuthError = forwardRef(function CustomerAuthError(
  { children },
  ref,
) {
  if (!children) return null;

  return (
    <div
      ref={ref}
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
      tabIndex={-1}
    >
      {children}
    </div>
  );
});

CustomerAuthError.displayName = "CustomerAuthError";

export function CustomerAuthSubmitButton({
  children,
  className = "",
  ...props
}) {
  return (
    <button
      data-tenant-button="primary"
      className={cx(
        "group inline-flex min-h-[54px] w-full items-center justify-center gap-3 rounded-full border border-[var(--tenant-accent)] bg-[var(--tenant-accent)] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tenant-accent-foreground)] shadow-[0_14px_34px_rgba(25,26,24,0.14)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(25,26,24,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tenant-page-label-color)]/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <ArrowLongRightIcon
        aria-hidden="true"
        className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"
      />
    </button>
  );
}

export default CustomerAuthField;
