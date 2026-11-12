"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { classNames } from "./menuUtils";

export default function SectionView({
  eyebrow = "Business",
  title,
  description,
  modules = [],
}) {
  const [activeModuleId, setActiveModuleId] = useState(modules[0]?.id);

  const activeModule = useMemo(() => {
    return modules.find((module) => module.id === activeModuleId) || modules[0];
  }, [modules, activeModuleId]);

  useEffect(() => {
    if (!modules.length) return;

    const exists = modules.some((module) => module.id === activeModuleId);

    if (!exists) {
      setActiveModuleId(modules[0]?.id);
    }
  }, [modules, activeModuleId]);

  if (!modules.length) return null;

  return (
    <main className="bg-[#f7f3ee] text-[#33261d]">
      <section className="overflow-hidden border-t border-[#e2d8ce] bg-[#f7f3ee]">
        <div className="relative overflow-hidden border-b border-[#e2d8ce] px-4 py-8 sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-96 bg-gradient-to-bl from-white/80 via-[#f1ebe4]/70 to-transparent" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-[11px] uppercase tracking-[0.22em] text-[#9f8d7c]">
                {eyebrow}
              </p>

              <h1 className="mt-3  text-[36px] leading-[0.98] tracking-[-0.045em] text-[#33261d] sm:text-[48px]">
                {title}
              </h1>

              {description && (
                <p className="mt-4 max-w-4xl text-[15px] leading-7 text-[#7f6d5d]">
                  {description}
                </p>
              )}
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-[#d8cec3] bg-white/55 p-1 shadow-[0_14px_34px_rgba(72,56,39,0.055)] lg:flex">
              {modules.slice(0, 3).map((module) => {
                const Icon = module.icon;
                const isActive = activeModule?.id === module.id;

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setActiveModuleId(module.id)}
                    className={classNames(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px]",
                      "font-medium uppercase tracking-[0.14em] transition-all duration-200",
                      isActive
                        ? "bg-[#483827] text-white shadow-[0_10px_24px_rgba(72,56,39,0.16)]"
                        : "text-[#8f7b69] hover:bg-white hover:text-[#483827]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{module.label}</span>
                  </button>
                );
              })}

              {modules.length > 3 && (
                <span className="pr-3 text-[11px] uppercase tracking-[0.14em] text-[#a39182]">
                  +{modules.length - 3}
                </span>
              )}
            </div>
          </div>

          <div className="mt-7 hidden border-t border-[#e2d8ce] pt-4 lg:block">
            <div className="flex flex-wrap items-center gap-2">
              {modules.map((module) => {
                const Icon = module.icon;
                const isActive = activeModule?.id === module.id;

                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => setActiveModuleId(module.id)}
                    className={classNames(
                      "group inline-flex min-h-[42px] items-center gap-2 rounded-full border px-4 py-2 text-[11px]",
                      "font-medium uppercase tracking-[0.14em] transition-all duration-200 focus-visible:outline-none",
                      isActive
                        ? "border-[#483827] bg-white text-[#483827] shadow-[0_12px_28px_rgba(72,56,39,0.08)]"
                        : "border-transparent text-[#8f7b69] hover:border-[#e3d8ce] hover:bg-white/70 hover:text-[#483827]",
                    )}
                  >
                    <Icon
                      className={classNames(
                        "h-4 w-4 shrink-0",
                        isActive
                          ? "text-[#483827]"
                          : "text-[#a39182] group-hover:text-[#483827]",
                      )}
                    />

                    <span className="whitespace-nowrap">{module.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 lg:hidden">
            <label className="mb-2 block font-medium text-[10px] uppercase tracking-[0.18em] text-[#8f7b69]">
              Section
            </label>

            <div className="relative">
              <select
                data-select-custom-arrow="true"
                value={activeModule?.id}
                onChange={(event) => setActiveModuleId(event.target.value)}
                className="h-12 w-full appearance-none rounded-full border border-[#d8cec3] bg-white/70 bg-none px-4 pr-10 font-medium text-sm text-[#483827] outline-none focus:border-[#483827] focus:ring-2 focus:ring-[#483827]/10"
              >
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.label}
                  </option>
                ))}
              </select>

              <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9f8d7c]" />
            </div>
          </div>
        </div>

        <div className="border-b border-[#e2d8ce] bg-white/50 px-4 py-5 sm:px-6 lg:px-8">
          <span className="inline-flex rounded-full border border-[#d8cec3] bg-white px-3.5 py-1.5 font-medium text-[10px] uppercase tracking-[0.16em] text-[#8f7b69]">
            {title}
          </span>

          <h2 className="mt-3  text-[28px] leading-tight tracking-[-0.04em] text-[#33261d] sm:text-[34px]">
            {activeModule?.label}
          </h2>

          {activeModule?.description && (
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#7f6d5d]">
              {activeModule.description}
            </p>
          )}
        </div>

        <div className="bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-full">{activeModule?.component}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
