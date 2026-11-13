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
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import WorkspaceSectionHeader from "@/components/dashboard/WorkspaceSectionHeader";
import {
  PERMISSIONS,
  hasPermission,
  isWorkspaceOwner,
} from "@/config/permissions";
import { SKAB_BRAND_COLORS } from "@/config/brandPalette";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";
import {
  useDeleteWorkspaceTeamMemberMutation,
  useGetWorkspaceRolesQuery,
  useGetWorkspaceTeamQuery,
  useUpdateWorkspaceTeamMemberMutation,
} from "@/lib/features/workspace-access/workspaceAccessApiSlice";
import {
  useCreateWorkspaceInvitationMutation,
  useSendWorkspaceSignInInvitationMutation,
} from "@/lib/features/workspace-access/teamInvitationsApiSlice";
import TeamInvitationsPanel, {
  invitationDeliveryKey,
  invitationRateErrorKey,
} from "./TeamInvitationsPanel";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import {
  getLocationId,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";

const EMPTY_FORM = {
  email: "",
  roleSelection: "staff",
  locationMode: "all",
  locationIds: [],
  jobTitle: "",
  displayName: "",
  calendarColor: SKAB_BRAND_COLORS.primary,
  status: "active",
};

const cx = (...classes) => classes.filter(Boolean).join(" ");

const getId = (value) =>
  String(value?.membershipId || value?.id || value?._id || "");

const getRoleId = (value) =>
  String(value?.roleId || value?.id || value?._id || "");

const normalizeTeam = (data) => {
  if (Array.isArray(data)) return data;
  for (const key of ["memberships", "team", "items", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

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
          (getRoleId(candidate) || candidate?.key || candidate?.roleKey) ===
          (getRoleId(role) || role?.key || role?.roleKey),
      ),
  );
};

const getUser = (membership) => membership?.user || membership?.account || {};

const getName = (membership, fallback) => {
  const user = getUser(membership);
  const profile = membership?.workspaceProfile || {};

  return (
    profile.displayName ||
    [user.firstname || user.firstName, user.lastname || user.lastName]
      .filter(Boolean)
      .join(" ") ||
    user.email ||
    membership?.email ||
    fallback
  );
};

const getEmail = (membership) =>
  getUser(membership)?.email || membership?.email || "";

const getRoleKey = (membership) =>
  String(membership?.roleKey || membership?.role || "staff").toLowerCase();

const buildForm = (membership) => {
  if (!membership) return { ...EMPTY_FORM };

  const access = membership.locationAccess || {};
  const profile = membership.workspaceProfile || {};
  const customRoleId =
    membership.customRoleId || getRoleId(membership.customRole);
  const roleKey = getRoleKey(membership);

  return {
    email: getEmail(membership),
    roleSelection:
      roleKey === "custom" && customRoleId ? `custom:${customRoleId}` : roleKey,
    locationMode: access.mode === "selected" ? "selected" : "all",
    locationIds: Array.isArray(access.locationIds)
      ? access.locationIds.map(String)
      : [],
    jobTitle: profile.jobTitle || "",
    displayName: profile.displayName || "",
    calendarColor: profile.calendarColor || SKAB_BRAND_COLORS.primary,
    status: membership.status || "active",
  };
};

const getMutationError = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

function Pill({ children, tone = "neutral" }) {
  const tones = {
    active: "bg-[#E8F0E3] text-[#4C6040]",
    suspended: "bg-[#FFF0EA] text-[#A34E38]",
    neutral: "bg-[#EEECE7] text-[#686762]",
    role: "bg-skab-cobalt-100 text-primary-text",
  };

  return (
    <span
      className={cx(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
        tones[tone] || tones.neutral,
      )}
    >
      {children}
    </span>
  );
}

export function TeamMemberDialog({
  membership,
  locations,
  roles,
  open,
  canManageOwners,
  canGrantAllLocations,
  onClose,
  onSaved,
  guided = false,
}) {
  const t = useTranslations("TeamSettings");
  const locale = useLocale();
  const setupT = useTranslations("SetupCenter");
  const [form, setForm] = useState(() => {
    const initial = buildForm(membership);

    if (!membership && !canGrantAllLocations) {
      initial.locationMode = "selected";
      initial.locationIds = locations.map(getLocationId).filter(Boolean);
    }

    return initial;
  });
  const [error, setError] = useState("");
  const [inviteMember, { isLoading: isAdding }] =
    useCreateWorkspaceInvitationMutation();
  const [updateMember, { isLoading: isUpdating }] =
    useUpdateWorkspaceTeamMemberMutation();
  const isEditing = Boolean(membership);
  const isLoading = isAdding || isUpdating;

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const roleOptions = useMemo(() => {
    const options = roles.map((role) => {
      const roleId = getRoleId(role);
      const key = String(role.key || role.roleKey || (roleId ? "custom" : ""));
      const isCustom =
        role.isCustom === true ||
        key === "custom" ||
        Boolean(roleId && !role.isBuiltIn);

      return {
        value: isCustom ? `custom:${roleId}` : key,
        label: role.name || role.roleName || t(`roles.${key}`),
        owner: key === "owner",
      };
    });

    if (!options.some((role) => role.value === "staff")) {
      options.unshift({
        value: "staff",
        label: t("roles.staff"),
        owner: false,
      });
    }

    return options.filter(
      (option) =>
        !option.owner ||
        (isEditing && (canManageOwners || option.value === form.roleSelection)),
    );
  }, [canManageOwners, form.roleSelection, isEditing, roles, t]);

  const toggleLocation = (locationId) => {
    setForm((current) => ({
      ...current,
      locationIds: current.locationIds.includes(locationId)
        ? current.locationIds.filter((id) => id !== locationId)
        : [...current.locationIds, locationId],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (isLoading) return;
    setError("");

    const isCustom = form.roleSelection.startsWith("custom:");
    const customRoleId = isCustom ? form.roleSelection.slice(7) : null;
    const roleKey = isCustom ? "custom" : form.roleSelection;

    if (form.locationMode === "selected" && form.locationIds.length === 0) {
      setError(t("editor.errors.locationRequired"));
      return;
    }

    const body = {
      roleKey,
      customRoleId,
      locationAccess: {
        mode: form.locationMode,
        locationIds: form.locationMode === "selected" ? form.locationIds : [],
      },
      workspaceProfile: {
        jobTitle: form.jobTitle.trim(),
        displayName: form.displayName.trim(),
        calendarColor: form.calendarColor,
      },
      ...(isEditing
        ? { status: form.status }
        : { email: form.email.trim().toLowerCase() }),
    };

    try {
      let result;
      if (isEditing) {
        await updateMember({
          membershipId: getId(membership),
          ...body,
        }).unwrap();
      } else {
        result = await inviteMember({
          ...body,
          locale: locale === "cs" ? "cs" : "en",
        }).unwrap();
      }
      const guidedHandled = await onSaved?.(result);
      if (!guidedHandled) onClose();
    } catch (mutationError) {
      const rateError = invitationRateErrorKey(mutationError);
      setError(
        rateError
          ? t(rateError)
          : getMutationError(mutationError, t("editor.errors.request")),
      );
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
            data-testid="team-member-dialog"
            data-dialog-layout="form"
            className="flex h-dvh max-h-dvh min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-none border-0 bg-surface-raised pt-[env(safe-area-inset-top)] shadow-floating sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-[24px] sm:border"
          >
            <div className="flex shrink-0 items-start justify-between border-b border-line bg-white px-5 py-5 sm:px-7">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
                  {t("editor.eyebrow")}
                </p>
                <DialogTitle className="mt-2 text-[24px] font-semibold tracking-[-0.04em] text-[#111111]">
                  {isEditing ? t("editor.editTitle") : t("editor.addTitle")}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-[#777773] hover:bg-[#F4F2ED] disabled:opacity-50"
                aria-label={t("editor.close")}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              data-testid="team-member-form"
              onSubmit={submit}
              data-guided-form={guided ? "team" : undefined}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div
                data-team-editor-body
                className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-7"
              >
                {!isEditing && (
                  <div>
                    <label
                      htmlFor="team-invitation-email"
                      className="mb-1.5 block text-xs font-semibold text-[#292925]"
                    >
                      {t("editor.email")}
                    </label>
                    <input
                      id="team-invitation-email"
                      aria-describedby="team-invitation-email-hint"
                      type="email"
                      required
                      value={form.email}
                      onChange={(event) => update("email", event.target.value)}
                      className="h-12 w-full rounded-[13px] border border-line bg-white px-4 text-[12px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                    />
                    <p
                      id="team-invitation-email-hint"
                      className="mt-1.5 block text-[11px] leading-4 text-[#777773]"
                    >
                      {t("editor.existingUserHint")}
                    </p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
                      {t("editor.role")}
                    </span>
                    <select
                      value={form.roleSelection}
                      onChange={(event) =>
                        update("roleSelection", event.target.value)
                      }
                      className="h-12 w-full rounded-[13px] border border-line bg-white px-4 text-[12px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                    >
                      {roleOptions.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isEditing && (
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
                        {t("editor.status")}
                      </span>
                      <select
                        value={form.status}
                        onChange={(event) =>
                          update("status", event.target.value)
                        }
                        className="h-12 w-full rounded-[13px] border border-line bg-white px-4 text-[12px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                      >
                        <option value="active">{t("statuses.active")}</option>
                        <option value="suspended">
                          {t("statuses.suspended")}
                        </option>
                      </select>
                    </label>
                  )}
                </div>

                {!guided ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
                        {t("editor.displayName")}
                      </span>
                      <input
                        value={form.displayName}
                        onChange={(event) =>
                          update("displayName", event.target.value)
                        }
                        className="h-12 w-full rounded-[13px] border border-line bg-white px-4 text-[12px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#292925]">
                        {t("editor.jobTitle")}
                      </span>
                      <input
                        value={form.jobTitle}
                        onChange={(event) =>
                          update("jobTitle", event.target.value)
                        }
                        className="h-12 w-full rounded-[13px] border border-line bg-white px-4 text-[12px] outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                      />
                    </label>
                  </div>
                ) : null}

                {!guided ? (
                  <section className="rounded-[17px] border border-line bg-white p-4">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-cobalt-600" />
                      <div className="min-w-0">
                        <h3 className="text-[12px] font-semibold text-[#292925]">
                          {t("editor.locationTitle")}
                        </h3>
                        <p className="mt-1 text-[11px] leading-4 text-[#777773]">
                          {t("editor.locationDescription")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {["all", "selected"]
                        .filter(
                          (mode) => mode !== "all" || canGrantAllLocations,
                        )
                        .map((mode) => (
                          <label
                            key={mode}
                            className={cx(
                              "flex cursor-pointer items-center gap-3 rounded-[12px] border px-3 py-3 text-xs",
                              form.locationMode === mode
                                ? "border-cobalt-500 bg-cobalt-50 text-cobalt-700"
                                : "border-line bg-surface-muted text-[#4F4F4B]",
                            )}
                          >
                            <input
                              type="radio"
                              name="locationMode"
                              value={mode}
                              checked={form.locationMode === mode}
                              onChange={() => update("locationMode", mode)}
                              className="shrink-0 text-cobalt-500 focus:ring-cobalt-500"
                            />
                            <span className="min-w-0 break-words">
                              {t(`editor.locationModes.${mode}`)}
                            </span>
                          </label>
                        ))}
                    </div>
                    {form.locationMode === "selected" && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {locations.map((location) => {
                          const id = getLocationId(location);
                          return (
                            <label
                              key={id}
                              className="flex items-center gap-3 rounded-[12px] border border-line px-3 py-2.5 text-xs text-[#4F4F4B]"
                            >
                              <input
                                type="checkbox"
                                checked={form.locationIds.includes(id)}
                                onChange={() => toggleLocation(id)}
                                className="shrink-0 rounded text-cobalt-500 focus:ring-cobalt-500"
                              />
                              <span className="min-w-0 break-words">
                                {location.name}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </section>
                ) : null}

                {!guided ? (
                  <label className="flex items-center gap-3 rounded-[14px] border border-line bg-white px-4 py-3">
                    <input
                      type="color"
                      value={form.calendarColor}
                      onChange={(event) =>
                        update("calendarColor", event.target.value)
                      }
                      className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent"
                    />
                    <span className="min-w-0">
                      <strong className="block text-xs text-[#292925]">
                        {t("editor.calendarColor")}
                      </strong>
                      <span className="mt-0.5 block text-[10px] text-[#777773]">
                        {t("editor.calendarColorHint")}
                      </span>
                    </span>
                  </label>
                ) : null}

                {error && (
                  <p
                    role="alert"
                    className="rounded-[13px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
                  >
                    {error}
                  </p>
                )}
              </div>
              <div
                data-team-editor-actions
                className="flex shrink-0 flex-col-reverse gap-2 border-t border-line bg-surface-raised px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-7"
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="min-h-11 rounded-full border border-line bg-white px-5 text-xs font-semibold text-[#4F4F4B] hover:border-line-strong"
                >
                  {t("actions.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-6 text-xs font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600 disabled:opacity-50"
                >
                  {isLoading && (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  )}
                  {guided
                    ? setupT("guided.saveAndContinue")
                    : isEditing
                      ? t("actions.save")
                      : t("invitations.send")}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

export default function TeamSettingsPage({ showPageHeader = true }) {
  const t = useTranslations("TeamSettings");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const guidedSetup = useGuidedSetupStep("team");
  const access = useSelector(selectCurrentWorkspaceAccess);
  const canAdd = hasPermission(access, PERMISSIONS.TEAM_MANAGE);
  const canManage = hasPermission(access, PERMISSIONS.TEAM_MANAGE);
  const canManageOwners = isWorkspaceOwner(access);
  const canGrantAllLocations = access?.locationAccess?.mode !== "selected";
  const [editor, setEditor] = useState(() => ({
    open: canAdd && searchParams.get("action") === "add",
    membership: null,
  }));
  const [notice, setNotice] = useState("");
  const [deliveryNotice, setDeliveryNotice] = useState(null);
  const [sendSignIn, { isLoading: isSendingSignIn }] =
    useSendWorkspaceSignInInvitationMutation();
  const [guidedReviewDismissed, setGuidedReviewDismissed] = useState(false);
  const [deleteMember, { isLoading: isDeleting }] =
    useDeleteWorkspaceTeamMemberMutation();

  const teamQuery = useGetWorkspaceTeamQuery();
  const rolesQuery = useGetWorkspaceRolesQuery(undefined, {
    skip: !canManage,
  });
  const locationsQuery = useGetLocationsQuery(
    { isActive: true, limit: 100 },
    { skip: !canManage },
  );

  const team = useMemo(() => normalizeTeam(teamQuery.data), [teamQuery.data]);
  const roles = useMemo(
    () => normalizeRoles(rolesQuery.data),
    [rolesQuery.data],
  );
  const locations = useMemo(
    () => normalizeLocationsResponse(locationsQuery.data),
    [locationsQuery.data],
  );
  const actorLocationIds = useMemo(
    () => new Set((access?.locationAccess?.locationIds || []).map(String)),
    [access?.locationAccess?.locationIds],
  );

  const guidedReviewMember = useMemo(() => {
    if (
      !guidedSetup.guided ||
      searchParams.get("action") === "add" ||
      guidedReviewDismissed ||
      teamQuery.isLoading ||
      !canManage
    ) {
      return null;
    }

    return (
      team.find(
        (membership) =>
          getId(membership) !== String(access?.membershipId || "") &&
          getRoleKey(membership) !== "owner" &&
          membership.status !== "active",
      ) ??
      team.find(
        (membership) =>
          getId(membership) !== String(access?.membershipId || "") &&
          getRoleKey(membership) !== "owner",
      ) ??
      null
    );
  }, [
    access?.membershipId,
    canManage,
    guidedReviewDismissed,
    guidedSetup.guided,
    searchParams,
    team,
    teamQuery.isLoading,
  ]);
  const activeEditor = editor.open
    ? editor
    : guidedReviewMember
      ? { open: true, membership: guidedReviewMember }
      : editor;

  const remove = async (membership) => {
    if (
      !window.confirm(
        t("deleteConfirm", { name: getName(membership, t("fallbackName")) }),
      )
    )
      return;
    setNotice("");
    try {
      await deleteMember(getId(membership)).unwrap();
    } catch (error) {
      setNotice(getMutationError(error, t("errors.delete")));
    }
  };

  const onDelivery = (invitation) => setDeliveryNotice(invitation);
  const sendSignInLink = async (membership) => {
    if (isSendingSignIn) return;
    setNotice("");
    setDeliveryNotice(null);
    try {
      const result = await sendSignIn({
        membershipId: getId(membership),
        locale: locale === "cs" ? "cs" : "en",
      }).unwrap();
      onDelivery(result.invitation);
    } catch (requestError) {
      setNotice(
        t(invitationRateErrorKey(requestError) || "invitations.errors.send"),
      );
    }
  };

  if (teamQuery.isLoading || (canManage && rolesQuery.isLoading)) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-cobalt-500" />
        <span className="ml-3 text-[12px] text-[#777773]">{t("loading")}</span>
      </div>
    );
  }

  return (
    <section data-contextual-guide-target="team-members" className="space-y-5">
      <WorkspaceSectionHeader
        showTitle={showPageHeader}
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={
          canAdd ? (
            <button
              type="button"
              data-contextual-guide-target="team-invite"
              onClick={() => setEditor({ open: true, membership: null })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cobalt-500 px-5 text-xs font-semibold text-white shadow-cobalt hover:bg-cobalt-600"
            >
              <PlusIcon className="h-4 w-4" />
              {t("actions.add")}
            </button>
          ) : null
        }
      />

      {notice && (
        <p
          role="alert"
          className="rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
        >
          {notice}
        </p>
      )}
      {deliveryNotice && (
        <p
          role={
            invitationDeliveryKey(deliveryNotice) === "failed"
              ? "alert"
              : "status"
          }
          className="rounded-[14px] border border-line bg-white p-4 text-sm"
        >
          {t(`invitations.notices.${invitationDeliveryKey(deliveryNotice)}`, {
            email: deliveryNotice.email,
          })}
        </p>
      )}
      {(teamQuery.isError || (canManage && rolesQuery.isError)) && (
        <p
          role="alert"
          className="rounded-[14px] border border-coral-200 bg-coral-50 px-4 py-3 text-xs text-terracotta-700"
        >
          {t("errors.load")}
        </p>
      )}

      <div className="overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_14px_38px_rgba(17,17,15,0.045)]">
        <div className="flex items-center justify-between border-b border-line bg-surface-muted px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cobalt-100 text-cobalt-700">
              <UserGroupIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-[#292925]">
                {t("listTitle")}
              </h2>
              <p className="mt-0.5 text-[10px] text-[#777773]">
                {t("memberCount", { count: team.length })}
              </p>
            </div>
          </div>
          <ShieldCheckIcon className="h-5 w-5 shrink-0 text-[#A3A3A0]" />
        </div>

        {team.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <UserGroupIcon className="h-8 w-8 text-[#A3A3A0]" />
            <h3 className="mt-4 text-[14px] font-semibold text-[#292925]">
              {t("empty.title")}
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[#777773]">
              {t("empty.description")}
            </p>
          </div>
        ) : (
          <div
            data-contextual-guide-target="team-list"
            className="divide-y divide-line"
          >
            {team.map((membership) => {
              const id = getId(membership);
              const roleKey = getRoleKey(membership);
              const locationAccess = membership.locationAccess || {};
              const ownMembership = id === String(access?.membershipId || "");
              const memberIsInsideActorScope =
                canGrantAllLocations ||
                (locationAccess.mode === "selected" &&
                  (locationAccess.locationIds || []).every((locationId) =>
                    actorLocationIds.has(String(locationId)),
                  ));
              const canEditMember =
                canManage &&
                !ownMembership &&
                memberIsInsideActorScope &&
                (roleKey !== "owner" || canManageOwners);
              return (
                <article
                  key={id}
                  className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary text-[11px] font-semibold text-white">
                    {getName(membership, "?")
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-[12px] font-semibold text-[#292925]">
                        {getName(membership, t("fallbackName"))}
                      </h3>
                      {ownMembership && <Pill>{t("you")}</Pill>}
                      <Pill tone="role">
                        {membership.roleName || t(`roles.${roleKey}`)}
                      </Pill>
                      <Pill
                        tone={
                          membership.status === "active"
                            ? "active"
                            : "suspended"
                        }
                      >
                        {t(`statuses.${membership.status || "active"}`)}
                      </Pill>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-[#777773]">
                      {getEmail(membership) || "—"}
                      {membership.workspaceProfile?.jobTitle
                        ? ` · ${membership.workspaceProfile.jobTitle}`
                        : ""}
                    </p>
                    <p className="mt-1 text-[10px] text-[#9A9993]">
                      {locationAccess.mode === "selected"
                        ? t("selectedLocations", {
                            count: locationAccess.locationIds?.length || 0,
                          })
                        : t("allLocations")}
                    </p>
                  </div>
                  {canEditMember && (
                    <div className="flex flex-wrap gap-2">
                      {roleKey !== "owner" &&
                        membership.status === "active" && (
                          <button
                            type="button"
                            disabled={isSendingSignIn}
                            onClick={() => sendSignInLink(membership)}
                            className="min-h-11 rounded-full border border-line px-4 text-xs font-semibold disabled:opacity-50"
                          >
                            {t("invitations.sendSignIn")}
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => setEditor({ open: true, membership })}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-[#5F5F5A] hover:border-cobalt-300 hover:text-cobalt-600"
                        aria-label={t("actions.edit")}
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => remove(membership)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-[#A34E38] hover:border-coral-300 hover:bg-coral-50 disabled:opacity-40"
                        aria-label={t("actions.remove")}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {canManage && (
        <TeamInvitationsPanel
          access={access}
          canManageOwners={canManageOwners}
          onDelivery={onDelivery}
        />
      )}

      {activeEditor.open && (
        <TeamMemberDialog
          key={getId(activeEditor.membership) || "new"}
          membership={activeEditor.membership}
          locations={locations}
          roles={roles}
          open
          canManageOwners={canManageOwners}
          canGrantAllLocations={canGrantAllLocations}
          guided={guidedSetup.guided}
          onClose={() => {
            setEditor({ open: false, membership: null });
            setGuidedReviewDismissed(true);
          }}
          onSaved={async (result) => {
            setNotice("");
            if (result?.invitation) onDelivery(result.invitation);
            await guidedSetup.refreshAndContinue({
              metadata: { form: "team_member" },
            });
            return guidedSetup.guided;
          }}
        />
      )}
    </section>
  );
}
