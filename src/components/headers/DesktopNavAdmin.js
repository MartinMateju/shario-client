"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLongRightIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  FireIcon,
  PuzzlePieceIcon,
  PaintBrushIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  TagIcon,
  TruckIcon,
  UserGroupIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { classNames } from "./header.utils";
export const ADMIN_LINKS = [
  {
    id: "core",
    href: "/app/bookings",
    labelKey: "Legacy.screens.management.groups.Core",
    icon: Squares2X2Icon,
    descriptionKey: "Header.adminNavigation.sections.core.description",
    items: [
      {
        href: "/app/bookings",
        labelKey: "Dashboard.nav.bookings",
        descriptionKey: "Header.adminNavigation.items.bookings.description",
        icon: ClipboardDocumentListIcon,
      },
      {
        href: "/app/calendar",
        labelKey: "Dashboard.nav.calendar",
        descriptionKey: "Header.adminNavigation.items.calendar.description",
        icon: CalendarDaysIcon,
      },
    ],
  },
  {
    id: "users",
    href: "/app/users",
    labelKey: "Legacy.USERS",
    icon: UsersIcon,
    descriptionKey: "Header.adminNavigation.sections.users.description",
    items: [
      {
        href: "/app/users?section=customers",
        labelKey: "Dashboard.nav.customers",
        descriptionKey: "Header.adminNavigation.items.customers.description",
        icon: UsersIcon,
      },
      {
        href: "/app/settings/team",
        labelKey: "Header.adminNavigation.items.team.label",
        descriptionKey: "Header.adminNavigation.items.team.description",
        icon: UserGroupIcon,
      },
    ],
  },
  {
    id: "operations",
    href: "/app/operations",
    labelKey: "Dashboard.routeTitles.operations",
    icon: WrenchScrewdriverIcon,
    descriptionKey: "Header.adminNavigation.sections.operations.description",
    items: [
      {
        href: "/app/operations?section=inventory",
        labelKey: "Dashboard.nav.inventory",
        descriptionKey: "Header.adminNavigation.items.inventory.description",
        icon: CubeIcon,
      },
      {
        href: "/app/operations?section=suppliers",
        labelKey: "Dashboard.routeTitles.suppliers",
        descriptionKey: "Header.adminNavigation.items.suppliers.description",
        icon: TruckIcon,
      },
      {
        href: "/app/operations?section=statistics",
        labelKey: "Legacy.screens.menu.INSIGHTS",
        descriptionKey: "Header.adminNavigation.items.statistics.description",
        icon: ChartBarIcon,
      },
    ],
  },
  {
    id: "sales",
    href: "/app/sales",
    labelKey: "Dashboard.nav.sales",
    icon: ShoppingBagIcon,
    descriptionKey: "Header.adminNavigation.sections.sales.description",
    items: [
      {
        href: "/app/products",
        labelKey: "Legacy.PRODUCTS",
        descriptionKey: "Header.adminNavigation.items.products.description",
        icon: ShoppingBagIcon,
      },
      {
        href: "/app/sales?section=orders",
        labelKey: "Sales.overview.orders",
        descriptionKey: "Header.adminNavigation.items.orders.description",
        icon: ReceiptPercentIcon,
      },
      {
        href: "/app/sales?section=vouchers",
        labelKey: "Products.categories.vouchers",
        descriptionKey: "Header.adminNavigation.items.vouchers.description",
        icon: TagIcon,
      },
    ],
  },
  {
    id: "management",
    href: "/app/settings",
    labelKey: "Legacy.MANAGEMENT",
    icon: Cog6ToothIcon,
    descriptionKey: "Header.adminNavigation.sections.management.description",
    items: [
      {
        href: "/app/settings/general",
        labelKey: "Header.adminNavigation.items.general.label",
        descriptionKey: "Header.adminNavigation.items.general.description",
        icon: Cog6ToothIcon,
      },
      {
        href: "/app/settings/public-site",
        labelKey: "SetupCenter.readiness.items.publicSite.title",
        descriptionKey: "Header.adminNavigation.items.public-site.description",
        icon: PaintBrushIcon,
      },
      {
        href: "/app/settings/locations",
        labelKey: "WorkspaceSettingsNav.items.locations",
        descriptionKey: "Header.adminNavigation.items.locations.description",
        icon: BuildingStorefrontIcon,
      },
      {
        href: "/app/settings/roles",
        labelKey: "RoleSettings.editor.permissionsTitle",
        descriptionKey: "Header.adminNavigation.items.roles.description",
        icon: UsersIcon,
      },
      {
        href: "/app/settings",
        labelKey: "Header.adminNavigation.items.integrations.label",
        descriptionKey: "Header.adminNavigation.items.integrations.description",
        icon: PuzzlePieceIcon,
      },
    ],
  },
];
const parseLocation = (value = "") => {
  const [rawPath = "", rawQuery = ""] = String(value).split("?");
  const normalizedPath =
    rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath || "/";
  return {
    path: normalizedPath,
    params: new URLSearchParams(rawQuery),
  };
};
export const isAdminSectionActive = (currentLocation = "", section) => {
  if (!section?.href) return false;
  const current = parseLocation(currentLocation);
  const target = parseLocation(section.href);
  return (
    current.path === target.path || current.path.startsWith(`${target.path}/`)
  );
};
export const isAdminItemActive = (currentLocation = "", item) => {
  if (!item?.href) return false;
  const current = parseLocation(currentLocation);
  const target = parseLocation(item.href);
  if (current.path !== target.path) return false;
  const expectedParams = Array.from(target.params.entries());
  if (expectedParams.length === 0) return true;
  return expectedParams.every(
    ([key, value]) => current.params.get(key) === value,
  );
};
const getGridClass = (itemCount) => {
  if (itemCount <= 2) return "grid-cols-2";
  if (itemCount === 3) return "grid-cols-3";
  return "grid-cols-4";
};
const DesktopNavAdmin = memo(function DesktopNavAdmin({ pathname = "" }) {
  const t = useTranslations();
  const closeTimeoutRef = useRef(null);
  const [openSectionId, setOpenSectionId] = useState(null);
  const navItems = useMemo(
    () =>
      ADMIN_LINKS.filter(
        (item) => item?.id && item?.href && Array.isArray(item.items),
      ),
    [],
  );
  const clearCloseTimeout = useCallback(() => {
    if (!closeTimeoutRef.current) return;
    clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
  }, []);
  const closeDropdown = useCallback(() => {
    clearCloseTimeout();
    setOpenSectionId(null);
  }, [clearCloseTimeout]);
  const scheduleCloseDropdown = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      setOpenSectionId(null);
      closeTimeoutRef.current = null;
    }, 170);
  }, [clearCloseTimeout]);
  const openDropdown = useCallback(
    (sectionId) => {
      clearCloseTimeout();
      setOpenSectionId(sectionId);
    },
    [clearCloseTimeout],
  );
  const toggleDropdown = useCallback(
    (sectionId) => {
      clearCloseTimeout();
      setOpenSectionId((current) => (current === sectionId ? null : sectionId));
    },
    [clearCloseTimeout],
  );
  const handleTriggerKeyDown = useCallback(
    (event, sectionId) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDropdown();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        openDropdown(sectionId);
      }
    },
    [closeDropdown, openDropdown],
  );
  const handleContainerBlur = useCallback(
    (event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        closeDropdown();
      }
    },
    [closeDropdown],
  );
  useEffect(() => {
    closeDropdown();
  }, [pathname, closeDropdown]);
  useEffect(() => {
    return () => clearCloseTimeout();
  }, [clearCloseTimeout]);
  return (
    <nav
      className="hidden min-w-0 flex-1 items-center justify-center gap-x-1 xl:flex 2xl:gap-x-1.5"
      aria-label={t("Header.adminNavigation.label")}
    >
      {navItems.map((section) => {
        const active = isAdminSectionActive(pathname, section);
        const isOpen = openSectionId === section.id;
        const Icon = section.icon;
        const label = t(section.labelKey);
        const description = t(section.descriptionKey);
        const panelId = `admin-menu-${section.id}`;
        return (
          <div
            key={section.id}
            className="inline-flex"
            onMouseEnter={() => openDropdown(section.id)}
            onMouseLeave={scheduleCloseDropdown}
            onBlur={handleContainerBlur}
          >
            <button
              type="button"
              className={classNames(
                "group relative inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium tracking-[-0.01em] transition-all duration-300 2xl:px-3 2xl:text-[12px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-offset-4 focus-visible:ring-offset-brand-offset",
                active || isOpen
                  ? "bg-white text-[#1F1F1F] shadow-[0_8px_24px_rgba(31,31,31,0.055)]"
                  : "text-[#5D5D58] hover:bg-white/70 hover:text-[#1F1F1F]",
              )}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              aria-controls={panelId}
              aria-current={active ? "page" : undefined}
              onClick={() => toggleDropdown(section.id)}
              onKeyDown={(event) => handleTriggerKeyDown(event, section.id)}
            >
              <Icon
                className={classNames(
                  "h-4 w-4 stroke-[1.65] transition-colors",
                  active || isOpen ? "text-primary-text" : "text-[#8A8A84]",
                )}
                aria-hidden="true"
              />

              <span>{label}</span>

              <ChevronDownIcon
                className={classNames(
                  "h-3.5 w-3.5 stroke-[1.65] transition-transform duration-300",
                  isOpen && "rotate-180",
                )}
                aria-hidden="true"
              />

              <span
                className={classNames(
                  "absolute bottom-[2px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand-primary transition-all duration-300",
                  active ? "scale-100 opacity-100" : "scale-0 opacity-0",
                )}
              />
            </button>

            {isOpen && (
              <div
                id={panelId}
                className="absolute left-1/2 top-[calc(100%+12px)] z-50 w-[min(1180px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[30px] border border-line bg-surface-raised/98 shadow-[0_30px_90px_rgba(31,31,31,0.15)] backdrop-blur-2xl"
                role="menu"
                onMouseEnter={() => openDropdown(section.id)}
                onMouseLeave={scheduleCloseDropdown}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeDropdown();
                  }
                }}
              >
                <div className="grid grid-cols-[275px_1fr]">
                  <Link
                    href={section.href}
                    onClick={closeDropdown}
                    role="menuitem"
                    className="group flex min-h-[250px] flex-col justify-between bg-[#191A18] p-7 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-skab-cobalt-400"
                  >
                    <div>
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-primary text-white shadow-[0_12px_32px_rgb(var(--skab-blue-rgb)/0.28)]">
                        <Icon
                          className="h-6 w-6 stroke-[1.55]"
                          aria-hidden="true"
                        />
                      </span>

                      <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-skab-coral-300">
                        {t("Header.adminNavigation.module")}
                      </p>

                      <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.05em] text-white">
                        {label}
                      </p>

                      {description && (
                        <p className="mt-4 text-[13px] leading-6 text-white/62">
                          {description}
                        </p>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-all duration-300 group-hover:gap-3">
                      {t("Header.adminNavigation.openModule")}
                      <ArrowLongRightIcon
                        className="h-4 w-4 stroke-[1.7]"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>

                  <div
                    className={classNames(
                      "grid gap-2 bg-surface p-4",
                      getGridClass(section.items.length),
                    )}
                  >
                    {section.items.map((item, index) => {
                      const ItemIcon = item.icon;
                      const itemActive = isAdminItemActive(pathname, item);
                      const itemTitle = t(item.labelKey);
                      const itemDescription = t(item.descriptionKey);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          aria-current={itemActive ? "page" : undefined}
                          onClick={closeDropdown}
                          className={classNames(
                            "group flex min-h-[218px] flex-col rounded-[21px] border p-5 transition-all duration-300 ease-out",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 focus-visible:ring-offset-2",
                            itemActive
                              ? "border-skab-cobalt-200 bg-skab-cobalt-50 shadow-[0_12px_28px_rgb(var(--skab-blue-rgb)/0.08)]"
                              : "border-transparent bg-white/70 hover:-translate-y-0.5 hover:border-[#E7E4DE] hover:bg-white hover:shadow-[0_16px_36px_rgba(31,31,31,0.07)]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span
                              className={classNames(
                                "grid h-10 w-10 place-items-center rounded-full transition-colors duration-300",
                                itemActive
                                  ? "bg-brand-primary text-white"
                                  : index % 2 === 0
                                    ? "bg-skab-coral-100 text-accent-text group-hover:bg-brand-accent group-hover:text-ink"
                                    : "bg-skab-cobalt-50 text-primary-text group-hover:bg-brand-primary group-hover:text-white",
                              )}
                            >
                              <ItemIcon
                                className="h-5 w-5 stroke-[1.65]"
                                aria-hidden="true"
                              />
                            </span>

                            <span className="text-[10px] font-semibold text-[#9A9A94]">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          <p className="mt-6 text-[15px] font-semibold tracking-[-0.025em] text-[#1F1F1F]">
                            {itemTitle}
                          </p>

                          {itemDescription && (
                            <p className="mt-2 text-[12.5px] leading-5 text-[#72726D]">
                              {itemDescription}
                            </p>
                          )}

                          <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-text transition-all duration-300 group-hover:gap-3">
                            {t("Locations.portalLinks.open")}
                            <ArrowLongRightIcon
                              className="h-4 w-4 stroke-[1.7]"
                              aria-hidden="true"
                            />
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
});
export default DesktopNavAdmin;
