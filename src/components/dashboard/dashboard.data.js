import {
  AcademicCapIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  DocumentTextIcon,
  FireIcon,
  IdentificationIcon,
  HomeModernIcon,
  BookOpenIcon,
  PresentationChartLineIcon,
  RocketLaunchIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { DATA_IMPORT_PERMISSIONS, PERMISSIONS } from "@/config/permissions";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";

/*
 * Keep leaf destinations flat for permission contracts and deep links. The
 * sidebar consumes `dashboardNavigationGroups` below, so hierarchy has one
 * shared source without taking routes away from the rest of the workspace.
 */
export const dashboardNavigation = [
  {
    key: "overview",
    labelKey: "overview",
    href: "/app",
    icon: ChartBarSquareIcon,
    permissions: [PERMISSIONS.WORKSPACE_VIEW],
    exact: true,
  },
  {
    key: "setup",
    labelKey: "setup",
    href: "/app/setup",
    icon: RocketLaunchIcon,
    permissions: [PERMISSIONS.WORKSPACE_UPDATE],
    sidebarHidden: true,
  },
  {
    key: "ai",
    labelKey: "ai",
    href: "/app/ai",
    icon: SparklesIcon,
    module: "ai",
    permissions: [PERMISSIONS.AI_USE],
    sidebarHidden: true,
  },
  {
    key: "calendar",
    labelKey: "calendar",
    href: "/app/calendar",
    icon: CalendarDaysIcon,
    module: "bookings",
    permissions: [PERMISSIONS.BOOKINGS_VIEW],
  },
  {
    key: "bookings",
    labelKey: "allBookings",
    href: "/app/bookings",
    icon: ClipboardDocumentListIcon,
    module: "bookings",
    permissions: [PERMISSIONS.BOOKINGS_VIEW],
  },
  {
    key: "coursesEvents",
    labelKey: "coursesEvents",
    href: "/app/products?category=classes",
    icon: AcademicCapIcon,
    module: "courses",
    permissions: [PERMISSIONS.PRODUCTS_VIEW],
    sidebarHidden: true,
  },
  {
    key: "customers",
    labelKey: "customers",
    href: "/app/users",
    icon: UsersIcon,
    module: "customers",
    permissions: [PERMISSIONS.CUSTOMERS_VIEW],
  },
  {
    key: "products",
    labelKey: "products",
    href: "/app/products",
    icon: SparklesIcon,
    permissions: [PERMISSIONS.PRODUCTS_VIEW, PERMISSIONS.MEMBERSHIPS_VIEW],
    modulePermissionPairs: [
      {
        permissions: [PERMISSIONS.PRODUCTS_VIEW],
      },
      {
        module: "memberships",
        permissions: [PERMISSIONS.MEMBERSHIPS_VIEW],
      },
    ],
    activeHrefs: [
      "/app/products",
      "/app/memberships",
      "/app/operations?section=memberships",
    ],
  },
  {
    key: "sales",
    labelKey: "salesOverview",
    href: "/app/sales",
    icon: BanknotesIcon,
    module: "payments",
    permissions: [
      PERMISSIONS.ORDERS_VIEW,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.VOUCHERS_VIEW,
    ],
    activeHrefs: ["/app/sales", "/app/finance/orders"],
  },
  {
    key: "customOrders",
    labelKey: "customOrders",
    href: "/app/custom-orders",
    icon: ClipboardDocumentListIcon,
    permissions: [PERMISSIONS.ORDERS_VIEW],
  },
  {
    key: "finance",
    labelKey: "transactions",
    href: "/app/finance/orders",
    icon: ClipboardDocumentListIcon,
    module: "payments",
    permissions: [PERMISSIONS.ORDERS_VIEW, PERMISSIONS.PAYMENTS_VIEW],
    permissionHrefs: [
      [PERMISSIONS.ORDERS_VIEW, "/app/finance/orders"],
      [PERMISSIONS.PAYMENTS_VIEW, "/app/finance/orders"],
    ],
  },
  {
    key: "invoices",
    labelKey: "invoices",
    href: "/app/finance/invoices",
    icon: DocumentTextIcon,
    module: "payments",
    permissions: [PERMISSIONS.INVOICES_VIEW],
  },
  {
    key: "memberships",
    labelKey: "memberships",
    href: "/app/products?category=memberships",
    icon: IdentificationIcon,
    module: "memberships",
    permissions: [PERMISSIONS.MEMBERSHIPS_VIEW],
    sidebarHidden: true,
  },
  {
    key: "inventory",
    labelKey: "inventory",
    href: "/app/operations?section=inventory",
    icon: CubeIcon,
    module: "inventory",
    permissions: [PERMISSIONS.INVENTORY_VIEW],
    activeHrefs: [
      "/app/operations?section=inventory",
      "/app/operations?section=suppliers",
    ],
  },
  {
    key: "staffPlanning",
    labelKey: "staffPlanning",
    href: "/app/operations?section=tasks",
    icon: ClipboardDocumentListIcon,
    module: "staff_tasks",
    requiresExplicitModule: true,
    permissions: [
      PERMISSIONS.TASKS_VIEW,
      PERMISSIONS.PLANNING_SUBMIT,
      PERMISSIONS.PLANNING_TEAM_VIEW,
      PERMISSIONS.PLANNING_MANAGE,
    ],
  },
  {
    key: "messages",
    labelKey: "messages",
    href: "/app/communications",
    icon: ChatBubbleLeftRightIcon,
    module: "communications",
    permissions: [
      PERMISSIONS.COMMUNICATIONS_VIEW,
      PERMISSIONS.COMMUNICATIONS_MANAGE,
    ],
    activeHrefs: ["/app/communications"],
  },
  {
    key: "knowledge",
    labelKey: "knowledge",
    href: "/app/knowledge",
    icon: BookOpenIcon,
    permissions: [PERMISSIONS.KNOWLEDGE_VIEW],
  },
  {
    key: "reports",
    labelKey: "reports",
    href: "/app/operations?section=statistics",
    icon: PresentationChartLineIcon,
    permissions: [PERMISSIONS.REPORTS_VIEW],
  },
  {
    key: "settings",
    labelKey: "settings",
    href: "/app/settings",
    icon: Cog6ToothIcon,
    permissions: [
      PERMISSIONS.WORKSPACE_UPDATE,
      PERMISSIONS.WORKSPACE_CONFIGURATION_MANAGE,
      PERMISSIONS.LOCATIONS_VIEW,
      PERMISSIONS.TEAM_VIEW,
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_CONNECT_MANAGE,
      PERMISSIONS.SUBSCRIPTION_VIEW,
      PERMISSIONS.AI_SETTINGS_MANAGE,
      ...DATA_IMPORT_PERMISSIONS,
    ],
    activeHrefs: ["/app/settings"],
  },
].filter((item) => NATIVE_INVOICES_ENABLED || item.key !== "invoices");
export const dashboardNavigationGroups = [
  {
    key: "overview",
    type: "item",
    itemKey: "overview",
  },
  {
    key: "bookings",
    type: "group",
    labelKey: "bookings",
    icon: CalendarDaysIcon,
    itemKeys: ["calendar", "bookings", "coursesEvents"],
  },
  {
    key: "customers",
    type: "item",
    itemKey: "customers",
  },
  {
    key: "studio",
    type: "group",
    labelKey: "studio",
    icon: HomeModernIcon,
    itemKeys: ["inventory", "staffPlanning", "knowledge"],
  },
  {
    key: "sales",
    type: "group",
    labelKey: "sales",
    icon: BanknotesIcon,
    itemKeys: ["sales", "products", "customOrders", "invoices"],
  },
  {
    key: "messages",
    type: "item",
    itemKey: "messages",
  },
  {
    key: "reports",
    type: "item",
    itemKey: "reports",
  },
];
export const dashboardUtilityNavigation = ["settings"];
export const dashboardStats = [
  {
    key: "bookings",
    value: "18",
    trend: "+12%",
    icon: CalendarDaysIcon,
    points: "0,16 10,14 20,8 30,10 40,4 50,7",
  },
  {
    key: "occupancy",
    value: "76%",
    trend: "+8%",
    icon: ChartBarSquareIcon,
    points: "0,17 10,12 20,14 30,8 40,11 50,2",
  },
  {
    key: "revenue",
    value: "126,480",
    trend: "+14%",
    icon: BanknotesIcon,
    points: "0,15 10,16 20,9 30,12 40,5 50,7",
  },
  {
    key: "customers",
    value: "24",
    trend: "+6%",
    icon: UserGroupIcon,
    points: "0,16 10,15 20,15 30,9 40,11 50,3",
  },
];
export const scheduleItems = [
  {
    key: "openStudio",
    time: "09:00 – 11:00",
    start: "09:00",
    end: "11:00",
    locationKey: "mainStudio",
    attendance: "5 / 8",
    avatars: ["AK", "JM", "LN"],
    accent: "sand",
  },
  {
    key: "wheelThrowing",
    time: "11:30 – 13:00",
    start: "11:30",
    end: "13:00",
    locationKey: "mainStudio",
    attendance: "4 / 6",
    avatars: ["SN", "DV"],
    overflow: 1,
    accent: "coral",
  },
  {
    key: "clayPlay",
    time: "14:00 – 16:00",
    start: "14:00",
    end: "16:00",
    locationKey: "workshopSpace",
    attendance: "8 / 10",
    avatars: ["EM", "TK", "AB", "MR"],
    overflow: 3,
    accent: "cobalt",
  },
  {
    key: "privateSession",
    time: "16:30 – 17:30",
    start: "16:30",
    end: "17:30",
    locationKey: "privateStudio",
    attendance: "2",
    avatars: ["KS", "ML"],
    accent: "rose",
  },
];
export const attentionItems = [
  {
    key: "payments",
    count: 3,
    href: "/app/bookings",
    permissions: [PERMISSIONS.PAYMENTS_VIEW],
  },
  {
    key: "renewals",
    count: 2,
    href: "/app/products?category=memberships",
    permissions: [PERMISSIONS.MEMBERSHIPS_VIEW],
  },
];
export const quickActions = [
  {
    key: "newBooking",
    href: "/app/bookings/new",
    icon: CalendarDaysIcon,
    primary: true,
    permissions: [PERMISSIONS.BOOKINGS_CREATE],
  },
  {
    key: "addCustomer",
    href: "/app/users?section=users",
    icon: UserGroupIcon,
    permissions: [PERMISSIONS.CUSTOMERS_MANAGE],
  },
  {
    key: "createClass",
    href: "/app/products/new?category=classes&productType=class",
    icon: SparklesIcon,
    module: "courses",
    permissions: [PERMISSIONS.PRODUCTS_MANAGE],
  },
];
export const revenuePoints =
  "0,104 24,110 48,90 72,80 96,68 120,72 144,88 168,44 192,24 216,56 240,62 264,56 288,76 312,104 336,112 360,92 384,70 408,64 432,56 456,18";
export const bookingsPoints =
  "0,124 24,128 48,110 72,118 96,100 120,108 144,94 168,82 192,106 216,114 240,108 264,112 288,122 312,118 336,106 360,112 384,96 408,90 432,98 456,76";
export const studioPlanLabels = {
  starter: "Starter",
  professional: "Professional",
  studio_plus: "Studio Plus",
  enterprise: "Enterprise",
};
export const commerceLink = {
  href: "/app/finance/orders",
  icon: ShoppingBagIcon,
};
