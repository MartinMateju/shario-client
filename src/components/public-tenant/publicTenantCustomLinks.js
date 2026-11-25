import {
  ROLLOUT_ELIGIBLE_LOCALE_CODES,
  normalizeLocaleCode,
} from "@/i18n/locales";
import { normalizePublicTenantUrl } from "./publicTenantUrl";

export const PUBLIC_SITE_CUSTOM_LINK_LIMITS = Object.freeze({
  header: 8,
  footer: 12,
});
const validId = (id) =>
  typeof id === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(id);
const safeText = (value) =>
  typeof value === "string" && !/[<>\u0000-\u001f\u007f]/.test(value);
const safeHref = (value) =>
  typeof value === "string" &&
  value.length <= 2048 &&
  !/[\\\u0000-\u001f\u007f]/.test(value) &&
  Boolean(normalizePublicTenantUrl(value));
const localized = (value, clean) =>
  Object.fromEntries(
    ROLLOUT_ELIGIBLE_LOCALE_CODES.map((locale) => [
      locale,
      typeof value?.[locale] === "string" ? clean(value[locale]) : "",
    ]).filter(([, value]) => value),
  );

export const normalizePublicSiteCustomLinks = (value, limit = 8) => {
  const ids = new Set();
  return (Array.isArray(value) ? value : []).slice(0, limit).flatMap((item) => {
    if (!item || !validId(item.id) || ids.has(item.id)) return [];
    ids.add(item.id);
    return [
      {
        id: item.id,
        label: localized(item.label, (text) =>
          safeText(text) && text.trim().length <= 80 ? text.trim() : "",
        ),
        href: localized(item.href, (href) =>
          safeHref(href) ? normalizePublicTenantUrl(href) : "",
        ),
      },
    ];
  });
};

// Resolve a whole translation together: never pair a translated label with a
// destination for another language when the translated destination is missing.
export const resolvePublicSiteCustomLinks = (links, locale, limit = 8) =>
  normalizePublicSiteCustomLinks(links, limit).flatMap((item) => {
    const locales = [
      ...new Set([
        normalizeLocaleCode(locale),
        "cs",
        "en",
        ...ROLLOUT_ELIGIBLE_LOCALE_CODES,
      ]),
    ];
    const selected = locales.find(
      (code) => item.label[code] && item.href[code],
    );
    return selected
      ? [
          {
            key: `custom-${item.id}`,
            custom: true,
            label: item.label[selected],
            href: item.href[selected],
          },
        ]
      : [];
  });

export const isValidPublicSiteCustomLinks = (value, limit) => {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length > limit) return false;
  const ids = new Set();
  return value.every((item) => {
    if (!item || !validId(item.id) || ids.has(item.id)) return false;
    if (
      item.children !== undefined ||
      item.emphasis !== undefined ||
      item.separatorBefore !== undefined
    )
      return false;
    ids.add(item.id);
    let complete = false;
    for (const locale of ROLLOUT_ELIGIBLE_LOCALE_CODES) {
      const label = item.label?.[locale] ?? "";
      const href = item.href?.[locale] ?? "";
      if (typeof label !== "string" || typeof href !== "string") return false;
      if (!label.trim() && !href.trim()) continue;
      if (
        !safeText(label) ||
        !label.trim() ||
        label.trim().length > 80 ||
        !safeHref(href)
      )
        return false;
      complete = true;
    }
    return complete;
  });
};

export const publicNavigationNeedsMenu = (items = []) =>
  items.some((item) => item.custom) &&
  (items.length > 8 ||
    items.reduce((length, item) => length + (item.label || "").length, 0) > 90);

const localeOrder = (locale) => [
  ...new Set([
    normalizeLocaleCode(locale),
    "cs",
    "en",
    ...ROLLOUT_ELIGIBLE_LOCALE_CODES,
  ]),
];

export const normalizePublicSiteHeaderLinks = (value) => {
  let buttonUsed = false;
  const normalize = (items, child = false) => {
    const ids = new Set();
    return (Array.isArray(items) ? items : []).slice(0, 8).flatMap((item) => {
      if (!item || !validId(item.id) || ids.has(item.id)) return [];
      ids.add(item.id);
      if (Array.isArray(item.children)) {
        if (child) return [];
        return [
          {
            id: item.id,
            label: localized(item.label, (text) =>
              safeText(text) && text.trim().length <= 80 ? text.trim() : "",
            ),
            children: normalize(item.children, true),
          },
        ];
      }
      const leaf = normalizePublicSiteCustomLinks([item], 1)[0];
      if (!leaf) return [];
      if (child && item.separatorBefore === true) leaf.separatorBefore = true;
      if (!child && item.emphasis === "button" && !buttonUsed) {
        leaf.emphasis = "button";
        buttonUsed = true;
      }
      return [leaf];
    });
  };
  return normalize(value);
};

export const resolvePublicSiteHeaderLinks = (value, locale) =>
  normalizePublicSiteHeaderLinks(value).flatMap((item) => {
    if (item.children) {
      const selected = localeOrder(locale).find((code) => item.label[code]);
      const children = item.children.flatMap((child) =>
        resolvePublicSiteCustomLinks([child], locale, 1).map((link) => ({
          ...link,
          key: `custom-group:${item.id}:${child.id}`,
          ...(child.separatorBefore ? { separatorBefore: true } : {}),
        })),
      );
      return selected && children.length
        ? [
            {
              key: `custom-${item.id}`,
              custom: true,
              label: item.label[selected],
              children,
            },
          ]
        : [];
    }
    return resolvePublicSiteCustomLinks([item], locale, 1).map((link) => ({
      ...link,
      ...(item.emphasis ? { emphasis: item.emphasis } : {}),
    }));
  });

export const isValidPublicSiteHeaderLinks = (value) => {
  if (value === undefined) return true;
  let buttons = 0;
  const validate = (items, child = false) => {
    const ids = new Set();
    return (
      Array.isArray(items) &&
      items.length <= 8 &&
      items.every((item) => {
        if (!item || !validId(item.id) || ids.has(item.id)) return false;
        ids.add(item.id);
        if (item.children !== undefined) {
          if (
            child ||
            item.href !== undefined ||
            item.emphasis !== undefined ||
            item.separatorBefore !== undefined ||
            !Array.isArray(item.children) ||
            !item.children.length
          )
            return false;
          let hasLabel = false;
          for (const locale of ROLLOUT_ELIGIBLE_LOCALE_CODES) {
            const label = item.label?.[locale] ?? "";
            if (!safeText(label) || label.trim().length > 80) return false;
            if (label.trim()) hasLabel = true;
          }
          return hasLabel && validate(item.children, true);
        }
        if (
          !isValidPublicSiteCustomLinks(
            [{ id: item.id, label: item.label, href: item.href }],
            1,
          )
        )
          return false;
        if (
          item.emphasis !== undefined &&
          (child || item.emphasis !== "button" || ++buttons > 1)
        )
          return false;
        if (
          item.separatorBefore !== undefined &&
          (!child || typeof item.separatorBefore !== "boolean")
        )
          return false;
        return true;
      })
    );
  };
  return validate(value);
};

export const flattenPublicSiteNavigation = (items = []) =>
  items
    .flatMap((item) => (item.children ? item.children : [item]))
    .filter((item) => item.href);
