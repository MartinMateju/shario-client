"use client";

import { forwardRef } from "react";

const cx = (...values) => values.filter(Boolean).join(" ");

const variantClasses = {
  primary: [
    "border border-[#1F1F1F] bg-[#1F1F1F] text-white",
    "hover:border-brand-primary hover:bg-brand-primary",
    "focus-visible:outline-brand-primary",
  ].join(" "),
  secondary: [
    "border border-skab-offset-300 bg-white text-[#1F1F1F]",
    "hover:border-[#1F1F1F] hover:bg-surface",
    "focus-visible:outline-brand-primary",
  ].join(" "),
  ghost: [
    "border border-transparent bg-transparent text-[#1F1F1F]",
    "hover:bg-surface",
    "focus-visible:outline-brand-primary",
  ].join(" "),
};

const sizeClasses = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-12 px-5 text-sm",
  lg: "min-h-14 px-6 text-[15px]",
};

export const Button = forwardRef(function Button(
  {
    children,
    className,
    disabled = false,
    fullWidth = false,
    leadingIcon,
    loading = false,
    size = "lg",
    trailingIcon,
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cx(
        "group inline-flex items-center justify-center gap-3 rounded-full font-medium",
        "transition-[color,background-color,border-color,transform,box-shadow] duration-300 ease-out",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
        />
      ) : (
        leadingIcon
      )}

      <span>{children}</span>

      {trailingIcon && (
        <span
          aria-hidden="true"
          className="ml-auto transition-transform duration-300 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
        >
          {trailingIcon}
        </span>
      )}
    </button>
  );
});
