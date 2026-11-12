import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { normalizeCurrency } from "@/config/currencies";
import { formatMajorCurrencyAmount } from "@/utils/money";

const cx = (...classes) => classes.filter(Boolean).join(" ");

/*
 * Customer-portal appearance controls intentionally expose a small, semantic
 * palette. Scoping the existing tenant tokens at each portal surface keeps the
 * calendar and account components consistent without teaching every nested
 * control about the website-builder contract.
 */
export const customerPortalHeaderThemeStyle = {
  "--tenant-background": "var(--tenant-portal-header-background)",
  "--tenant-surface": "var(--tenant-portal-header-surface)",
  "--tenant-text": "var(--tenant-portal-header-text)",
  "--tenant-text-on-surface": "var(--tenant-portal-header-text-on-surface)",
  "--tenant-muted-text": "var(--tenant-portal-header-muted)",
  "--tenant-text-muted": "var(--tenant-portal-header-muted)",
  "--tenant-muted-on-surface": "var(--tenant-portal-header-muted)",
  "--tenant-border": "var(--tenant-portal-header-border)",
  "--tenant-label-color": "var(--tenant-portal-header-accent)",
  "--tenant-accent": "var(--tenant-portal-button)",
  "--tenant-accent-foreground": "var(--tenant-portal-button-foreground)",
  "--tenant-accent-link": "var(--tenant-portal-header-accent)",
  "--tenant-accent-on-surface": "var(--tenant-portal-header-accent)",
  "--tenant-heading-color": "var(--tenant-portal-header-heading)",
  "--tenant-interactive-hover": "var(--tenant-portal-header-secondary)",
  "--tenant-interactive-hover-on-surface":
    "var(--tenant-portal-header-secondary-on-surface)",
};

export const customerPortalCalendarThemeStyle = {
  "--tenant-background": "var(--tenant-portal-calendar-background)",
  "--tenant-surface": "var(--tenant-portal-calendar-surface)",
  "--tenant-calendar-available-surface":
    "var(--tenant-portal-calendar-available-surface)",
  "--tenant-calendar-available-text":
    "var(--tenant-portal-calendar-available-text)",
  "--tenant-calendar-available-accent":
    "var(--tenant-portal-calendar-available-accent)",
  "--tenant-text": "var(--tenant-portal-calendar-text)",
  "--tenant-text-on-surface": "var(--tenant-portal-calendar-text-on-surface)",
  "--tenant-muted-text": "var(--tenant-portal-calendar-muted)",
  "--tenant-text-muted": "var(--tenant-portal-calendar-muted)",
  "--tenant-muted-on-surface": "var(--tenant-portal-calendar-muted)",
  "--tenant-border": "var(--tenant-portal-calendar-border)",
  "--tenant-label-color": "var(--tenant-portal-calendar-label)",
  "--tenant-accent": "var(--tenant-portal-button)",
  "--tenant-accent-foreground": "var(--tenant-portal-button-foreground)",
  "--tenant-accent-link": "var(--tenant-portal-calendar-accent)",
  "--tenant-accent-on-surface": "var(--tenant-portal-calendar-accent)",
  "--tenant-heading-color": "var(--tenant-portal-calendar-heading)",
  "--tenant-heading-on-surface":
    "var(--tenant-portal-calendar-heading-on-surface)",
  "--tenant-interactive-hover": "var(--tenant-portal-calendar-accent)",
  "--tenant-interactive-hover-on-surface":
    "var(--tenant-portal-calendar-accent)",
};

export const customerPortalProfileThemeStyle = {
  "--tenant-background": "var(--tenant-portal-profile-background)",
  "--tenant-surface": "var(--tenant-portal-profile-surface)",
  "--tenant-text": "var(--tenant-portal-profile-text)",
  "--tenant-text-on-surface": "var(--tenant-portal-profile-text-on-surface)",
  "--tenant-muted-text": "var(--tenant-portal-profile-muted)",
  "--tenant-text-muted": "var(--tenant-portal-profile-muted)",
  "--tenant-muted-on-surface": "var(--tenant-portal-profile-muted)",
  "--tenant-border": "var(--tenant-portal-profile-border)",
  "--tenant-label-color": "var(--tenant-portal-profile-label)",
  "--tenant-heading-color": "var(--tenant-portal-profile-text-on-surface)",
  "--tenant-accent": "var(--tenant-portal-button)",
  "--tenant-accent-foreground": "var(--tenant-portal-button-foreground)",
  "--tenant-accent-link": "var(--tenant-portal-profile-accent)",
  "--tenant-accent-on-surface": "var(--tenant-portal-profile-accent)",
  "--tenant-interactive-hover": "var(--tenant-portal-profile-secondary)",
  "--tenant-interactive-hover-on-surface":
    "var(--tenant-portal-profile-secondary-on-surface)",
};

export const customerPortalPrimaryButtonStyle = {
  backgroundColor: "var(--tenant-portal-button)",
  color: "var(--tenant-portal-button-foreground)",
};

export const customerPortalPrimaryActionClass =
  "tenant-button-primary customer-portal-button-primary group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--tenant-portal-button)] px-6 text-[12px] font-semibold text-[var(--tenant-portal-button-foreground)] shadow-[0_12px_28px_color-mix(in_srgb,var(--tenant-portal-button)_22%,transparent)] transition-[transform,filter,box-shadow] duration-200 hover:-translate-y-0.5 hover:brightness-[0.97] hover:shadow-[0_16px_34px_color-mix(in_srgb,var(--tenant-portal-button)_26%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-action-focus,var(--tenant-accent-link))]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-action-focus-offset,var(--tenant-background))] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none";

export const customerPortalSecondaryActionClass =
  "tenant-button-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_15%,transparent)] bg-[var(--tenant-surface)] px-5 text-[11px] font-semibold text-[var(--tenant-text-on-surface)] shadow-[0_7px_18px_rgba(17,17,15,0.035)] transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--tenant-accent-on-surface)_42%,transparent)] hover:bg-[var(--tenant-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-action-focus,var(--tenant-accent-link))]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-action-focus-offset,var(--tenant-background))] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none";

export function CustomerPortalPage({
  children,
  className = "",
  contentClassName = "",
  ...props
}) {
  return (
    <main
      className={cx(
        "relative min-h-dvh overflow-hidden bg-[var(--tenant-background)] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-8 text-[var(--tenant-text)] sm:px-6 sm:pt-10 lg:px-10 lg:pt-12",
        className,
      )}
      data-customer-portal-page
      data-tenant-layout="page"
      {...props}
    >
      <div
        className="pointer-events-none absolute -left-32 -top-36 h-96 w-96 rounded-full bg-[color-mix(in_srgb,var(--tenant-accent)_7%,transparent)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 top-12 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--tenant-secondary)_8%,transparent)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className={cx(
          "relative mx-auto w-full max-w-[1480px]",
          contentClassName,
        )}
        data-customer-portal-page-content
      >
        {children}
      </div>
    </main>
  );
}

export function CustomerPortalPageHeader({
  actions,
  className = "",
  description,
  eyebrow,
  headingAs: Heading = "h1",
  title,
}) {
  return (
    <header
      className={cx(
        "flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
      data-customer-portal-page-header
    >
      <div className="min-w-0 max-w-4xl">
        {eyebrow ? (
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--tenant-label-color)] sm:text-[11px]"
            data-tenant-type="eyebrow"
          >
            {eyebrow}
          </p>
        ) : null}
        <Heading
          className="mt-2 text-[36px] leading-[0.98] tracking-[-0.045em] text-[var(--tenant-heading-color)] sm:text-[44px] lg:text-[52px]"
          data-tenant-type="display"
          style={{ fontFamily: "var(--tenant-font-display)" }}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-3 max-w-3xl text-[14px] leading-6 text-[var(--tenant-muted-text)] sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2.5 lg:w-auto lg:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function CustomerPortalSurface({
  as: Component = "section",
  children,
  className = "",
  ...props
}) {
  return (
    <Component
      className={cx(
        "overflow-hidden rounded-[26px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_12%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-text-on-surface)] shadow-[0_18px_54px_rgba(17,17,15,0.055)] backdrop-blur-sm [--tenant-heading-color:var(--tenant-heading-on-surface)] [--tenant-action-focus:var(--tenant-accent-on-surface)] [--tenant-action-focus-offset:var(--tenant-surface)]",
        className,
      )}
      data-customer-portal-surface
      data-tenant-surface="panel"
      {...props}
    >
      {children}
    </Component>
  );
}

export function CustomerPortalEmptyState({
  action,
  className = "",
  description,
  icon: Icon,
  title,
}) {
  return (
    <div
      className={cx(
        "flex min-h-[260px] flex-col items-center justify-center rounded-[22px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] bg-[var(--tenant-surface)] px-5 py-10 text-center text-[var(--tenant-text-on-surface)] sm:min-h-[290px] sm:px-8 [--tenant-heading-color:var(--tenant-heading-on-surface)] [--tenant-action-focus:var(--tenant-accent-on-surface)] [--tenant-action-focus-offset:var(--tenant-surface)]",
        className,
      )}
      data-customer-portal-empty-state
      data-tenant-surface="card"
    >
      {Icon ? (
        <span className="grid h-[52px] w-[52px] place-items-center rounded-[17px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] bg-[var(--tenant-surface)] text-[var(--tenant-accent-on-surface)] shadow-[0_10px_28px_rgba(17,17,15,0.05)]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      ) : null}
      <h2
        className="mt-5 text-[26px] leading-tight tracking-[-0.035em] text-[var(--tenant-heading-color)] sm:text-[30px]"
        data-tenant-type="display"
        style={{ fontFamily: "var(--tenant-font-display)" }}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-md text-[12px] leading-6 text-[var(--tenant-muted-on-surface)] sm:text-[13px]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function CustomerPortalLoadingState({ label }) {
  return (
    <div
      className="flex min-h-[260px] items-center justify-center rounded-[22px] border border-[color-mix(in_srgb,var(--tenant-text-on-surface)_10%,transparent)] bg-[var(--tenant-surface)] text-[12px] text-[var(--tenant-muted-on-surface)]"
      role="status"
      data-customer-portal-loading-state
      data-tenant-surface="card"
    >
      <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
      {label}
    </div>
  );
}

export function formatCustomerPortalCurrencyAmount(
  amount,
  currency,
  locale = "en-GB",
) {
  const normalizedCurrency = normalizeCurrency(currency);
  const value = Number(amount);
  if (!Number.isFinite(value) || !normalizedCurrency) return "—";

  if (normalizedCurrency === "CZK") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return formatMajorCurrencyAmount(value, normalizedCurrency, locale);
}
