import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function TextInput({
  id,
  label,
  required = false,
  optional = false,
  type = "text",
  value,
  onChange,
  placeholder,
  readOnly = false,
  icon: Icon,
  status = null,
  statusText = "",
  error = null,
  helperText = null,
  maxLength,
  showCount = false,
  showToggle = false,
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="mb-4">
      {(label || required || optional) && (
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor={id} className="text-sm font-semibold text-slate-700">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {optional && <span className="text-xs text-slate-400">Optional</span>}
        </div>
      )}

      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        )}
        <input
          id={id}
          type={type === "password" && showToggle ? (visible ? "text" : "password") : type}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={readOnly}
          maxLength={maxLength}
          className={[
            "w-full rounded-xl border text-sm py-2.5 bg-[#F7F6F2]",
            Icon ? "pl-10" : "pl-3.5",
            "pr-10",
            readOnly
              ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
              : "border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0B1526]/15 focus:border-[#0B1526]",
            error ? "border-red-300" : "",
          ].join(" ")}
        />
        {type === "password" && showToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center text-slate-500"
            title={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {status === "checking" && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
        )}
        {status === "valid" && (
          <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8860B]" />
        )}
      </div>

      {statusText && (
        <p className="mt-1.5 text-xs text-[#B8860B] flex items-center gap-1">{statusText}</p>
      )}
      {showCount && maxLength && (
        <p className="mt-1 text-right text-xs text-slate-400">
          {(value?.length ?? 0)} / {maxLength}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-400 italic">{helperText}</p>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
