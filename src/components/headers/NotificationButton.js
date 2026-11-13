"use client";

import { memo } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { classNames, headerStatusBadgeClass } from "./header.utils";

const NotificationButton = memo(function NotificationButton({
  className = "",
  hasUnread = false,
  tenantThemed = false,
  href = "/portal/notifications",
}) {
  const t = useTranslations("Dashboard.routeTitles");

  return (
    <Link
      href={href}
      aria-label={t("notifications")}
      data-header-action="notifications"
      className={classNames(
        "group relative inline-flex h-11 w-11 items-center justify-center rounded-full",
        "transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none",
        tenantThemed
          ? "text-[var(--tenant-text)] hover:bg-[color-mix(in_srgb,var(--tenant-surface)_68%,transparent)] hover:text-[var(--tenant-accent-on-surface)] focus-visible:ring-[var(--tenant-accent-link)]/30 focus-visible:ring-offset-[var(--tenant-background)]"
          : "text-[#483827] hover:bg-white/70 hover:shadow-[0_8px_22px_rgba(72,56,39,0.08)] focus-visible:ring-brand-primary/25 focus-visible:ring-offset-brand-offset",
        className,
      )}
    >
      <BellIcon aria-hidden="true" className="h-[19px] w-[19px] stroke-[1.6]" />

      {hasUnread && (
        <span
          className={classNames(
            headerStatusBadgeClass,
            "bg-[#b9856c]",
            tenantThemed ? "ring-[var(--tenant-background)]" : "ring-[#f7f3ee]",
          )}
          data-header-badge="notification"
          style={
            tenantThemed
              ? {
                  backgroundColor: "var(--tenant-accent)",
                }
              : undefined
          }
        />
      )}
    </Link>
  );
});

export default NotificationButton;
