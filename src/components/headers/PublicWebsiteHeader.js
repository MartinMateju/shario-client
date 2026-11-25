"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import TenantLogoLink from "@/components/brand/TenantLogoLink";
import { useMissedImageError } from "@/hooks/useMissedImageError";
import {
  getLocalizedPublicTenantText,
  getPublicTenantTheme,
  normalizePublicTenantColor,
} from "@/components/public-tenant/publicTenant.config";
import styles from "./publicWebsiteHeader.module.css";

const languageLabel = (locale) =>
  locale === "cs" ? "CZ" : locale.toUpperCase();

function NavigationLink({ item, children, ...props }) {
  const ItemLink = item.custom ? "a" : Link;
  return (
    <ItemLink href={item.href} data-tenant-hover="preserve" {...props}>
      {children || item.label}
    </ItemLink>
  );
}

function WebsiteLogo({ branding, onClick }) {
  const [failedLogoUrl, setFailedLogoUrl] = useState("");
  const imageRef = useRef(null);
  const logoUrl = branding.logoUrl || "";
  const name = branding.displayName || "";
  useMissedImageError(imageRef, logoUrl, setFailedLogoUrl);

  return (
    <TenantLogoLink
      branding={branding}
      className={styles.logo}
      onClick={onClick}
      aria-label={name}
      data-tenant-hover="preserve"
    >
      {logoUrl && failedLogoUrl !== logoUrl ? (
        // Tenant-managed logo hosts are not restricted to Next's image allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imageRef}
          src={logoUrl}
          alt={name}
          width="132"
          height="44"
          referrerPolicy="no-referrer"
          onError={() => setFailedLogoUrl(logoUrl)}
        />
      ) : (
        <span>{name}</span>
      )}
    </TenantLogoLink>
  );
}

function Chevron() {
  return <span aria-hidden="true" className={styles.chevron} />;
}

function NavigationGroup({
  item,
  id,
  open,
  onToggle,
  onNavigate,
  mobile = false,
}) {
  return (
    <div className={styles.disclosure} data-public-website-disclosure={id}>
      <button
        id={`${id}-trigger`}
        type="button"
        data-tenant-hover="preserve"
        className={styles.groupTrigger}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
      >
        <span>{item.label}</span>
        <Chevron />
      </button>
      <div
        id={`${id}-panel`}
        className={mobile ? styles.mobileSubmenu : styles.submenu}
        hidden={!open}
      >
        {item.children.map((child) => (
          <NavigationLink
            key={child.key}
            item={child}
            className={child.separatorBefore ? styles.separator : undefined}
            onClick={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function LanguageMenu({
  locale,
  localeCodes,
  id,
  open,
  onToggle,
  onChange,
  label,
}) {
  if (localeCodes.length < 2) return null;
  return (
    <div className={styles.language} data-public-website-disclosure={id}>
      <button
        id={`${id}-trigger`}
        type="button"
        data-tenant-hover="preserve"
        className={styles.languageTrigger}
        aria-label={`${label}, ${languageLabel(locale)}`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
      >
        <span lang={locale}>{languageLabel(locale)}</span>
        <Chevron />
      </button>
      <div id={`${id}-panel`} className={styles.languageOptions} hidden={!open}>
        {localeCodes.map((code) => (
          <button
            key={code}
            type="button"
            data-tenant-hover="preserve"
            lang={code}
            aria-current={code === locale ? "true" : undefined}
            onClick={() => onChange(code)}
          >
            {languageLabel(code)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PublicWebsiteHeader({
  tenant,
  items = [],
  locale = "en",
  localeCodes = ["en"],
  onLocaleChange,
}) {
  const t = useTranslations("Header");
  const publicT = useTranslations("PublicTenant");
  const id = `website-header-${useId().replaceAll(":", "")}`;
  const [activeDisclosure, setActiveDisclosure] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeRef = useRef(null);
  const theme = getPublicTenantTheme(tenant);
  const branding = tenant?.publicSite?.branding || {};
  const header = tenant?.publicSite?.header || {};
  const navigationItems = items.filter(
    (item) => item.emphasis !== "button" || item.children?.length,
  );
  const actions = items.filter(
    (item) => item.emphasis === "button" && !item.children?.length,
  );
  // Keep tenant-authored long labels intact instead of squeezing or clipping
  // them in the desktop row. The compact navigation remains available at any
  // viewport width, including when a translated label is much longer.
  const compact =
    navigationItems.length > 6 ||
    items.some((item) => (item.label || "").length > 30) ||
    items.reduce((length, item) => length + (item.label || "").length, 0) > 65;
  const announcement = getLocalizedPublicTenantText(
    header.announcement?.text,
    locale,
  );
  const style = {
    ...theme.style,
    "--website-header-background": normalizePublicTenantColor(
      header.backgroundColor,
      theme.backgroundColor,
    ),
    "--website-header-link": normalizePublicTenantColor(
      header.linkColor,
      theme.accentLinkColor,
    ),
    "--website-header-button": normalizePublicTenantColor(
      header.buttonColor,
      theme.accentColor,
    ),
    "--website-header-button-text": normalizePublicTenantColor(
      branding.buttonTextColor,
      theme.accentForeground,
    ),
  };

  const toggleDisclosure = (key) =>
    setActiveDisclosure((active) => (active === key ? null : key));
  const closeNavigation = () => {
    setActiveDisclosure(null);
    setMobileOpen(false);
  };
  const closeDisclosure = () => {
    if (!activeDisclosure) return false;
    document
      .getElementById(`${activeDisclosure}-trigger`)
      ?.focus({ preventScroll: true });
    setActiveDisclosure(null);
    return true;
  };
  const changeLanguage = (code) => {
    closeNavigation();
    if (code !== locale) onLocaleChange?.(code);
  };

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1100px)");
    const reset = () => {
      setMobileOpen(false);
      setActiveDisclosure(null);
    };
    media.addEventListener("change", reset);
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      media.removeEventListener("change", reset);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!activeDisclosure) return;
    const closeOutside = (event) => {
      const trigger = document.getElementById(`${activeDisclosure}-trigger`);
      if (!trigger?.parentElement?.contains(event.target))
        setActiveDisclosure(null);
    };
    const escape = (event) => {
      if (event.key !== "Escape" || mobileOpen) return;
      event.preventDefault();
      document
        .getElementById(`${activeDisclosure}-trigger`)
        ?.focus({ preventScroll: true });
      setActiveDisclosure(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [activeDisclosure, mobileOpen]);

  const languageMenu = (suffix) => {
    const languageId = `${id}-${suffix}-language`;
    return (
      <LanguageMenu
        locale={locale}
        localeCodes={localeCodes}
        id={languageId}
        open={activeDisclosure === languageId}
        onToggle={() => toggleDisclosure(languageId)}
        onChange={changeLanguage}
        label={t("mobile.language")}
      />
    );
  };

  return (
    <>
      <header
        className={`${styles.header} ${scrolled ? styles.scrolled : ""} ${compact ? styles.compact : ""}`}
        style={style}
        data-public-website-header
        data-compact={compact || undefined}
      >
        <div className={styles.row}>
          <WebsiteLogo branding={branding} onClick={closeNavigation} />
          <nav
            className={styles.desktopNavigation}
            aria-label={publicT("mobile.eyebrow")}
          >
            {navigationItems.map((item) => {
              const groupId = `${id}-desktop-${item.key}`;
              return item.children?.length ? (
                <NavigationGroup
                  key={item.key}
                  item={item}
                  id={groupId}
                  open={activeDisclosure === groupId}
                  onToggle={() => toggleDisclosure(groupId)}
                  onNavigate={closeNavigation}
                />
              ) : (
                <NavigationLink
                  key={item.key}
                  item={item}
                  onClick={closeNavigation}
                />
              );
            })}
          </nav>
          <div className={styles.actions}>
            {actions.map((item) => (
              <NavigationLink
                key={item.key}
                item={item}
                className={`${styles.action} ${styles.headerAction}`}
                onClick={closeNavigation}
              />
            ))}
            {languageMenu("desktop")}
            <button
              className={styles.menuToggle}
              type="button"
              data-tenant-hover="preserve"
              aria-label={t("openMenu")}
              aria-expanded={mobileOpen}
              aria-controls={`${id}-mobile-navigation`}
              onClick={() => {
                setActiveDisclosure(null);
                setMobileOpen(true);
              }}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
        {announcement ? (
          <div className={styles.announcement}>
            {header.announcement?.url ? (
              <a href={header.announcement.url} data-tenant-hover="preserve">
                {announcement}
              </a>
            ) : (
              announcement
            )}
          </div>
        ) : null}
      </header>

      <Dialog
        open={mobileOpen}
        onClose={() => {
          if (!closeDisclosure()) closeNavigation();
        }}
        initialFocus={closeRef}
        className={styles.mobileDialog}
        style={style}
      >
        <DialogPanel className={styles.mobilePanel}>
          <DialogTitle className={styles.srOnly}>
            {t("mobile.navigation")}
          </DialogTitle>
          <div className={`${styles.row} ${styles.mobileTopRow}`}>
            <WebsiteLogo branding={branding} onClick={closeNavigation} />
            <div className={styles.actions}>
              {languageMenu("mobile")}
              <button
                ref={closeRef}
                className={`${styles.menuToggle} ${styles.menuClose}`}
                type="button"
                data-tenant-hover="preserve"
                aria-label={t("closeMenu")}
                aria-expanded="true"
                aria-controls={`${id}-mobile-navigation`}
                onClick={closeNavigation}
              >
                <span />
                <span />
              </button>
            </div>
          </div>
          <nav
            id={`${id}-mobile-navigation`}
            className={styles.mobileNavigation}
            aria-label={t("mobile.navigation")}
          >
            <p className={styles.eyebrow}>{publicT("mobile.eyebrow")}</p>
            {navigationItems.map((item) => {
              const groupId = `${id}-mobile-${item.key}`;
              return item.children?.length ? (
                <NavigationGroup
                  key={item.key}
                  item={item}
                  id={groupId}
                  open={activeDisclosure === groupId}
                  onToggle={() => toggleDisclosure(groupId)}
                  onNavigate={closeNavigation}
                  mobile
                />
              ) : (
                <NavigationLink
                  key={item.key}
                  item={item}
                  onClick={closeNavigation}
                />
              );
            })}
            {actions.length ? (
              <div className={styles.mobileActions}>
                {actions.map((item) => (
                  <NavigationLink
                    key={item.key}
                    item={item}
                    className={styles.action}
                    onClick={closeNavigation}
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true">⟶</span>
                  </NavigationLink>
                ))}
              </div>
            ) : null}
          </nav>
        </DialogPanel>
      </Dialog>
    </>
  );
}
