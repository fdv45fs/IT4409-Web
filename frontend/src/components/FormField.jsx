function FormField({
  label,
  optional = false,
  type = "text",
  value,
  onChange,
  name,
  placeholder,
  options,
}) {
  const id = `field-${name}`;

  if (type === "select") {
    return (
      <label htmlFor={id} className="block text-sm">
        <span className="mb-1 inline-flex items-center gap-2 font-medium text-gray-700">
          {label}
          {optional && <span className="text-xs text-gray-400">(optional)</span>}
        </span>
        <div className="relative rounded-lg border border-gray-300 bg-white">
          <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            className="w-full rounded-lg bg-transparent px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </label>
    );
  }

  return (
    <label htmlFor={id} className="block text-sm">
      <span className="mb-1 inline-flex items-center gap-2 font-medium text-gray-700">
        {label}
        {optional && <span className="text-xs text-gray-400">(optional)</span>}
      </span>
      <div className="relative rounded-lg border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <input
          id={id}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-lg bg-transparent px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none"
          required={!optional}
        />
      </div>
    </label>
  );
}

export default FormField;
