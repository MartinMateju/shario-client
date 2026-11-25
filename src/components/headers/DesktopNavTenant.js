"use client";

import { Link } from "@/i18n/navigation";
import { SKAB_BRAND_COLORS } from "@/config/brandPalette";

import { classNames, isActivePath } from "./header.utils";
import styles from "./customerPortalHeader.module.css";
import CustomNavigationGroup from "./CustomNavigationGroup";

export default function DesktopNavTenant({
  pathname = "",
  items = [],
  accentLinkColor = SKAB_BRAND_COLORS.primary,
  variant = "default",
  navigationLabel = "Studio navigation",
}) {
  const isPortal = variant === "portal";

  return (
    <nav
      className={classNames(
        styles.tenantNavigation,
        "flex max-w-full items-center gap-x-6",
        items.some((item) => item.children)
          ? "overflow-visible"
          : "overflow-x-auto",
        items.some((item) => item.custom) ? "2xl:gap-x-8" : "2xl:gap-x-10",
      )}
      aria-label={navigationLabel}
      data-tenant-navigation
      data-tenant-navigation-layout="flat"
      data-customer-portal-navigation-layout={isPortal ? "flat" : undefined}
    >
      {items.map((item) => {
        if (item.children)
          return (
            <CustomNavigationGroup
              key={item.key}
              item={item}
              accentLinkColor={accentLinkColor}
            />
          );
        const active = !item.custom && isActivePath(pathname, item.href);
        const ItemLink = item.custom ? "a" : Link;

        return (
          <ItemLink
            key={item.key || item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-tenant-navigation-item
            data-customer-portal-navigation-item={isPortal || undefined}
            className={classNames(
              "group relative inline-flex shrink-0 min-h-11 min-w-0 items-center justify-center whitespace-nowrap px-0.5",
              "text-[13px] font-semibold tracking-[-0.012em] text-[var(--tenant-accent-link)] 2xl:text-[14px]",
              "transition-colors duration-300 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-background)]",
              "motion-reduce:transition-none",
              item.emphasis === "button"
                ? "rounded-lg bg-[var(--tenant-accent)] px-4 text-[var(--tenant-accent-foreground)]"
                : "",
            )}
            style={{
              color:
                item.emphasis === "button"
                  ? "var(--tenant-accent-foreground)"
                  : active
                    ? "var(--tenant-interactive-hover)"
                    : accentLinkColor,
              fontFamily: "var(--tenant-font-label)",
              fontSize: isPortal
                ? "clamp(0.8125rem, 0.78vw, 0.9375rem)"
                : "clamp(0.875rem, 0.85vw, 1.0625rem)",
              fontWeight: 600,
              letterSpacing: "-0.012em",
              lineHeight: 1.25,
              minHeight: "2.75rem",
              textTransform: "var(--tenant-header-text-transform, none)",
            }}
          >
            <span className="truncate">{item.label || item.key}</span>
            <span
              aria-hidden="true"
              data-tenant-navigation-indicator
              data-customer-portal-active-indicator={isPortal || undefined}
              className={classNames(
                isPortal
                  ? "pointer-events-none absolute inset-x-0.5 bottom-0 h-0.5 origin-center bg-current transition-transform duration-200 ease-out motion-reduce:transition-none"
                  : "absolute inset-x-0.5 bottom-1 h-[2px] rounded-full bg-current transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none",
                isPortal
                  ? active
                    ? "scale-x-100"
                    : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  : active
                    ? "origin-left scale-x-100 opacity-100"
                    : "origin-right scale-x-0 opacity-0 group-hover:origin-left group-hover:scale-x-100 group-hover:opacity-100 group-focus-visible:origin-left group-focus-visible:scale-x-100 group-focus-visible:opacity-100",
              )}
            />
          </ItemLink>
        );
      })}
    </nav>
  );
}
