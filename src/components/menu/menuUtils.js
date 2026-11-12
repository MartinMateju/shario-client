import translation from "@/translations/translation";
import { buildCustomerPortalPath } from "@/utils/customerPortalLocation";
import { DEFAULT_TAB, TAB_LABELS } from "./menuConfig";

export const classNames = (...classes) => classes.filter(Boolean).join(" ");

export const formatTabToUrl = (tabName, location) =>
  buildCustomerPortalPath({ location, tab: tabName });

export const formatUrlToTab = (tabName) =>
  tabName ? tabName.toUpperCase().replace(/-/g, "_") : DEFAULT_TAB;

export const getTabLabel = (tabName, language) =>
  TAB_LABELS[tabName]?.[language] ||
  TAB_LABELS[tabName]?.EN ||
  translation[tabName]?.[language] ||
  tabName;
