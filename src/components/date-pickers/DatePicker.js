import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import Datepicker from "react-tailwindcss-datepicker";

export default function DatePicker({
  date,
  onDateChange,
  placeholder = "Vyberte datum",
  minDate,
  maxDate,
  disabled = false,
}) {
  const handleValueChange = (newValue) => {
    onDateChange?.(newValue);
  };

  return (
    <div className="w-full">
      <Datepicker
        asSingle={true}
        useRange={false}
        value={date}
        onChange={handleValueChange}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
        popoverDirection="up"
        displayFormat="DD.MM.YYYY"
        placeholder={placeholder}
        inputClassName={[
          "w-full rounded-2xl border bg-white px-11 py-3 text-sm text-black",
          "border-black/10 shadow-sm transition-all duration-200",
          "placeholder:text-black/35",
          "hover:border-black/20 hover:shadow-md",
          "focus:border-[var(--unnamed-color-b3a292)] focus:ring-2 focus:ring-[var(--unnamed-color-b3a292)]/20 focus:outline-none",
          "disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/40",
        ].join(" ")}
        containerClassName="relative w-full"
        toggleClassName="absolute left-3 top-1/2 -translate-y-1/2 text-black/45 hover:text-black transition-colors"
        toggleIcon={(open) => (
          <CalendarDaysIcon
            className={`h-5 w-5 transition-transform duration-200 ${
              open ? "scale-105 text-[var(--unnamed-color-b3a292)]" : ""
            }`}
          />
        )}
        primaryColor="amber"
        readOnly={true}
      />
    </div>
  );
}
