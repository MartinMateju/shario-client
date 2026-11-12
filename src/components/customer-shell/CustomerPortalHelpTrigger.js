"use client";

import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { useLocale } from "next-intl";

/*
 * The header renders this button on every portal page, while the help drawer
 * it opens loads on demand. Keep the button outside the drawer module so the
 * header does not pull the drawer into the initial bundle.
 */
export const CUSTOMER_PORTAL_HELP_TRIGGER_LABELS = Object.freeze({
  en: "Help and guides",
  cs: "Nápověda a návody",
});

export function CustomerPortalHelpTrigger({
  controls,
  expanded = false,
  onOpen,
}) {
  const locale = useLocale();
  const label =
    CUSTOMER_PORTAL_HELP_TRIGGER_LABELS[locale === "cs" ? "cs" : "en"];

  return (
    <button
      type="button"
      aria-controls={controls}
      aria-expanded={expanded}
      aria-haspopup="dialog"
      aria-label={label}
      title={label}
      onClick={onOpen}
      data-header-action="help"
      data-customer-portal-help-trigger
      data-tenant-hover="preserve"
      className="group relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-transparent text-[var(--tenant-text)] transition-[border-color,background-color,color] duration-200 hover:border-[var(--tenant-secondary)] hover:bg-[var(--tenant-surface)] hover:text-[var(--tenant-secondary)] aria-expanded:border-[var(--tenant-secondary)] aria-expanded:bg-[var(--tenant-surface)] aria-expanded:text-[var(--tenant-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-secondary)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--tenant-background)] motion-reduce:transition-none"
    >
      <QuestionMarkCircleIcon
        className="h-[19px] w-[19px] stroke-[1.6]"
        aria-hidden="true"
      />
    </button>
  );
}
