import { useMemo, useState } from "react";
import { Send, X } from "lucide-react";

export default function ResearchInterests({
  id,
  label,
  required = false,
  value = [],
  onChange,
  categories = [],
  onAddOtherInterest,
}) {
  const [otherInterest, setOtherInterest] = useState("");

  const selectedIds = useMemo(
    () => new Set((Array.isArray(value) ? value : []).map((item) => (typeof item === "object" && item?.id ? item.id : item))),
    [value]
  );

  function toggleInterest(categoryItem) {
    const current = Array.isArray(value) ? value : [];
    const id = categoryItem.id;
    const exists = current.some((item) => (typeof item === "object" && item?.id ? item.id : item) === id);
    if (exists) {
      onChange(current.filter((item) => (typeof item === "object" && item?.id ? item.id : item) !== id));
    } else {
      onChange([...current, categoryItem]);
    }
  }

  function removeInterest(tagToRemove) {
    const current = Array.isArray(value) ? value : [];
    const idToRemove = typeof tagToRemove === "object" && tagToRemove?.id ? tagToRemove.id : tagToRemove;
    onChange(current.filter((item) => (typeof item === "object" && item?.id ? item.id : item) !== idToRemove));
  }

  function handleAddOther() {
    if (!otherInterest.trim() || !onAddOtherInterest) return;
    onAddOtherInterest(otherInterest.trim());
    setOtherInterest("");
  }

  const displayItems = Array.isArray(value) ? value : [];

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {displayItems.map((tag, idx) => {
          const labelText = typeof tag === "string" ? tag : tag?.name || String(tag);
          const isPending = typeof tag === "object" && tag?.pending;
          return (
            <span key={`${labelText}-${idx}`} className="inline-flex items-center gap-1 bg-[#6B5B1A] text-white text-xs font-medium rounded-full px-3 py-1">
              {labelText}
              {isPending && <span className="text-[10px] opacity-80">(pending)</span>}
              <button
                type="button"
                onClick={() => removeInterest(tag)}
                aria-label={`Remove ${labelText}`}
                className="hover:text-red-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-500 mb-2">Select from approved categories:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {categories.map((categoryItem) => {
            const label = categoryItem.name || String(categoryItem);
            const isSelected = selectedIds.has(categoryItem.id);
            return (
              <button
                type="button"
                key={categoryItem.id}
                onClick={() => toggleInterest(categoryItem)}
                className={`text-sm text-left px-3 py-2 rounded-2xl border transition-colors ${
                  isSelected ? "border-[#B8860B] bg-[#FBF6E9] text-[#0B1526]" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500 mb-2">Not listed? Add a custom interest (pending approval):</p>
        <div className="flex gap-2">
          <input
            placeholder="Enter your interest..."
            value={otherInterest}
            onChange={(e) => setOtherInterest(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddOther(); } }}
            className="w-full rounded-lg border border-slate-200 text-sm py-2.5 px-3"
          />
          <button type="button" onClick={handleAddOther} className="inline-flex items-center gap-2 bg-[#B8860B] text-white px-3 py-1.5 rounded-md text-sm whitespace-nowrap">
            <Send className="w-4 h-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
