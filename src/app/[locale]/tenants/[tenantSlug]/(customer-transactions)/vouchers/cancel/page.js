import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function VoucherPurchaseCancelPage() {
  const t = await getTranslations("VoucherPurchase");
  return (
    <main className="min-h-[70vh] px-5 py-16 text-[color:var(--tenant-text)]">
      <section className="mx-auto max-w-xl rounded-[26px] border border-[color:var(--tenant-border)] bg-[color:var(--tenant-surface)] p-7 text-[color:var(--tenant-text-on-surface)] sm:p-10">
        <h1 className="font-serif text-3xl tracking-[-0.03em]">
          {t("cancel.title")}
        </h1>
        <p className="mt-4 text-base leading-7 text-[color:var(--tenant-muted-on-surface)]">
          {t("cancel.description")}
        </p>
        <Link
          href="/vouchers"
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--tenant-accent)] px-6 text-sm font-semibold text-[color:var(--tenant-accent-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-accent-on-surface)] focus-visible:ring-offset-2"
          data-tenant-button="primary"
        >
          {t("cancel.return")}
        </Link>
      </section>
    </main>
  );
}
