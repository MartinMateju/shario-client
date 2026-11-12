export default function PublicTenantUnavailable({ locale = "en" }) {
  return (
    <main className="flex min-h-[calc(100dvh-var(--header-height))] items-center justify-center bg-brand-offset px-6 py-20 text-center text-[#1F1F1F]">
      <section className="max-w-lg rounded-[28px] border border-[#E7E4DE] bg-white px-7 py-10 shadow-[0_18px_60px_rgba(17,17,15,0.06)] sm:px-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-text">
          shario.io
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em]">
          {locale === "cs"
            ? "Studio je dočasně nedostupné"
            : "This studio is temporarily unavailable"}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#686762]">
          {locale === "cs"
            ? "Konfiguraci studia se nyní nepodařilo bezpečně načíst. Zkuste to prosím znovu za chvíli."
            : "The studio configuration could not be loaded safely. Please try again in a moment."}
        </p>
      </section>
    </main>
  );
}
