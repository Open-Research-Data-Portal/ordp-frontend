import { useMemo, useState } from "react";
import { Send, Search, X, Loader2 } from "lucide-react";

function subLabel(sub) {
  if (sub == null) return "";
  if (typeof sub === "string") return sub;
  return String(sub.name ?? sub.label ?? "").trim();
}

/**
 * Research-interest picker: search/filter categories, subfield chips,
 * multi-select with removable "×" chips, plus a "Not listed?" mini-form that
 * requests a brand-new category/subcategory for admin approval.
 *
 * The component is presentational about *where* a request goes: pass
 * `onRequestCategory` and it will be awaited, so the caller decides which API
 * endpoint backs the request (onboarding and profile settings both pass the
 * same POST /accounts/profile/interests/other/ call). Without the prop the
 * request is tracked locally only, which keeps the component usable in
 * isolation (e.g. tests, storybook).
 */
export default function ResearchInterests({
  id,
  label,
  required = false,
  value = [],
  onChange,
  categories = [],
  onRequestCategory,
}) {
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [otherCategory, setOtherCategory] = useState("");
  const [otherSub, setOtherSub] = useState("");
  const [sending, setSending] = useState(false);
  const [requestError, setRequestError] = useState("");

  // `categories` can arrive asynchronously (GET /accounts/profile/options/), so
  // the active category is derived rather than synced through an effect: it
  // falls back to the first available category until the user picks one.
  const activeCategory = category || categories[0]?.category || "";

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) {
      const selected = categories.find((c) => c.category === activeCategory);
      return selected ? [selected] : [];
    }
    return categories
      .map((categoryItem) => {
        const categoryMatches = categoryItem.category
          .toLowerCase()
          .includes(normalizedQuery);
        const matchingSubcategories = (categoryItem.subcategories || []).filter(
          (sub) => subLabel(sub).toLowerCase().includes(normalizedQuery)
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
  }, [categories, normalizedQuery, activeCategory]);

  function addInterest(cat, sub) {
    const interestLabel = `${cat} — ${sub}`;
    if (!value.includes(interestLabel)) onChange([...value, interestLabel]);
  }

  function removeInterest(interestLabel) {
    onChange(value.filter((v) => v !== interestLabel));
  }

  async function sendRequest() {
    const nextCategory = otherCategory.trim();
    const nextSub = otherSub.trim();
    // The category is the only required part: a user may request a whole new
    // category on its own, or a category + subcategory pair.
    if (!nextCategory || sending) return;

    setRequestError("");

    // Send one interest string, matching the shape the backend stores.
    const requestName = nextSub ? `${nextCategory} — ${nextSub}` : nextCategory;
    const record = {
      category: nextCategory,
      subcategory: nextSub,
      status: "Pending Approval",
    };

    if (!onRequestCategory) {
      setPendingRequests((s) => [record, ...s]);
      setOtherCategory("");
      setOtherSub("");
      return;
    }

    setSending(true);
    try {
      await onRequestCategory(requestName, {
        category: nextCategory,
        subcategory: nextSub,
      });
      setPendingRequests((s) => [record, ...s]);
      setOtherCategory("");
      setOtherSub("");
    } catch (err) {
      setRequestError(
        err?.message || "Could not send your request. Please try again."
      );
    } finally {
      setSending(false);
    }
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
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-[#6B5B1A] text-white text-xs font-medium rounded-full px-3 py-1"
          >
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
            id={id}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories or subfields..."
            className="w-full rounded-lg border border-slate-200 text-sm py-2.5 pl-10 pr-3"
          />
        </div>

        {!normalizedQuery && (
          <select
            aria-label="Filter by category"
            value={activeCategory}
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
                  {(categoryItem.subcategories || []).map((sub) => {
                    const name = subLabel(sub);
                    const selected = value.includes(
                      `${categoryItem.category} — ${name}`
                    );
                    return (
                      <button
                        type="button"
                        key={`${categoryItem.category}-${name}`}
                        aria-pressed={selected}
                        onClick={() => addInterest(categoryItem.category, name)}
                        className={`text-sm text-left px-3 py-2 rounded-2xl border transition ${
                          selected
                            ? "border-[#B8860B] bg-[#FDF7E6] text-[#0B1526]"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-3 border-t border-slate-100 pt-3">
        <p className="text-xs text-slate-500 mb-2">
          Not listed? Request a new category for admin review. The subcategory is
          optional — leave it blank to request the category on its own.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            aria-label="New category"
            placeholder="Category (e.g., Engineering)"
            value={otherCategory}
            onChange={(e) => setOtherCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-200 text-sm py-2.5 px-3"
          />
          <input
            aria-label="New subcategory (optional)"
            placeholder="Subcategory (optional)"
            value={otherSub}
            onChange={(e) => setOtherSub(e.target.value)}
            className="w-full rounded-lg border border-slate-200 text-sm py-2.5 px-3"
          />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={sendRequest}
            disabled={sending || !otherCategory.trim()}
            className="inline-flex items-center gap-2 bg-[#B8860B] text-white px-3 py-1.5 rounded-md text-sm disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Request
          </button>
          <span className="text-xs text-slate-500">
            After submission, status will be Pending Approval.
          </span>
        </div>

        {requestError && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {requestError}
          </p>
        )}

        {pendingRequests.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-slate-700 mb-1">
              Pending Requests
            </h4>
            <ul className="text-xs text-slate-600 space-y-1">
              {pendingRequests.map((r, i) => (
                <li key={`${r.category}-${r.subcategory}-${i}`}>
                  {r.subcategory ? `${r.category} — ${r.subcategory}` : r.category}{" "}
                  <span className="text-amber-700">({r.status})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
