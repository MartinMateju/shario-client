"use client";

import { useSelector } from "react-redux";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { Link } from "@/i18n/navigation";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";

export default function OpenStudioPlanNotice({ t }) {
  const access = useSelector(selectCurrentWorkspaceAccess);
  return (
    <section className="rounded-[18px] border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <h2 className="text-sm font-semibold">{t("openStudioPlan.title")}</h2>
      <p className="mt-2 text-xs leading-6">
        {t("openStudioPlan.description")}
      </p>
      {hasPermission(access, PERMISSIONS.SUBSCRIPTION_VIEW) ? (
        <Link
          href="/app/settings/billing"
          className="mt-3 inline-flex min-h-10 items-center rounded-full border border-amber-300 bg-white px-4 text-xs font-semibold"
        >
          {t("openStudioPlan.action")}
        </Link>
      ) : null}
    </section>
  );
}
