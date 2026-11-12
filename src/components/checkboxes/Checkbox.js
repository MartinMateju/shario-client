export default function Checkbox({
  className = "relative flex gap-x-3 pt-6",
  id = "post-checkbox",
  name = "post-checkbox",
  htmlFor = "post-checkbox",
  label = "",
  text = "",
  onChange,
  checked,
}) {
  return (
    <div className={className}>
      <div className="flex h-6 items-center">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded-none border-gray-300 text-cobalt-600 focus:ring-cobalt-600"
        />
      </div>
      <div className="text-base sm:text-sm leading-6">
        <label htmlFor={htmlFor} className="font-medium text-gray-900">
          {label}
        </label>
        <p className="text-gray-500">{text}</p>
      </div>
    </div>
  );
}
