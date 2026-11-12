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
import { Link } from "@/i18n/navigation";
import { classNames } from "./header.utils";
export const ADMIN_LINKS = [
  {
    id: "core",
    href: "/app/bookings",
    label: {
      CZ: "Core",
      EN: "Core",
    },
    icon: Squares2X2Icon,
    description: {
      CZ: "Rezervace, kalendář a denní provoz.",
      EN: "Bookings, calendar and daily operations.",
    },
    items: [
      {
        href: "/app/bookings",
        label: {
          CZ: "Rezervace",
          EN: "Bookings",
        },
        description: {
          CZ: "Správa rezervací, hostů, plateb a změn.",
          EN: "Manage bookings, guests, payments and changes.",
        },
        icon: ClipboardDocumentListIcon,
      },
      {
        href: "/app/calendar",
        label: {
          CZ: "Kalendář",
          EN: "Calendar",
        },
        description: {
          CZ: "Kapacity, obsazenost, kurzy a studio rozvrh.",
          EN: "Capacity, occupancy, courses and studio schedule.",
        },
        icon: CalendarDaysIcon,
      },
    ],
  },
  {
    id: "users",
    href: "/app/users",
    label: {
      CZ: "Uživatelé",
      EN: "Users",
    },
    icon: UsersIcon,
    description: {
      CZ: "Zákazníci, členové týmu a historie.",
      EN: "Customers, team members and history.",
    },
    items: [
      {
        href: "/app/users?section=customers",
        label: {
          CZ: "Zákazníci",
          EN: "Customers",
        },
        description: {
          CZ: "Správa zákazníků, kontaktů, kreditů a historie.",
          EN: "Manage customers, contacts, credits and history.",
        },
        icon: UsersIcon,
      },
      {
        href: "/app/settings/team",
        label: {
          CZ: "Můj tým",
          EN: "My team",
        },
        description: {
          CZ: "Správa členů týmu, rolí a interních přístupů.",
          EN: "Manage team members, roles and internal access.",
        },
        icon: UserGroupIcon,
      },
    ],
  },
  {
    id: "operations",
    href: "/app/operations",
    label: {
      CZ: "Operations",
      EN: "Operations",
    },
    icon: WrenchScrewdriverIcon,
    description: {
      CZ: "Sklad, reporty, úkoly a provozní přehledy.",
      EN: "Inventory, reports, tasks and operational overview.",
    },
    items: [
      {
        href: "/app/operations?section=inventory",
        label: {
          CZ: "Sklad",
          EN: "Inventory",
        },
        description: {
          CZ: "Materiály, zásoby, pohyby a skladový přehled.",
          EN: "Materials, stock, movements and inventory overview.",
        },
        icon: CubeIcon,
      },
      {
        href: "/app/operations?section=suppliers",
        label: {
          CZ: "Dodavatelé",
          EN: "Suppliers",
        },
        description: {
          CZ: "Kontakty, nákupy a dodavatelská historie.",
          EN: "Contacts, purchases and supplier history.",
        },
        icon: TruckIcon,
      },
      {
        href: "/app/operations?section=statistics",
        label: {
          CZ: "Insights",
          EN: "Insights",
        },
        description: {
          CZ: "Statistiky, přehledy výkonu a provozní metriky.",
          EN: "Statistics, performance overview and operational metrics.",
        },
        icon: ChartBarIcon,
      },
    ],
  },
  {
    id: "sales",
    href: "/app/sales",
    label: {
      CZ: "Sales",
      EN: "Sales",
    },
    icon: ShoppingBagIcon,
    description: {
      CZ: "Produkty, objednávky, platby, poukazy a prodej.",
      EN: "Products, orders, payments, vouchers and sales.",
    },
    items: [
      {
        href: "/app/products",
        label: {
          CZ: "Produkty",
          EN: "Products",
        },
        description: {
          CZ: "Kurzy, workshopy, poukazy a rezervační produkty.",
          EN: "Courses, workshops, vouchers and booking products.",
        },
        icon: ShoppingBagIcon,
      },
      {
        href: "/app/sales?section=orders",
        label: {
          CZ: "Objednávky",
          EN: "Orders",
        },
        description: {
          CZ: "Objednávky, zakázky, poptávky a platby.",
          EN: "Orders, custom work, requests and payments.",
        },
        icon: ReceiptPercentIcon,
      },
      {
        href: "/app/sales?section=vouchers",
        label: {
          CZ: "Poukazy",
          EN: "Vouchers",
        },
        description: {
          CZ: "Dárkové poukazy, uplatnění a historie.",
          EN: "Gift vouchers, redemptions and history.",
        },
        icon: TagIcon,
      },
    ],
  },
  {
    id: "management",
    href: "/app/settings",
    label: {
      CZ: "Management",
      EN: "Management",
    },
    icon: Cog6ToothIcon,
    description: {
      CZ: "Systém, nastavení, lokace, oprávnění a integrace.",
      EN: "System, settings, locations, permissions and integrations.",
    },
    items: [
      {
        href: "/app/settings/general",
        label: {
          CZ: "System",
          EN: "System",
        },
        description: {
          CZ: "Základní nastavení aplikace a interní správa.",
          EN: "Core app settings and internal administration.",
        },
        icon: Cog6ToothIcon,
      },
      {
        href: "/app/settings/public-site",
        label: {
          CZ: "Veřejný web",
          EN: "Public website",
        },
        description: {
          CZ: "Vzhled, obsah, přihlášení a publikace webu studia.",
          EN: "Branding, content, sign-in and studio-site publishing.",
        },
        icon: PaintBrushIcon,
      },
      {
        href: "/app/settings/locations",
        label: {
          CZ: "Lokace",
          EN: "Locations",
        },
        description: {
          CZ: "Správa studií, kapacit, adres a provozních pravidel.",
          EN: "Manage studios, capacity, addresses and operating rules.",
        },
        icon: BuildingStorefrontIcon,
      },
      {
        href: "/app/settings/roles",
        label: {
          CZ: "Oprávnění",
          EN: "Permissions",
        },
        description: {
          CZ: "Role, přístupy a bezpečnostní pravidla.",
          EN: "Roles, access and security rules.",
        },
        icon: UsersIcon,
      },
      {
        href: "/app/settings",
        label: {
          CZ: "Integrace",
          EN: "Integrations",
        },
        description: {
          CZ: "Stripe, e-maily, kalendáře a externí služby.",
          EN: "Stripe, emails, calendars and external services.",
        },
        icon: PuzzlePieceIcon,
      },
    ],
  },
];
const getLocalized = (value, language, fallback = "") => {
  if (typeof value === "string") return value;
  return value?.[language] || value?.EN || value?.CZ || fallback;
};
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
const DesktopNavAdmin = memo(function DesktopNavAdmin({
  pathname = "",
  language = "CZ",
}) {
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
      aria-label={language === "CZ" ? "Administrace" : "Admin navigation"}
    >
      {navItems.map((section) => {
        const active = isAdminSectionActive(pathname, section);
        const isOpen = openSectionId === section.id;
        const Icon = section.icon;
        const label = getLocalized(section.label, language, section.id);
        const description = getLocalized(section.description, language);
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
                        {language === "CZ" ? "Modul" : "Module"}
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
                      {language === "CZ" ? "Otevřít modul" : "Open module"}
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
                      const itemTitle = getLocalized(
                        item.label,
                        language,
                        item.href,
                      );
                      const itemDescription = getLocalized(
                        item.description,
                        language,
                      );
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
                            {language === "CZ" ? "Otevřít" : "Open"}
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
