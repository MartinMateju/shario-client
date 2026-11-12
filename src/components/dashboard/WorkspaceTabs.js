"use client";

import { useEffect, useId, useRef } from "react";

import { revealElementHorizontally } from "@/components/ui/horizontalScroll";

const cx = (...classes) => classes.filter(Boolean).join(" ");

const normalizeIdPart = (value, fallback) => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
};

export const getWorkspaceTabId = (tabsId, tabId) =>
  `${normalizeIdPart(tabsId, "workspace-tabs")}-tab-${normalizeIdPart(
    tabId,
    "item",
  )}`;

export const getWorkspaceTabPanelId = (tabsId, tabId) =>
  `${normalizeIdPart(tabsId, "workspace-tabs")}-panel-${normalizeIdPart(
    tabId,
    "item",
  )}`;

const getEnabledIndex = (tabs, startIndex, direction) => {
  if (!tabs.length) return -1;

  for (let offset = 1; offset <= tabs.length; offset += 1) {
    const index = (startIndex + direction * offset + tabs.length) % tabs.length;

    if (!tabs[index]?.disabled) return index;
  }

  return -1;
};

const getEdgeEnabledIndex = (tabs, fromEnd = false) => {
  const indexes = Array.from({ length: tabs.length }, (_, index) => index);
  const orderedIndexes = fromEnd ? indexes.reverse() : indexes;

  return orderedIndexes.find((index) => !tabs[index]?.disabled) ?? -1;
};

export function WorkspaceTabPanel({
  tabsId,
  tabId,
  active = true,
  className,
  children,
  unmount = false,
  ...props
}) {
  if (unmount && !active) return null;

  return (
    <div
      {...props}
      id={getWorkspaceTabPanelId(tabsId, tabId)}
      role="tabpanel"
      aria-labelledby={getWorkspaceTabId(tabsId, tabId)}
      hidden={!active}
      tabIndex={0}
      className={cx(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function WorkspaceTabs({
  id,
  tabs = [],
  value,
  onChange,
  ariaLabel,
  ariaLabelledBy,
  activationMode = "manual",
  stretch = false,
  variant = "line",
  className,
}) {
  const generatedId = useId();
  const tabsId = normalizeIdPart(
    id || `workspace-tabs-${generatedId}`,
    "workspace-tabs",
  );
  const tabRefs = useRef([]);
  const scrollContainerRef = useRef(null);
  const selectedIndex = tabs.findIndex(
    (tab) => tab.id === value && !tab.disabled,
  );
  const fallbackIndex = getEdgeEnabledIndex(tabs);
  const focusableIndex = selectedIndex >= 0 ? selectedIndex : fallbackIndex;
  const cards = variant === "cards";

  useEffect(() => {
    if (cards || selectedIndex < 0) return;

    revealElementHorizontally(
      scrollContainerRef.current,
      tabRefs.current[selectedIndex],
      16,
    );
  }, [cards, selectedIndex]);

  const focusTab = (index) => {
    if (index < 0) return;

    tabRefs.current[index]?.focus();

    if (activationMode === "automatic") {
      onChange?.(tabs[index].id);
    }
  };

  const handleKeyDown = (event, index) => {
    const isRtl =
      typeof document !== "undefined" &&
      document.documentElement.getAttribute("dir") === "rtl";
    let nextIndex = -1;

    if (event.key === "ArrowRight") {
      nextIndex = getEnabledIndex(tabs, index, isRtl ? -1 : 1);
    } else if (event.key === "ArrowLeft") {
      nextIndex = getEnabledIndex(tabs, index, isRtl ? 1 : -1);
    } else if (event.key === "Home") {
      nextIndex = getEdgeEnabledIndex(tabs);
    } else if (event.key === "End") {
      nextIndex = getEdgeEnabledIndex(tabs, true);
    } else {
      return;
    }

    event.preventDefault();
    focusTab(nextIndex);
  };

  return (
    <div
      ref={scrollContainerRef}
      className={cx(
        cards
          ? "rounded-[22px] border border-line bg-white p-2 shadow-[0_14px_44px_rgba(17,17,15,0.04)] sm:p-3"
          : "scroll-px-4 overflow-x-auto border-b border-line",
        stretch && !cards && "w-full",
        className,
      )}
    >
      <div
        className={cx(
          cards
            ? "grid grid-cols-2 gap-2 lg:grid-cols-4"
            : "flex min-w-max gap-1",
          stretch && !cards && "w-full sm:min-w-0",
        )}
        role="tablist"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-orientation="horizontal"
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = tab.id === value && !tab.disabled;
          const hasBadge = tab.badge !== undefined && tab.badge !== null;

          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={getWorkspaceTabId(tabsId, tab.id)}
              type="button"
              role="tab"
              aria-controls={getWorkspaceTabPanelId(tabsId, tab.id)}
              aria-selected={isActive}
              aria-label={tab.ariaLabel}
              tabIndex={index === focusableIndex ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => onChange?.(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cx(
                cards
                  ? "group min-w-0 rounded-[17px] border px-3 py-3.5 text-left transition duration-200 motion-reduce:transition-none sm:px-4 sm:py-4"
                  : "relative inline-flex min-h-12 shrink-0 items-center gap-2 px-4 text-[12px] font-medium transition-colors duration-200 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt-300",
                "disabled:cursor-not-allowed disabled:opacity-45",
                stretch && !cards && "flex-1 justify-center",
                cards
                  ? isActive
                    ? "border-cobalt-200 bg-gradient-to-br from-cobalt-50 via-white to-white shadow-[0_10px_24px_rgba(38,56,206,0.09)]"
                    : "border-transparent bg-[#FAF9F6] hover:border-line-strong hover:bg-white"
                  : isActive
                    ? "text-[#171717]"
                    : "text-[#777773] hover:text-[#171717]",
              )}
            >
              {cards ? (
                <>
                  <span className="flex items-start justify-between gap-2.5">
                    {Icon ? (
                      <span
                        className={cx(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] sm:h-10 sm:w-10",
                          tab.iconClass || "bg-cobalt-50 text-cobalt-600",
                        )}
                      >
                        <Icon
                          className="h-[18px] w-[18px]"
                          strokeWidth={1.7}
                          aria-hidden="true"
                        />
                      </span>
                    ) : null}
                    {hasBadge ? (
                      <span
                        className={cx(
                          "inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums",
                          isActive
                            ? "bg-cobalt-100 text-cobalt-700"
                            : "bg-white text-ink-muted ring-1 ring-line",
                        )}
                      >
                        {tab.badge}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-3 block truncate text-[12px] font-semibold text-[#252524] sm:text-[13px]">
                    {tab.label}
                  </span>
                  {tab.description ? (
                    <span className="mt-1 hidden text-[10px] leading-4 text-ink-muted sm:line-clamp-2 sm:block">
                      {tab.description}
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  {Icon ? (
                    <Icon
                      className={cx(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-cobalt-600" : "text-[#858580]",
                      )}
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {hasBadge ? (
                    <span
                      className={cx(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        isActive
                          ? "bg-cobalt-50 text-cobalt-700"
                          : "bg-[#EEECE7] text-[#686762]",
                      )}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                  {isActive ? (
                    <span
                      className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-cobalt-500"
                      aria-hidden="true"
                    />
                  ) : null}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
