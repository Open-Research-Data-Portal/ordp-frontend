import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ExternalLink, Trash2 } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { StatusBadge, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useToast } from "../../../context/ToastContext.jsx";
import * as datasetsApi from "../hooks/datasetsApi.js";

export default function AdminDatasetsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decidingId, setDecidingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await datasetsApi.getAdminQueue();
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load dataset queue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleView(datasetId) {
    navigate(`/datasets/${datasetId}`);
  }

  async function handleDelete(datasetId) {
    setDecidingId(datasetId);
    try {
      addToast("Dataset delete is not yet available in the backend.", "info");
    } catch (err) {
      addToast(err?.message || "Failed to delete dataset.", "error");
    } finally {
      setDecidingId(null);
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

      <div className="mb-4">
        <h1 className="text-2xl font-serif font-bold text-navy">Dataset Management</h1>
        <p className="text-sm text-gray-500 mt-1">Review and manage pending datasets.</p>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-sm text-gray-500">{items.length} pending dataset{items.length === 1 ? "" : "s"}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                <th className="px-5 py-3 text-left font-semibold">Owner</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-gold" />
                    Loading datasets…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                    <EmptyState title="No pending datasets" description="All caught up — no datasets awaiting review." />
                  </td>
                </tr>
              ) : (
                items.map((d) => (
                  <tr key={d.id || d.dataset_id} className="border-t border-gray-100 hover:bg-bg/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-navy">{d.title || "Untitled"}</p>
                      <p className="text-xs text-gray-500 font-mono">{d.id || d.dataset_id}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{d.owner?.email || d.owner_name || "—"}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={String(d.status || "pending").toLowerCase()} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleView(d.id || d.dataset_id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-navy text-white rounded-lg px-4 py-2.5 hover:bg-navy-light transition-colors min-h-[40px]"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id || d.dataset_id)}
                          disabled={decidingId === (d.id || d.dataset_id)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg px-4 py-2.5 hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[40px]"
                        >
                          {decidingId === (d.id || d.dataset_id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
