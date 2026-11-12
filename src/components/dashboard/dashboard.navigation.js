import { hasAnyPermission, hasPermission } from "@/config/permissions";

import {
  dashboardNavigation,
  dashboardNavigationGroups,
  dashboardUtilityNavigation,
} from "./dashboard.data";

const normalizePath = (value = "") => {
  const path = String(value || "").split("?")[0] || "/";

  return path.length > 1 ? path.replace(/\/+$/, "") : path;
};

const getSearchParams = (value) => {
  if (value instanceof URLSearchParams) {
    return value;
  }

  if (typeof value?.get === "function") {
    return value;
  }

  return new URLSearchParams(String(value || "").replace(/^\?/, ""));
};

const parseHref = (href = "") => {
  const [path = "", query = ""] = String(href).split("?");

  return {
    path: normalizePath(path),
    searchParams: new URLSearchParams(query),
  };
};

const PROTECTED_NAVIGATION_ITEM_KEYS = new Set(["overview", "settings"]);

const toStringSet = (value) =>
  new Set(
    Array.isArray(value)
      ? value.filter(Boolean).map((item) => String(item))
      : [],
  );

export const getDashboardNavigationPreferences = (tenant) => {
  const navigation = tenant?.settings?.navigation ?? tenant?.navigation ?? {};

  return {
    hiddenGroups: toStringSet(navigation.hiddenGroups),
    hiddenItems: toStringSet(navigation.hiddenItems),
  };
};

export const isDashboardModuleEnabled = (item, tenant) => {
  const modules = Array.isArray(item?.modules)
    ? item.modules
    : item?.module
      ? [item.module]
      : [];

  if (!modules.length) {
    return true;
  }

  return modules.every((module) =>
    item.requiresExplicitModule
      ? tenant?.modules?.[module] === true
      : tenant?.modules?.[module] !== false,
  );
};

const hasEnabledModulePermissionPair = (item, tenant, workspaceAccess) => {
  const pairs = Array.isArray(item?.modulePermissionPairs)
    ? item.modulePermissionPairs
    : [];

  if (!pairs.length) return true;

  return pairs.some(
    (pair) =>
      isDashboardModuleEnabled(pair, tenant) &&
      hasAnyPermission(workspaceAccess, pair.permissions),
  );
};

export const isDashboardNavigationItemVisible = ({
  item,
  tenant,
  workspaceAccess,
}) =>
  Boolean(
    item &&
    !item.sidebarHidden &&
    isDashboardModuleEnabled(item, tenant) &&
    hasEnabledModulePermissionPair(item, tenant, workspaceAccess) &&
    hasAnyPermission(workspaceAccess, item.permissions),
  );

export const resolveDashboardItemHref = (item, workspaceAccess) => {
  if (!item) {
    return "";
  }

  if (!Array.isArray(item.permissionHrefs)) {
    return item.href || "";
  }

  return (
    item.permissionHrefs.find(([permission]) =>
      hasPermission(workspaceAccess, permission),
    )?.[1] || ""
  );
};

export const buildDashboardNavigation = ({
  tenant,
  workspaceAccess,
  items = dashboardNavigation,
  groups = dashboardNavigationGroups,
  utilityKeys = dashboardUtilityNavigation,
}) => {
  const navigationPreferences = getDashboardNavigationPreferences(tenant);
  const visibleItems = new Map(
    items
      .filter(
        (item) =>
          (PROTECTED_NAVIGATION_ITEM_KEYS.has(item.key) ||
            !navigationPreferences.hiddenItems.has(item.key)) &&
          isDashboardNavigationItemVisible({
            item,
            tenant,
            workspaceAccess,
          }),
      )
      .map((item) => [
        item.key,
        {
          ...item,
          resolvedHref: resolveDashboardItemHref(item, workspaceAccess),
        },
      ])
      .filter(([, item]) => Boolean(item.resolvedHref)),
  );

  const primary = groups
    .filter(
      (entry) =>
        entry.type !== "group" ||
        !navigationPreferences.hiddenGroups.has(entry.key),
    )
    .map((entry) => {
      if (entry.type === "item") {
        const item = visibleItems.get(entry.itemKey);

        return item
          ? {
              ...entry,
              item,
              resolvedHref: item.resolvedHref,
            }
          : null;
      }

      const children = entry.itemKeys
        .map((key) => visibleItems.get(key))
        .filter(Boolean);

      return children.length
        ? {
            ...entry,
            children,
            resolvedHref: children[0].resolvedHref,
          }
        : null;
    })
    .filter(Boolean);

  const utility = utilityKeys
    .map((key) => visibleItems.get(key))
    .filter(Boolean);

  return { primary, utility, visibleItems };
};

const matchesExcludedSearchParam = (item, searchParams) =>
  item?.excludedSearchParams?.some(
    ([key, value]) => searchParams.get(key) === value,
  ) === true;

const getHrefMatchScore = ({
  currentPath,
  currentSearchParams,
  href,
  exact = false,
}) => {
  const target = parseHref(href);
  const pathMatches = exact
    ? currentPath === target.path
    : currentPath === target.path || currentPath.startsWith(`${target.path}/`);

  if (!pathMatches) {
    return -1;
  }

  const queryEntries = Array.from(target.searchParams.entries());
  const queryMatches = queryEntries.every(
    ([key, value]) => currentSearchParams.get(key) === value,
  );

  if (!queryMatches) {
    return -1;
  }

  return (
    target.path.length * 10 +
    queryEntries.length * 1000 +
    (currentPath === target.path ? 100 : 0)
  );
};

export const getDashboardNavigationMatchScore = ({
  pathname,
  searchParams,
  item,
}) => {
  if (!item) {
    return -1;
  }

  const currentPath = normalizePath(pathname);
  const currentSearchParams = getSearchParams(searchParams);

  if (matchesExcludedSearchParam(item, currentSearchParams)) {
    return -1;
  }

  const hrefs =
    Array.isArray(item.activeHrefs) && item.activeHrefs.length
      ? item.activeHrefs
      : [item.resolvedHref || item.href];

  return Math.max(
    ...hrefs.map((href) =>
      getHrefMatchScore({
        currentPath,
        currentSearchParams,
        href,
        exact: item.exact === true,
      }),
    ),
  );
};

export const getActiveDashboardNavigation = ({
  pathname,
  searchParams,
  primary,
  utility,
}) => {
  const candidates = [
    ...primary.flatMap((entry) =>
      entry.type === "group" ? entry.children : [entry.item],
    ),
    ...utility,
  ];

  const activeItem = candidates.reduce(
    (best, item) => {
      const score = getDashboardNavigationMatchScore({
        pathname,
        searchParams,
        item,
      });

      return score > best.score ? { item, score } : best;
    },
    { item: null, score: -1 },
  ).item;

  const activeGroup =
    activeItem &&
    primary.find(
      (entry) =>
        entry.type === "group" &&
        entry.children.some((item) => item.key === activeItem.key),
    );

  return {
    activeItemKey: activeItem?.key || null,
    activeGroupKey: activeGroup?.key || null,
  };
};
