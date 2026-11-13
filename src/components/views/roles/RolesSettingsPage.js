"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import {
  ArrowPathIcon,
  CheckIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { canCreateCustomRolesForPlan } from "@/config/planEntitlements";
import { Link } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  useCreateWorkspaceRoleMutation,
  useDeleteWorkspaceRoleMutation,
  useGetPermissionCatalogQuery,
  useGetWorkspaceRolesQuery,
  useUpdateWorkspaceRoleMutation,
} from "@/lib/features/workspace-access/workspaceAccessApiSlice";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const getId = (value) => String(value?.roleId || value?.id || value?._id || "");
const getKey = (value) =>
  String(value?.key || value?.roleKey || "custom").toLowerCase();

const normalizeRoles = (data) => {
  if (Array.isArray(data)) return data;
  const direct = Array.isArray(data?.roles) ? data.roles : [];
  const builtIn = Array.isArray(data?.builtInRoles) ? data.builtInRoles : [];
  const custom = Array.isArray(data?.customRoles) ? data.customRoles : [];
  return [...direct, ...builtIn, ...custom].filter(
    (role, index, values) =>
      index ===
      values.findIndex(
        (candidate) =>
          (getId(candidate) || getKey(candidate)) ===
          (getId(role) || getKey(role)),
      ),
  );
};

const humanize = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const isPermissionVisible = (permission) =>
  NATIVE_INVOICES_ENABLED || !String(permission).startsWith("invoices.");

const normalizePermission = (permission, group) => {
  if (typeof permission === "string") {
    return { key: permission, group: group || permission.split(".")[0] };
  }

  return {
    ...permission,
    key: permission?.key || permission?.permission || permission?.id || "",
    group:
      permission?.group ||
      permission?.category ||
      group ||
      String(permission?.key || "").split(".")[0],
  };
};

const normalizePermissionCatalog = (data) => {
  const source = data?.permissions ?? data?.catalog ?? data;

  if (Array.isArray(source)) {
    return source
      .map((permission) => normalizePermission(permission))
      .filter((item) => item.key && item.reservedForCustomRoles !== true);
  }

  const groups = Array.isArray(data?.groups) ? data.groups : [];
  if (groups.length) {
    return groups.flatMap((group) =>
      (group.permissions || []).map((permission) =>
        normalizePermission(permission, group.key || group.name),
      ),
    );
  }

  if (source && typeof source === "object") {
    return Object.entries(source).flatMap(([group, permissions]) =>
      Array.isArray(permissions)
        ? permissions.map((permission) =>
            normalizePermission(permission, group),
          )
        : [],
    );
  }

  return [];
};

const isBuiltInRole = (role) =>
  role?.isBuiltIn === true ||
  role?.builtIn === true ||
  role?.type === "built_in" ||
  !getId(role);

const getMutationError = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

function RoleEditor({ role, catalog, open, onClose }) {
  const t = useTranslations("RoleSettings");
  const isEditing = Boolean(role);
  const [name, setName] = useState(role?.name || role?.roleName || "");
  const [description, setDescription] = useState(role?.description || "");
  // Retain hidden grants so editing another field does not revoke them.
  const [selected, setSelected] = useState(
    () => new Set(Array.isArray(role?.permissions) ? role.permissions : []),
  );
  const [error, setError] = useState("");
  const [createRole, { isLoading: isCreating }] =
    useCreateWorkspaceRoleMutation();
  const [updateRole, { isLoading: isUpdating }] =
    useUpdateWorkspaceRoleMutation();
  const isLoading = isCreating || isUpdating;

  const grouped = useMemo(() => {
    return catalog.reduce((result, permission) => {
      const group = permission.group || "other";
      result[group] ||= [];
      result[group].push(permission);
      return result;
    }, {});
  }, [catalog]);

  const toggle = (key) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const body = {
      name: name.trim(),
      description: description.trim(),
      permissions: [...selected],
    };

    try {
      if (isEditing) {
        await updateRole({ roleId: getId(role), ...body }).unwrap();
      } else {
        await createRole(body).unwrap();
      }
      onClose();
    } catch (mutationError) {
      setError(getMutationError(mutationError, t("editor.errors.request")));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? () => {} : onClose}
      className="relative z-[120]"
    >
      <DialogBackdrop
        data-dialog-backdrop
        className="fixed inset-0 bg-[#11110F]/30 backdrop-blur-[2px]"
      />
      <div className="fixed inset-0 overflow-y-auto p-0 sm:p-6">
        <div className="flex min-h-full items-stretch justify-center sm:items-center">
          <DialogPanel
            data-dialog-layout="form"
            className="h-dvh max-h-dvh w-full max-w-3xl overflow-hidden rounded-none border-0 bg-surface-raised pt-[env(safe-area-inset-top)] shadow-floating sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] sm:border"
          >
            <div className="flex items-start justify-between border-b border-line bg-white px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
                  {t("editor.eyebrow")}
                </p>
                <DialogTitle className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#111111]">
                  {isEditing ? t("editor.editTitle") : t("editor.createTitle")}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-[#777773] hover:bg-[#F4F2ED]"
                aria-label={t("editor.close")}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={submit}
              className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-7"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
                    {t("editor.name")}
                  </span>
                  <input
                    required
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-12 w-full rounded-[13px] border border-line bg-white px-4 text-[12px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
                    {t("editor.description")}
                  </span>
                  <input
                    maxLength={240}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="h-12 w-full rounded-[13px] border border-line bg-white px-4 text-[12px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                  />
                </label>
              </div>

              <section>
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold text-[#292925]">
                      {t("editor.permissionsTitle")}
                    </h3>
                    <p className="mt-1 text-[11px] leading-4 text-[#777773]">
                      {t("editor.permissionsDescription")}
                    </p>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-cobalt-100 px-3 py-1 text-[10px] font-semibold text-cobalt-700">
                    {t("editor.selected", {
                      count: [...selected].filter(isPermissionVisible).length,
                    })}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {Object.entries(grouped).map(([group, permissions]) => (
                    <div
                      key={group}
                      className="overflow-hidden rounded-[16px] border border-line bg-white"
                    >
                      <div className="border-b border-line bg-surface-muted px-4 py-3">
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5F5F5A]">
                          {t.has(`groups.${group}`)
                            ? t(`groups.${group}`)
                            : humanize(group)}
                        </h4>
                      </div>
                      <div className="grid gap-px bg-line sm:grid-cols-2">
                        {permissions.map((permission) => {
                          const checked = selected.has(permission.key);
                          const translationKey = permission.key.replaceAll(
                            ".",
                            "_",
                          );
                          return (
                            <label
                              key={permission.key}
                              className="flex cursor-pointer gap-3 bg-white px-4 py-3.5 hover:bg-surface-muted"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(permission.key)}
                                className="sr-only"
                              />
                              <span
                                className={cx(
                                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                                  checked
                                    ? "border-cobalt-500 bg-cobalt-500 text-white"
                                    : "border-[#D6D3CC] bg-white text-transparent",
                                )}
                              >
                                <CheckIcon className="h-3.5 w-3.5" />
                              </span>
                              <span className="min-w-0">
                                <strong className="block text-xs font-semibold text-[#292925]">
                                  {t.has(`permissionNames.${translationKey}`)
                                    ? t(`permissionNames.${translationKey}`)
                                    : permission.label ||
                                      humanize(permission.key)}
                                </strong>
                                <span className="mt-0.5 block break-words text-[10px] leading-4 text-[#858580]">
                                  {permission.description || permission.key}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex gap-3 rounded-[14px] border border-sand-200 bg-sand-50 px-4 py-3">
                <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0 text-sand-700" />
                <p className="text-[11px] leading-5 text-sand-800">
                  {t("editor.nonDelegableNotice")}
                </p>
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-[13px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
                >
                  {error}
                </p>
              )}
              <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-full border border-line bg-white px-5 text-xs font-semibold text-[#4F4F4B]"
                >
                  {t("actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-6 text-xs font-semibold text-white shadow-cobalt hover:bg-cobalt-600 disabled:opacity-50"
                >
                  {isLoading && (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  )}
                  {t("actions.save")}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default function RolesSettingsPage({ showPageHeader = true }) {
  const t = useTranslations("RoleSettings");
  const access = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const canManage = hasPermission(access, PERMISSIONS.ROLES_MANAGE);
  const canCreate = canManage && canCreateCustomRolesForPlan(tenant);
  const [editor, setEditor] = useState({ open: false, role: null });
  const [notice, setNotice] = useState("");
  const rolesQuery = useGetWorkspaceRolesQuery();
  const catalogQuery = useGetPermissionCatalogQuery();
  const [deleteRole, { isLoading: isDeleting }] =
    useDeleteWorkspaceRoleMutation();
  const roles = useMemo(
    () => normalizeRoles(rolesQuery.data),
    [rolesQuery.data],
  );
  const catalog = useMemo(
    () =>
      normalizePermissionCatalog(catalogQuery.data).filter((permission) =>
        isPermissionVisible(permission.key),
      ),
    [catalogQuery.data],
  );

  const remove = async (role) => {
    if (
      !window.confirm(t("deleteConfirm", { name: role.name || role.roleName }))
    )
      return;
    setNotice("");
    try {
      await deleteRole(getId(role)).unwrap();
    } catch (error) {
      setNotice(getMutationError(error, t("errors.delete")));
    }
  };

  if (rolesQuery.isLoading || catalogQuery.isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-cobalt-500" />
        <span className="ml-3 text-[12px] text-[#777773]">{t("loading")}</span>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <WorkspaceSectionHeader
        showTitle={showPageHeader}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => setEditor({ open: true, role: null })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt hover:bg-cobalt-600"
            >
              <PlusIcon className="h-4 w-4" />
              {t("actions.create")}
            </button>
          ) : null
        }
      />
      {canManage && !canCreate ? (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950">
          <p>{t("planRestriction")}</p>
          {hasPermission(access, PERMISSIONS.SUBSCRIPTION_VIEW) ? (
            <Link
              href="/app/settings/billing"
              className="mt-2 inline-flex min-h-10 items-center font-semibold underline"
            >
              {t("reviewPlan")}
            </Link>
          ) : null}
        </div>
      ) : null}
      {notice && (
        <p
          role="alert"
          className="rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
        >
          {notice}
        </p>
      )}
      {(rolesQuery.isError || catalogQuery.isError) && (
        <p
          role="alert"
          className="rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
        >
          {t("errors.load")}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((role) => {
          const builtIn = isBuiltInRole(role);
          const roleKey = getKey(role);
          const permissions = Array.isArray(role.permissions)
            ? role.permissions.filter(isPermissionVisible)
            : [];
          return (
            <article
              key={getId(role) || roleKey}
              className="rounded-[20px] border border-line bg-white p-5 shadow-[0_14px_38px_rgba(17,17,15,0.04)]"
            >
              <div className="flex items-start gap-4">
                <span
                  className={cx(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                    builtIn
                      ? "bg-surface-muted text-ink-muted"
                      : "bg-cobalt-100 text-cobalt-700",
                  )}
                >
                  {builtIn ? (
                    <LockClosedIcon className="h-5 w-5" />
                  ) : (
                    <ShieldCheckIcon className="h-5 w-5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[14px] font-semibold text-ink">
                      {role.name || role.roleName || t(`roles.${roleKey}`)}
                    </h2>
                    <span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                      {builtIn ? t("builtIn") : t("custom")}
                    </span>
                  </div>
                  <p className="mt-1 min-h-8 text-[11px] leading-4 text-ink-muted">
                    {role.description || t(`roleDescriptions.${roleKey}`)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {permissions.slice(0, 6).map((permission) => (
                  <span
                    key={permission}
                    className="rounded-full border border-line bg-surface-muted px-2 py-1 text-[10px] text-[#686762]"
                  >
                    {humanize(permission)}
                  </span>
                ))}
                {permissions.length > 6 && (
                  <span className="rounded-full bg-cobalt-100 px-2 py-1 text-[10px] font-semibold text-cobalt-700">
                    +{permissions.length - 6}
                  </span>
                )}
                {permissions.length === 0 && (
                  <span className="text-[10px] text-[#9A9993]">
                    {t("noPermissions")}
                  </span>
                )}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="text-[10px] text-[#858580]">
                  {t("membersUsing", {
                    count: role.memberCount || role.membershipsCount || 0,
                  })}
                </span>
                {canManage && !builtIn && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditor({ open: true, role })}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-[#5F5F5A] hover:text-cobalt-600"
                      aria-label={t("actions.edit")}
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => remove(role)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-[#A34E38] hover:bg-coral-50 disabled:opacity-40"
                      aria-label={t("actions.delete")}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {editor.open && (
        <RoleEditor
          key={getId(editor.role) || "new"}
          role={editor.role}
          catalog={catalog}
          open
          onClose={() => setEditor({ open: false, role: null })}
        />
      )}
    </section>
  );
}
