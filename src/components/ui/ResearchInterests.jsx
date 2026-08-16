import { useMemo, useState } from "react";
import { Send, Search, X } from "lucide-react";

export default function ResearchInterests({
  id,
  label,
  required = false,
  value = [],
  onChange,
  categories = [],
}) {
  const [category, setCategory] = useState(categories[0]?.category ?? "");
  const [query, setQuery] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [otherCategory, setOtherCategory] = useState("");
  const [otherSub, setOtherSub] = useState("");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) {
      const selected = categories.find((c) => c.category === category);
      return selected ? [selected] : [];
    }
    return categories
      .map((categoryItem) => {
        const categoryMatches = categoryItem.category.toLowerCase().includes(normalizedQuery);
        const matchingSubcategories = categoryItem.subcategories.filter((sub) =>
          sub.toLowerCase().includes(normalizedQuery)
        );
        if (categoryMatches) {
          return { ...categoryItem, subcategories: categoryItem.subcategories };
        }
        if (matchingSubcategories.length > 0) {
          return { ...categoryItem, subcategories: matchingSubcategories };
        }
        return null;
      })
      .filter(Boolean);
  }, [categories, normalizedQuery, category]);

  function addInterest(cat, sub) {
    const label = `${cat} — ${sub}`;
    if (!value.includes(label)) onChange([...value, label]);
  }

  function removeInterest(label) {
    onChange(value.filter((v) => v !== label));
  }

  function sendRequest() {
    if (!otherCategory.trim() || !otherSub.trim()) return;
    const req = { category: otherCategory.trim(), subcategory: otherSub.trim(), status: "Pending Approval" };
    setPendingRequests((s) => [req, ...s]);
    setOtherCategory("");
    setOtherSub("");
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 bg-[#6B5B1A] text-white text-xs font-medium rounded-full px-3 py-1">
            {tag}
            <button
              type="button"
              onClick={() => removeInterest(tag)}
              aria-label={`Remove ${tag}`}
              className="hover:text-red-200"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="mb-3">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories or subfields..."
            className="w-full rounded-lg border border-slate-200 text-sm py-2.5 pl-10 pr-3"
          />
        </div>

        {!normalizedQuery && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-200 text-sm py-2.5 px-3 mb-2"
          >
            {categories.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-1 gap-4">
          {filteredCategories.length === 0 ? (
            <div className="text-sm text-slate-500 py-3 rounded-lg border border-slate-200 bg-slate-50">
              No matching categories or subfields found.
            </div>
          ) : (
            filteredCategories.map((categoryItem) => (
              <div key={categoryItem.category} className="space-y-3">
                <div className="text-xs font-semibold uppercase text-slate-500 tracking-[0.2em]">
                  {categoryItem.category}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {categoryItem.subcategories.map((sub) => (
                    <button
                      type="button"
                      key={`${categoryItem.category}-${sub}`}
                      onClick={() => addInterest(categoryItem.category, sub)}
                      className="text-sm text-left px-3 py-2 rounded-2xl border border-slate-200 hover:bg-slate-50"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500 mb-2">Not listed? Request a new category or subcategory for admin review.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            placeholder="Category (e.g., Engineering)"
            value={otherCategory}
            onChange={(e) => setOtherCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-200 text-sm py-2.5 px-3"
          />
          <input
            placeholder="Subcategory (e.g., Civil Engineering)"
            value={otherSub}
            onChange={(e) => setOtherSub(e.target.value)}
            className="w-full rounded-lg border border-slate-200 text-sm py-2.5 px-3"
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button type="button" onClick={sendRequest} className="inline-flex items-center gap-2 bg-[#B8860B] text-white px-3 py-1.5 rounded-md text-sm">
            <Send className="w-4 h-4" /> Send Request
          </button>
          <span className="text-xs text-slate-500">After submission, status will be Pending Approval.</span>
        </div>

        {pendingRequests.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-slate-700 mb-1">Pending Requests</h4>
            <ul className="text-xs text-slate-600 space-y-1">
              {pendingRequests.map((r, i) => (
                <li key={`${r.category}-${r.subcategory}-${i}`}>{r.category} — {r.subcategory} <span className="text-amber-700">({r.status})</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
