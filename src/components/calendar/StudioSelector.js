"use client";

import {
  BuildingOffice2Icon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

export default function StudioSelector({ studios, value, onChange, label }) {
  const selected = studios.find((studio) => studio.id === value) || studios[0];

  if (studios.length <= 1) {
    return (
      <div className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-[13px] border border-[#E7E4DE] bg-[#F7F5F1] px-3.5 text-[12px] text-[#4B4B49]">
        <BuildingOffice2Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{selected?.name}</span>
      </div>
    );
  }

  return (
    <label className="relative block min-w-0 sm:min-w-[190px]">
      <span className="sr-only">{label}</span>
      <BuildingOffice2Icon
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#686866]"
        aria-hidden="true"
      />
      <select
        data-select-custom-arrow="true"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none truncate rounded-[13px] border border-[#DCD9D3] bg-white bg-none py-2 pl-10 pr-9 text-[12px] font-medium text-[#20201F] outline-none transition hover:border-[#BCB8B0] focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
      >
        {studios.map((studio) => (
          <option key={studio.id} value={studio.id}>
            {studio.name}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#686866]"
        aria-hidden="true"
      />
    </label>
  );
}
