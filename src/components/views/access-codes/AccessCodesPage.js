"use client";

import { getLocalizedApiErrorMessage } from "@/i18n/api-errors";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ClockIcon,
  EllipsisHorizontalIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  KeyIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import { WorkspaceTable } from "@/components/dashboard/WorkspaceDataSurface";

import { Link } from "@/i18n/navigation";

import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentUser,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import {
  useArchiveAccessCodePoolMutation,
  useBulkCreateAccessCodesMutation,
  useCreateAccessCodeMutation,
  useCreateAccessCodePoolMutation,
  useGetAccessCodePoolsQuery,
  useGetAccessCodesQuery,
  useRetireAccessCodeMutation,
  useRevealAccessCodeMutation,
  useUpdateAccessCodeMutation,
  useUpdateAccessCodePoolMutation,
} from "@/lib/features/accessCodes/accessCodeApiSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import {
  getTenantIdFromUser,
  normalizeLocationsResponse,
} from "@/lib/features/locations/location.utils";

import { AccessCodeDialog, AccessCodePoolDialog } from "./AccessCodeDialog";
import AccessCodeAuditLog from "./AccessCodeAuditLog";
import BulkAccessCodesDialog from "./BulkAccessCodesDialog";
import RevealAccessCodeDialog from "./RevealAccessCodeDialog";
import RetireAccessCodeDialog from "./RetireAccessCodeDialog";
import {
  ACCESS_CODE_STATUSES,
  ACCESS_CODE_TYPES,
  formatMaskedCode,
  getPoolCounts,
  getAccessCodeAvailability,
  isPoolLowStock,
  normalizeAccessCodePools,
  normalizeAccessCodes,
} from "./accessCodes.utils";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const getRequestError = (error, fallback) =>
  getLocalizedApiErrorMessage(error, fallback);

const getCodeId = (code) => String(code?.id ?? code?._id ?? "").trim();
const getPoolId = (pool) => String(pool?.id ?? pool?._id ?? "").trim();

const getEffectiveStatus = (code) => {
  const value = String(code?.effectiveStatus || code?.status || "draft")
    .trim()
    .toLowerCase();
  return [...ACCESS_CODE_STATUSES, "expired"].includes(value) ? value : "draft";
};

const getType = (code) => {
  const value = String(code?.type || "single_booking")
    .trim()
    .toLowerCase();
  return ACCESS_CODE_TYPES.includes(value) ? value : "single_booking";
};

const STATUS_TONES = Object.freeze({
  draft: "bg-surface text-ink-muted",
  available: "bg-success-soft text-success",
  disabled: "bg-amber-50 text-amber-800",
  retired: "bg-surface text-ink-subtle",
  expired: "bg-danger/5 text-danger",
});

function StatusBadge({ status, t }) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.11em]",
        STATUS_TONES[status] || STATUS_TONES.draft,
      )}
    >
      {t(`statuses.${status}`)}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, tone, value }) {
  const toneClasses = {
    cobalt: "bg-cobalt-50 text-cobalt-600",
    coral: "bg-coral-100 text-terracotta-700",
    green: "bg-success-soft text-success",
    neutral: "bg-surface text-ink-muted",
  };

  return (
    <div className="rounded-[18px] border border-line bg-white p-4 shadow-[0_10px_30px_rgba(31,31,31,0.035)]">
      <div className="flex items-center justify-between gap-3">
        <span
          className={cx(
            "grid size-9 place-items-center rounded-xl",
            toneClasses[tone],
          )}
        >
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <strong className="text-xl font-semibold tracking-[-0.04em] text-ink">
          {value}
        </strong>
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-subtle">
        {label}
      </p>
    </div>
  );
}

function CodeActions({
  canManage,
  canReveal,
  code,
  onEdit,
  onRetire,
  onReveal,
  t,
  variant = "table",
}) {
  const status = getEffectiveStatus(code);
  const terminal = status === "retired";
  const card = variant === "card";
  const buttonClass = cx(
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-[11px] border bg-white px-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30",
    card ? "min-w-0 flex-1" : "min-w-10 2xl:px-3",
  );
  const labelClass = cx(
    "text-[10px] font-semibold",
    card ? "inline" : "hidden 2xl:inline",
  );

  return (
    <div
      className={cx(
        "flex items-center gap-2",
        card ? "mt-3 w-full" : "justify-end",
      )}
    >
      {canReveal && !terminal ? (
        <button
          type="button"
          onClick={() => onReveal(code)}
          aria-label={t("actions.revealFor", { code: formatMaskedCode(code) })}
          title={t("actions.reveal")}
          className={cx(
            buttonClass,
            "border-line text-ink-muted hover:border-cobalt-200 hover:bg-cobalt-50 hover:text-cobalt-700",
          )}
        >
          <EyeIcon aria-hidden="true" className="size-[18px] shrink-0" />
          <span className={labelClass}>{t("actions.reveal")}</span>
        </button>
      ) : null}
      {canManage && !terminal ? (
        <button
          type="button"
          onClick={() => onEdit(code)}
          aria-label={t("actions.editFor", { code: formatMaskedCode(code) })}
          title={t("actions.edit")}
          className={cx(
            buttonClass,
            "border-line text-ink-muted hover:border-cobalt-200 hover:bg-cobalt-50 hover:text-cobalt-700",
          )}
        >
          <PencilSquareIcon
            aria-hidden="true"
            className="size-[18px] shrink-0"
          />
          <span className={labelClass}>{t("actions.edit")}</span>
        </button>
      ) : null}
      {canManage && !terminal ? (
        <button
          type="button"
          onClick={() => onRetire(code)}
          aria-label={t("actions.retireFor", {
            code: formatMaskedCode(code),
          })}
          title={t("actions.retire")}
          className={cx(
            buttonClass,
            "border-danger/20 text-danger hover:border-danger/35 hover:bg-danger/5",
          )}
        >
          <ArchiveBoxIcon aria-hidden="true" className="size-[18px] shrink-0" />
          <span className={labelClass}>{t("actions.retire")}</span>
        </button>
      ) : null}
    </div>
  );
}

function AccessCodeRows({
  canManage,
  canReveal,
  codes,
  format,
  onEdit,
  onRetire,
  onReveal,
  t,
}) {
  const validity = (code) => {
    if (!code.validUntil) return t("inventory.neverExpires");
    return format.dateTime(new Date(code.validUntil), {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <>
      <div className="hidden overflow-hidden rounded-[18px] border border-line bg-white lg:block">
        <WorkspaceTable className="table-fixed">
          <thead className="bg-surface-muted text-left">
            <tr>
              <th className="w-[23%] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                {t("inventory.columns.code")}
              </th>
              <th className="w-[18%] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                {t("inventory.columns.type")}
              </th>
              <th className="w-[17%] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                {t("inventory.columns.status")}
              </th>
              <th className="w-[20%] px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                {t("inventory.columns.validUntil")}
              </th>
              <th className="w-[22%] px-3 py-3 text-right text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                {t("inventory.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {codes.map((code) => {
              const status = getEffectiveStatus(code);
              const type = getType(code);
              return (
                <tr
                  key={getCodeId(code)}
                  className="transition hover:bg-surface-muted/65"
                >
                  <td className="px-3 py-3.5">
                    <p className="truncate font-mono text-[13px] font-semibold tracking-[0.13em] text-ink">
                      {formatMaskedCode(code)}
                    </p>
                    <p className="mt-1 truncate text-[10px] text-ink-muted">
                      {code.label || t("inventory.noLabel")}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-[11px] font-medium text-ink-muted">
                    {t(`types.${type}.label`)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={status} t={t} />
                    {code.verifiedAt ? (
                      <span className="mt-1.5 flex items-center gap-1 text-[9px] font-medium text-success">
                        <CheckCircleIcon
                          aria-hidden="true"
                          className="size-3"
                        />
                        {t("inventory.verified")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5 text-[10px] leading-4 text-ink-muted">
                    {validity(code)}
                  </td>
                  <td className="px-3 py-3.5">
                    <CodeActions
                      canManage={canManage}
                      canReveal={canReveal}
                      code={code}
                      onEdit={onEdit}
                      onRetire={onRetire}
                      onReveal={onReveal}
                      t={t}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </WorkspaceTable>
      </div>

      <ul className="space-y-3 lg:hidden">
        {codes.map((code) => {
          const status = getEffectiveStatus(code);
          const type = getType(code);
          return (
            <li
              key={getCodeId(code)}
              className="rounded-[18px] border border-line bg-white p-4 shadow-[0_8px_24px_rgba(31,31,31,0.03)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold tracking-[0.14em] text-ink">
                    {formatMaskedCode(code)}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-ink-muted">
                    {code.label || t("inventory.noLabel")}
                  </p>
                </div>
                <StatusBadge status={status} t={t} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-line py-3">
                <div>
                  <dt className="text-[9px] uppercase tracking-[0.1em] text-ink-subtle">
                    {t("inventory.columns.type")}
                  </dt>
                  <dd className="mt-1 text-[11px] font-semibold text-ink">
                    {t(`types.${type}.label`)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-[0.1em] text-ink-subtle">
                    {t("inventory.columns.validUntil")}
                  </dt>
                  <dd className="mt-1 text-[11px] font-semibold text-ink">
                    {validity(code)}
                  </dd>
                </div>
              </dl>
              <div className="mt-3">
                <span className="text-[10px] text-ink-muted">
                  {code.verifiedAt
                    ? t("inventory.verified")
                    : t("inventory.notVerified")}
                </span>
                <CodeActions
                  canManage={canManage}
                  canReveal={canReveal}
                  code={code}
                  onEdit={onEdit}
                  onRetire={onRetire}
                  onReveal={onReveal}
                  t={t}
                  variant="card"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export default function AccessCodesPage() {
  const t = useTranslations("AccessCodes");
  const format = useFormatter();
  const searchParams = useSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const tenantId = getTenantIdFromUser(currentUser);
  const canManage = hasPermission(
    workspaceAccess,
    PERMISSIONS.ACCESS_CODES_MANAGE,
  );
  const canReveal = hasPermission(
    workspaceAccess,
    PERMISSIONS.ACCESS_CODES_REVEAL,
  );
  const canImport = hasPermission(
    workspaceAccess,
    PERMISSIONS.ACCESS_CODES_IMPORT,
  );
  const canViewAudit = hasPermission(
    workspaceAccess,
    PERMISSIONS.ACCESS_CODES_AUDIT_VIEW,
  );
  const tenantAvailability = getAccessCodeAvailability(tenant);
  const canManageModules = hasPermission(
    workspaceAccess,
    PERMISSIONS.WORKSPACE_CONFIGURATION_MANAGE,
  );
  const canViewPlan = hasPermission(
    workspaceAccess,
    PERMISSIONS.SUBSCRIPTION_VIEW,
  );

  const [selectedLocationId, setSelectedLocationId] = useState(
    () => searchParams.get("location") || "",
  );
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [activeTab, setActiveTab] = useState("codes");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [poolDialog, setPoolDialog] = useState(null);
  const [codeDialog, setCodeDialog] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [revealCode, setRevealCode] = useState(null);
  const [retireCandidate, setRetireCandidate] = useState(null);
  const [requestError, setRequestError] = useState("");

  const locationsQuery = useGetLocationsQuery(
    { tenantId, isActive: true, limit: 100 },
    { skip: !tenantId },
  );
  const locations = useMemo(
    () => normalizeLocationsResponse(locationsQuery.data),
    [locationsQuery.data],
  );

  useEffect(() => {
    if (
      selectedLocationId &&
      locations.some((location) => location.id === selectedLocationId)
    ) {
      return;
    }
    setSelectedLocationId(locations[0]?.id || "");
  }, [locations, selectedLocationId]);

  const poolsQuery = useGetAccessCodePoolsQuery(
    { locationId: selectedLocationId, includeArchived: false },
    {
      // An effective false flag does not identify a plan restriction versus an
      // owner-disabled module. Let the protected API explain the current reason,
      // including after a module change left a successful response in the cache.
      skip: !selectedLocationId || tenantAvailability === "disabled",
      refetchOnMountOrArgChange: tenantAvailability === "unavailable",
    },
  );
  const availability = getAccessCodeAvailability(tenant, poolsQuery.error);
  const currentPools = poolsQuery.isError
    ? undefined
    : (poolsQuery.currentData ??
      (!poolsQuery.isFetching ? poolsQuery.data : undefined));
  const pools = useMemo(
    () => normalizeAccessCodePools(currentPools),
    [currentPools],
  );

  useEffect(() => {
    if (selectedPoolId && pools.some((pool) => pool.id === selectedPoolId)) {
      return;
    }
    setSelectedPoolId(pools[0]?.id || "");
  }, [pools, selectedPoolId]);

  const selectedPool = pools.find((pool) => pool.id === selectedPoolId) || null;
  const codesQuery = useGetAccessCodesQuery(
    {
      poolId: selectedPoolId,
      status: statusFilter,
      type: typeFilter,
      search: search.trim(),
      page: 1,
      limit: 100,
    },
    { skip: !selectedPool || Boolean(availability) || activeTab !== "codes" },
  );
  const codes = useMemo(
    () => normalizeAccessCodes(codesQuery.data),
    [codesQuery.data],
  );
  const counts = getPoolCounts(selectedPool);

  const [createPool, createPoolState] = useCreateAccessCodePoolMutation();
  const [updatePool, updatePoolState] = useUpdateAccessCodePoolMutation();
  const [archivePool, archivePoolState] = useArchiveAccessCodePoolMutation();
  const [createCode, createCodeState] = useCreateAccessCodeMutation();
  const [updateCode, updateCodeState] = useUpdateAccessCodeMutation();
  const [retireCode, retireCodeState] = useRetireAccessCodeMutation();
  const [revealSecret, revealState] = useRevealAccessCodeMutation();
  const [bulkCreate, bulkState] = useBulkCreateAccessCodesMutation();

  const closeDialogs = () => {
    setPoolDialog(null);
    setCodeDialog(null);
    setBulkOpen(false);
    setRevealCode(null);
    setRetireCandidate(null);
    setRequestError("");
  };

  const savePool = async (payload) => {
    setRequestError("");
    try {
      if (poolDialog?.id) {
        await updatePool({ id: poolDialog.id, ...payload }).unwrap();
      } else {
        const response = await createPool(payload).unwrap();
        const created = response?.pool || response?.accessCodePool || response;
        if (getPoolId(created)) setSelectedPoolId(getPoolId(created));
      }
      closeDialogs();
    } catch (error) {
      setRequestError(getRequestError(error, t("errors.savePool")));
    }
  };

  const saveCode = async (payload) => {
    setRequestError("");
    try {
      if (codeDialog?.id) {
        await updateCode({ id: codeDialog.id, ...payload }).unwrap();
      } else {
        await createCode(payload).unwrap();
      }
      closeDialogs();
    } catch (error) {
      setRequestError(getRequestError(error, t("errors.saveCode")));
    }
  };

  const saveBulk = async (payload) => {
    setRequestError("");
    try {
      const response = await bulkCreate(payload).unwrap();
      const failed = Number(response?.failed ?? response?.summary?.failed ?? 0);
      if (failed === 0) closeDialogs();
      return response;
    } catch (error) {
      setRequestError(getRequestError(error, t("errors.bulk")));
      return null;
    }
  };

  const requestRetire = (code) => {
    setRequestError("");
    setRetireCandidate(code);
  };

  const confirmRetire = async () => {
    if (!retireCandidate) return;
    setRequestError("");
    try {
      await retireCode(getCodeId(retireCandidate)).unwrap();
      setRetireCandidate(null);
    } catch (error) {
      setRequestError(getRequestError(error, t("errors.retireCode")));
    }
  };

  const handleArchivePool = async () => {
    if (!selectedPool || !window.confirm(t("confirm.archivePool"))) return;
    setRequestError("");
    try {
      await archivePool(selectedPool.id).unwrap();
      setSelectedPoolId("");
    } catch (error) {
      setRequestError(getRequestError(error, t("errors.archivePool")));
    }
  };

  const handleReveal = async () => {
    setRequestError("");
    try {
      return await revealSecret(getCodeId(revealCode)).unwrap();
    } catch (error) {
      setRequestError(getRequestError(error, t("errors.revealCode")));
      return null;
    }
  };

  if (availability) {
    return (
      <div className="rounded-[22px] border border-line bg-white px-6 py-10 text-center shadow-card">
        <LockClosedIcon
          aria-hidden="true"
          className="mx-auto size-8 text-ink-muted"
        />
        <h1 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-ink">
          {t(`${availability}.title`)}
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-ink-muted">
          {t(`${availability}.description`)}
        </p>
        {availability === "unavailable" && poolsQuery.isError ? (
          <div className="mt-4 text-xs text-danger" role="alert">
            <p>{t("errors.pools")}</p>
            <button
              type="button"
              onClick={() => poolsQuery.refetch()}
              disabled={poolsQuery.isFetching}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 font-semibold text-cobalt-700"
            >
              <ArrowPathIcon aria-hidden="true" className="size-4" />
              {t("actions.retry")}
            </button>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {canManageModules && availability !== "notEntitled" ? (
            <Link
              href="/app/settings/modules"
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-cobalt-700"
            >
              {t("actions.manageModules")}
            </Link>
          ) : null}
          {canViewPlan && availability !== "disabled" ? (
            <Link
              href="/app/settings/billing"
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-cobalt-700"
            >
              {t("actions.viewPlan")}
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <section
      data-contextual-guide-target="access-codes-page"
      className="space-y-5"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cobalt-600">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.05em] text-ink sm:text-[34px]">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-ink-muted">
            {t("description")}
          </p>
        </div>
        <div className="w-full sm:w-[260px]">
          <label
            htmlFor="access-code-location"
            className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
          >
            {t("location")}
          </label>
          <select
            id="access-code-location"
            value={selectedLocationId}
            onChange={(event) => {
              setSelectedLocationId(event.target.value);
              setSelectedPoolId("");
            }}
            disabled={locationsQuery.isLoading || !locations.length}
            className="h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-xs font-semibold text-ink outline-none transition focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
          >
            {!locations.length ? (
              <option value="">{t("chooseLocation")}</option>
            ) : null}
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div
        data-contextual-guide-target="access-codes-scope"
        className="flex items-start gap-3 rounded-[18px] border border-cobalt-100 bg-cobalt-50/60 px-4 py-4"
      >
        <ShieldCheckIcon
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-cobalt-600"
        />
        <div>
          <p className="text-xs font-semibold text-cobalt-950">
            {t("scopeNotice.title")}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-cobalt-900/75">
            {t("scopeNotice.description")}
          </p>
        </div>
      </div>

      {locationsQuery.isError ? (
        <div className="rounded-[18px] border border-danger/20 bg-danger/5 px-5 py-8 text-center">
          <p className="text-sm font-semibold text-ink">
            {t("errors.locations")}
          </p>
          <button
            type="button"
            onClick={() => locationsQuery.refetch()}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[11px] font-semibold text-cobalt-700"
          >
            <ArrowPathIcon aria-hidden="true" className="size-4" />
            {t("actions.retry")}
          </button>
        </div>
      ) : null}

      {!locationsQuery.isLoading &&
      !locationsQuery.isError &&
      !locations.length ? (
        <div className="rounded-[20px] border border-dashed border-line bg-white/65 px-6 py-10 text-center">
          <KeyIcon
            aria-hidden="true"
            className="mx-auto size-7 text-cobalt-500"
          />
          <h2 className="mt-3 text-base font-semibold text-ink">
            {t("emptyLocations.title")}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-ink-muted">
            {t("emptyLocations.description")}
          </p>
        </div>
      ) : null}

      {selectedLocationId ? (
        <div
          data-contextual-guide-target="access-codes-pools"
          className="rounded-[22px] border border-line bg-white p-4 shadow-card sm:p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                {t("pools.eyebrow")}
              </p>
              <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.035em] text-ink">
                {t("pools.title")}
              </h2>
            </div>
            {canManage ? (
              <button
                type="button"
                onClick={() => setPoolDialog({})}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-4 text-[11px] font-semibold text-cobalt-700 transition hover:bg-cobalt-100"
              >
                <PlusIcon aria-hidden="true" className="size-4" />
                {t("actions.addPool")}
              </button>
            ) : null}
          </div>

          {poolsQuery.isLoading ? (
            <div className="mt-4 flex gap-3 overflow-hidden">
              {[0, 1].map((item) => (
                <div
                  key={item}
                  className="h-20 w-56 shrink-0 animate-pulse rounded-[16px] bg-surface"
                />
              ))}
            </div>
          ) : poolsQuery.isError ? (
            <div
              className="mt-4 rounded-[14px] bg-danger/5 px-4 py-3 text-xs text-danger"
              role="alert"
            >
              <p>{t("errors.pools")}</p>
              <button
                type="button"
                onClick={() => poolsQuery.refetch()}
                disabled={poolsQuery.isFetching}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-white px-4 font-semibold text-cobalt-700"
              >
                <ArrowPathIcon aria-hidden="true" className="size-4" />
                {t("actions.retry")}
              </button>
            </div>
          ) : pools.length ? (
            <div className="mt-4 flex max-w-full snap-x gap-3 overflow-x-auto pb-1">
              {pools.map((pool) => {
                const poolCounts = getPoolCounts(pool);
                const selected = pool.id === selectedPoolId;
                return (
                  <button
                    key={pool.id}
                    type="button"
                    onClick={() => setSelectedPoolId(pool.id)}
                    aria-pressed={selected}
                    className={cx(
                      "min-w-[210px] snap-start rounded-[16px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30",
                      selected
                        ? "border-cobalt-300 bg-cobalt-50 shadow-[0_0_0_1px_rgb(var(--skab-blue-rgb)/0.12)]"
                        : "border-line bg-surface-muted hover:border-cobalt-200",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-white text-cobalt-600 shadow-xs">
                        <LockClosedIcon aria-hidden="true" className="size-4" />
                      </span>
                      {isPoolLowStock(pool) ? (
                        <ExclamationTriangleIcon
                          aria-label={t("pools.lowStock")}
                          className="size-4 text-amber-700"
                        />
                      ) : null}
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold text-ink">
                      {pool.name}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-muted">
                      {t("pools.availableCount", {
                        count: poolCounts.available,
                      })}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-[16px] border border-dashed border-line bg-surface-muted px-5 py-8 text-center">
              <LockClosedIcon
                aria-hidden="true"
                className="mx-auto size-6 text-ink-muted"
              />
              <p className="mt-3 text-sm font-semibold text-ink">
                {t("pools.emptyTitle")}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-ink-muted">
                {t("pools.emptyDescription")}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {selectedPool ? (
        <>
          {isPoolLowStock(selectedPool) ? (
            <div className="flex flex-col gap-4 rounded-[20px] border border-amber-300 bg-amber-50 px-5 py-5 shadow-[0_12px_36px_rgba(180,112,20,0.08)] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-white text-amber-700 shadow-xs">
                  <ExclamationTriangleIcon
                    aria-hidden="true"
                    className="size-5"
                  />
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-[-0.025em] text-amber-950">
                    {t("warning.title")}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-amber-900/80">
                    {t("warning.description", {
                      count: counts.available,
                      threshold: Number(selectedPool.lowStockThreshold || 0),
                    })}
                  </p>
                </div>
              </div>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => setBulkOpen(true)}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-amber-900 px-4 text-[11px] font-semibold text-white"
                >
                  <PlusIcon aria-hidden="true" className="size-4" />
                  {t("warning.action")}
                </button>
              ) : null}
            </div>
          ) : null}

          <div
            data-contextual-guide-target="access-codes-stock"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <SummaryCard
              icon={KeyIcon}
              label={t("summary.available")}
              value={counts.available}
              tone="cobalt"
            />
            <SummaryCard
              icon={ArrowPathIcon}
              label={t("summary.reusable")}
              value={counts.reusable}
              tone="green"
            />
            <SummaryCard
              icon={ClockIcon}
              label={t("summary.expiring")}
              value={counts.expiring}
              tone="coral"
            />
            <SummaryCard
              icon={SparklesIcon}
              label={t("summary.emergency")}
              value={counts.emergency}
              tone="neutral"
            />
          </div>

          <div className="rounded-[22px] border border-line bg-white p-4 shadow-card sm:p-5">
            <div className="flex flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[18px] font-semibold tracking-[-0.04em] text-ink">
                    {selectedPool.name}
                  </h2>
                  <span className="rounded-full bg-surface px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.11em] text-ink-muted">
                    {t(`poolStatuses.${selectedPool.status || "active"}`)}
                  </span>
                </div>
                {selectedPool.description ? (
                  <p className="mt-1 truncate text-[11px] text-ink-muted">
                    {selectedPool.description}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => setPoolDialog(selectedPool)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[10px] font-semibold text-ink-muted transition hover:border-cobalt-200 hover:text-cobalt-700"
                  >
                    <PencilSquareIcon aria-hidden="true" className="size-4" />
                    {t("actions.editPool")}
                  </button>
                ) : null}
                {canManage ? (
                  <button
                    type="button"
                    onClick={handleArchivePool}
                    disabled={archivePoolState.isLoading}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[10px] font-semibold text-ink-muted transition hover:border-danger/25 hover:text-danger"
                  >
                    <ArchiveBoxIcon aria-hidden="true" className="size-4" />
                    {t("actions.archivePool")}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div
                data-contextual-guide-target="access-codes-audit"
                className="flex rounded-full border border-line bg-surface-muted p-1"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("codes")}
                  className={cx(
                    "h-9 rounded-full px-4 text-[10px] font-semibold transition",
                    activeTab === "codes"
                      ? "bg-white text-ink shadow-xs"
                      : "text-ink-muted",
                  )}
                >
                  {t("tabs.codes")}
                </button>
                {canViewAudit ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("audit")}
                    className={cx(
                      "h-9 rounded-full px-4 text-[10px] font-semibold transition",
                      activeTab === "audit"
                        ? "bg-white text-ink shadow-xs"
                        : "text-ink-muted",
                    )}
                  >
                    {t("tabs.audit")}
                  </button>
                ) : null}
              </div>

              {activeTab === "codes" ? (
                <div
                  data-contextual-guide-target="access-codes-add"
                  className="flex flex-wrap gap-2"
                >
                  {canImport ? (
                    <button
                      type="button"
                      onClick={() => setBulkOpen(true)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-cobalt-200 bg-cobalt-50 px-4 text-[10px] font-semibold text-cobalt-700 transition hover:bg-cobalt-100"
                    >
                      <EllipsisHorizontalIcon
                        aria-hidden="true"
                        className="size-4"
                      />
                      {t("actions.bulkAdd")}
                    </button>
                  ) : null}
                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => setCodeDialog({})}
                      className="inline-flex h-10 items-center gap-2 rounded-full bg-cobalt-500 px-4 text-[10px] font-semibold text-white shadow-cobalt transition hover:bg-cobalt-600"
                    >
                      <PlusIcon aria-hidden="true" className="size-4" />
                      {t("actions.addCode")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {activeTab === "codes" ? (
              <>
                <div
                  data-contextual-guide-target="access-codes-inventory"
                  className="mt-4 grid gap-2 border-y border-line py-4 sm:grid-cols-[minmax(0,1fr)_170px_170px]"
                >
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("filters.search")}
                    aria-label={t("filters.search")}
                    className="h-10 rounded-[11px] border border-line bg-white px-3.5 text-xs text-ink outline-none focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                  />
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    aria-label={t("filters.type")}
                    className="h-10 rounded-[11px] border border-line bg-white px-3 text-xs text-ink outline-none focus:border-cobalt-500"
                  >
                    <option value="">{t("filters.allTypes")}</option>
                    {ACCESS_CODE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(`types.${type}.label`)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label={t("filters.status")}
                    className="h-10 rounded-[11px] border border-line bg-white px-3 text-xs text-ink outline-none focus:border-cobalt-500"
                  >
                    <option value="">{t("filters.allStatuses")}</option>
                    {[...ACCESS_CODE_STATUSES, "expired"].map((status) => (
                      <option key={status} value={status}>
                        {t(`statuses.${status}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {requestError ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-[14px] border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger"
                  >
                    {requestError}
                  </p>
                ) : null}

                <div className="mt-4">
                  {codesQuery.isLoading || codesQuery.isFetching ? (
                    <div
                      className="space-y-3"
                      aria-label={t("inventory.loading")}
                    >
                      {[0, 1, 2].map((item) => (
                        <div
                          key={item}
                          className="h-16 animate-pulse rounded-[16px] border border-line bg-surface-muted"
                        />
                      ))}
                    </div>
                  ) : codesQuery.isError ? (
                    <div className="rounded-[18px] border border-dashed border-danger/25 bg-danger/5 px-5 py-8 text-center">
                      <p className="text-sm font-semibold text-ink">
                        {t("inventory.loadError")}
                      </p>
                      <button
                        type="button"
                        onClick={() => codesQuery.refetch()}
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[11px] font-semibold text-cobalt-700"
                      >
                        <ArrowPathIcon aria-hidden="true" className="size-4" />
                        {t("actions.retry")}
                      </button>
                    </div>
                  ) : !codes.length ? (
                    <div className="rounded-[18px] border border-dashed border-line bg-surface-muted px-5 py-10 text-center">
                      <KeyIcon
                        aria-hidden="true"
                        className="mx-auto size-7 text-cobalt-500"
                      />
                      <p className="mt-3 text-sm font-semibold text-ink">
                        {t("inventory.emptyTitle")}
                      </p>
                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-ink-muted">
                        {search || statusFilter || typeFilter
                          ? t("inventory.noResults")
                          : t("inventory.emptyDescription")}
                      </p>
                    </div>
                  ) : (
                    <AccessCodeRows
                      canManage={canManage}
                      canReveal={canReveal}
                      codes={codes}
                      format={format}
                      onEdit={setCodeDialog}
                      onRetire={requestRetire}
                      onReveal={setRevealCode}
                      t={t}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="mt-4">
                <AccessCodeAuditLog
                  enabled={canViewAudit}
                  poolId={selectedPoolId}
                />
              </div>
            )}
          </div>
        </>
      ) : null}

      {poolDialog ? (
        <AccessCodePoolDialog
          pool={poolDialog.id ? poolDialog : null}
          locations={locations}
          selectedLocationId={selectedLocationId}
          onClose={closeDialogs}
          onSave={savePool}
          isSaving={createPoolState.isLoading || updatePoolState.isLoading}
          requestError={requestError}
        />
      ) : null}
      {codeDialog ? (
        <AccessCodeDialog
          code={codeDialog.id ? codeDialog : null}
          poolId={selectedPoolId}
          onClose={closeDialogs}
          onSave={saveCode}
          isSaving={createCodeState.isLoading || updateCodeState.isLoading}
          requestError={requestError}
        />
      ) : null}
      {bulkOpen ? (
        <BulkAccessCodesDialog
          poolId={selectedPoolId}
          onClose={closeDialogs}
          onSave={saveBulk}
          isSaving={bulkState.isLoading}
          requestError={requestError}
        />
      ) : null}
      {revealCode ? (
        <RevealAccessCodeDialog
          code={revealCode}
          onClose={closeDialogs}
          onReveal={handleReveal}
          isRevealing={revealState.isLoading}
          requestError={requestError}
        />
      ) : null}
      {retireCandidate ? (
        <RetireAccessCodeDialog
          code={retireCandidate}
          onClose={closeDialogs}
          onConfirm={confirmRetire}
          isRetiring={retireCodeState.isLoading}
          requestError={requestError}
        />
      ) : null}
      <span className="sr-only" aria-live="polite">
        {retireCodeState.isLoading ? t("actions.retiring") : ""}
      </span>
    </section>
  );
}
