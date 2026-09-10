import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Loader2, Inbox, Eye, RotateCcw } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { SectionHeader } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { useToast } from "../../../context/ToastContext.jsx";
import { isAdmin, getDashboardPath } from "../../../utils/userRoles";
import * as archiveApi from "../../../api/archiveRequests";
import * as datasetsApi from "../hooks/datasetsApi";
import ArchiveRequestDetailModal from "../../../components/dashboard/ArchiveRequestDetailModal";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  restored: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminArchivedDatasetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [detail, setDetail] = useState(null);

  // Admins only — redirect everyone else to their own dashboard.
  useEffect(() => {
    if (user && !isAdmin(user)) {
      navigate(getDashboardPath(user), { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    let active = true;
    (async () => {
      // 1. Real backend: pending archive requests first.
      try {
        const real = await datasetsApi.getAdminArchiveRequestQueue();
        if (active && real.length > 0) {
          setItems(real.map((r) => archiveApi.normalizeBackendRequest(r)));
          setLoading(false);
          return;
        }
      } catch {
        // ignore — fall through to local fallback
      }
      // 2. Fallback: local store (mock seed + user-submitted requests).
      const t = setTimeout(() => {
        if (!active) return;
        setItems(archiveApi.getAllArchiveRequests());
        setLoading(false);
      }, 300);
      return () => clearTimeout(t);
    })();
    return () => { active = false; };
  }, []);

  const pendingCount = useMemo(() => items.filter((r) => r.status === "pending").length, [items]);

  async function handleRestore(request) {
    const id = request.id || request.request_id;
    const datasetId = request.dataset_id;
    if (!id || actionId) return;
    const confirmed = window.confirm(
      `Restore "${request.dataset_title || "this dataset"}"?\n\nIt will become publicly visible again.`
    );
    if (!confirmed) return;

    setActionId(id);
    try {
      try {
        // Real admin restore endpoint.
        if (datasetId) await datasetsApi.adminRestoreDataset(datasetId);
      } catch {
        // fallback — mark local mock/store request as restored
        archiveApi.resolveArchiveRequest(id, "restored");
      }
      setItems((list) => list.map((r) => (r.id === id ? { ...r, status: "restored" } : r)));
      addToast(`Dataset "${request.dataset_title}" restored.`, "success");
    } catch (err) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to restore dataset.", "error");
    } finally {
      setActionId(null);
    }
  }

  return (
    <DashboardShell title="ORDP Admin Console" subtitle="Archived Datasets">
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-1">
          <SectionHeader
            title="Archived Datasets"
            subtitle={`${pendingCount} archive request${pendingCount === 1 ? "" : "s"} pending review.`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                <th className="px-5 py-3 text-left font-semibold">Requested By</th>
                <th className="px-5 py-3 text-left font-semibold">Reason / Comment</th>
                <th className="px-5 py-3 text-left font-semibold">Date</th>
                <th className="px-5 py-3 text-left font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gold" /> Loading archive requests…
                    </span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No archive requests yet.</p>
                  </td>
                </tr>
              ) : (
                items.map((request) => {
                  const busy = actionId === request.id;
                  return (
                    <tr key={request.id} className="border-t border-gray-100 hover:bg-bg/50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-navy">{request.dataset_title}</p>
                        <p className="text-xs text-gray-400 font-mono">{request.dataset_id}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {request.owner_name}
                        {request.source === "user" && (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">
                            New
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 max-w-[300px]">
                        <p className="text-xs font-semibold text-gray-700">{archiveApi.reasonLabel(request.reason)}</p>
                        {request.comment && <p className="text-xs text-gray-500 mt-0.5 italic line-clamp-2">"{request.comment}"</p>}
                        <button
                          type="button"
                          onClick={() => setDetail(request)}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{formatDate(request.requested_at)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[request.status] || STATUS_BADGE.pending}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {request.status === "pending" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRestore(request)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-2 disabled:opacity-50 transition-colors"
                          >
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            Restore
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                            <Archive className="w-3.5 h-3.5" /> Resolved
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {detail && (
        <ArchiveRequestDetailModal request={detail} onClose={() => setDetail(null)} />
      )}
    </DashboardShell>
  );
}