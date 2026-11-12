import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { retainCustomerPortalLocation } from "@/utils/customerPortalLocation";

export default async function MembershipCheckoutCancelPage({ searchParams }) {
  const t = await getTranslations("Memberships.checkout.cancelled");
  const params = (await searchParams) || {};
  const plansHref = retainCustomerPortalLocation(
    "/portal/membership/plans?checkout=cancelled",
    params.location || params.locationId,
  );
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-brand-offset px-4 py-14">
      <section className="w-full max-w-lg rounded-[25px] border border-line bg-white p-8 text-center shadow-sm">
        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-terracotta-600">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
          {t("title")}
        </h1>
        <p className="mt-3 text-[10px] leading-5 text-[#777773]">
          {t("description")}
        </p>
        <Link
          href={plansHref}
          data-tenant-button="primary"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#171717] px-6 text-[10px] font-semibold text-white"
        >
          {t("back")}
        </Link>
      </section>
    </main>
  );
}
