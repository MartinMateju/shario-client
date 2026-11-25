"use client";

import { useSelector } from "react-redux";
import { PERMISSIONS, hasPermission } from "@/config/permissions";
import { Link } from "@/i18n/navigation";
import { selectCurrentWorkspaceAccess } from "@/lib/features/auth/authSlice";

export default function OpenStudioPlanNotice({ t }) {
  const access = useSelector(selectCurrentWorkspaceAccess);
  return (
    <section className="rounded-[18px] border border-line bg-white p-5 text-ink">
      <h2 className="text-sm font-semibold">{t("openStudioPlan.title")}</h2>
      <p className="mt-2 text-[13px] leading-6 text-ink-muted">
        {t("openStudioPlan.description")}
      </p>
      {hasPermission(access, PERMISSIONS.SUBSCRIPTION_VIEW) ? (
        <Link
          href="/app/settings/billing"
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-primary/35 bg-white px-4 text-[13px] font-semibold text-primary transition hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {t("openStudioPlan.action")}
        </Link>
      ) : null}
    </section>
  );
}
