export default function Toggle({ id, label, description, checked, onChange, optional = false }) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
          <label htmlFor={id} className="text-sm font-semibold text-slate-700">
            {label}
          </label>
          {optional && <span className="text-xs text-slate-400">Optional</span>}
        </div>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-[#0B1526]" : "bg-slate-200",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
