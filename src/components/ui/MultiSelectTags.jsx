import { useState, useMemo, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";

/**
 * Multi-select with tag chips (matches the "Artificial Intelligence ×",
 * "Software Engineering ×" chips + "+ Add Interest" pattern in the
 * profile screenshot). `value` is an array of selected option strings.
 */
export default function MultiSelectTags({
  id,
  label,
  required = false,
  optional = false,
  value = [],
  onChange,
  options,
  placeholder = "Add interest...",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const available = useMemo(
    () =>
      options.filter(
        (opt) =>
          !value.includes(opt) &&
          opt.toLowerCase().includes(query.toLowerCase())
      ),
    [options, value, query]
  );

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addTag(tag) {
    if (!value.includes(tag)) onChange([...value, tag]);
    setQuery("");
    setOpen(false);
  }

  function removeTag(tag) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="mb-4" ref={containerRef}>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {optional && <span className="text-xs text-slate-400">Optional</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-[#6B5B1A] text-white text-xs font-medium
                       rounded-full px-3 py-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="hover:text-red-200"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 border border-dashed border-[#B8860B] text-[#B8860B]
                       text-xs font-medium rounded-full px-3 py-1 hover:bg-amber-50"
          >
            + Add Interest
            <ChevronDown className="w-3 h-3" />
          </button>

          {open && (
            <div className="absolute z-10 mt-1 w-64 max-h-56 overflow-y-auto rounded-lg border
                             border-slate-200 bg-white shadow-lg">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 text-sm border-b border-slate-100 bg-[#F7F6F2] focus:outline-none"
              />
              {available.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-400">No matches.</p>
              )}
              {available.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  onClick={() => addTag(opt)}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Free-text fallback input, matching the "Other (type to add)..." row in the screenshot */}
      <input
        id={id}
        value=""
        onChange={() => {}}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.value.trim()) {
            e.preventDefault();
            addTag(e.target.value.trim());
            e.target.value = "";
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 text-sm py-2.5 px-3 bg-[#F7F6F2]
                   focus:outline-none focus:ring-2 focus:ring-[#0B1526]/20 focus:border-[#0B1526]"
      />
    </div>
  );
}
