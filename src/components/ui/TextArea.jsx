export default function TextArea({
  id,
  label,
  required = false,
  optional = false,
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
  helperText = null,
  showCount = false,
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {optional && <span className="text-xs text-slate-400">Optional</span>}
      </div>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-xl border border-slate-200 text-sm p-3.5 resize-none bg-[#F8F7F4]
                   focus:outline-none focus:ring-2 focus:ring-[#0B1526]/15 focus:border-[#0B1526]"
      />
      <div className="flex items-center justify-between mt-1.5">
        {helperText ? <p className="text-xs text-slate-400">{helperText}</p> : <span />}
        {(showCount || maxLength) && maxLength && (
          <p className="text-xs text-slate-400 ml-auto">
            {(value?.length ?? 0)} / {maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
