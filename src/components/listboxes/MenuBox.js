import {
  Label,
  Listbox,
  ListboxOptions,
  ListboxOption,
  ListboxButton,
} from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/20/solid";
import { forwardRef, useEffect, useMemo, useState } from "react";

const classNames = (...classes) => classes.filter(Boolean).join(" ");

const getOptionLabel = (opt) => {
  if (!opt) return "";
  if (typeof opt === "string" || typeof opt === "number") return String(opt);
  return opt.name ?? opt.label ?? "";
};

const isSameOption = (a, b) => {
  if (a == null || b == null) return false;

  const aIsPrimitive = typeof a === "string" || typeof a === "number";
  const bIsPrimitive = typeof b === "string" || typeof b === "number";

  if (aIsPrimitive && !bIsPrimitive) return String(a) === String(b?.name);
  if (!aIsPrimitive && bIsPrimitive) return String(a?.name) === String(b);
  if (aIsPrimitive && bIsPrimitive) return String(a) === String(b);

  const aId = a.id ?? a._id ?? a.productId;
  const bId = b.id ?? b._id ?? b.productId;

  if (aId != null && bId != null) return String(aId) === String(bId);

  return String(a?.name) === String(b?.name);
};

const MenuBox = forwardRef(function MenuBox(
  {
    title = "",
    options = [],
    onChange,
    placeholder = "Vyberte možnost",
    value = null,
    isMandatory = false,
    highlightFocus = false,
    disabled = false,
    emptyMessage = "Žádné možnosti",
    tenantStylePresetId = null,
    tenantThemeStyle = null,
  },
  ref,
) {
  const safeOptions = useMemo(
    () => (Array.isArray(options) ? options : []),
    [options],
  );

  const selectedLabel = getOptionLabel(value);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      {title ? (
        <Label className="mb-2 block text-sm font-medium leading-6 text-[#1f1c19]">
          {title}
          {isMandatory ? <span className="text-red-600"> *</span> : null}
        </Label>
      ) : null}

      <div className="relative">
        <ListboxButton
          ref={ref}
          aria-invalid={highlightFocus || undefined}
          data-tenant-hover={highlightFocus ? "preserve" : undefined}
          className={classNames(
            "relative min-h-11 w-full cursor-default rounded-2xl border bg-white px-4 py-2.5 pr-11 text-left",
            "text-sm leading-6 text-[#151311] shadow-sm",
            "transition duration-200 ease-out",
            "hover:border-black/20 hover:bg-[#fffdfb]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            disabled
              ? "cursor-not-allowed border-black/10 bg-black/[0.03] text-black/35 shadow-none"
              : "",
            highlightFocus
              ? "border-red-300 focus-visible:ring-red-500 focus-visible:ring-offset-[#fbfaf8]"
              : "border-black/10 focus-visible:ring-[var(--unnamed-color-b3a292)] focus-visible:ring-offset-[#fbfaf8]",
          )}
        >
          {selectedLabel ? (
            <span className="block truncate font-medium">{selectedLabel}</span>
          ) : (
            <span className="block truncate text-black/40">{placeholder}</span>
          )}

          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <ChevronUpDownIcon
              className={classNames(
                "h-5 w-5",
                disabled ? "text-black/20" : "text-black/35",
              )}
              aria-hidden="true"
            />
          </span>
        </ListboxButton>

        {mounted && (
          <ListboxOptions
            portal
            anchor="bottom start"
            transition
            data-tenant-style={tenantStylePresetId || undefined}
            style={tenantThemeStyle || undefined}
            className={classNames(
              "z-[9999] mt-2 max-h-64 w-[var(--button-width)] overflow-auto rounded-2xl border border-black/10 bg-white py-1.5",
              "shadow-[0_18px_45px_rgba(0,0,0,0.14)] focus:outline-none",
              "origin-top transition duration-150 ease-out",
              "data-[closed]:scale-[0.98] data-[closed]:opacity-0",
              "data-[leave]:duration-100 data-[leave]:ease-in",
            )}
          >
            {safeOptions.length > 0 ? (
              safeOptions.map((option, idx) => {
                const selected = isSameOption(option, value);
                const optionLabel = getOptionLabel(option);

                return (
                  <ListboxOption
                    key={option?.id ?? option?._id ?? option?.productId ?? idx}
                    value={option}
                    className={classNames(
                      "group relative mx-1 cursor-default select-none rounded-xl px-3 py-2.5 pr-9 text-sm text-[#1f1c19]",
                      "transition-colors duration-150",
                      "data-[focus]:bg-[#f5f1ec]",
                      selected ? "bg-[rgba(179,162,146,0.12)]" : "",
                    )}
                  >
                    {({ selected: headlessSelected }) => (
                      <>
                        <span
                          data-tenant-interactive-label
                          className={classNames(
                            "block truncate",
                            headlessSelected || selected
                              ? "font-medium text-[#111]"
                              : "font-normal text-[#3f3933]",
                          )}
                        >
                          {optionLabel}
                        </span>

                        {(headlessSelected || selected) && (
                          <span
                            data-tenant-hover="preserve"
                            className="absolute inset-y-0 right-3 flex items-center text-[var(--unnamed-color-b3a292)]"
                          >
                            <CheckIcon className="h-4 w-4" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </ListboxOption>
                );
              })
            ) : (
              <div className="px-4 py-3 text-sm text-black/45">
                {emptyMessage}
              </div>
            )}
          </ListboxOptions>
        )}
      </div>
    </Listbox>
  );
});

export default MenuBox;
