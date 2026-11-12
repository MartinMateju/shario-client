import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { WorkspaceToolbar } from "@/components/dashboard/WorkspaceDataSurface";

import { cx } from "./people-table.utils";

export default function PeopleToolbar({
  activeTab,
  search,
  status,
  membership,
  role,
  membershipOptions,
  roleOptions,
  activeFilterCount,
  total,
  t,
  onSearchChange,
  onStatusChange,
  onMembershipChange,
  onRoleChange,
  onClearFilters,
  onExport,
}) {
  return (
    <WorkspaceToolbar contained>
      <Disclosure defaultOpen={activeFilterCount > 0}>
        {({ open }) => (
          <div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <label className="relative min-w-0 flex-1 xl:max-w-[420px]">
                <span className="sr-only">{t("filters.searchLabel")}</span>
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D7D7D]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={t(
                    activeTab === "customers"
                      ? "filters.customerSearchPlaceholder"
                      : "filters.staffSearchPlaceholder",
                  )}
                  className="h-11 w-full rounded-[12px] border border-line bg-white py-2 pl-10 pr-4 text-[12px] text-ink outline-none transition placeholder:text-ink-subtle hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                />
              </label>

              <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
                <DisclosureButton
                  className={cx(
                    "inline-flex h-11 items-center gap-2 rounded-[12px] border px-3.5 text-[12px] font-medium outline-none transition focus-visible:ring-4 focus-visible:ring-cobalt-500/10",
                    open || activeFilterCount > 0
                      ? "border-cobalt-200 bg-cobalt-50 text-cobalt-700"
                      : "border-line bg-white text-ink-soft hover:border-line-strong hover:bg-canvas",
                  )}
                >
                  <AdjustmentsHorizontalIcon
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  {t("filters.button")}
                  {activeFilterCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-primary px-1.5 text-[10px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                  <ChevronDownIcon
                    className={cx(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      open && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </DisclosureButton>

                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="inline-flex h-11 items-center gap-1.5 rounded-[12px] px-3 text-[12px] font-medium text-ink-muted transition hover:bg-surface-muted hover:text-ink"
                  >
                    <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                    {t("filters.clear")}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={onExport}
                  disabled={total === 0}
                  className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-line bg-white px-4 text-[12px] font-medium text-ink-soft transition hover:border-line-strong hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                  {t("actions.export")}
                </button>
              </div>
            </div>

            <DisclosurePanel
              transition
              className="origin-top transition duration-150 ease-out data-[closed]:-translate-y-1 data-[closed]:opacity-0"
            >
              <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2 xl:max-w-[560px]">
                {activeTab === "customers" ? (
                  <label>
                    <span className="sr-only">{t("filters.membership")}</span>
                    <select
                      value={membership}
                      onChange={(event) =>
                        onMembershipChange(event.target.value)
                      }
                      className="h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[12px] text-ink-soft outline-none transition hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                    >
                      <option value="">{t("filters.allMemberships")}</option>
                      <option value="none">{t("membership.none")}</option>
                      {membershipOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label>
                    <span className="sr-only">{t("filters.role")}</span>
                    <select
                      value={role}
                      onChange={(event) => onRoleChange(event.target.value)}
                      className="h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[12px] text-ink-soft outline-none transition hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                    >
                      <option value="">{t("filters.allRoles")}</option>
                      {roleOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  <span className="sr-only">{t("filters.status")}</span>
                  <select
                    value={status}
                    onChange={(event) => onStatusChange(event.target.value)}
                    className="h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[12px] text-ink-soft outline-none transition hover:border-line-strong focus:border-cobalt-500 focus:ring-4 focus:ring-cobalt-500/10"
                  >
                    <option value="">{t("filters.allStatuses")}</option>
                    {["active", "invited", "inactive"].map((option) => (
                      <option key={option} value={option}>
                        {t(`status.${option}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </DisclosurePanel>
          </div>
        )}
      </Disclosure>
    </WorkspaceToolbar>
  );
}
