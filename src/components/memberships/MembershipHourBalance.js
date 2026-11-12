"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  formatDate,
  formatMembershipMinutes,
  isPersonalHourBenefit,
} from "./membership.utils";

export default function MembershipHourBalance({ benefit, balance }) {
  const t = useTranslations("Memberships.benefits");
  const locale = useLocale();
  if (
    !isPersonalHourBenefit(benefit) ||
    !balance ||
    !Number.isFinite(balance.currentPeriodAvailable) ||
    !Number.isFinite(balance.carryoverAvailable)
  )
    return null;
  return (
    <dl className="mt-3 space-y-2 text-[10px] leading-5">
      <div className="flex justify-between gap-3">
        <dt>{t("currentPeriod")}</dt>
        <dd className="font-semibold">
          {formatMembershipMinutes(balance.currentPeriodAvailable, locale)}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>{t("carryover")}</dt>
        <dd className="font-semibold">
          {formatMembershipMinutes(balance.carryoverAvailable, locale)}
        </dd>
      </div>
      {balance.carryoverAvailable > 0 && balance.carryoverExpiresAt ? (
        <div>
          <dt>{t("carryoverExpires")}</dt>
          <dd>
            {formatDate(balance.carryoverExpiresAt, locale, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
