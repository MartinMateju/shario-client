import {
  ArrowUpTrayIcon,
  BanknotesIcon,
  BellIcon,
  EnvelopeIcon,
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
  UserCircleIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

import {
  DATA_IMPORT_PERMISSIONS,
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
  isWorkspaceAccessActive,
} from "@/config/permissions";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";

export const SETTINGS_OVERVIEW_PATH = "/app/settings";

export const PERSONAL_SETTINGS_PATH = `${SETTINGS_OVERVIEW_PATH}?section=personal`;

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
  PERMISSIONS.COMMUNICATIONS_MANAGE,
  PERMISSIONS.COMMUNICATIONS_SETTINGS_MANAGE,
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
    key: "communications",
    icon: EnvelopeIcon,
    tone: "indigo",
    items: [
      {
        key: "communications",
        href: "/app/settings/communications",
        permissions: [
          PERMISSIONS.COMMUNICATIONS_SETTINGS_MANAGE,
          PERMISSIONS.COMMUNICATIONS_MANAGE,
        ],
        module: "communications",
        icon: EnvelopeIcon,
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
  {
    key: "advanced",
    icon: Squares2X2Icon,
    tone: "indigo",
    advanced: true,
    items: [
      {
        key: "modules",
        href: "/app/settings/modules",
        permission: PERMISSIONS.WORKSPACE_CONFIGURATION_MANAGE,
        icon: Squares2X2Icon,
      },
      {
        key: "migration",
        href: "/app/settings/migration",
        permissions: DATA_IMPORT_PERMISSIONS,
        icon: ArrowUpTrayIcon,
      },
    ],
  },
];

export const personalSettingsGroups = [
  {
    key: "profile",
    icon: UserCircleIcon,
    tone: "cobalt",
    items: [
      {
        key: "profile",
        href: "/app/settings/profile",
        personal: true,
        icon: UserCircleIcon,
      },
    ],
  },
  {
    key: "preferences",
    icon: AdjustmentsHorizontalIcon,
    tone: "mint",
    items: [
      {
        key: "preferences",
        href: "/app/settings/preferences#workspace-preferences",
        personal: true,
        icon: AdjustmentsHorizontalIcon,
      },
    ],
  },
  {
    key: "notifications",
    icon: BellIcon,
    tone: "coral",
    items: [
      {
        key: "notifications",
        href: "/app/settings/preferences#notification-preferences",
        personal: true,
        icon: BellIcon,
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
  (item.personal
    ? Boolean(access) && isWorkspaceAccessActive(access)
    : item.permissions
      ? hasAnyPermission(access, item.permissions)
      : hasPermission(access, item.permission));

export const getVisibleSettingsGroups = ({
  access,
  tenant,
  section = "studio",
}) =>
  (section === "personal" ? personalSettingsGroups : settingsNavigationGroups)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        canAccessSettingsItem(item, access, tenant),
      ),
    }))
    .filter((group) => group.items.length > 0);

export const isSettingsItemActive = (item, pathname) => {
  const path = item.href.split("#")[0];
  return pathname === path || pathname?.startsWith(`${path}/`);
};

export const getActiveSettingsGroup = (groups, pathname) =>
  groups.find((group) =>
    group.items.some((item) => isSettingsItemActive(item, pathname)),
  ) ?? null;

export const getSettingsSection = ({
  pathname = SETTINGS_OVERVIEW_PATH,
  requestedSection,
  studioGroups,
}) => {
  if (
    ["/app/settings/profile", "/app/settings/preferences"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  )
    return "personal";
  if (pathname !== SETTINGS_OVERVIEW_PATH) return "studio";
  return requestedSection === "personal" || !studioGroups.length
    ? "personal"
    : "studio";
};

// Ignore accents so e.g. Czech "pobocky" also finds "Pobočky".
export const normalizeSettingsSearch = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();

export const filterSettingsGroups = (groups, query, t) => {
  const words = normalizeSettingsSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return groups;
  return groups
    .map((group) => {
      const groupText = `${t(`groups.${group.key}.title`)} ${t(`groups.${group.key}.description`)}`;
      return {
        ...group,
        items: group.items.filter((item) => {
          const text = normalizeSettingsSearch(
            `${groupText} ${t(`items.${item.key}.title`)} ${t(`items.${item.key}.description`)}`,
          );
          return words.every((word) => text.includes(word));
        }),
      };
    })
    .filter((group) => group.items.length);
};
