import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { EmptyState } from "../../../components/dashboard/dashboardUi";
import { useToast } from "../../../context/ToastContext.jsx";

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "settings-categories";
  const { addToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [saving, setSaving] = useState(false);

  const tabs = [
    { key: "settings-categories", label: "Categories" },
    { key: "settings-colleges", label: "Colleges" },
    { key: "settings-centers", label: "Centers of Excellence" },
    { key: "settings-departments", label: "Departments" },
    { key: "settings-languages", label: "Languages" },
  ];

  const currentTab = tabs.find((t) => t.key === tab) || tabs[0];
  const endpointMap = {
    "settings-categories": "/metadata/categories/",
    "settings-colleges": "/metadata/colleges/",
    "settings-centers": "/metadata/centers/",
    "settings-departments": "/metadata/departments/",
    "settings-languages": "/metadata/languages/",
  };
  const endpoint = endpointMap[tab] || "/metadata/categories/";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const base = import.meta.env.VITE_API_BASE_URL || "https://ordp-backend.onrender.com/api";
        const res = await fetch(`${base}${endpoint}`, {
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
  }, [tab, endpoint]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setSaving(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "https://ordp-backend.onrender.com/api";
      const res = await fetch(`${base}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("ordp:access_token")}`,
        },
        body: JSON.stringify({ name: newItemName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || err?.message || `Create failed (${res.status})`);
      }
      addToast(`${currentTab.label.slice(0, -1)} created successfully.`, "success");
      setNewItemName("");
      setShowForm(false);
      setItems((s) => [...s, { name: newItemName.trim() }]);
    } catch (err) {
      addToast(err?.message || "Create failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="ORDP Admin Console" subtitle="System status and key metrics">
      <button
        type="button"
        onClick={() => navigate("/admin-dashboard")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-navy transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-serif font-bold text-navy">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage categories, colleges, centers, departments, and languages.</p>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => navigate(`/admin/settings?tab=${t.key}`)}
              className={`text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors min-h-[40px] whitespace-nowrap ${tab === t.key ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {error && (
            <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-navy">{currentTab.label}</h3>
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="bg-gold hover:bg-gold-dark text-white text-xs font-semibold rounded-lg px-4 py-2.5 transition-colors min-h-[40px]"
            >
              {showForm ? <span className="inline-flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</span> : <span className="inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add New</span>}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="mb-4 flex items-center gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={`New ${currentTab.label.slice(0, -1)} name`}
                className="flex-1 rounded-lg border border-slate-200 text-sm py-2.5 px-3"
                required
              />
              <button type="submit" disabled={saving} className="bg-navy hover:bg-navy-light text-white text-sm font-semibold rounded-lg px-4 py-2.5 disabled:opacity-50 transition-colors min-h-[40px]">
                {saving ? "Saving…" : "Save"}
              </button>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gold" /> Loading…
            </p>
          ) : items.length === 0 ? (
            <EmptyState title="No items yet" description={`Add your first ${currentTab.label.slice(0, -1)} using the button above.`} />
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
                        <button
                          type="button"
                          onClick={() => addToast("Edit not yet implemented.", "info")}
                          className="text-xs text-gold hover:underline min-h-[32px] px-2"
                        >
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
      </div>
    </DashboardShell>
  );
}
