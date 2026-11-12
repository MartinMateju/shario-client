export default function InternalAdminPage() {
  return (
    <main className="relative z-[60] -mt-[var(--header-height)] flex min-h-dvh items-center justify-center bg-[#11110F] px-6 text-white">
      <section className="w-full max-w-xl rounded-[24px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-skab-coral-300">
          shario.io internal
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
          Platform administration
        </h1>
        <p className="mt-4 leading-7 text-white/65">
          This hostname is reserved for the shario.io operations team. Platform
          administration modules can be added here without mixing them with a
          tenant&apos;s workspace.
        </p>
      </section>
    </main>
  );
}
