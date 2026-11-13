"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  UsersIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  CalendarDaysIcon,
  ShoppingBagIcon,
  TicketIcon,
  BellAlertIcon,
  IdentificationIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { selectCurrentLanguage } from "@/lib/features/language/languageSlice";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { useLegacyCopy } from "@/i18n/useLegacyCopy";
import MembershipPlansPage from "../membership_plans/MembershipPlansPage";
import InventoryManagementPage from "../inventory/InventoryManagementPage";
import StatisticsPage from "../statistics/StatisticsPage";
import EventsManagementPage from "../events/EventsManagementPage";
import StaffTasksPage from "../staff_tasks/StaffTasksPage";
import StudioOrdersManagementPage from "../studio_orders/StudioOrdersManagementPage";
import AutomatedCommunicationsPage from "../automated_communications/AutomatedCommunicationsPage";
import ProductsTable from "@/components/tables/ProductsTable";
import BookingsTable from "@/components/tables/BookingsTable";
import OrdersTable from "@/components/tables/OrdersTable";
import VouchersTable from "@/components/tables/VouchersTable";
import PromoCodesTable from "@/components/tables/PromoCodesTable";
import UsersAndStaffTable from "@/components/tables/UsersAndStaffTable";
const classNames = (...classes) => classes.filter(Boolean).join(" ");
export default function Management() {
  const copy = useLegacyCopy("management");
  const language = useSelector(selectCurrentLanguage);
  const currentUser = useSelector(selectCurrentUser);
  const { isAdmin } = currentUser || {};
  const modules = useMemo(() => {
    const adminModules = [
      {
        id: "users-staff",
        label: copy.modules["users-staff"].label,
        description: copy.modules["users-staff"].description,
        icon: UsersIcon,
        group: "Core",
        component: <UsersAndStaffTable />,
      },
      {
        id: "bookings",
        label: copy.modules["bookings"].label,
        description: copy.modules["bookings"].description,
        icon: CalendarDaysIcon,
        group: "Core",
        component: <BookingsTable />,
      },
      {
        id: "products",
        label: copy.modules["products"].label,
        description: copy.modules["products"].description,
        icon: CubeIcon,
        group: "Core",
        component: <ProductsTable />,
      },
      {
        id: "orders",
        label: copy.modules["orders"].label,
        description: copy.modules["orders"].description,
        icon: ShoppingBagIcon,
        group: "Core",
        component: <OrdersTable />,
      },
      {
        id: "inventory",
        label: copy.modules["inventory"].label,
        description: copy.modules["inventory"].description,
        icon: ClipboardDocumentListIcon,
        group: "Studio",
        component: <InventoryManagementPage />,
      },
      {
        id: "studio-orders",
        label: copy.modules["studio-orders"].label,
        description: copy.modules["studio-orders"].description,
        icon: ClipboardDocumentCheckIcon,
        group: "Studio",
        component: <StudioOrdersManagementPage />,
      },
      {
        id: "staff-tasks",
        label: copy.modules["staff-tasks"].label,
        description: copy.modules["staff-tasks"].description,
        icon: ClipboardDocumentListIcon,
        group: "Team",
        component: <StaffTasksPage />,
      },
      {
        id: "memberships",
        label: copy.modules["memberships"].label,
        description: copy.modules["memberships"].description,
        icon: IdentificationIcon,
        group: "Growth",
        component: <MembershipPlansPage />,
      },
      {
        id: "statistics",
        label: copy.modules["statistics"].label,
        description: copy.modules["statistics"].description,
        icon: ChartBarIcon,
        group: "Growth",
        component: <StatisticsPage />,
      },
      {
        id: "automated-communications",
        label: copy.modules["automated-communications"].label,
        description: copy.modules["automated-communications"].description,
        icon: BellAlertIcon,
        group: "Communication",
        component: <AutomatedCommunicationsPage />,
      },
      {
        id: "events",
        label: copy.modules["events"].label,
        description: copy.modules["events"].description,
        icon: CalendarDaysIcon,
        group: "Studio",
        component: <EventsManagementPage />,
      },
      {
        id: "vouchers",
        label: copy.modules["vouchers"].label,
        description: copy.modules["vouchers"].description,
        icon: TicketIcon,
        group: "Sales",
        component: (
          <div className="space-y-6">
            <VouchersTable />
            <PromoCodesTable />
          </div>
        ),
      },
    ];
    return isAdmin ? adminModules : [];
  }, [copy, isAdmin]);
  const [activeModuleId, setActiveModuleId] = useState(modules[0]?.id || null);
  const activeModule =
    modules.find((module) => module.id === activeModuleId) || modules[0];
  const groupedModules = useMemo(() => {
    return modules.reduce((acc, module) => {
      const group = module.group || "Other";
      if (!acc[group]) acc[group] = [];
      acc[group].push(module);
      return acc;
    }, {});
  }, [modules]);
  const groupNames = useMemo(
    () => Object.keys(groupedModules),
    [groupedModules],
  );
  const [activeGroup, setActiveGroup] = useState(
    activeModule?.group || groupNames[0],
  );
  const visibleModules = groupedModules[activeGroup] || modules;
  useEffect(() => {
    if (!modules.length) return;
    const exists = modules.some((module) => module.id === activeModuleId);
    if (!exists) {
      setActiveModuleId(modules[0]?.id || null);
    }
  }, [modules, activeModuleId]);
  useEffect(() => {
    if (activeModule?.group && activeModule.group !== activeGroup) {
      setActiveGroup(activeModule.group);
    }
  }, [activeModule?.group, activeGroup]);
  if (!modules.length) {
    return (
      <main className="min-h-screen bg-[#f4f1ed] px-4 py-10 text-[#0f1113]">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-[#d8d1ca] bg-white p-8 shadow-[0_18px_50px_rgba(15,17,19,0.055)]">
          <p className="font-medium text-[10px] uppercase tracking-[0.18em] text-[#3f3a35]">
            {copy.title}
          </p>

          <h1 className="mt-3 font-medium text-2xl text-[#0f1113]">
            {copy.denied}
          </h1>
        </div>
      </main>
    );
  }
  return (
    <main className="bg-white text-[#0f1113]">
      <div className="">
        <section className="overflow-hidden border border-[#d8d1ca] bg-white shadow-[0_18px_50px_rgba(15,17,19,0.045)]">
          <div className="border-b border-[#e7e1db] px-4 py-5 sm:px-6 lg:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <h1 className="mt-2 font-medium text-3xl leading-tight tracking-tight text-[#0f1113] sm:text-4xl">
                  {copy.title}
                </h1>

                {/* <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4b4540]">
                  Přehledná správa studia, rezervací, zákazníků, výrobků a
                  komunikace.
                 </p> */}
              </div>

              <div className="inline-flex w-fit rounded-full border border-[#d8d1ca] bg-[#f8f6f3] px-3.5 py-1.5 font-medium text-[11px] uppercase tracking-[0.14em] text-[#3f3a35]">
                {isAdmin ? copy.adminAccess : copy.moderatorAccess}
              </div>
            </div>

            <div className="mt-6 hidden space-y-4 lg:block">
              <div className="flex flex-wrap gap-2">
                {groupNames.map((group) => {
                  const isActive = group === activeGroup;
                  return (
                    <button
                      key={copy.groups[group]}
                      type="button"
                      onClick={() => {
                        setActiveGroup(group);
                        setActiveModuleId(groupedModules[group]?.[0]?.id);
                      }}
                      className={classNames(
                        "inline-flex h-10 items-center rounded-full border px-4",
                        "font-medium text-[11px] uppercase tracking-[0.16em]",
                        "transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f1113]/15",
                        isActive
                          ? "border-[#0f1113] bg-[#0f1113] text-white shadow-[0_10px_24px_rgba(15,17,19,0.14)]"
                          : "border-[#d8d1ca] bg-white text-[#2b2825] hover:border-[#0f1113] hover:bg-[#f8f6f3]",
                      )}
                    >
                      {group}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-[#e2dcd6] pt-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                  {visibleModules.map((module) => {
                    const Icon = module.icon;
                    const isActive = activeModule?.id === module.id;
                    return (
                      <button
                        key={module.id}
                        type="button"
                        onClick={() => setActiveModuleId(module.id)}
                        className={classNames(
                          "group relative inline-flex items-center gap-1.5 py-2 text-sm",
                          "font-medium transition-colors duration-200 focus-visible:outline-none",
                          isActive
                            ? "text-[#0f1113]"
                            : "text-[#3f3a35] hover:text-[#0f1113]",
                        )}
                      >
                        <Icon
                          className={classNames(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-[#0f1113]"
                              : "text-[#3f3a35] group-hover:text-[#0f1113]",
                          )}
                          aria-hidden="true"
                        />

                        <span className="whitespace-nowrap">
                          {module.label}
                        </span>

                        <span
                          className={classNames(
                            "absolute -bottom-[13px] left-0 h-[2px] rounded-full bg-[#0f1113] transition-all duration-200",
                            isActive ? "w-full opacity-100" : "w-0 opacity-0",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 lg:hidden">
              <label className="mb-2 block font-medium text-[10px] uppercase tracking-[0.18em] text-[#3f3a35]">
                {copy.section}
              </label>

              <select
                value={activeModule?.id}
                onChange={(event) => setActiveModuleId(event.target.value)}
                className="h-12 w-full rounded-full border border-[#d8d1ca] bg-white px-4 font-medium text-sm text-[#0f1113] outline-none focus:border-[#0f1113] focus:ring-2 focus:ring-[#0f1113]/10"
              >
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-b border-[#e7e1db] bg-[#fbfaf8] px-4 py-4 sm:px-6 lg:px-7">
            <div className="min-w-0">
              <span className="inline-flex rounded-full border border-[#d8d1ca] bg-white px-3.5 py-1.5 font-medium text-[10px] uppercase tracking-[0.16em] text-[#3f3a35]">
                {copy.groups[activeModule?.group] || copy.groups.Admin}
              </span>

              <h2 className="mt-3 font-medium text-2xl uppercase leading-tight tracking-tight text-[#0f1113] sm:text-3xl">
                {activeModule?.label}
              </h2>

              {activeModule?.description && (
                <p className="mt-2 max-w-4xl text-sm leading-6 text-[#4b4540]">
                  {activeModule.description}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white">
            <div className="overflow-x-auto">
              <div className="min-w-full">{activeModule?.component}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
