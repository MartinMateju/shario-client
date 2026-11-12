import {
  CalendarDaysIcon,
  FireIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  TicketIcon,
  ShoppingBagIcon,
  ArchiveBoxIcon,
  UsersIcon,
  IdentificationIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
} from "@heroicons/react/20/solid";
import UsersAndStaffTable from "@/components/tables/UsersAndStaffTable";
import BookingsTable from "@/components/tables/BookingsTable";
import ProductsTable from "@/components/tables/ProductsTable";
import OrdersTable from "@/components/tables/OrdersTable";
import VouchersTable from "@/components/tables/VouchersTable";
import PromoCodesTable from "@/components/tables/PromoCodesTable";
import MembershipPlansPage from "../views/membership_plans/MembershipPlansPage";
import InventoryManagementPage from "../views/inventory/InventoryManagementPage";
import StatisticsPage from "../views/statistics/StatisticsPage";
import EventsManagementPage from "../views/events/EventsManagementPage";
import StaffTasksPage from "../views/staff_tasks/StaffTasksPage";
import StudioOrdersManagementPage from "../views/studio_orders/StudioOrdersManagementPage";
import AutomatedCommunicationsPage from "../views/automated_communications/AutomatedCommunicationsPage";
export const getOperationsModules = ({ activeStudio }) => [
  {
    id: "bookings",
    label: "Bookings",
    description: "Reservations, participants and studio capacity.",
    icon: CalendarDaysIcon,
    component: <BookingsTable activeStudio={activeStudio} />,
  },
  {
    id: "events",
    label: "Events",
    description: "Private events, team buildings and studio events.",
    icon: CalendarDaysIcon,
    component: <EventsManagementPage activeStudio={activeStudio} />,
  },
  {
    id: "studio-orders",
    label: "Studio Orders",
    description: "Custom orders and business requests.",
    icon: ClipboardDocumentCheckIcon,
    component: <StudioOrdersManagementPage activeStudio={activeStudio} />,
  },
  {
    id: "team-tasks",
    label: "Team Tasks",
    description: "Weekly tasks, blockers and staff responsibilities.",
    icon: ClipboardDocumentListIcon,
    component: <StaffTasksPage activeStudio={activeStudio} />,
  },
];
export const getCustomerModules = ({ activeStudio }) => [
  {
    id: "customers",
    label: "Customers",
    description: "Customers, credits, customer history and internal notes.",
    icon: UsersIcon,
    component: <UsersAndStaffTable activeStudio={activeStudio} />,
  },
  {
    id: "memberships",
    label: "Memberships",
    description: "Membership plans, monthly credits, limits and benefits.",
    icon: IdentificationIcon,
    component: <MembershipPlansPage activeStudio={activeStudio} />,
  },
];
export const getCommunicationModules = ({ activeStudio }) => [
  {
    id: "automated-communications",
    label: "Automated Emails",
    description: "Automated messages, email logs and sender addresses.",
    icon: ChatBubbleLeftRightIcon,
    component: <AutomatedCommunicationsPage activeStudio={activeStudio} />,
  },
];
export const getCommerceModules = ({ activeStudio }) => [
  {
    id: "orders",
    label: "Orders",
    description: "Customer orders, payments and checkout history.",
    icon: ShoppingBagIcon,
    component: <OrdersTable activeStudio={activeStudio} />,
  },
  {
    id: "products",
    label: "Products & Classes",
    description: "Studio access, classes, memberships and vouchers.",
    icon: CubeIcon,
    component: <ProductsTable activeStudio={activeStudio} />,
  },
  {
    id: "vouchers",
    label: "Vouchers",
    description: "Gift vouchers and issued voucher codes.",
    icon: TicketIcon,
    component: <VouchersTable activeStudio={activeStudio} />,
  },
  {
    id: "promo-codes",
    label: "Promo Codes",
    description: "Discount codes and promotional campaigns.",
    icon: TicketIcon,
    component: <PromoCodesTable activeStudio={activeStudio} />,
  },
];
export const getInventoryModules = ({ activeStudio }) => [
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock, suppliers, purchases, movements and reorder overview.",
    icon: ArchiveBoxIcon,
    component: <InventoryManagementPage activeStudio={activeStudio} />,
  },
];
export const getInsightsModules = ({ activeStudio }) => [
  {
    id: "statistics",
    label: "Statistics",
    description: "Statistics, reports and business performance overview.",
    icon: ChartBarIcon,
    component: <StatisticsPage activeStudio={activeStudio} />,
  },
];
