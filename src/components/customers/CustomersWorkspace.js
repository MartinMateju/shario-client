"use client";

import { useMemo, useState } from "react";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import UsersAndStaffTable from "@/components/tables/UsersAndStaffTable";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";

import {
  AssignMembershipDialog,
  CancelMembershipDialog,
  CreateCustomerDialog,
  GrantCreditsDialog,
} from "./CustomerActionDialogs";
import CustomerProfileDialog from "./CustomerProfileDialog";
import { getCustomerName } from "./customers.utils";

const moduleEnabled = (tenant, key) => tenant?.modules?.[key] !== false;

const permission = (access, ...values) =>
  values.some((value) => hasPermission(access, value));

export const getCustomersWorkspaceCapabilities = ({
  tenant,
  workspaceAccess,
}) => ({
  canCreate: hasPermission(workspaceAccess, PERMISSIONS.CUSTOMERS_MANAGE),
  canViewBookings:
    moduleEnabled(tenant, "bookings") &&
    hasPermission(workspaceAccess, PERMISSIONS.BOOKINGS_VIEW),
  canViewCredits:
    moduleEnabled(tenant, "credits") &&
    permission(
      workspaceAccess,
      PERMISSIONS.CREDITS_VIEW,
      PERMISSIONS.CREDITS_MANAGE,
    ),
  canGrantCredits:
    moduleEnabled(tenant, "credits") &&
    hasPermission(workspaceAccess, PERMISSIONS.CREDITS_MANAGE),
  canViewMemberships:
    moduleEnabled(tenant, "memberships") &&
    permission(
      workspaceAccess,
      PERMISSIONS.MEMBERSHIPS_VIEW,
      PERMISSIONS.MEMBERSHIPS_MANAGE,
    ),
  canManageMemberships:
    moduleEnabled(tenant, "memberships") &&
    hasPermission(workspaceAccess, PERMISSIONS.MEMBERSHIPS_MANAGE),
});

export default function CustomersWorkspace({ showPageHeader = false }) {
  const t = useTranslations("People");
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const capabilities = useMemo(
    () => getCustomersWorkspaceCapabilities({ tenant, workspaceAccess }),
    [tenant, workspaceAccess],
  );
  const [profileCustomer, setProfileCustomer] = useState(null);
  const [action, setAction] = useState({ type: "", target: null });
  const [notice, setNotice] = useState("");

  const closeAction = () => setAction({ type: "", target: null });
  const openAction = (type, target = null) => {
    setProfileCustomer(null);
    setNotice("");
    setAction({ type, target });
  };
  const completeAction = (message) => {
    closeAction();
    setNotice(message);
  };

  return (
    <>
      <div className="space-y-4">
        {notice ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-[16px] border border-success/20 bg-success-soft px-4 py-3 text-[12px] leading-5 text-success"
          >
            <CheckCircleIcon
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label={t("notices.dismiss")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <UsersAndStaffTable
          showPageHeader={showPageHeader}
          showInsights={false}
          showStaff={false}
          onAddCustomer={
            capabilities.canCreate ? () => openAction("create") : undefined
          }
          onOpenCustomer={setProfileCustomer}
          onAddCredits={
            capabilities.canGrantCredits
              ? (customer) => openAction("credits", customer)
              : undefined
          }
        />
      </div>

      <CustomerProfileDialog
        key={profileCustomer?.id || profileCustomer?._id || "customer-profile"}
        open={Boolean(profileCustomer)}
        customer={profileCustomer}
        permissions={capabilities}
        onClose={() => setProfileCustomer(null)}
        onGrantCredits={(customer) => openAction("credits", customer)}
        onAssignMembership={(customer) => openAction("membership", customer)}
        onCancelMembership={(membership) =>
          openAction("cancel-membership", membership)
        }
        t={t}
      />

      {action.type === "create" ? (
        <CreateCustomerDialog
          open
          onClose={closeAction}
          onCreated={() => completeAction(t("notices.customerCreated"))}
          t={t}
        />
      ) : null}
      {action.type === "credits" ? (
        <GrantCreditsDialog
          open
          customer={action.target}
          onClose={closeAction}
          onGranted={() =>
            completeAction(
              t("notices.creditsGranted", {
                name: getCustomerName(action.target),
              }),
            )
          }
          t={t}
        />
      ) : null}
      {action.type === "membership" ? (
        <AssignMembershipDialog
          open
          customer={action.target}
          onClose={closeAction}
          onAssigned={() =>
            completeAction(
              t("notices.membershipAssigned", {
                name: getCustomerName(action.target),
              }),
            )
          }
          t={t}
        />
      ) : null}
      {action.type === "cancel-membership" ? (
        <CancelMembershipDialog
          open
          membership={action.target}
          onClose={closeAction}
          onCancelled={() => completeAction(t("notices.membershipCancelled"))}
          t={t}
        />
      ) : null}
    </>
  );
}
