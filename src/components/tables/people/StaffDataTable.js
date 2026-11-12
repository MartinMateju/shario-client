"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  EllipsisHorizontalIcon,
  EyeIcon,
  TrashIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

import {
  WorkspaceEmptyState,
  WorkspaceTable,
  WorkspaceTableHeadCell,
  WorkspaceTableScroller,
  WorkspaceTruncatedText,
} from "@/components/dashboard/WorkspaceDataSurface";
import { Link } from "@/i18n/navigation";

import PersonAvatar from "./PersonAvatar";
import {
  cx,
  formatRelativeDate,
  getFullName,
  getId,
  getStaffAccess,
  getStaffLastActive,
  getStaffLocation,
  getStaffRole,
  getStaffStatus,
  getStatusTone,
  humanizeValue,
  translateValue,
} from "./people-table.utils";

function StaffRowActions({
  member,
  canDelete,
  isDeleting,
  t,
  getStaffHref,
  onOpenStaff,
  onDelete,
}) {
  const profileHref = getStaffHref?.(member);
  const hasActions = Boolean(profileHref || onOpenStaff || canDelete);

  if (!hasActions) return null;

  return (
    <Menu as="div" className="relative flex justify-end">
      <MenuButton
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#777771] transition hover:bg-[#F0EFEC] hover:text-[#11110F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25"
        aria-label={t("actions.openStaffActions", {
          name: getFullName(member),
        })}
      >
        <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
      </MenuButton>

      <MenuItems
        transition
        anchor="bottom end"
        portal
        className="z-[140] mt-1.5 w-48 origin-top-right rounded-[14px] border border-[#E7E4DE] bg-white p-1.5 shadow-[0_18px_50px_rgba(17,17,15,0.15)] outline-none transition duration-150 data-[closed]:scale-95 data-[closed]:opacity-0"
      >
        {(onOpenStaff || profileHref) && (
          <MenuItem>
            {profileHref && !onOpenStaff ? (
              <Link
                href={profileHref}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-ink-soft transition data-[focus]:bg-sand-50"
              >
                <EyeIcon className="h-4 w-4" aria-hidden="true" />
                {t("actions.viewProfile")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => onOpenStaff?.(member)}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-ink-soft transition data-[focus]:bg-sand-50"
              >
                <EyeIcon className="h-4 w-4" aria-hidden="true" />
                {t("actions.viewProfile")}
              </button>
            )}
          </MenuItem>
        )}

        {canDelete && (
          <MenuItem>
            <button
              type="button"
              onClick={() => onDelete(member)}
              disabled={isDeleting}
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[12px] font-medium text-terracotta-600 transition data-[focus]:bg-coral-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
              {t("actions.removeStaff")}
            </button>
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  );
}

function StatusPill({ status, t }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-6 items-center rounded-[7px] px-2 py-1 text-[10px] font-medium leading-none",
        getStatusTone(status),
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

function EmptyState({ t }) {
  return (
    <WorkspaceEmptyState
      contained
      icon={UserPlusIcon}
      title={t("empty.staffTitle")}
      description={t("empty.staffDescription")}
    />
  );
}

function MobileStaffCard({
  member,
  locale,
  canDelete,
  isDeleting,
  t,
  getStaffHref,
  onOpenStaff,
  onDelete,
}) {
  const role = getStaffRole(member);
  const access = getStaffAccess(member);
  const status = getStaffStatus(member);

  return (
    <article className="rounded-[18px] border border-[#E7E4DE] bg-white p-4">
      <div className="flex items-start gap-3">
        <PersonAvatar person={member} />
        <div className="min-w-0 flex-1">
          <WorkspaceTruncatedText
            as="p"
            className="text-[13px] font-semibold text-ink"
          >
            {getFullName(member)}
          </WorkspaceTruncatedText>
          <WorkspaceTruncatedText
            as="p"
            className="mt-0.5 text-[12px] text-ink-muted"
          >
            {member?.email || "—"}
          </WorkspaceTruncatedText>
        </div>
        <StaffRowActions
          member={member}
          canDelete={canDelete}
          isDeleting={isDeleting}
          t={t}
          getStaffHref={getStaffHref}
          onOpenStaff={onOpenStaff}
          onDelete={onDelete}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-[14px] bg-[#F8F6F2] p-3.5">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.role")}
          </dt>
          <dd className="mt-1 text-[12px] font-medium text-ink-soft">
            {translateValue(t, `roles.${role}`, humanizeValue(role))}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.access")}
          </dt>
          <dd className="mt-1 text-[12px] font-medium text-ink-soft">
            {translateValue(t, `access.${access}`, humanizeValue(access))}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.location")}
          </dt>
          <dd className="mt-1 text-[12px] font-medium text-ink-soft">
            {getStaffLocation(member) === "all"
              ? t("locations.all")
              : getStaffLocation(member)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
            {t("columns.lastActive")}
          </dt>
          <dd className="mt-1 text-[12px] font-medium text-ink-soft">
            {formatRelativeDate(getStaffLastActive(member), locale, t)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="truncate text-[12px] text-ink-muted">
          {member?.phone || member?.phoneNumber || "—"}
        </p>
        <StatusPill status={status} t={t} />
      </div>
    </article>
  );
}

export default function StaffDataTable({
  staff,
  locale,
  canDelete,
  isDeleting,
  t,
  getStaffHref,
  onOpenStaff,
  onDelete,
}) {
  if (staff.length === 0) return <EmptyState t={t} />;

  return (
    <>
      <div className="space-y-3 p-4 sm:hidden">
        {staff.map((member) => (
          <MobileStaffCard
            key={getId(member)}
            member={member}
            locale={locale}
            canDelete={canDelete}
            isDeleting={isDeleting}
            t={t}
            getStaffHref={getStaffHref}
            onOpenStaff={onOpenStaff}
            onDelete={onDelete}
          />
        ))}
      </div>

      <WorkspaceTableScroller
        ariaLabel={t("table.label")}
        className="hidden sm:block"
      >
        <WorkspaceTable className="min-w-[1040px]">
          <thead>
            <tr className="bg-surface-muted/90">
              {[
                "teamMember",
                "contact",
                "role",
                "access",
                "location",
                "lastActive",
                "status",
              ].map((column) => (
                <WorkspaceTableHeadCell key={column} className="px-5">
                  {t(`columns.${column}`)}
                </WorkspaceTableHeadCell>
              ))}
              <WorkspaceTableHeadCell className="w-24 text-right">
                {t("columns.actions")}
              </WorkspaceTableHeadCell>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => {
              const role = getStaffRole(member);
              const access = getStaffAccess(member);
              const status = getStaffStatus(member);
              const location = getStaffLocation(member);

              return (
                <tr
                  key={getId(member)}
                  className="bg-white transition-colors hover:bg-surface-muted"
                >
                  <td className="border-b border-[#EDEAE4] px-5 py-3">
                    <div className="flex items-center gap-3">
                      <PersonAvatar person={member} />
                      <div className="min-w-0">
                        <WorkspaceTruncatedText
                          as="p"
                          className="max-w-[180px] text-[12px] font-semibold text-ink"
                        >
                          {getFullName(member)}
                        </WorkspaceTruncatedText>
                        <WorkspaceTruncatedText
                          as="p"
                          className="mt-0.5 max-w-[180px] text-[12px] text-ink-muted"
                        >
                          {member?.email || "—"}
                        </WorkspaceTruncatedText>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-[#EDEAE4] px-5 py-3 text-[12px] text-ink-soft">
                    <p>{member?.phone || member?.phoneNumber || "—"}</p>
                  </td>
                  <td className="border-b border-[#EDEAE4] px-5 py-3">
                    <span className="inline-flex min-h-6 items-center rounded-[7px] bg-coral-50 px-2 py-1 text-[10px] font-medium text-terracotta-600">
                      {translateValue(t, `roles.${role}`, humanizeValue(role))}
                    </span>
                  </td>
                  <td className="border-b border-[#EDEAE4] px-5 py-3 text-[12px] text-ink-soft">
                    {translateValue(
                      t,
                      `access.${access}`,
                      humanizeValue(access),
                    )}
                  </td>
                  <td className="border-b border-[#EDEAE4] px-5 py-3 text-[12px] text-ink-soft">
                    {location === "all" ? t("locations.all") : location}
                  </td>
                  <td className="border-b border-[#EDEAE4] px-5 py-3 text-[12px] text-ink-soft">
                    {formatRelativeDate(getStaffLastActive(member), locale, t)}
                  </td>
                  <td className="border-b border-[#EDEAE4] px-5 py-3">
                    <StatusPill status={status} t={t} />
                  </td>
                  <td className="border-b border-[#EDEAE4] px-4 py-3">
                    <StaffRowActions
                      member={member}
                      canDelete={canDelete}
                      isDeleting={isDeleting}
                      t={t}
                      getStaffHref={getStaffHref}
                      onOpenStaff={onOpenStaff}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </WorkspaceTable>
      </WorkspaceTableScroller>
    </>
  );
}
