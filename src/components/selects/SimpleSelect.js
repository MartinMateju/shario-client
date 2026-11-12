export default function SimpleSelect({
  id = "",
  name = "",
  label = "",
  value = "",
  options = [],
  defaultValue = "",
  onChange,
}) {
  return (
    <>
      <label
        htmlFor={label}
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        onChange={(e) => onChange(e.target.value)}
        defaultValue={defaultValue}
        className="mt-2 block w-full rounded-none border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-cobalt-600 sm:text-sm sm:leading-6"
      >
        {options.length > 0 &&
          options.map((optionValue, index) => (
            <option key={index} value={value} selected={optionValue}>
              {optionValue}
            </option>
          ))}
      </select>
    </>
  );
}
