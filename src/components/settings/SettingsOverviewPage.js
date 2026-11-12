"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  SparklesIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useSelector } from "react-redux";

import WorkspaceBrushField from "@/components/decorations/WorkspaceBrushField";
import { NATIVE_INVOICES_ENABLED } from "@/config/features";
import { Link } from "@/i18n/navigation";
import {
  selectCurrentTenant,
  selectCurrentWorkspaceAccess,
} from "@/lib/features/auth/authSlice";

import {
  canAccessSettingsItem,
  getVisibleSettingsGroups,
  launchCenterItem,
} from "./settingsNavigation";

const toneClasses = {
  cobalt: {
    icon: "bg-cobalt-50 text-cobalt-700 ring-cobalt-100",
    glow: "bg-cobalt-300/20",
    line: "from-cobalt-500 to-cobalt-300",
  },
  indigo: {
    icon: "bg-skab-cobalt-50 text-skab-cobalt-600 ring-skab-cobalt-100",
    glow: "bg-skab-cobalt-300/20",
    line: "from-skab-cobalt-600 to-skab-cobalt-300",
  },
  coral: {
    icon: "bg-coral-50 text-terracotta-700 ring-coral-100",
    glow: "bg-coral-300/20",
    line: "from-terracotta-600 to-coral-300",
  },
  sand: {
    icon: "bg-sand-50 text-sand-800 ring-sand-200",
    glow: "bg-sand-300/25",
    line: "from-sand-700 to-sand-300",
  },
  mint: {
    icon: "bg-[#EFF7F0] text-[#4B6B51] ring-[#D7E8D9]",
    glow: "bg-[#A8C9AE]/20",
    line: "from-[#5F8166] to-[#9BC2A2]",
  },
  slate: {
    icon: "bg-[#F1F1EF] text-[#4A4A46] ring-[#E2E1DD]",
    glow: "bg-[#B8B7B0]/20",
    line: "from-[#454541] to-[#92918A]",
  },
};

export default function SettingsOverviewPage() {
  const t = useTranslations("WorkspaceSettingsOverview");
  const navT = useTranslations("WorkspaceSettingsNav");
  const modulesT = useTranslations("WorkspaceModules");
  const access = useSelector(selectCurrentWorkspaceAccess);
  const tenant = useSelector(selectCurrentTenant);
  const visibleGroups = getVisibleSettingsGroups({ access, tenant });
  const launchCenterVisible = canAccessSettingsItem(
    launchCenterItem,
    access,
    tenant,
  );

  return (
    <section className="min-w-0 space-y-5 pb-10">
      <header className="relative isolate overflow-hidden rounded-[28px] border border-line bg-white px-5 py-7 shadow-[0_20px_60px_rgba(31,31,27,0.07)] sm:px-8 sm:py-9">
        <WorkspaceBrushField variant="settingsHero" />

        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cobalt-100 bg-cobalt-50/75 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-cobalt-700">
            <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t("eyebrow")}
          </span>
          <h2 className="mt-4 text-[28px] font-semibold tracking-[-0.055em] text-[#171715] sm:text-[38px]">
            {t("title")}
          </h2>
          <p className="mt-3 max-w-2xl text-[13px] leading-6 text-ink-muted sm:text-[14px]">
            {t("description")}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-medium text-ink-soft">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/75 px-3 py-1.5 shadow-xs">
              <CheckCircleIcon
                className="h-3.5 w-3.5 text-success"
                aria-hidden="true"
              />
              {t("tailored")}
            </span>
            <span className="rounded-full border border-line bg-white/75 px-3 py-1.5 shadow-xs">
              {t("categoryCount", { count: visibleGroups.length })}
            </span>
          </div>
        </div>
      </header>

      {visibleGroups.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const tone = toneClasses[group.tone] ?? toneClasses.cobalt;

            return (
              <article
                key={group.key}
                className="relative isolate min-w-0 overflow-hidden rounded-[24px] border border-line bg-white p-5 shadow-[0_14px_42px_rgba(17,17,15,0.045)] sm:p-6"
              >
                <div
                  className={`pointer-events-none absolute -right-14 -top-16 -z-10 h-40 w-40 rounded-full blur-3xl ${tone.glow}`}
                  aria-hidden="true"
                />
                <div
                  className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${tone.line}`}
                  aria-hidden="true"
                />

                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] ring-1 ring-inset ${tone.icon}`}
                  >
                    <GroupIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-[18px] font-semibold tracking-[-0.035em] text-ink">
                        {navT(group.labelKey ?? `groups.${group.key}`)}
                      </h3>
                      <span className="rounded-full bg-[#F7F5F1] px-2.5 py-1 text-[9px] font-semibold text-ink-muted">
                        {t("itemCount", { count: group.items.length })}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-5 text-ink-muted sm:text-[13px]">
                      {group.key === "payments" && !NATIVE_INVOICES_ENABLED
                        ? modulesT("modules.payments.description")
                        : t(`groups.${group.key}.description`)}
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-1.5">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          className="group/item flex min-h-11 items-center gap-3 rounded-[14px] border border-transparent px-3 text-[12px] font-medium text-ink-soft transition hover:border-line hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-500/30 sm:text-[13px]"
                        >
                          <ItemIcon
                            className="h-4 w-4 shrink-0 text-ink-subtle"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {navT(`items.${item.key}`)}
                          </span>
                          <ArrowRightIcon
                            className="h-3.5 w-3.5 shrink-0 text-ink-subtle transition group-hover/item:text-cobalt-600"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      ) : (
        <div
          role="status"
          className="rounded-[24px] border border-dashed border-line-strong bg-white px-6 py-10 text-center shadow-[0_14px_42px_rgba(17,17,15,0.035)]"
        >
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-[15px] bg-cobalt-50 text-cobalt-700 ring-1 ring-inset ring-cobalt-100">
            <Squares2X2Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.035em] text-ink">
            {t("empty.title")}
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-[13px] leading-6 text-ink-muted">
            {t("empty.description")}
          </p>
        </div>
      )}

      {launchCenterVisible ? (
        <aside className="relative isolate overflow-hidden rounded-[22px] border border-coral-200 bg-coral-50/60 px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6">
          <WorkspaceBrushField variant="settingsLaunch" />

          <div className="relative z-10 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-terracotta-700 shadow-xs">
              <RocketLaunchIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold tracking-[-0.025em] text-terracotta-900">
                {t("launchCenter.title")}
              </h3>
              <p className="mt-1 max-w-2xl text-[12px] leading-5 text-terracotta-800/80 sm:text-[13px]">
                {t("launchCenter.description")}
              </p>
            </div>
          </div>
          <Link
            href={launchCenterItem.href}
            className="relative z-10 mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-skab-coral-700 px-5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-skab-coral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skab-coral-700/35 focus-visible:ring-offset-2 focus-visible:ring-offset-coral-50 sm:mt-0 sm:w-auto"
          >
            {t("launchCenter.action")}
            <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </aside>
      ) : null}
    </section>
  );
}
