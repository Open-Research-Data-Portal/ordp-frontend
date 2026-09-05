import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { SectionHeader, EmptyState } from "../../../components/dashboard/dashboardUi";
import * as datasetsApi from "../hooks/datasetsApi";
import { useToast } from "../../../context/ToastContext.jsx";
import { useAuth } from "../../../context/useAuth";
import { isAdmin, getDashboardPath } from "../../../utils/userRoles";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminDeletionRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState(null);

  // Admins only — redirect everyone else to their own dashboard.
  useEffect(() => {
    if (user && !isAdmin(user)) {
      navigate(getDashboardPath(user), { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await datasetsApi.getAdminDeletionQueue();
        if (!active) return;
        setItems(Array.isArray(data) ? data : (data?.results || []));
      } catch (err) {
        if (!active) return;
        addToast(err?.response?.data?.detail || err?.message || "Failed to load deletion requests.", "error");
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [addToast]);

  async function handleExecute(request) {
    const id = request.id || request.request_id;
    if (!id || executingId) return;
    const confirmed = window.confirm(
      `Permanently delete "${request.dataset_title || "this dataset"}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setExecutingId(id);
    try {
      await datasetsApi.executeDatasetDeletion(id);
      addToast(`Dataset "${request.dataset_title || ""}" deleted permanently.`, "success");
      setItems((s) => s.filter((r) => (r.id || r.request_id) !== id));
    } catch (err) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to execute deletion.", "error");
    } finally {
      setExecutingId(null);
    }
  }

  return (
    <DashboardShell title="ORDP Admin Console" subtitle="Deletion Requests">
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <SectionHeader
            title="Approved Deletion Requests"
            subtitle="Fully-approved requests queued for permanent deletion."
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                <th className="px-5 py-3 text-left font-semibold">Requested By</th>
                <th className="px-5 py-3 text-left font-semibold">Reason</th>
                <th className="px-5 py-3 text-left font-semibold">Resolved</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-500">
                    Loading deletion requests…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10">
                    <EmptyState
                      title="No deletion requests"
                      description="Approved deletion requests will appear here for execution."
                    />
                  </td>
                </tr>
              ) : (
                items.map((request) => {
                  const id = request.id || request.request_id;
                  const busy = executingId === id;
                  return (
                    <tr key={id} className="border-t border-gray-100 hover:bg-bg/50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-navy">{request.dataset_title || "Untitled dataset"}</p>
                        <p className="text-xs text-gray-400 font-mono">{request.dataset_id || id}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{request.requested_by || "—"}</td>
                      <td className="px-5 py-4 text-gray-500 max-w-[260px]">
                        <span className="inline-flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{request.reason || "—"}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(request.resolved_at)}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleExecute(request)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg px-3 py-2 disabled:opacity-50 transition-colors"
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          {busy ? "Deleting…" : "Execute Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}