import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../../../components/dashboard/dashboardUi";
import { useToast } from "../../../context/ToastContext.jsx";

export default function AdminSettingsPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "settings-categories";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const meta = {
    "settings-categories": { title: "Categories", endpoint: "/metadata/categories/", nameKey: "name" },
    "settings-colleges": { title: "Colleges", endpoint: "/metadata/colleges/", nameKey: "name" },
    "settings-coe": { title: "Centers of Excellence", endpoint: "/metadata/centers/", nameKey: "name" },
    "settings-departments": { title: "Departments", endpoint: "/metadata/departments/", nameKey: "name" },
    "settings-languages": { title: "Languages", endpoint: "/metadata/languages/", nameKey: "name" },
    [tab]: { title: tab.replace("settings-", "").replace(/^\w/, (c) => c.toUpperCase()), endpoint: `/metadata/${tab.replace("settings-", "")}s/`, nameKey: "name" },
  };

  const current = meta[tab] || meta["settings-categories"];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const base = import.meta.env.VITE_API_BASE_URL || "https://ordp-backend.onrender.com/api";
        const res = await fetch(`${base}${current.endpoint}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("ordp:access_token")}` },
        });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab, current.endpoint]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setSaving(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "https://ordp-backend.onrender.com/api";
      const path = current.endpoint;
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("ordp:access_token")}`,
        },
        body: JSON.stringify({ [current.nameKey]: newItemName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || err?.message || `Create failed (${res.status})`);
      }
      addToast("Created successfully.", "success");
      setNewItemName("");
      setShowForm(false);
      setItems((s) => [...s, { [current.nameKey]: newItemName.trim() }]);
    } catch (err) {
      addToast(err?.message || "Create failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-navy">{current.title}</h3>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="bg-gold hover:bg-gold-dark text-white text-xs font-semibold rounded-lg px-4 py-2.5 transition-colors min-h-[40px]"
        >
          {showForm ? "Cancel" : "+ Add New"}
        </button>
      </div>
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 flex items-center gap-2">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={`New ${current.title.slice(0, -1)} name`}
            className="flex-1 rounded-lg border border-slate-200 text-sm py-2.5 px-3"
            required
          />
          <button type="submit" disabled={saving} className="bg-navy hover:bg-navy-light text-white text-sm font-semibold rounded-lg px-4 py-2.5 disabled:opacity-50 transition-colors min-h-[40px]">
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState title="No items yet" description={`Add your first ${current.title.slice(0, -1)} using the button above.`} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Name</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || item.pk || idx} className="border-t border-gray-100 hover:bg-bg/50">
                  <td className="px-5 py-3 font-medium text-navy">{item.name || item.label || item.title || "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <button type="button" className="text-xs text-gold hover:underline min-h-[32px] px-2" onClick={() => addToast("Edit not yet implemented.", "info")}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
