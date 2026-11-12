"use client";

import { useEffect, useMemo } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import {
  ArrowUpRightIcon,
  BuildingOffice2Icon,
  CheckIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useDispatch, useSelector } from "react-redux";

import {
  clearActiveStudioId,
  selectActiveStudioId,
  setActiveStudioId,
} from "@/lib/features/studio/studioContextSlice";
import {
  formatLocationAddress,
  getLocationId,
} from "@/lib/features/locations/location.utils";

import styles from "./dashboardShell.module.css";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const getStudioName = (studio, fallback) => {
  const name = studio?.name?.trim();

  return name || fallback;
};

const getStudioInitials = (studioName = "") => {
  const initials = studioName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return initials || "S";
};

const normalizeStudioLimit = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return number;
};

export default function StudioSwitcher({
  studios = [],
  tenantId,
  studioLimit = null,
  canManageStudios = false,
  isLoading = false,
  isError = false,
  planLabel,
  variant = "sidebar",
  mobile = false,
  collapsed = false,
  onNavigate,
  onStudioChange,
  onAddStudio,
  onUpgradePlan,
  onRetry,
}) {
  const t = useTranslations("Dashboard");
  const dispatch = useDispatch();
  const isTopbar = variant === "topbar";

  const activeStudioId = useSelector(selectActiveStudioId);

  /*
   * Remove invalid studios, studios without IDs
   * and duplicate studio entries.
   */
  const availableStudios = useMemo(() => {
    const source = Array.isArray(studios) ? studios : [];

    const studioIds = new Set();

    return source.filter((studio) => {
      const studioId = getLocationId(studio);

      if (!studioId || studio?.isActive === false || studioIds.has(studioId)) {
        return false;
      }

      studioIds.add(studioId);

      return true;
    });
  }, [studios]);

  /*
   * Use the selected studio when it remains valid.
   * Otherwise fall back to the first studio.
   */
  const activeStudio = useMemo(() => {
    return (
      availableStudios.find(
        (studio) => getLocationId(studio) === activeStudioId,
      ) ||
      availableStudios.find((studio) => studio?.isPrimary) ||
      availableStudios[0] ||
      null
    );
  }, [activeStudioId, availableStudios]);

  const resolvedActiveStudioId = getLocationId(activeStudio);

  /*
   * Keep the active studio first in the dropdown.
   */
  const orderedStudios = useMemo(() => {
    if (!activeStudio) {
      return availableStudios;
    }

    return [
      activeStudio,
      ...availableStudios.filter(
        (studio) => getLocationId(studio) !== resolvedActiveStudioId,
      ),
    ];
  }, [activeStudio, availableStudios, resolvedActiveStudioId]);

  const numericStudioLimit = normalizeStudioLimit(studioLimit);

  const hasStudioLimit = numericStudioLimit !== null;

  const hasReachedStudioLimit =
    hasStudioLimit && availableStudios.length >= numericStudioLimit;

  const hasMultipleStudios = availableStudios.length > 1;

  /*
   * An owner must be able to open the menu
   * even when only one studio exists because
   * the menu contains "Add new studio".
   */
  const canOpenMenu = hasMultipleStudios || canManageStudios;

  /*
   * Synchronize an empty or invalid persisted
   * selection with the first available studio.
   */
  useEffect(() => {
    if (!resolvedActiveStudioId) {
      if (!isLoading && !isError && activeStudioId) {
        dispatch(clearActiveStudioId());
      }

      return;
    }

    if (resolvedActiveStudioId !== activeStudioId) {
      dispatch(
        setActiveStudioId({
          tenantId,
          studioId: resolvedActiveStudioId,
        }),
      );

      onStudioChange?.(resolvedActiveStudioId, activeStudio);
    }
  }, [
    activeStudio,
    activeStudioId,
    dispatch,
    isError,
    isLoading,
    onStudioChange,
    resolvedActiveStudioId,
    tenantId,
  ]);

  const handleStudioChange = (studio) => {
    const studioId = getLocationId(studio);

    if (!studioId) {
      return;
    }

    if (studioId !== resolvedActiveStudioId) {
      dispatch(
        setActiveStudioId({
          tenantId,
          studioId,
        }),
      );

      onStudioChange?.(studioId, studio);
    }

    onNavigate?.();
  };

  /*
   * The visible action is always "Add new studio".
   * The plan limit only determines what happens
   * after the user clicks it.
   */
  const handleAddStudio = () => {
    if (!canManageStudios) {
      return;
    }

    if (hasReachedStudioLimit) {
      onUpgradePlan?.();
    } else {
      onAddStudio?.();
    }

    onNavigate?.();
  };

  if (isLoading) {
    if (isTopbar) {
      return (
        <div className="w-full min-w-0" aria-live="polite">
          <div className="flex h-12 w-full animate-pulse items-center gap-3 rounded-[18px] border border-line bg-surface-raised px-3 motion-reduce:animate-none">
            <span className="h-9 w-9 shrink-0 rounded-[12px] bg-[var(--studio-soft)]" />
            <span className="min-w-0 flex-1">
              <span className="block h-3 w-3/5 rounded-full bg-[var(--studio-soft)]" />
              <span className="mt-2 block h-2.5 w-4/5 rounded-full bg-[var(--studio-soft)]" />
            </span>
            <span className="sr-only">
              {t("studioSwitcher.loadingTitle")}.{" "}
              {t("studioSwitcher.loadingDescription")}
            </span>
          </div>
        </div>
      );
    }

    if (collapsed && !mobile) {
      return (
        <div className="shrink-0 p-2.5 pt-2" aria-live="polite">
          <div className="flex h-11 w-full animate-pulse items-center justify-center rounded-[18px] border border-line bg-surface-raised motion-reduce:animate-none">
            <span className="h-7 w-7 rounded-[10px] bg-[var(--studio-soft)]" />
            <span className="sr-only">
              {t("studioSwitcher.loadingTitle")}.{" "}
              {t("studioSwitcher.loadingDescription")}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="shrink-0 p-4 pt-2" aria-live="polite">
        <div className="flex w-full animate-pulse items-center gap-3 rounded-[18px] border border-line bg-surface-raised p-3 motion-reduce:animate-none">
          <span className="h-10 w-10 shrink-0 rounded-[13px] bg-[var(--studio-soft)]" />

          <span className="min-w-0 flex-1">
            <span className="block h-3 w-3/5 rounded-full bg-[var(--studio-soft)]" />
            <span className="mt-2 block h-2.5 w-4/5 rounded-full bg-[var(--studio-soft)]" />
          </span>

          <span className="sr-only">
            {t("studioSwitcher.loadingTitle")}.{" "}
            {t("studioSwitcher.loadingDescription")}
          </span>
        </div>
      </div>
    );
  }

  if (isError) {
    if (isTopbar) {
      const ErrorElement = onRetry ? "button" : "div";

      return (
        <ErrorElement
          {...(onRetry
            ? {
                type: "button",
                onClick: () => onRetry(),
              }
            : {})}
          aria-label={t("studioSwitcher.loadError")}
          aria-live="polite"
          className={classNames(
            "flex h-12 w-full min-w-0 items-center gap-3 rounded-[18px] border border-[var(--studio-clay)] bg-[var(--studio-paper)] px-3 text-left",
            onRetry &&
              "transition hover:bg-[var(--studio-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--studio-white)] text-[var(--studio-clay)]">
            <BuildingOffice2Icon
              className="h-5 w-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--studio-muted)]">
            {t("studioSwitcher.loadError")}
          </span>
        </ErrorElement>
      );
    }

    if (collapsed && !mobile) {
      const ErrorElement = onRetry ? "button" : "div";

      return (
        <div className="shrink-0 p-2.5 pt-2" aria-live="polite">
          <ErrorElement
            {...(onRetry
              ? {
                  type: "button",
                  onClick: () => onRetry(),
                }
              : {})}
            aria-label={t("studioSwitcher.loadError")}
            className={classNames(
              "flex h-11 w-full items-center justify-center rounded-[18px] border border-[var(--studio-clay)] bg-[var(--studio-paper)] text-[var(--studio-clay)]",
              onRetry &&
                "transition hover:bg-[var(--studio-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
            )}
          >
            <BuildingOffice2Icon
              className="h-5 w-5"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </ErrorElement>
        </div>
      );
    }

    return (
      <div className="shrink-0 p-4 pt-2" aria-live="polite">
        <div className="rounded-[18px] border border-[var(--studio-clay)] bg-[var(--studio-paper)] p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--studio-white)] text-[var(--studio-clay)]">
              <BuildingOffice2Icon
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-[var(--studio-muted)]">
                {t("studioSwitcher.loadError")}
              </span>
              <span className="mt-0.5 block text-[12px] leading-4 text-[var(--studio-muted)]">
                {t("studioSwitcher.loadErrorDescription")}
              </span>
            </span>
          </div>

          {onRetry && (
            <button
              type="button"
              onClick={() => onRetry()}
              className="mt-2.5 min-h-11 w-full touch-manipulation rounded-[var(--studio-action-radius)] bg-[var(--studio-white)] px-3 py-2 text-xs font-semibold text-[var(--studio-blue)] transition active:bg-[var(--color-primary-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)] md:hover:bg-[var(--color-primary-soft)]"
            >
              {t("studioSwitcher.retry")}
            </button>
          )}
        </div>
      </div>
    );
  }

  /* No active studio location exists yet. */
  if (!activeStudio) {
    const title = canManageStudios
      ? t("studioSwitcher.addNewStudio")
      : t("studioSwitcher.noStudios");

    const description = canManageStudios
      ? hasReachedStudioLimit
        ? t("studioSwitcher.studioLimitReached", {
            count: numericStudioLimit ?? 0,
          })
        : t("studioSwitcher.addFirstStudioDescription")
      : t("studioSwitcher.noStudiosAvailable");

    const EmptyStateElement = canManageStudios ? "button" : "div";

    if (isTopbar) {
      return (
        <EmptyStateElement
          {...(canManageStudios
            ? {
                type: "button",
                onClick: handleAddStudio,
              }
            : {})}
          aria-label={title}
          className={classNames(
            "group flex h-12 w-full min-w-0 items-center gap-3 rounded-[18px] border border-dashed border-line bg-surface-raised px-3 text-left",
            canManageStudios &&
              "transition hover:border-[var(--studio-blue-line)] hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--studio-paper)] text-[var(--studio-clay)]">
            {canManageStudios ? (
              <PlusIcon
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            ) : (
              <BuildingOffice2Icon
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-[var(--studio-ink)]">
              {title}
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-[var(--studio-muted)]">
              {description}
            </span>
          </span>
          {canManageStudios ? (
            <ArrowUpRightIcon
              className="h-5 w-5 shrink-0 text-[var(--studio-muted)] transition group-hover:text-[var(--studio-blue)]"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          ) : null}
        </EmptyStateElement>
      );
    }

    if (collapsed && !mobile) {
      return (
        <div className="shrink-0 p-2.5 pt-2">
          <EmptyStateElement
            {...(canManageStudios
              ? {
                  type: "button",
                  onClick: handleAddStudio,
                }
              : {})}
            aria-label={title}
            className={classNames(
              "flex h-11 w-full items-center justify-center rounded-[18px] border border-dashed border-line bg-surface-raised",
              canManageStudios &&
                "transition hover:border-[var(--studio-blue-line)] hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
            )}
          >
            {canManageStudios ? (
              <PlusIcon
                className="h-5 w-5 text-[var(--studio-clay)]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            ) : (
              <BuildingOffice2Icon
                className="h-5 w-5 text-[var(--studio-clay)]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
          </EmptyStateElement>
        </div>
      );
    }

    return (
      <div className="shrink-0 p-4 pt-2">
        <EmptyStateElement
          {...(canManageStudios
            ? {
                type: "button",
                onClick: handleAddStudio,
              }
            : {})}
          className={classNames(
            "group flex w-full items-center gap-3 rounded-[18px] border border-dashed border-line bg-surface-raised p-3 text-left",
            canManageStudios &&
              "transition hover:border-[var(--studio-blue-line)] hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)]",
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[var(--studio-paper)] text-[var(--studio-clay)]">
            {canManageStudios ? (
              <PlusIcon
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            ) : (
              <BuildingOffice2Icon
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-[var(--studio-muted)]">
              {title}
            </span>

            <span className="mt-0.5 block text-[12px] leading-4 text-[var(--studio-muted)]">
              {description}
            </span>
          </span>

          {canManageStudios && (
            <ArrowUpRightIcon
              className="h-5 w-5 shrink-0 text-[var(--studio-muted)] transition group-hover:text-[var(--studio-blue)]"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}
        </EmptyStateElement>

        {mobile && (
          <p className="mt-3 px-1 text-[12px] leading-5 text-[var(--studio-muted)]">
            {t("mobileStudioHint")}
          </p>
        )}
      </div>
    );
  }

  const activeStudioName = getStudioName(
    activeStudio,
    t("studioSwitcher.unnamedStudio"),
  );

  const activeStudioAddress = formatLocationAddress(activeStudio);

  const secondaryLabel =
    activeStudioAddress ||
    (planLabel
      ? t("plan", {
          plan: planLabel,
        })
      : "");

  return (
    <div
      data-product-tour-target="studio-switcher"
      className={classNames(
        isTopbar ? "w-full min-w-0" : "shrink-0 pt-2",
        !isTopbar && (collapsed && !mobile ? "p-2.5" : "p-4"),
      )}
    >
      <Menu as="div" className="relative">
        {({ open }) => (
          <>
            <MenuButton
              disabled={!canOpenMenu}
              aria-label={`${t("changeStudio")}: ${activeStudioName}`}
              className={classNames(
                styles.pickerControl,
                "group flex w-full min-w-0 items-center border bg-surface-raised text-left shadow-[0_3px_12px_rgb(32_40_36/0.06)] transition",
                isTopbar
                  ? "h-12 gap-3 rounded-[18px] px-3"
                  : collapsed && !mobile
                    ? "h-11 justify-center rounded-[18px] p-1.5"
                    : "gap-3 rounded-[18px] p-3",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel",
                canOpenMenu
                  ? "cursor-pointer hover:border-[var(--studio-blue-line)] hover:bg-surface-raised"
                  : "cursor-default",
                open
                  ? "border-[var(--studio-blue-line)] bg-surface-raised"
                  : "border-line",
              )}
            >
              <span
                className={classNames(
                  "flex shrink-0 items-center justify-center bg-[var(--studio-soft)] text-[12px] font-medium tracking-[-0.02em] text-[var(--studio-ink)]",
                  isTopbar
                    ? "h-9 w-9 rounded-[12px]"
                    : collapsed && !mobile
                      ? "h-8 w-8 rounded-[11px]"
                      : "h-10 w-10 rounded-[13px]",
                )}
              >
                {getStudioInitials(activeStudioName)}
              </span>

              {!collapsed || mobile || isTopbar ? (
                <>
                  <span className="min-w-0 flex-1">
                    <span
                      className={classNames(
                        "block truncate font-medium text-[var(--studio-ink)]",
                        isTopbar ? "text-[13px]" : "text-[12px]",
                      )}
                      title={activeStudioName}
                    >
                      {activeStudioName}
                    </span>

                    {secondaryLabel && (
                      <span
                        className="mt-0.5 block truncate text-[12px] text-[var(--studio-muted)]"
                        title={secondaryLabel}
                      >
                        {secondaryLabel}
                      </span>
                    )}
                  </span>

                  {canOpenMenu && (
                    <ChevronDownIcon
                      className={classNames(
                        "h-4 w-4 shrink-0 text-[var(--studio-muted)] transition duration-200 group-hover:text-[var(--studio-ink)] motion-reduce:transition-none",
                        open && "rotate-180 text-[var(--studio-ink)]",
                      )}
                      aria-hidden="true"
                    />
                  )}
                </>
              ) : null}
            </MenuButton>

            {canOpenMenu && (
              <MenuItems
                data-skab-workspace-surface
                transition
                portal
                anchor={isTopbar ? "bottom start" : "top start"}
                className={classNames(
                  styles.menuSurface,
                  "z-[90] max-h-[min(360px,calc(100dvh-24px))] overflow-y-auto overscroll-contain rounded-[20px]",
                  isTopbar
                    ? "w-[min(380px,calc(100vw-24px))] min-w-[var(--button-width)]"
                    : collapsed && !mobile
                      ? "w-[248px]"
                      : "w-[var(--button-width)]",
                  "border border-line bg-surface-raised p-1.5 shadow-[0_18px_45px_rgb(32_40_36/0.12)]",
                  "[--anchor-gap:8px]",
                  isTopbar ? "origin-top" : "origin-bottom",
                  "transition duration-150 ease-out focus:outline-none motion-reduce:transform-none motion-reduce:transition-none",
                  isTopbar
                    ? "data-closed:-translate-y-1 data-closed:scale-[0.98] data-closed:opacity-0"
                    : "data-closed:translate-y-1 data-closed:scale-[0.98] data-closed:opacity-0",
                )}
              >
                <div className="px-2.5 pb-2 pt-1.5">
                  <p className={styles.menuLabel}>
                    {t("studioSwitcher.yourStudios")}
                  </p>
                </div>

                {orderedStudios.map((studio) => {
                  const studioId = getLocationId(studio);

                  const studioName = getStudioName(
                    studio,
                    t("studioSwitcher.unnamedStudio"),
                  );

                  const studioAddress = formatLocationAddress(studio);

                  const isActive = studioId === resolvedActiveStudioId;

                  return (
                    <MenuItem key={studioId}>
                      <button
                        type="button"
                        onClick={() => handleStudioChange(studio)}
                        aria-current={isActive ? "true" : undefined}
                        className={classNames(
                          styles.pickerControl,
                          "group/item flex w-full items-center gap-3 rounded-[18px] px-2.5 py-2.5 text-left transition",
                          "focus:outline-none data-focus:ring-2 data-focus:ring-inset data-focus:ring-[var(--studio-blue)]",
                          isActive
                            ? "bg-[var(--color-primary-soft)] ring-1 ring-inset ring-[var(--studio-rule)]"
                            : "hover:bg-surface-muted data-focus:bg-surface-muted",
                        )}
                      >
                        <span
                          className={classNames(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[12px] font-semibold",
                            isActive
                              ? "bg-[var(--color-primary-soft)] text-[var(--studio-blue)]"
                              : "bg-[var(--studio-soft)] text-[var(--studio-ink)]",
                          )}
                        >
                          {getStudioInitials(studioName)}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span
                            className="block break-words text-[12px] font-medium leading-4 text-[var(--studio-ink)]"
                            title={studioName}
                          >
                            {studioName}
                          </span>

                          {studioAddress && (
                            <span
                              className="mt-0.5 block truncate text-[12px] text-[var(--studio-muted)]"
                              title={studioAddress}
                            >
                              {studioAddress}
                            </span>
                          )}
                        </span>

                        {isActive && (
                          <>
                            <CheckIcon
                              className="h-5 w-5 shrink-0 text-[var(--studio-blue)]"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />

                            <span className="sr-only">
                              {t("studioSwitcher.selected")}
                            </span>
                          </>
                        )}
                      </button>
                    </MenuItem>
                  );
                })}

                {canManageStudios && (
                  <div className="mt-1 border-t border-line px-1 pt-1.5">
                    <MenuItem>
                      <button
                        type="button"
                        onClick={handleAddStudio}
                        className={classNames(
                          styles.pickerControl,
                          "group/add flex w-full items-center gap-3 rounded-[18px] px-2 py-2.5 text-left transition",
                          "focus:outline-none hover:bg-surface-muted data-focus:bg-surface-muted data-focus:ring-2 data-focus:ring-inset data-focus:ring-[var(--studio-blue)]",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--studio-paper)] text-[var(--studio-clay)]">
                          <PlusIcon
                            className="h-5 w-5"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-[var(--studio-ink)]">
                            {t("studioSwitcher.addNewStudio")}
                          </span>

                          <span className="mt-0.5 block text-[12px] leading-4 text-[var(--studio-muted)]">
                            {hasReachedStudioLimit
                              ? t("studioSwitcher.studioLimitReached", {
                                  count: numericStudioLimit ?? 0,
                                })
                              : t("studioSwitcher.addNewStudioDescription")}
                          </span>
                        </span>

                        <ArrowUpRightIcon
                          className="h-5 w-5 shrink-0 text-[var(--studio-muted)] transition group-hover/add:text-[var(--studio-blue)]"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </button>
                    </MenuItem>
                  </div>
                )}
              </MenuItems>
            )}
          </>
        )}
      </Menu>

      {mobile && (
        <p className="mt-3 px-1 text-[12px] leading-5 text-[var(--studio-muted)]">
          {t("mobileStudioHint")}
        </p>
      )}
    </div>
  );
}
