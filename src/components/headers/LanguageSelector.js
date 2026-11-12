"use client";

import { Fragment, memo, useMemo, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";

import { getLocaleDefinition, normalizeLocaleCode } from "@/i18n/locales";
import { persistExplicitLocalePreference } from "@/i18n/localePreference";
import { persistCustomerCurrentLocale } from "@/i18n/customerLocalePreference";
import { useOptionalPublicTenant } from "@/components/public-tenant/PublicTenantProvider";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

import { classNames } from "./header.utils";

const LanguageSelector = memo(function LanguageSelector({
  variant = "desktop",
  onLocaleChange,
  tenantThemed = false,
  tenantScoped = false,
  tenantSlug,
  localeCodes,
  contextLabel = "Shario",
  hideWhenSingle = false,
}) {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const publicTenant = useOptionalPublicTenant()?.tenant;
  const customerTenantSlug = tenantSlug || publicTenant?.slug;

  const [isChangingLocale, startLocaleTransition] = useTransition();

  const isMobile = variant === "mobile";
  const isCompact = variant === "compact";

  const currentHref = useMemo(() => {
    const currentPathname = pathname || "/";
    const queryString = searchParams?.toString();

    return queryString ? `${currentPathname}?${queryString}` : currentPathname;
  }, [pathname, searchParams]);

  const currentDefinition = getLocaleDefinition(locale);
  const currentLocale = currentDefinition || {
    nativeName: locale,
    shortLabel: locale.toUpperCase(),
  };

  const availableLocaleCodes = useMemo(() => {
    if (!Array.isArray(localeCodes)) return routing.locales;

    const routeableLocales = new Set(routing.locales);

    return [
      ...new Set(
        localeCodes
          .map(normalizeLocaleCode)
          .filter((localeCode) => routeableLocales.has(localeCode)),
      ),
    ];
  }, [localeCodes]);

  const availableLocales = availableLocaleCodes.map((localeCode) => {
    const definition = getLocaleDefinition(localeCode);

    return {
      code: localeCode,
      label: definition?.nativeName || localeCode.toUpperCase(),
      shortLabel: definition?.shortLabel || localeCode.toUpperCase(),
    };
  });

  if (hideWhenSingle && availableLocales.length <= 1) return null;

  const handleLocaleChange = (nextLocale, close = () => {}) => {
    if (customerTenantSlug) {
      persistCustomerCurrentLocale(nextLocale, customerTenantSlug);
    } else if (!tenantScoped && !tenantThemed) {
      persistExplicitLocalePreference(nextLocale);
    }

    if (nextLocale === locale) {
      close();
      return;
    }

    close();
    onLocaleChange?.();

    startLocaleTransition(() => {
      const hash = window.location.hash;

      router.replace(`${currentHref}${hash}`, {
        locale: nextLocale,
        scroll: false,
      });
    });
  };

  // Native options stay usable inside the profile drawer's clipped footer.
  if (variant === "profile") {
    return (
      <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-[var(--tenant-radius-field,12px)] px-2 text-[var(--tenant-text,#292925)]">
        <GlobeAltIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only">{t("changeLanguage")}</span>
        <select
          value={locale}
          disabled={isChangingLocale || availableLocales.length <= 1}
          onChange={(event) => handleLocaleChange(event.target.value)}
          data-language-selector-trigger
          className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent text-[12px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-link)]/30 disabled:opacity-60"
        >
          {availableLocales.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <Popover className={classNames("relative", isMobile && "w-full")}>
      {({ open, close }) => (
        <>
          <PopoverButton
            disabled={isChangingLocale}
            data-tenant-hover="preserve"
            data-language-selector-trigger
            aria-label={
              isMobile
                ? t("changeLanguage")
                : `${t("changeLanguage")} (${currentLocale.shortLabel})`
            }
            className={classNames(
              "group transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2",
              tenantThemed || tenantScoped
                ? "focus-visible:ring-[var(--tenant-accent-link)]/30"
                : "focus-visible:ring-brand-primary/25",
              "disabled:cursor-wait disabled:opacity-50",
              isMobile
                ? "flex min-h-11 w-full items-center justify-between rounded-[14px] px-3 text-[12px] font-medium text-[#686864] hover:bg-white hover:text-[#11110F]"
                : isCompact
                  ? "inline-flex h-11 items-center gap-1.5 rounded-full border border-[#E7E4DE] bg-white/70 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#1F1F1F] hover:border-[#D8D3CA] hover:bg-white hover:text-primary-text"
                  : tenantThemed
                    ? "inline-flex h-11 items-center gap-1 rounded-full px-2 text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--tenant-text)] hover:bg-[var(--tenant-surface)] hover:text-[var(--tenant-accent-on-surface)]"
                    : tenantScoped
                      ? "inline-flex h-11 items-center gap-1 rounded-full px-2 text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--tenant-text)] hover:bg-[color-mix(in_srgb,var(--tenant-surface)_76%,transparent)] hover:text-[var(--tenant-accent-link)]"
                      : "inline-flex h-10 items-center gap-1 px-1 text-[10px] font-medium uppercase tracking-[0.07em] text-[#686864] hover:text-primary-text",
              tenantScoped &&
                !tenantThemed &&
                open &&
                "bg-[color-mix(in_srgb,var(--tenant-surface)_76%,transparent)] text-[var(--tenant-accent-link)]",
            )}
            style={
              tenantThemed && open
                ? { color: "var(--tenant-accent-on-surface)" }
                : undefined
            }
          >
            <span className="inline-flex items-center gap-2">
              <GlobeAltIcon
                className={
                  isMobile ? "h-4 w-4 stroke-[1.6]" : "h-3 w-3 stroke-[1.6]"
                }
                aria-hidden="true"
              />

              {isMobile && <span>{t("changeLanguage")}</span>}

              {!isMobile && <span>{currentLocale.shortLabel}</span>}
            </span>

            <span className="inline-flex items-center gap-1.5">
              {isMobile && (
                <span className="font-semibold uppercase tracking-[0.08em] text-[#11110F]">
                  {currentLocale.shortLabel}
                </span>
              )}

              <ChevronDownIcon
                className={classNames(
                  "h-3 w-3 stroke-[1.7]",
                  "transition-transform duration-200",
                  open && "rotate-180",
                )}
                aria-hidden="true"
              />
            </span>
          </PopoverButton>

          <Transition
            as={Fragment}
            enter="transition duration-200 ease-out"
            enterFrom="translate-y-1 scale-[0.98] opacity-0"
            enterTo="translate-y-0 scale-100 opacity-100"
            leave="transition duration-150 ease-in"
            leaveFrom="translate-y-0 scale-100 opacity-100"
            leaveTo="translate-y-1 scale-[0.98] opacity-0"
          >
            <PopoverPanel
              data-language-selector-panel
              className={classNames(
                "absolute z-[120] overflow-hidden",
                "rounded-[16px] border",
                tenantThemed
                  ? "border-[var(--tenant-border)] bg-[var(--tenant-auth-form-surface,var(--tenant-surface))]"
                  : "border-line bg-surface-raised/98",
                "shadow-[0_20px_60px_rgba(17,17,15,0.12)]",
                "backdrop-blur-xl focus:outline-none",
                isMobile
                  ? "bottom-[calc(100%+8px)] right-0 w-full"
                  : "right-0 top-[calc(100%+12px)] w-56",
              )}
            >
              <div
                className={classNames(
                  "border-b px-4 py-3.5",
                  tenantThemed
                    ? "border-[var(--tenant-border)]"
                    : "border-[#E7E4DE]",
                )}
              >
                <p
                  className={classNames(
                    "text-[9px] font-semibold uppercase tracking-[0.14em]",
                    tenantThemed
                      ? "text-[var(--tenant-auth-form-secondary,var(--tenant-label-color))]"
                      : "text-accent-text",
                  )}
                >
                  {contextLabel}
                </p>

                <p
                  className={classNames(
                    "mt-1 text-[13px] font-semibold tracking-[-0.02em]",
                    tenantThemed
                      ? "text-[var(--tenant-auth-form-text,var(--tenant-text))]"
                      : "text-[#11110F]",
                  )}
                >
                  {t("changeLanguage")}
                </p>
              </div>

              <div className="max-h-[min(420px,70vh)] overflow-y-auto p-2">
                {availableLocales.map(({ code, label, shortLabel }) => {
                  const selected = code === locale;

                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleLocaleChange(code, close)}
                      aria-pressed={selected}
                      className={classNames(
                        "group flex min-h-[46px] w-full",
                        "items-center justify-between gap-4",
                        "rounded-[10px] px-3 text-left",
                        "transition-colors duration-200",
                        "focus-visible:outline-none",
                        "focus-visible:ring-2",
                        tenantThemed
                          ? "focus-visible:ring-[var(--tenant-auth-form-secondary,var(--tenant-interactive-hover))]/30"
                          : "focus-visible:ring-brand-primary/25",
                        selected
                          ? tenantThemed
                            ? "bg-[var(--tenant-secondary)] text-[var(--tenant-secondary-foreground)]"
                            : "bg-skab-cobalt-50 text-[#11110F]"
                          : tenantThemed
                            ? "text-[var(--tenant-auth-form-muted,var(--tenant-text))] hover:bg-[var(--tenant-auth-form-surface,var(--tenant-surface))] hover:text-[var(--tenant-auth-form-secondary,var(--tenant-interactive-hover))]"
                            : "text-[#52524D] hover:bg-white hover:text-[#11110F]",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={classNames(
                            "w-6 text-[9px] font-semibold",
                            "uppercase tracking-[0.08em]",
                            selected
                              ? tenantThemed
                                ? "text-current"
                                : "text-primary-text"
                              : tenantThemed
                                ? "text-[var(--tenant-auth-form-muted,var(--tenant-muted-text))]"
                                : "text-[#999991]",
                          )}
                        >
                          {shortLabel}
                        </span>

                        <span className="text-[12px] font-medium">{label}</span>
                      </span>

                      <CheckIcon
                        className={classNames(
                          "h-4 w-4 stroke-[2]",
                          selected
                            ? tenantThemed
                              ? "text-current opacity-100"
                              : "text-primary-text opacity-100"
                            : "opacity-0",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </PopoverPanel>
          </Transition>
        </>
      )}
    </Popover>
  );
});

export default LanguageSelector;
