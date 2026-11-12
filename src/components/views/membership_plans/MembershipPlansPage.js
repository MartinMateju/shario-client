"use client";

import { useMemo, useState } from "react";
import {
  ArchiveBoxIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  PencilSquareIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import WorkspaceTabs, {
  WorkspaceTabPanel,
} from "@/components/dashboard/WorkspaceTabs";
import {
  WorkspaceCard,
  WorkspaceEmptyState,
} from "@/components/dashboard/WorkspaceDataSurface";
import ConfirmationModal from "@/components/modals/ConformationModal";
import useGuidedSetupStep from "@/components/setup-center/useGuidedSetupStep";
import PlanEditorDialog from "@/components/memberships/PlanEditorDialog";
import MembershipCustomersPanel from "@/components/memberships/MembershipCustomersPanel";
import {
  formatBenefitValue,
  formatPlanPrice,
  getEntityId,
  getLocalizedMembershipText,
  getPlanBenefits,
  getPlanLocations,
  getPlanPrices,
  getPlanVersion,
  normalizePlans,
  statusTone,
} from "@/components/memberships/membership.utils";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { DEFAULT_STUDIO_COMMERCE_CURRENCY } from "@/config/currencies";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useGetLocationsQuery } from "@/lib/features/locations/locationApiSlice";
import { normalizeLocationsResponse } from "@/lib/features/locations/location.utils";
import { useGetAllProductsQuery } from "@/lib/features/products/productsApiSlice";
import {
  normalizeProductKind,
  PRODUCT_KIND,
} from "@/lib/features/products/products.contract.mjs";
import {
  useArchiveMembershipPlanMutation,
  useCreateMembershipPlanMutation,
  useDuplicateMembershipPlanMutation,
  useGetAllMembershipPlansQuery,
  usePublishMembershipPlanMutation,
  useUpdateMembershipPlanMutation,
} from "@/lib/features/memberships/membershipsApiSlice";

const cx = (...classes) => classes.filter(Boolean).join(" ");
const MEMBERSHIP_TABS_ID = "membership-sections";

export default function MembershipPlansPage({
  showPageHeader = true,
  embedded = false,
  createOpen = false,
  onCreateOpenChange,
  guidedSetup = false,
  onGuidedSaved,
}) {
  const t = useTranslations("Memberships.owner");
  const commonT = useTranslations("Memberships.common");
  const benefitT = useTranslations("Memberships.benefits");
  const setupT = useTranslations("SetupCenter");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const internalGuidedSetup = useGuidedSetupStep("membership");
  const effectiveGuidedSetup = guidedSetup || internalGuidedSetup.guided;
  const completeGuidedSave =
    onGuidedSaved ||
    (() =>
      internalGuidedSetup.refreshAndContinue({
        metadata: { form: "membership_plan" },
      }));
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const canManage = hasPermission(
    workspaceAccess,
    PERMISSIONS.MEMBERSHIPS_MANAGE,
  );
  const [activeTab, setActiveTab] = useState("plans");
  const [editingPlan, setEditingPlan] = useState(null);
  const [editorOpen, setEditorOpen] = useState(
    () => canManage && searchParams.get("action") === "create",
  );
  const [requestError, setRequestError] = useState(false);
  const [notice, setNotice] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);

  const plansQuery = useGetAllMembershipPlansQuery({
    includeInactive: true,
  });
  const locationsQuery = useGetLocationsQuery({ limit: 100 });
  const coursesQuery = useGetAllProductsQuery(
    { kind: "class", includeInactive: true },
    { skip: !canManage },
  );
  const courses = (
    Array.isArray(coursesQuery.data) ? coursesQuery.data : []
  ).filter((product) => normalizeProductKind(product) === PRODUCT_KIND.CLASS);
  const plans = normalizePlans(plansQuery.data);
  const locations = useMemo(
    () => normalizeLocationsResponse(locationsQuery.data),
    [locationsQuery.data],
  );
  const locationsById = useMemo(
    () =>
      new Map(locations.map((location) => [getEntityId(location), location])),
    [locations],
  );
  const defaultCurrency =
    tenant?.settings?.currency || DEFAULT_STUDIO_COMMERCE_CURRENCY;

  const [createPlan, createState] = useCreateMembershipPlanMutation();
  const [updatePlan, updateState] = useUpdateMembershipPlanMutation();
  const [publishPlan, publishState] = usePublishMembershipPlanMutation();
  const [archivePlan, archiveState] = useArchiveMembershipPlanMutation();
  const [duplicatePlan, duplicateState] = useDuplicateMembershipPlanMutation();
  const isSaving = createState.isLoading || updateState.isLoading;
  const isActing =
    publishState.isLoading ||
    archiveState.isLoading ||
    duplicateState.isLoading;
  const externalCreateOpen = embedded && canManage && createOpen;
  const activeEditorPlan = externalCreateOpen ? null : editingPlan;
  const isEditorOpen = editorOpen || externalCreateOpen;

  const openCreate = () => {
    setEditingPlan(null);
    setRequestError(false);
    if (embedded && onCreateOpenChange) {
      onCreateOpenChange(true);
    } else {
      setEditorOpen(true);
    }
  };

  const openEdit = (plan) => {
    onCreateOpenChange?.(false);
    setEditingPlan(plan);
    setRequestError(false);
    setEditorOpen(true);
  };

  const handleSave = async (payload) => {
    setRequestError(false);
    try {
      if (activeEditorPlan) {
        await updatePlan({
          id: getEntityId(activeEditorPlan),
          ...payload,
        }).unwrap();
        setNotice(t("notices.updated"));
      } else {
        await createPlan(payload).unwrap();
        setNotice(t("notices.created"));
      }
      if (effectiveGuidedSetup) {
        await completeGuidedSave();
        return;
      }
      setEditorOpen(false);
      onCreateOpenChange?.(false);
    } catch {
      setRequestError(true);
    }
  };

  const runAction = async (
    action,
    plan,
    successKey,
    completeGuidedStep = false,
  ) => {
    try {
      await action(getEntityId(plan)).unwrap();
      setNotice(t(`notices.${successKey}`));
      if (effectiveGuidedSetup && completeGuidedStep) {
        await completeGuidedSave();
      }
    } catch {
      setNotice(t("notices.actionError"));
    }
  };

  const handleArchive = (plan) => setArchiveTarget(plan);

  const tabs = [
    { id: "plans", label: t("tabs.plans"), icon: ArchiveBoxIcon },
    { id: "customers", label: t("tabs.customers"), icon: UserGroupIcon },
  ];

  return (
    <section
      data-guided-form={effectiveGuidedSetup ? "membership" : undefined}
      className={`${embedded ? "min-h-[360px]" : "min-h-[70vh]"} bg-canvas text-[#20201E]`}
    >
      <header
        className={
          embedded
            ? "rounded-[20px] border border-line bg-white px-3 pt-1 shadow-[0_10px_30px_rgba(17,17,15,0.03)]"
            : "rounded-[24px] border border-line bg-white px-5 py-6 shadow-[0_12px_38px_rgba(17,17,15,0.035)] sm:px-7"
        }
      >
        <div
          className={
            showPageHeader
              ? "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
              : "flex justify-end"
          }
        >
          {showPageHeader ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-terracotta-600">
                {t("eyebrow")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-3 max-w-2xl text-[12px] leading-6 text-[#777773]">
                {t("description")}
              </p>
            </div>
          ) : null}
          {!embedded && activeTab === "plans" ? (
            <button
              type="button"
              onClick={openCreate}
              disabled={!canManage}
              title={!canManage ? t("managePermissionRequired") : undefined}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cobalt-700 px-6 text-[12px] font-semibold text-white shadow-[0_12px_28px_rgb(var(--skab-blue-rgb)/0.22)] transition hover:-translate-y-0.5 hover:bg-cobalt-800 disabled:cursor-not-allowed disabled:bg-[#D9D7D1] disabled:text-[#777773] disabled:shadow-none disabled:hover:translate-y-0 sm:w-auto"
            >
              <PlusIcon className="h-4 w-4" /> {t("createPlan")}
            </button>
          ) : null}
        </div>
        <WorkspaceTabs
          id={MEMBERSHIP_TABS_ID}
          className={embedded ? "mt-0" : "mt-6"}
          tabs={tabs}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel={t("tabs.label")}
        />
      </header>

      {notice ? (
        <div
          className="mt-4 flex items-center justify-between rounded-[14px] border border-line bg-white px-4 py-3 text-[12px] text-[#555553]"
          role="status"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="font-semibold text-[#171717]"
          >
            {commonT("dismiss")}
          </button>
        </div>
      ) : null}

      {tabs
        .filter((tab) => tab.id !== activeTab)
        .map((tab) => (
          <WorkspaceTabPanel
            key={tab.id}
            tabsId={MEMBERSHIP_TABS_ID}
            tabId={tab.id}
            active={false}
          />
        ))}

      <WorkspaceTabPanel tabsId={MEMBERSHIP_TABS_ID} tabId={activeTab}>
        {activeTab === "customers" ? (
          <MembershipCustomersPanel
            plans={plans}
            locations={locations}
            canManage={canManage}
          />
        ) : plansQuery.isLoading ? (
          <div
            className="mt-5 flex min-h-72 items-center justify-center rounded-[22px] border border-line bg-white text-[12px] text-[#777773]"
            role="status"
          >
            <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />{" "}
            {t("loading")}
          </div>
        ) : plansQuery.isError ? (
          <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-[22px] border border-danger/20 bg-danger-soft px-6 text-center">
            <p className="text-[13px] font-semibold text-danger">
              {t("loadError")}
            </p>
            <button
              type="button"
              onClick={plansQuery.refetch}
              className="mt-4 min-h-10 rounded-full bg-[#171717] px-4 py-2 text-[12px] font-semibold text-white"
            >
              {commonT("retry")}
            </button>
          </div>
        ) : plans.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={getEntityId(plan)}
                plan={plan}
                locale={locale}
                t={t}
                benefitT={benefitT}
                locationsById={locationsById}
                canManage={canManage}
                disabled={isActing}
                onEdit={() => openEdit(plan)}
                onPublish={() =>
                  runAction(publishPlan, plan, "published", true)
                }
                publishLabel={
                  effectiveGuidedSetup
                    ? setupT("guided.publishAndContinue")
                    : undefined
                }
                onDuplicate={async () => {
                  try {
                    await duplicatePlan({ id: getEntityId(plan) }).unwrap();
                    setNotice(t("notices.duplicated"));
                  } catch {
                    setNotice(t("notices.actionError"));
                  }
                }}
                onArchive={() => handleArchive(plan)}
              />
            ))}
          </div>
        ) : (
          <WorkspaceEmptyState
            className="mt-5 min-h-80"
            icon={ArchiveBoxIcon}
            title={t("empty.title")}
            description={t("empty.description")}
            action={
              <div>
                <button
                  type="button"
                  onClick={openCreate}
                  disabled={!canManage}
                  title={!canManage ? t("managePermissionRequired") : undefined}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-cobalt-700 px-6 text-[12px] font-semibold text-white shadow-[0_14px_30px_rgb(var(--skab-blue-rgb)/0.24)] transition hover:-translate-y-0.5 hover:bg-cobalt-800 disabled:cursor-not-allowed disabled:bg-[#D9D7D1] disabled:text-[#777773] disabled:shadow-none disabled:hover:translate-y-0"
                >
                  <PlusIcon className="h-4 w-4" /> {t("createPlan")}
                </button>
                {!canManage ? (
                  <p className="mt-3 max-w-sm text-[12px] leading-5 text-[#777773]">
                    {t("managePermissionRequired")}
                  </p>
                ) : null}
              </div>
            }
          />
        )}
      </WorkspaceTabPanel>

      {isEditorOpen ? (
        <PlanEditorDialog
          open
          plan={activeEditorPlan}
          locations={locations}
          courses={courses}
          defaultCurrency={defaultCurrency}
          languageSettings={tenant?.settings}
          saving={isSaving}
          requestError={requestError}
          guided={effectiveGuidedSetup}
          onClose={() => {
            setEditorOpen(false);
            onCreateOpenChange?.(false);
          }}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmationModal
        open={Boolean(archiveTarget)}
        setOpen={(nextOpen) => {
          if (!nextOpen && !archiveState.isLoading) setArchiveTarget(null);
        }}
        title={t("archiveDialog.title")}
        text={t("archiveConfirm", {
          name: getLocalizedMembershipText(
            getPlanVersion(archiveTarget),
            "name",
            locale,
          ),
        })}
        confirmText={t("archiveDialog.confirm")}
        cancelText={t("archiveDialog.cancel")}
        isLoading={archiveState.isLoading}
        onConfirm={async () => {
          if (!archiveTarget) return;
          await runAction(archivePlan, archiveTarget, "archived");
          setArchiveTarget(null);
        }}
      />
    </section>
  );
}

function PlanCard({
  plan,
  locale,
  t,
  benefitT,
  locationsById,
  canManage,
  disabled,
  onEdit,
  onPublish,
  publishLabel,
  onDuplicate,
  onArchive,
}) {
  const version = getPlanVersion(plan);
  const prices = getPlanPrices(plan);
  const benefits = getPlanBenefits(plan);
  const status = plan.status || (plan.publishedVersion ? "published" : "draft");
  const isArchived = status === "archived";
  const billing = version?.billing || {};
  const selectedLocations = getPlanLocations(plan);
  const hasDraft = Boolean(
    plan.draftVersion || plan.currentDraftVersion || status === "draft",
  );

  return (
    <WorkspaceCard className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold tracking-[-0.025em]">
            {getLocalizedMembershipText(version, "name", locale) ||
              t("unnamedPlan")}
          </h2>
          <p className="mt-1 text-[11px] text-[#777773]">
            {billing.type === "fixed"
              ? t("billing.fixed", { days: billing.durationDays || 0 })
              : t(
                  `billing.${billing.interval === "year" ? "yearly" : "monthly"}`,
                  {
                    count: billing.intervalCount || 1,
                  },
                )}
          </p>
        </div>
        <span
          className={cx(
            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold",
            statusTone(status),
          )}
        >
          {t(`statuses.${status}`)}
        </span>
      </div>
      {getLocalizedMembershipText(version, "description", locale) ? (
        <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-[#686762]">
          {getLocalizedMembershipText(version, "description", locale)}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {prices.map((price) => (
          <span
            key={price.currency}
            className="rounded-full bg-cobalt-50 px-3 py-1.5 text-[12px] font-semibold text-cobalt-700"
          >
            {formatPlanPrice(price, locale)}
          </span>
        ))}
      </div>
      <div className="mt-4 rounded-[15px] bg-[#F7F5F1] px-3.5 py-3 text-[12px] leading-5 text-[#686762]">
        {selectedLocations.length
          ? t("selectedLocationSummary", {
              locations:
                selectedLocations
                  .map((id) => locationsById.get(id)?.name)
                  .filter(Boolean)
                  .join(", ") || t("selectedLocationsFallback"),
            })
          : t("allLocations")}
      </div>
      <div className="mt-4 flex-1 space-y-2">
        {benefits.slice(0, 4).map((benefit) => (
          <div
            key={benefit.key}
            className="flex items-start gap-2 text-[12px] leading-5 text-[#555553]"
          >
            <CheckCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terracotta-500" />
            <span>
              <strong className="font-semibold text-[#292925]">
                {getLocalizedMembershipText(
                  benefit,
                  "label",
                  locale,
                  version?.sourceLanguage,
                )}
              </strong>{" "}
              · {formatBenefitValue(benefit, benefitT, locale)}
            </span>
          </div>
        ))}
        {benefits.length > 4 ? (
          <p className="pl-5 text-[11px] text-[#777773]">
            {t("moreBenefits", { count: benefits.length - 4 })}
          </p>
        ) : null}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-[#777773]">
        {benefits.some(
          (benefit) => benefit.unit === "minute" && benefit.memberOnly,
        )
          ? benefitT("timeTrackingNotice")
          : t("trackingNotice")}
      </p>
      {canManage ? (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4">
          {!isArchived ? (
            <ActionButton
              icon={PencilSquareIcon}
              label={t("actions.edit")}
              onClick={onEdit}
              disabled={disabled}
            />
          ) : null}
          {hasDraft && !isArchived ? (
            <ActionButton
              icon={CheckCircleIcon}
              label={publishLabel || t("actions.publish")}
              onClick={onPublish}
              disabled={disabled}
            />
          ) : null}
          <ActionButton
            icon={DocumentDuplicateIcon}
            label={t("actions.duplicate")}
            onClick={onDuplicate}
            disabled={disabled}
          />
          {!isArchived ? (
            <ActionButton
              icon={ArchiveBoxIcon}
              label={t("actions.archive")}
              onClick={onArchive}
              disabled={disabled}
              danger
            />
          ) : null}
        </div>
      ) : null}
    </WorkspaceCard>
  );
}

function ActionButton({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] border border-line px-3 text-[12px] font-semibold transition hover:bg-[#F7F5F1] disabled:opacity-40",
        danger && "text-danger",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
