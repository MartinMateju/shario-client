"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";

import { isLaunchChecklistIncomplete } from "@/components/dashboard/launchCenterNavigation";
import { getLaunchCenterNavigationStatus } from "@/components/setup-center/setupCenter.utils";
import { Link } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";
import { useGetSetupCenterQuery } from "@/lib/features/setup-center/setupCenterApiSlice";
import {
  canAccessSettingsItem,
  filterSettingsGroups,
  getSettingsSection,
  getVisibleSettingsGroups,
  launchCenterItem,
} from "./settingsNavigation";

const iconTones = {
  cobalt: "bg-[var(--studio-blue-soft)] text-[var(--studio-blue)]",
  indigo: "bg-[var(--studio-blue-soft)] text-[var(--studio-blue)]",
  coral: "bg-[var(--studio-clay-soft)] text-[var(--studio-clay)]",
  sand: "bg-[var(--studio-soft)] text-[var(--studio-muted)]",
  mint: "bg-[var(--studio-soft)] text-[var(--studio-muted)]",
  slate: "bg-surface-muted text-ink-soft",
};

function SettingsGroup({ group, t }) {
  const Icon = group.icon;
  return (
    <article className="min-w-0 rounded-[var(--studio-radius)] border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTones[group.tone] || iconTones.cobalt}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[16px] leading-6 font-medium tracking-[-0.02em] text-ink break-words">
            {t(`groups.${group.key}.title`)}
          </h3>
          <p className="mt-1 text-sm leading-5 text-ink-muted">
            {t(`groups.${group.key}.description`)}
          </p>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-line/60">
        {group.items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="group flex min-h-12 items-center gap-3 rounded-xl px-2 py-3 text-sm font-medium text-ink-soft transition hover:bg-surface-muted hover:text-cobalt-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500"
            >
              <span className="min-w-0 flex-1 break-words">
                {t(`items.${item.key}.title`)}
              </span>
              <ArrowRightIcon
                className="h-4 w-4 shrink-0 text-ink-subtle group-hover:text-cobalt-700"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function SettingsOverviewPage() {
  const t = useTranslations("UnifiedSettings");
  const searchParams = useSearchParams();
  const access = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const [query, setQuery] = useState("");
  const studioGroups = getVisibleSettingsGroups({ access, tenant });
  const section = getSettingsSection({
    requestedSection: searchParams?.get("section"),
    studioGroups,
  });
  // Keep each section's search independent when switching tabs without a remount.
  const [searchSection, setSearchSection] = useState(section);
  if (searchSection !== section) {
    setSearchSection(section);
    setQuery("");
  }
  const groups =
    section === "personal"
      ? getVisibleSettingsGroups({ access, tenant, section })
      : studioGroups;
  const filtered = filterSettingsGroups(groups, query, t);
  const standardGroups = filtered.filter((group) => !group.advanced);
  const advancedGroups = filtered.filter((group) => group.advanced);
  const canUseSetup =
    section === "studio" &&
    canAccessSettingsItem(launchCenterItem, access, tenant);
  const setupQuery = useGetSetupCenterQuery(undefined, { skip: !canUseSetup });
  const setupStatus = setupQuery.isSuccess
    ? getLaunchCenterNavigationStatus(setupQuery.currentData ?? setupQuery.data)
    : null;
  const showChecklist = canUseSetup && isLaunchChecklistIncomplete(setupStatus);

  return (
    <section
      aria-label={t(section === "personal" ? "personalTitle" : "studioTitle")}
      className="min-w-0 space-y-4"
    >
      <form
        data-ui-unstyled="true"
        role="search"
        aria-label={t("searchLabel")}
        onSubmit={(event) => event.preventDefault()}
        className="relative flex min-w-0 items-center rounded-xl border border-line bg-white focus-within:ring-2 focus-within:ring-cobalt-500"
      >
        <MagnifyingGlassIcon
          className="pointer-events-none ml-4 h-5 w-5 shrink-0 text-ink-subtle"
          aria-hidden="true"
        />
        <input
          type="search"
          aria-label={t("searchLabel")}
          placeholder={t(
            section === "personal" ? "searchPersonal" : "searchStudio",
          )}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-12 min-w-0 flex-1 border-0 bg-transparent px-3 text-[16px] text-ink placeholder:text-ink-muted sm:text-[13px] focus:ring-0 [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("clearSearch")}
            className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </form>
      {query.trim() ? (
        <p role="status" className="px-1 text-sm text-ink-muted">
          {t("searchResults", {
            count: filtered.reduce(
              (count, group) => count + group.items.length,
              0,
            ),
          })}
        </p>
      ) : null}
      {standardGroups.length ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {standardGroups.map((group) => (
            <SettingsGroup key={group.key} group={group} t={t} />
          ))}
        </div>
      ) : null}
      {advancedGroups.length ? (
        <details
          open={query.trim() ? true : undefined}
          className="rounded-[var(--studio-radius)] border border-line bg-white p-4 sm:p-5"
        >
          <summary className="min-h-11 cursor-pointer rounded-lg py-2 text-[14px] font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500">
            {t("advancedTitle")}
          </summary>
          <p className="mb-4 text-sm leading-5 text-ink-muted">
            {t("advancedDescription")}
          </p>
          {advancedGroups.map((group) => (
            <SettingsGroup key={group.key} group={group} t={t} />
          ))}
        </details>
      ) : null}
      {!filtered.length ? (
        <div className="rounded-[var(--studio-radius)] border border-dashed border-line bg-white p-6 text-center">
          <h3 className="text-[16px] leading-6 font-medium tracking-[-0.02em] text-ink">
            {t("emptyTitle")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            {t("emptyDescription")}
          </p>
        </div>
      ) : null}
      {showChecklist && !query.trim() ? (
        <aside className="flex flex-wrap items-center gap-4 rounded-[var(--studio-radius)] border border-line bg-white p-4 sm:p-5">
          <RocketLaunchIcon
            className="h-5 w-5 shrink-0 text-cobalt-600"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1 basis-48">
            <h3 className="text-[14px] font-medium text-ink">
              {t("setupTitle")}
            </h3>
            <p className="mt-1 text-sm leading-5 text-ink-muted">
              {t("setupProgress", {
                completed: setupStatus.completed,
                total: setupStatus.total,
              })}
            </p>
          </div>
          <Link
            href={launchCenterItem.href}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-cobalt-600 ring-1 ring-cobalt-200 hover:bg-cobalt-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500"
          >
            {t("setupAction")}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
      ) : null}
    </section>
  );
}
