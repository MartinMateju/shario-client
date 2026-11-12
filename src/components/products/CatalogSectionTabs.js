import {
  AcademicCapIcon,
  BuildingOffice2Icon,
  GiftIcon,
  IdentificationIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

import WorkspaceTabs from "@/components/dashboard/WorkspaceTabs";

import { PRODUCT_CATEGORIES } from "./products.utils";

const SECTION_PRESENTATION = Object.freeze({
  openStudio: {
    icon: BuildingOffice2Icon,
    accent: "bg-cobalt-50 text-cobalt-600",
  },
  classes: {
    icon: AcademicCapIcon,
    accent: "bg-[#FBF0DF] text-[#A56500]",
  },
  memberships: {
    icon: IdentificationIcon,
    accent: "bg-[#EDF3E6] text-[#527043]",
  },
  vouchers: {
    icon: GiftIcon,
    accent: "bg-coral-50 text-terracotta-600",
  },
  privateStudio: {
    icon: LockClosedIcon,
    accent: "bg-[#F0EEEA] text-[#57534E]",
  },
});

export const CATALOG_TABS_ID = "product-catalog-sections";

export default function CatalogSectionTabs({
  value,
  counts,
  availableSections = PRODUCT_CATEGORIES,
  onChange,
  t,
}) {
  const tabs = PRODUCT_CATEGORIES.filter((section) =>
    availableSections.includes(section),
  ).map((section) => ({
    id: section,
    label: t(`sections.${section}.label`),
    description: t(`sections.${section}.description`),
    badge: counts?.[section] || 0,
    icon: SECTION_PRESENTATION[section].icon,
    iconClass: SECTION_PRESENTATION[section].accent,
  }));

  return (
    <WorkspaceTabs
      id={CATALOG_TABS_ID}
      variant="cards"
      tabs={tabs}
      value={value}
      onChange={onChange}
      ariaLabel={t("sections.label")}
    />
  );
}
