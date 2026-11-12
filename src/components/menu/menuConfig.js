import {
  CalendarDaysIcon,
  ClipboardIcon,
  GiftIcon,
  HeartIcon,
  PlayCircleIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from "@heroicons/react/20/solid";
export const DEFAULT_TAB = "STUDIO_CALENDAR";
export const STUDIO_CALENDAR_TAB = "STUDIO_CALENDAR";
export const TABS = [
  {
    name: STUDIO_CALENDAR_TAB,
    group: "USER_ACCOUNT",
    adminOnly: false,
    hidden: true,
    module: ["bookings", "courses"],
  },
  {
    name: "MY_BOOKINGS",
    group: "USER_ACCOUNT",
    adminOnly: false,
    module: ["bookings", "courses"],
  },
  {
    name: "VOUCHERS",
    group: "USER_ACCOUNT",
    adminOnly: false,
    module: "vouchers",
  },
  {
    name: "TUTORIALS",
    group: "USER_ACCOUNT",
    adminOnly: false,
  },
  {
    name: "OPERATIONS",
    group: "BUSINESS",
    adminOnly: true,
  },
  {
    name: "CUSTOMERS",
    group: "BUSINESS",
    adminOnly: true,
  },
  {
    name: "COMMUNICATION",
    group: "BUSINESS",
    adminOnly: true,
  },
  {
    name: "COMMERCE",
    group: "BUSINESS",
    adminOnly: true,
  },
  {
    name: "INVENTORY",
    group: "BUSINESS",
    adminOnly: true,
  },
  {
    name: "INSIGHTS",
    group: "BUSINESS",
    adminOnly: true,
  },
  {
    name: "MANAGEMENT",
    group: "SYSTEM",
    adminOnly: true,
  },
];
export const TAB_LABELS = {
  STUDIO_CALENDAR: {
    CZ: "Studio",
    EN: "Studio",
  },
  MY_BOOKINGS: {
    CZ: "Moje rezervace",
    EN: "My Bookings",
  },
  VOUCHERS: {
    CZ: "Poukazy",
    EN: "Vouchers",
  },
  TUTORIALS: {
    CZ: "Rady studia",
    EN: "Knowledge hub",
  },
  OPERATIONS: {
    CZ: "Operations",
    EN: "Operations",
  },
  CUSTOMERS: {
    CZ: "Customers",
    EN: "Customers",
  },
  COMMUNICATION: {
    CZ: "Communication",
    EN: "Communication",
  },
  COMMERCE: {
    CZ: "Commerce",
    EN: "Commerce",
  },
  INVENTORY: {
    CZ: "Inventory",
    EN: "Inventory",
  },
  INSIGHTS: {
    CZ: "Insights",
    EN: "Insights",
  },
  MANAGEMENT: {
    CZ: "Management",
    EN: "Management",
  },
};
export const TAB_ICONS = {
  STUDIO_CALENDAR: CalendarDaysIcon,
  MY_BOOKINGS: ClipboardIcon,
  VOUCHERS: GiftIcon,
  TUTORIALS: PlayCircleIcon,
  OPERATIONS: CalendarDaysIcon,
  CUSTOMERS: UserGroupIcon,
  COMMUNICATION: ChatBubbleLeftRightIcon,
  COMMERCE: ShoppingBagIcon,
  INVENTORY: ArchiveBoxIcon,
  INSIGHTS: ChartBarIcon,
  MANAGEMENT: Cog6ToothIcon,
};
export const GROUP_LABELS = {
  USER_ACCOUNT: "User Account",
  BUSINESS: "Business",
  SYSTEM: "System",
};
