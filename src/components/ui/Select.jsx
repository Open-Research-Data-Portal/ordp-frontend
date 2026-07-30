import { ChevronDown } from "lucide-react";

export default function Select({
  id,
  label,
  required = false,
  optional = false,
  value,
  onChange,
  options, // array of strings, or [{ value, label }]
  placeholder = "Select...",
}) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {optional && <span className="text-xs text-slate-400">Optional</span>}
      </div>
      <div className="relative">
        <select
          id={id}
          value={value ?? ""}
          onChange={onChange}
          className="w-full appearance-none rounded-xl border border-slate-200 text-sm py-2.5 pl-3.5 pr-9
                     bg-[#F8F7F4] focus:outline-none focus:ring-2 focus:ring-[#0B1526]/15 focus:border-[#0B1526]"
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {normalized.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
