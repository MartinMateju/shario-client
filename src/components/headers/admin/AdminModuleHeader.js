"use client";

export default function AdminModuleHeader({
  eyebrow = "Admin module",
  title = "Module",
  description = "",
  stats = [],
}) {
  return (
    <section className="relative overflow-hidden border-b border-[#e2d8ce] bg-[#f7f3ee]">
      <div className="pointer-events-none absolute left-1/2 top-[-180px] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[#e8ddd2] blur-3xl" />

      <div className="relative mx-auto max-w-[1540px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div>
          {/* <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#9f8d7c]">
            {eyebrow}
          </p> */}

          <h1 className="mt-4 max-w-3xl text-[38px] leading-tight tracking-[-0.04em] text-[#33261d] sm:text-[52px]">
            {title}
          </h1>

          {description && (
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#7f6d5d]">
              {description}
            </p>
          )}
        </div>

        {stats.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[1.7rem] border border-[#e3d8ce] bg-white/55 p-5 shadow-[0_18px_50px_rgba(72,56,39,0.07)] backdrop-blur-sm"
              >
                <p className="text-[11px] uppercase tracking-[0.17em] text-[#9f8d7c]">
                  {stat.label}
                </p>

                <p className="mt-4 text-[32px] tracking-[-0.04em] text-[#33261d]">
                  {stat.value}
                </p>

                {stat.detail && (
                  <p className="mt-2 text-sm text-[#8f7b69]">{stat.detail}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
