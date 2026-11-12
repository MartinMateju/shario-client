import {
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { forwardRef, useEffect, useMemo, useState } from "react";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const ComboBox = forwardRef(function ComboBox(
  {
    title = "",
    selected = null,
    setSelected,
    placeholder = "",
    options = [],
    tagEnabled = false,
    isMandatory = false,
    highlightFocus = false,
    disabled = false,
    helperText = "",
    tenantStylePresetId = null,
    tenantThemeStyle = null,
  },
  ref,
) {
  // Prevent SSR mismatch when portalling
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const safeOptions = useMemo(
    () => (Array.isArray(options) ? options : []),
    [options],
  );

  const selectedLabel =
    selected && typeof selected === "object" && selected?.name != null
      ? String(selected.name)
      : selected != null
        ? String(selected)
        : "";

  return (
    <Listbox value={selected} onChange={setSelected} disabled={disabled}>
      <Label className="block text-base sm:text-sm font-medium leading-6 text-gray-900">
        {title}
        {isMandatory && <span className="text-red-600"> *</span>}
      </Label>

      <div className="relative mt-2">
        <ListboxButton
          ref={ref}
          disabled={disabled}
          aria-invalid={highlightFocus || undefined}
          data-tenant-hover={highlightFocus ? "preserve" : undefined}
          className={classNames(
            "relative w-full rounded-full bg-white py-2.5 sm:py-1.5 pl-3 pr-10 text-left shadow-sm ring-1 ring-inset sm:text-sm sm:leading-6",
            disabled
              ? "cursor-not-allowed opacity-60 ring-gray-200 text-gray-500"
              : "cursor-default text-gray-900 ring-gray-300",
            highlightFocus && !disabled
              ? "ring-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              : !disabled
                ? "focus:outline-none focus:ring-2 focus:ring-black"
                : "focus:outline-none",
          )}
        >
          <span className="flex items-center">
            {tagEnabled && (
              <span
                aria-label={
                  selected?.applicable ? "Applicable" : "Not-applicable"
                }
                className={classNames(
                  selected?.applicable ? "bg-green-400" : "bg-gray-200",
                  "inline-block h-2 w-2 flex-shrink-0 rounded-full",
                )}
              />
            )}

            {selected ? (
              <span
                className={classNames(
                  "block font-medium truncate",
                  tagEnabled && "ml-3",
                )}
              >
                {selectedLabel}
              </span>
            ) : (
              <span
                className={classNames(
                  "block truncate italic text-gray-500",
                  tagEnabled && "ml-3",
                )}
              >
                {placeholder}
              </span>
            )}
          </span>

          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              aria-hidden="true"
              className="h-5 w-5 text-gray-400"
            />
          </span>
        </ListboxButton>

        {helperText ? (
          <p className="mt-2 text-xs  text-black/50">{helperText}</p>
        ) : null}

        {/* ✅ Portal + floating positioning to avoid clipping behind sidebar */}
        {mounted && !disabled && (
          <ListboxOptions
            portal
            anchor="bottom start"
            transition
            data-tenant-style={tenantStylePresetId || undefined}
            style={tenantThemeStyle || undefined}
            className={classNames(
              "z-[9999] mt-2 max-h-60 w-[var(--button-width)] overflow-auto rounded-xl bg-white py-1 text-base shadow-xl ring-1 ring-gray-300 focus:outline-none",
              "data-[closed]:data-[leave]:opacity-0 data-[leave]:transition data-[leave]:duration-100 data-[leave]:ease-in",
              "sm:text-sm",
            )}
          >
            {safeOptions.map((option) => {
              const optionLabel =
                option && typeof option === "object" && option?.name != null
                  ? String(option.name)
                  : option != null
                    ? String(option)
                    : "";

              const optionKey =
                option && typeof option === "object"
                  ? (option.id ?? option.name ?? optionLabel)
                  : optionLabel;

              const isOptionDisabled = tagEnabled
                ? option?.applicable === false
                : false;

              return (
                <ListboxOption
                  key={optionKey}
                  value={option}
                  disabled={isOptionDisabled}
                  className={classNames(
                    "group relative cursor-default select-none py-2 pl-3 pr-9",
                    "text-gray-900 data-[focus]:bg-gray-200 data-[focus]:text-gray-900",
                    isOptionDisabled && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {({ selected: isSelected, disabled: isDisabled }) => (
                    <>
                      <div className="flex items-center">
                        {tagEnabled && (
                          <span
                            aria-hidden="true"
                            className={classNames(
                              option?.applicable
                                ? "bg-green-400"
                                : "bg-gray-200",
                              "inline-block h-2 w-2 flex-shrink-0 rounded-full",
                            )}
                          />
                        )}

                        <span
                          data-tenant-interactive-label
                          className={classNames(
                            "block truncate",
                            isSelected ? "font-medium" : "",
                            tagEnabled && "ml-3",
                            isDisabled ? "text-gray-400" : "text-gray-900",
                          )}
                        >
                          {optionLabel}
                          {tagEnabled && (
                            <span className="sr-only">
                              {" "}
                              is{" "}
                              {option?.applicable
                                ? "applicable"
                                : "not-applicable"}
                            </span>
                          )}
                        </span>
                      </div>

                      {!isDisabled && isSelected && (
                        <span
                          data-tenant-hover="preserve"
                          className="absolute inset-y-0 right-0 flex items-center pr-4 text-green-600"
                        >
                          <CheckIcon aria-hidden="true" className="h-5 w-5" />
                        </span>
                      )}
                    </>
                  )}
                </ListboxOption>
              );
            })}
          </ListboxOptions>
        )}
      </div>
    </Listbox>
  );
});

export default ComboBox;
