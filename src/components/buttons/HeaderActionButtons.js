"use client";

import { Link } from "@/i18n/navigation";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const baseFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/25 focus-visible:ring-offset-4 focus-visible:ring-offset-brand-offset";

export function HeaderTextLink({ href, children, className = "" }) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex items-center border-b border-[#2b2520]/30 pb-1",
        "font-sans text-[10px] font-medium uppercase tracking-[0.28em]",
        "text-[#5f554d] transition-colors duration-300",
        "hover:border-brand-accent hover:text-accent-text",
        baseFocus,
        className,
      )}
    >
      <span className="text-current">{children}</span>
    </Link>
  );
}

export function HeaderPillLink({ href, children, className = "" }) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex items-center justify-center rounded-full border border-[#2b2520]/20",
        "px-5 py-2.5 font-sans text-[10px] font-medium uppercase tracking-[0.26em]",
        "text-[#2b2520] transition-all duration-300",
        "hover:border-brand-accent hover:bg-brand-accent hover:text-ink",
        baseFocus,
        className,
      )}
    >
      <span className="text-current">{children}</span>
    </Link>
  );
}

export function HeaderIconButton({
  children,
  className = "",
  badge = 0,
  badgeLabel,
  ...props
}) {
  return (
    <button
      type="button"
      className={cx(
        "group relative inline-flex h-10 w-10 items-center justify-center rounded-full",
        "text-[#2b2520] transition-all duration-300",
        "hover:bg-brand-accent/12 hover:text-accent-text",
        baseFocus,
        className,
      )}
      {...props}
    >
      <span className="text-current [&_svg]:text-current [&_svg]:stroke-current">
        {children}
      </span>

      {badge > 0 && (
        <span
          aria-label={badgeLabel}
          className="absolute right-0 top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand-accent px-[5px] text-[9px] font-medium leading-none text-ink ring-2 ring-brand-offset"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export function HeaderMenuButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={cx(
        "group inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-2",
        "text-[#5f554d] transition-all duration-300",
        "hover:bg-brand-accent/12 hover:text-accent-text",
        baseFocus,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
