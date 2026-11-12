"use client";

import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  GiftIcon,
  IdentificationIcon,
  InformationCircleIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";

import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";

import DataImportWizard from "./DataImportWizard";
import ImportHistoryPanel from "./ImportHistoryPanel";
import { DATA_IMPORT_ENTITIES } from "./customerImport.utils";

const IMPORT_GROUPS = [
  {
    key: DATA_IMPORT_ENTITIES.CUSTOMERS,
    icon: UserGroupIcon,
    permission: PERMISSIONS.CUSTOMERS_IMPORT,
    entities: [{ key: DATA_IMPORT_ENTITIES.CUSTOMERS }],
  },
  {
    key: DATA_IMPORT_ENTITIES.PRODUCTS,
    icon: ShoppingBagIcon,
    permission: PERMISSIONS.PRODUCTS_IMPORT,
    modulesAny: ["bookings", "courses"],
    entities: [{ key: DATA_IMPORT_ENTITIES.PRODUCTS }],
  },
  {
    key: DATA_IMPORT_ENTITIES.BOOKINGS,
    icon: CalendarDaysIcon,
    permission: PERMISSIONS.BOOKINGS_IMPORT,
    module: "bookings",
    entities: [{ key: DATA_IMPORT_ENTITIES.BOOKINGS }],
  },
  {
    key: "memberships",
    icon: IdentificationIcon,
    permission: PERMISSIONS.MEMBERSHIPS_IMPORT,
    module: "memberships",
    entities: [
      { key: DATA_IMPORT_ENTITIES.MEMBERSHIP_PLANS, label: "plans" },
      { key: DATA_IMPORT_ENTITIES.MEMBERSHIPS, label: "customers" },
    ],
  },
  {
    key: DATA_IMPORT_ENTITIES.CREDITS,
    icon: CreditCardIcon,
    permission: PERMISSIONS.CREDITS_IMPORT,
    module: "credits",
    entities: [{ key: DATA_IMPORT_ENTITIES.CREDITS }],
  },
  {
    key: "vouchers",
    icon: GiftIcon,
    permission: PERMISSIONS.VOUCHERS_IMPORT,
    module: "vouchers",
    entities: [
      { key: DATA_IMPORT_ENTITIES.VOUCHER_PRODUCTS, label: "products" },
      { key: DATA_IMPORT_ENTITIES.VOUCHERS, label: "issued" },
    ],
  },
];

const ROLLBACK_ENTITY_PERMISSIONS = Object.freeze({
  [DATA_IMPORT_ENTITIES.CUSTOMERS]: [
    PERMISSIONS.CUSTOMERS_IMPORT,
    PERMISSIONS.CUSTOMERS_MANAGE,
  ],
  [DATA_IMPORT_ENTITIES.PRODUCTS]: [
    PERMISSIONS.PRODUCTS_IMPORT,
    PERMISSIONS.PRODUCTS_MANAGE,
  ],
  [DATA_IMPORT_ENTITIES.BOOKINGS]: [
    PERMISSIONS.BOOKINGS_IMPORT,
    PERMISSIONS.BOOKINGS_CANCEL,
    PERMISSIONS.BOOKINGS_UPDATE,
  ],
  [DATA_IMPORT_ENTITIES.MEMBERSHIP_PLANS]: [
    PERMISSIONS.MEMBERSHIPS_IMPORT,
    PERMISSIONS.MEMBERSHIPS_MANAGE,
  ],
  [DATA_IMPORT_ENTITIES.MEMBERSHIPS]: [
    PERMISSIONS.MEMBERSHIPS_IMPORT,
    PERMISSIONS.MEMBERSHIPS_MANAGE,
  ],
  [DATA_IMPORT_ENTITIES.CREDITS]: [
    PERMISSIONS.CREDITS_IMPORT,
    PERMISSIONS.CREDITS_MANAGE,
  ],
  [DATA_IMPORT_ENTITIES.VOUCHER_PRODUCTS]: [
    PERMISSIONS.VOUCHERS_IMPORT,
    PERMISSIONS.VOUCHERS_MANAGE,
  ],
  [DATA_IMPORT_ENTITIES.VOUCHERS]: [
    PERMISSIONS.VOUCHERS_IMPORT,
    PERMISSIONS.VOUCHERS_MANAGE,
  ],
});

const VALID_DATA_IMPORT_ENTITIES = new Set(Object.values(DATA_IMPORT_ENTITIES));

const resolveRequestedEntity = (entity) =>
  VALID_DATA_IMPORT_ENTITIES.has(entity)
    ? entity
    : DATA_IMPORT_ENTITIES.CUSTOMERS;

function MigrationCenterContent({ initialEntity }) {
  const t = useTranslations("MigrationCenter");
  const tenant = useSelector(selectCurrentTenant);
  const workspaceAccess = useSelector(selectCurrentWorkspaceAccess);
  const wizardRef = useRef(null);
  const [requestedEntity, setRequestedEntity] = useState(initialEntity);
  const [selectedSession, setSelectedSession] = useState(null);
  const [handoffFile, setHandoffFile] = useState(null);
  const availableGroups = useMemo(
    () =>
      IMPORT_GROUPS.filter(
        (item) =>
          hasPermission(workspaceAccess, item.permission) &&
          (!item.module || tenant?.modules?.[item.module] !== false) &&
          (!item.modulesAny ||
            item.modulesAny.some(
              (module) => tenant?.modules?.[module] !== false,
            )),
      ),
    [tenant, workspaceAccess],
  );
  const availableEntities = useMemo(
    () => availableGroups.flatMap((group) => group.entities),
    [availableGroups],
  );
  const selectedEntity = availableEntities.some(
    (item) => item.key === requestedEntity,
  )
    ? requestedEntity
    : availableEntities[0]?.key;
  const entityT = useTranslations(
    `MigrationCenter.importers.${selectedEntity || DATA_IMPORT_ENTITIES.CUSTOMERS}`,
  );
  const handleSessionChange = useCallback((next) => {
    if (!next) setSelectedSession(null);
  }, []);
  const canRollbackEntity = useCallback(
    (entity) => {
      const required = ROLLBACK_ENTITY_PERMISSIONS[entity];

      return Boolean(
        required &&
        availableEntities.some((item) => item.key === entity) &&
        hasPermission(workspaceAccess, PERMISSIONS.DATA_IMPORTS_ROLLBACK) &&
        required.every((permission) =>
          hasPermission(workspaceAccess, permission),
        ),
      );
    },
    [availableEntities, workspaceAccess],
  );

  const openHistoryItem = (item) => {
    const entity = item?.entityType ?? item?.entity;

    if (availableEntities.some((entry) => entry.key === entity)) {
      setRequestedEntity(entity);
    }
    setHandoffFile(null);
    setSelectedSession(item);
    window.requestAnimationFrame(() =>
      wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const selectEntity = (entity) => {
    if (entity === selectedEntity) return;

    setRequestedEntity(entity);
    setHandoffFile(null);
    setSelectedSession(null);
    window.requestAnimationFrame(() =>
      wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const continueCustomerFileToCredits = (file) => {
    if (
      !file ||
      !availableEntities.some(
        (entry) => entry.key === DATA_IMPORT_ENTITIES.CREDITS,
      )
    )
      return;
    setHandoffFile(file);
    setRequestedEntity(DATA_IMPORT_ENTITIES.CREDITS);
    setSelectedSession(null);
    window.requestAnimationFrame(() =>
      wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  return (
    <section className="min-w-0 space-y-5 pb-10">
      <header className="relative isolate overflow-hidden rounded-[28px] bg-skab-cobalt-900 px-5 py-7 text-white shadow-[0_22px_64px_rgb(var(--skab-blue-rgb)/0.2)] sm:px-8 sm:py-9">
        <WorkspaceBrushField variant="settingsHero" />

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-coral-200">
            <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t("hero.eyebrow")}
          </span>
          <h2 className="mt-4 text-[28px] font-semibold tracking-[-0.055em] text-white sm:text-[38px]">
            {t("hero.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-[12px] leading-6 text-white/72 sm:text-[13px]">
            {t("hero.description")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[9px] font-semibold text-white/78">
            {["preview", "duplicates", "safe"].map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5"
              >
                <CheckCircleIcon
                  className="h-3.5 w-3.5 text-coral-200"
                  aria-hidden="true"
                />
                {t(`hero.benefits.${item}`)}
              </span>
            ))}
          </div>
        </div>
      </header>

      <section
        aria-labelledby="available-importers-title"
        data-contextual-guide-target="data-import-types"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        <h3 id="available-importers-title" className="sr-only">
          {t("entities.availableImporters")}
        </h3>
        {availableGroups.map(({ key, icon: Icon, entities }) => {
          const active = entities.some((item) => item.key === selectedEntity);
          const cardClass = `relative min-w-0 overflow-hidden rounded-[23px] border p-5 text-left shadow-[0_14px_42px_rgba(17,17,15,0.045)] transition ${
            active
              ? "border-cobalt-200 bg-white ring-1 ring-cobalt-100"
              : "border-line bg-surface-muted hover:border-cobalt-100 hover:bg-white"
          }`;
          const heading = (
            <>
              {active ? (
                <span
                  className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cobalt-600 via-cobalt-400 to-coral-300"
                  aria-hidden="true"
                />
              ) : null}
              <span className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-cobalt-50 text-cobalt-700 ring-1 ring-inset ring-cobalt-100">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-success-soft px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-success">
                  {active ? t("entities.selected") : t("entities.available")}
                </span>
              </span>
              <span className="mt-4 block text-[15px] font-semibold tracking-[-0.03em] text-ink">
                {t(`entities.${key}.title`)}
              </span>
              <span className="mt-1.5 block text-[10px] leading-5 text-ink-muted">
                {t(`entities.${key}.description`)}
              </span>
            </>
          );

          if (entities.length === 1) {
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => selectEntity(entities[0].key)}
                className={`${cardClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30`}
              >
                {heading}
              </button>
            );
          }

          return (
            <article key={key} className={cardClass}>
              {heading}
              <div
                role="group"
                aria-label={t(`entities.${key}.modeLabel`)}
                className="mt-4 grid grid-cols-2 gap-2"
              >
                {entities.map((item) => {
                  const selected = item.key === selectedEntity;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => selectEntity(item.key)}
                      className={`min-h-10 rounded-[12px] border px-3 py-2 text-[9px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/25 ${
                        selected
                          ? "border-cobalt-300 bg-cobalt-50 text-cobalt-800"
                          : "border-line bg-white text-ink-muted hover:border-cobalt-200 hover:text-cobalt-700"
                      }`}
                    >
                      {t(`entities.${key}.modes.${item.label}`)}
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      <aside className="flex items-start gap-3 rounded-[18px] border border-cobalt-100 bg-cobalt-50/45 p-4 text-cobalt-950 sm:p-5">
        <InformationCircleIcon
          className="mt-0.5 h-5 w-5 shrink-0 text-cobalt-600"
          aria-hidden="true"
        />
        <div>
          <p className="text-[11px] font-semibold">
            {t("entities.importOrder.title")}
          </p>
          <p className="mt-1 text-[10px] leading-5 text-cobalt-900/75">
            {t("entities.importOrder.description")}
          </p>
          {selectedEntity === DATA_IMPORT_ENTITIES.BOOKINGS ? (
            <p className="mt-2 text-[10px] font-medium leading-5 text-cobalt-900">
              {t("entities.bookings.limitation")}
            </p>
          ) : null}
          {selectedEntity &&
          [
            DATA_IMPORT_ENTITIES.MEMBERSHIP_PLANS,
            DATA_IMPORT_ENTITIES.MEMBERSHIPS,
            DATA_IMPORT_ENTITIES.CREDITS,
            DATA_IMPORT_ENTITIES.VOUCHER_PRODUCTS,
            DATA_IMPORT_ENTITIES.VOUCHERS,
          ].includes(selectedEntity) ? (
            <p className="mt-2 text-[10px] font-medium leading-5 text-cobalt-900">
              {t(`entities.guidance.${selectedEntity}`)}
            </p>
          ) : null}
        </div>
      </aside>

      <div
        ref={wizardRef}
        data-contextual-guide-target="data-import-wizard"
        className="scroll-mt-[112px]"
      >
        {selectedEntity ? (
          <DataImportWizard
            entity={selectedEntity}
            initialFile={
              selectedEntity === DATA_IMPORT_ENTITIES.CREDITS
                ? handoffFile
                : null
            }
            initialSession={selectedSession}
            onContinueToCredits={
              availableEntities.some(
                (entry) => entry.key === DATA_IMPORT_ENTITIES.CREDITS,
              )
                ? continueCustomerFileToCredits
                : null
            }
            onSessionChange={handleSessionChange}
          />
        ) : (
          <div className="rounded-[23px] border border-line bg-white p-8 text-center text-[11px] text-ink-muted">
            {t("entities.noAccess")}
          </div>
        )}
      </div>

      <div data-contextual-guide-target="data-import-history">
        <ImportHistoryPanel
          key={selectedEntity || "no-import-access"}
          entities={availableEntities.map((item) => item.key)}
          selectedEntity={selectedEntity}
          canRollbackEntity={canRollbackEntity}
          onOpenSession={openHistoryItem}
        />
      </div>

      <aside className="flex items-start gap-3 rounded-[18px] border border-coral-200 bg-coral-50/55 p-4 text-terracotta-900 sm:p-5">
        <ClockIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-[11px] font-semibold">{t("support.title")}</p>
          <p className="mt-1 text-[10px] leading-5 text-terracotta-800/80">
            {entityT("support.description")}
          </p>
        </div>
      </aside>
    </section>
  );
}

export default function MigrationCenterPage() {
  const requestedEntity = resolveRequestedEntity(
    useSearchParams().get("entity"),
  );

  return (
    <MigrationCenterContent
      key={requestedEntity}
      initialEntity={requestedEntity}
    />
  );
}
