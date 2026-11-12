"use client";

import {
  ClipboardDocumentListIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import { Link, usePathname } from "@/i18n/navigation";
import {
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
} from "@/config/permissions";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";

const navigation = [
  {
    key: "orders",
    href: "/app/finance/orders",
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.PAYMENTS_VIEW],
    icon: ClipboardDocumentListIcon,
  },
  {
    key: "invoices",
    href: "/app/finance/invoices",
    permissions: [PERMISSIONS.INVOICES_VIEW],
    icon: DocumentTextIcon,
  },
].filter((item) => NATIVE_INVOICES_ENABLED || item.key !== "invoices");

export default function FinanceShell({ children }) {
  const t = useTranslations("Finance");
  const pathname = usePathname();
  const access = useSelector(selectCurrentWorkspaceAccess);
  const visibleItems = navigation.filter((item) =>
    hasAnyPermission(access, item.permissions),
  );

  return (
    <div className="space-y-5">
      <nav
        aria-label={t("navigation.label")}
        className="overflow-x-auto rounded-[18px] border border-line bg-white p-2 shadow-[0_10px_30px_rgba(17,17,15,0.035)]"
      >
        <ul className="flex min-w-max gap-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "flex min-h-11 items-center gap-2.5 rounded-[13px] bg-coral-100 px-4 text-[12px] font-semibold text-[#292925]"
                      : "flex min-h-11 items-center gap-2.5 rounded-[13px] px-4 text-[12px] font-medium text-[#686762] transition hover:bg-[#F7F5F1] hover:text-[#292925]"
                  }
                >
                  <Icon
                    className={
                      active ? "h-4 w-4 text-terracotta-600" : "h-4 w-4"
                    }
                    aria-hidden="true"
                  />
                  {t(`navigation.${item.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}

export const getDefaultFinanceHref = (access) => {
  if (
    hasPermission(access, PERMISSIONS.ORDERS_VIEW) ||
    hasPermission(access, PERMISSIONS.PAYMENTS_VIEW)
  ) {
    return "/app/finance/orders";
  }

  if (
    NATIVE_INVOICES_ENABLED &&
    hasPermission(access, PERMISSIONS.INVOICES_VIEW)
  ) {
    return "/app/finance/invoices";
  }

  return "/app";
};
