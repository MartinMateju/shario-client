"use client";

import { ArrowLongRightIcon } from "@heroicons/react/24/outline";

import { Link } from "@/i18n/navigation";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const baseStyles =
  "group inline-flex min-h-[54px] items-center justify-center gap-3 rounded-full px-7 py-3 font-sans text-[11px] font-medium uppercase tracking-[0.24em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-4 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "border border-brand-primary bg-brand-primary text-white shadow-[0_12px_28px_rgb(var(--skab-blue-rgb)/0.2)] hover:border-primary-hover hover:bg-primary-hover hover:shadow-[0_16px_34px_rgb(var(--skab-blue-rgb)/0.28)] focus-visible:ring-brand-primary/30 focus-visible:ring-offset-brand-offset",

  secondary:
    "border border-[#2b2520]/25 bg-white/20 text-[#2b2520] hover:border-brand-accent hover:bg-white/35 hover:text-accent-text focus-visible:ring-offset-brand-offset",

  ghost:
    "border border-transparent bg-transparent text-[#2b2520] hover:bg-white/35 hover:text-accent-text focus-visible:ring-offset-brand-offset",

  text: "min-h-0 rounded-none border-b border-[#2b2520]/35 px-0 py-1 text-[#2b2520] hover:border-brand-accent hover:text-accent-text focus-visible:ring-offset-brand-offset",
};

export default function Button({
  href,
  type = "button",
  variant = "primary",
  fullWidth = false,
  showArrow = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  const classes = cx(
    baseStyles,
    variants[variant] || variants.primary,
    fullWidth && "w-full",
    className,
  );

  const content = (
    <>
      {children}

      {showArrow && (
        <ArrowLongRightIcon
          className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-disabled={disabled || undefined}
        {...props}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} className={classes} {...props}>
      {content}
    </button>
  );
}
