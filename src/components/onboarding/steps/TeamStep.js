"use client";

import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";

import { InlineNotice } from "@/components/ui/form/InlineNotice";
import styles from "../onboarding.module.css";

const teamActions = [
  {
    key: "invite",
    icon: UserPlusIcon,
  },
  {
    key: "permissions",
    icon: Cog6ToothIcon,
  },
];

export function TeamStep({ studioName }) {
  const t = useTranslations("Onboarding");

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {teamActions.map(({ key, icon: Icon }) => (
          <div key={key} className={`${styles.teamCard} p-4`}>
            <span
              className={`${styles.benefitIcon} grid size-9 place-items-center`}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <strong className="mt-4 block text-sm font-medium">
              {t(`team.actions.${key}.title`)}
            </strong>
            <p className={`${styles.muted} mt-1 text-xs leading-5`}>
              {t(`team.actions.${key}.description`)}
            </p>
          </div>
        ))}
      </div>

      <InlineNotice className={styles.notice}>
        <div className="flex gap-3">
          <ShieldCheckIcon
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-[var(--studio-blue)]"
          />
          <div>
            <strong className="block text-sm font-medium">
              {t("team.ownerTitle", {
                studio: studioName || t("team.workspaceFallback"),
              })}
            </strong>
            <p className={`${styles.muted} mt-1 text-xs leading-5`}>
              {t("team.ownerDescription")}
            </p>
          </div>
        </div>
      </InlineNotice>
    </div>
  );
}
