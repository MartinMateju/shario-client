import {
  ArrowUpTrayIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  CreditCardIcon,
  DocumentTextIcon,
  KeyIcon,
  PaintBrushIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

import {
  DATA_IMPORT_PERMISSIONS,
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
} from "@/config/permissions";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";

export const SETTINGS_OVERVIEW_PATH = "/app/settings";

export const SETTINGS_ACCESS_PERMISSIONS = [
  PERMISSIONS.WORKSPACE_UPDATE,
  PERMISSIONS.WORKSPACE_CONFIGURATION_MANAGE,
  PERMISSIONS.LOCATIONS_VIEW,
  PERMISSIONS.TEAM_VIEW,
  PERMISSIONS.ROLES_VIEW,
  PERMISSIONS.ACCESS_CODES_VIEW,
  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.PAYMENTS_CONNECT_MANAGE,
  PERMISSIONS.SUBSCRIPTION_VIEW,
  PERMISSIONS.AI_SETTINGS_MANAGE,
  ...DATA_IMPORT_PERMISSIONS,
];

export const launchCenterItem = {
  key: "setup",
  href: "/app/setup",
  permission: PERMISSIONS.WORKSPACE_UPDATE,
  icon: RocketLaunchIcon,
};

export const settingsNavigationGroups = [
  {
    key: "workspace",
    icon: BuildingOffice2Icon,
    tone: "cobalt",
    items: [
      {
        key: "general",
        href: "/app/settings/general",
        permission: PERMISSIONS.WORKSPACE_UPDATE,
        icon: Cog6ToothIcon,
      },
      {
        key: "locations",
        href: "/app/settings/locations",
        permission: PERMISSIONS.LOCATIONS_VIEW,
        icon: BuildingOffice2Icon,
      },
      {
        key: "migration",
        href: "/app/settings/migration",
        permissions: DATA_IMPORT_PERMISSIONS,
        icon: ArrowUpTrayIcon,
      },
    ],
  },
  {
    key: "features",
    icon: Squares2X2Icon,
    tone: "indigo",
    items: [
      {
        key: "modules",
        href: "/app/settings/modules",
        permission: PERMISSIONS.WORKSPACE_CONFIGURATION_MANAGE,
        icon: Squares2X2Icon,
      },
      {
        key: "ai",
        href: "/app/settings/ai",
        permission: PERMISSIONS.AI_SETTINGS_MANAGE,
        module: "ai",
        icon: SparklesIcon,
      },
    ],
  },
  {
    key: "website",
    icon: PaintBrushIcon,
    tone: "coral",
    items: [
      {
        key: "publicSite",
        href: "/app/settings/public-site",
        permission: PERMISSIONS.WORKSPACE_UPDATE,
        icon: PaintBrushIcon,
      },
    ],
  },
  {
    key: "access",
    icon: ShieldCheckIcon,
    tone: "sand",
    items: [
      {
        key: "team",
        href: "/app/settings/team",
        permission: PERMISSIONS.TEAM_VIEW,
        icon: UserGroupIcon,
      },
      {
        key: "roles",
        href: "/app/settings/roles",
        permission: PERMISSIONS.ROLES_VIEW,
        icon: ShieldCheckIcon,
      },
      {
        key: "accessCodes",
        href: "/app/settings/access-codes",
        permission: PERMISSIONS.ACCESS_CODES_VIEW,
        module: "access_codes",
        icon: KeyIcon,
      },
    ],
  },
  {
    key: "payments",
    icon: CreditCardIcon,
    tone: "mint",
    labelKey: NATIVE_INVOICES_ENABLED ? "groups.payments" : "items.payments",
    items: [
      {
        key: "payments",
        href: "/app/settings/payments",
        permissions: [
          PERMISSIONS.PAYMENTS_VIEW,
          PERMISSIONS.PAYMENTS_CONNECT_MANAGE,
        ],
        module: "payments",
        icon: CreditCardIcon,
      },
      {
        key: "invoicing",
        href: "/app/settings/invoicing",
        permission: PERMISSIONS.WORKSPACE_UPDATE,
        module: "payments",
        icon: DocumentTextIcon,
      },
    ],
  },
  {
    key: "account",
    icon: BanknotesIcon,
    tone: "slate",
    items: [
      {
        key: "billing",
        href: "/app/settings/billing",
        permission: PERMISSIONS.SUBSCRIPTION_VIEW,
        icon: BanknotesIcon,
      },
    ],
  },
];

export const canAccessSettingsItem = (item, access, tenant) =>
  (NATIVE_INVOICES_ENABLED || item.key !== "invoicing") &&
  (!item.module || tenant?.modules?.[item.module] !== false) &&
  (!item.requiresAnyModule ||
    item.requiresAnyModule.some(
      (module) => tenant?.modules?.[module] !== false,
    )) &&
  (item.permissions
    ? hasAnyPermission(access, item.permissions)
    : hasPermission(access, item.permission));

export const getVisibleSettingsGroups = ({ access, tenant }) =>
  settingsNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessSettingsItem(item, access, tenant),
      ),
    }))
    .filter((group) => group.items.length > 0);

export const isSettingsItemActive = (item, pathname) =>
  pathname === item.href || pathname?.startsWith(`${item.href}/`);

export const getActiveSettingsGroup = (groups, pathname) =>
  groups.find((group) =>
    group.items.some((item) => isSettingsItemActive(item, pathname)),
  ) ?? null;
