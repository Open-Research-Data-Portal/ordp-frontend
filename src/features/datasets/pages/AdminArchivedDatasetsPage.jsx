import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Archive,
  Loader2,
  Inbox,
  Eye,
  RotateCcw,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  X,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { useAuth } from "../../../context/useAuth";
import { useToast } from "../../../context/ToastContext.jsx";
import { isAdmin, getDashboardPath } from "../../../utils/userRoles";
import * as archiveApi from "../../../api/archiveRequests";
import * as datasetsApi from "../hooks/datasetsApi";
import ArchiveRequestDetailModal from "../../../components/dashboard/ArchiveRequestDetailModal";
import ArchiveHistoryModal from "../../../components/dashboard/ArchiveHistoryModal";
import { getDatasetImage } from "../../../utils/datasetImage";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();

  const tabParam = searchParams.get("tab") || "archived";
  const [activeTab, setActiveTab] = useState(tabParam);

  // Tab 1: Currently Archived Datasets (GET /api/admin-panel/datasets/archived/)
  const [archivedDatasets, setArchivedDatasets] = useState([]);
  const [loadingArchived, setLoadingArchived] = useState(true);

  // Tab 2: Restore Requests Queue (GET /api/admin-panel/unarchive-requests/queue/)
  const [unarchiveRequests, setUnarchiveRequests] = useState([]);
  const [loadingUnarchive, setLoadingUnarchive] = useState(true);

  const [actionId, setActionId] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [confirmRestoreDataset, setConfirmRestoreDataset] = useState(null);
  const [selectedRestoreReq, setSelectedRestoreReq] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Admins only — redirect everyone else to their own dashboard.
  useEffect(() => {
    if (user && !isAdmin(user)) {
      navigate(getDashboardPath(user), { replace: true });
    }
  }, [user, navigate]);

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // 1. Fetch currently archived datasets
  const loadArchivedDatasets = async () => {
    setLoadingArchived(true);
    try {
      const data = await datasetsApi.getAdminArchivedDatasets();
      setArchivedDatasets(Array.isArray(data) ? data : []);
    } catch {
      try {
        const fallback = await datasetsApi.getArchivedDatasets();
        setArchivedDatasets(
          Array.isArray(fallback)
            ? fallback.map((d) => ({
                id: d.id,
                title: d.title,
                owner: d.owner_name || d.author?.name || "Researcher",
                archived_at: d.archived_at || d.updated_at || new Date().toISOString(),
              }))
            : []
        );
      } catch {
        setArchivedDatasets([]);
      }
    } finally {
      setLoadingArchived(false);
    }
  };

  // 2. Fetch unarchive requests queue
  const loadUnarchiveRequests = async () => {
    setLoadingUnarchive(true);
    try {
      const data = await datasetsApi.getAdminUnarchiveRequestQueue();
      setUnarchiveRequests(Array.isArray(data) ? data : []);
    } catch {
      setUnarchiveRequests([]);
    } finally {
      setLoadingUnarchive(false);
    }
  };

  useEffect(() => {
    loadArchivedDatasets();
    loadUnarchiveRequests();
  }, []);

  // Instant Unarchive (Admin Override - no request body needed)
  async function executeInstantRestore(dataset) {
    const id = dataset.id;
    if (!id || actionId) return;

    setActionId(id);
    try {
      await datasetsApi.adminRestoreDataset(id);
      addToast(`Dataset "${dataset.title}" instantly restored.`, "success");
      setArchivedDatasets((list) => list.filter((d) => d.id !== id));
      setConfirmRestoreDataset(null);
    } catch (err) {
      addToast(
        err?.response?.data?.detail || err?.message || "Failed to restore dataset.",
        "error"
      );
    } finally {
      setActionId(null);
    }
  }

  // Decide Unarchive Request (Approve / Reject)
  async function handleDecideUnarchive(request, decision) {
    const id = request.id || request.request_id;
    if (!id || actionId) return;

    setActionId(id);
    try {
      await datasetsApi.decideUnarchiveRequest(id, decision);
      addToast(
        decision === "approve"
          ? `Restore request for "${request.dataset_title || "dataset"}" approved.`
          : `Restore request for "${request.dataset_title || "dataset"}" rejected.`,
        decision === "approve" ? "success" : "info"
      );
      setUnarchiveRequests((list) =>
        list.filter((r) => (r.id || r.request_id) !== id)
      );
      loadArchivedDatasets();
    } catch (err) {
      addToast(
        err?.response?.data?.detail || err?.message || "Failed to process decision.",
        "error"
      );
    } finally {
      setActionId(null);
    }
  }

  // Archive request vote / resolve (with Undo support)
  async function handleResolveArchive(request, status) {
    const id = request.id || request.request_id;
    if (!id || actionId) return;

    setActionId(id);
    try {
      try {
        await datasetsApi.voteOnArchiveRequest(
          id,
          status === "approved" ? "approve" : "reject"
        );
      } catch {
        archiveApi.resolveArchiveRequest(id, status);
      }
      setArchiveRequests((list) =>
        list.map((r) => (r.id === id ? { ...r, status } : r))
      );
      addToast(
        status === "approved"
          ? `Archive request approved.`
          : `Archive request rejected.`,
        status === "approved" ? "success" : "info"
      );
      loadArchivedDatasets();
    } catch (err) {
      addToast(
        err?.response?.data?.detail || err?.message || "Failed to record decision.",
        "error"
      );
    } finally {
      setActionId(null);
    }
  }

  // Filtered lists for search
  const filteredArchived = useMemo(() => {
    if (!searchQuery.trim()) return archivedDatasets;
    const q = searchQuery.toLowerCase();
    return archivedDatasets.filter(
      (d) =>
        String(d.title || "").toLowerCase().includes(q) ||
        String(d.owner || "").toLowerCase().includes(q) ||
        String(d.id || "").toLowerCase().includes(q)
    );
  }, [archivedDatasets, searchQuery]);

  const pendingUnarchiveCount = unarchiveRequests.length;

  return (
    <DashboardShell
      title="Archived"
      subtitle="Comprehensive Archive & Restore Management"
    >
      {/* Top summary metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 animate-fade-in-up">
        <div
          onClick={() => switchTab("archived")}
          className={`cursor-pointer rounded-2xl border p-5 transition ${
            activeTab === "archived"
              ? "bg-navy text-white border-navy shadow-md"
              : "bg-white border-border hover:border-gold/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Archived
            </span>
            <Archive
              className={`w-5 h-5 ${activeTab === "archived" ? "text-gold" : "text-gray-400"}`}
            />
          </div>
          <p className="text-3xl font-bold mt-2">{archivedDatasets.length}</p>
          <p className="text-xs mt-1 opacity-70">
            Currently unlisted from search
          </p>
        </div>

        <div
          onClick={() => switchTab("unarchive-requests")}
          className={`cursor-pointer rounded-2xl border p-5 transition ${
            activeTab === "unarchive-requests"
              ? "bg-navy text-white border-navy shadow-md"
              : "bg-white border-border hover:border-gold/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Restore Requests
            </span>
            <RotateCcw
              className={`w-5 h-5 ${activeTab === "unarchive-requests" ? "text-gold" : "text-blue-500"}`}
            />
          </div>
          <p className="text-3xl font-bold mt-2">{pendingUnarchiveCount}</p>
          <p className="text-xs mt-1 opacity-70">
            Single-admin decision queue
          </p>
        </div>
      </div>

      {/* Main Section */}
      <section className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden animate-fade-in-up">
        {/* Tab switcher header */}
        <div className="border-b border-border px-5 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-4 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => switchTab("archived")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === "archived"
                    ? "bg-navy text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                All Archived ({archivedDatasets.length})
              </button>
              <button
                type="button"
                onClick={() => switchTab("unarchive-requests")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === "unarchive-requests"
                    ? "bg-navy text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Restore Requests Queue ({pendingUnarchiveCount})
              </button>
            </div>

            {/* Quick search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by title or owner…"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-gray-50 focus:bg-white focus:outline-none focus:border-gold transition"
              />
            </div>
          </div>
        </div>

        {/* TAB 1: ALL ARCHIVED DATASETS (Admin Management Card Rows) */}
        {activeTab === "archived" && (
          <div className="divide-y divide-gray-100">
            {loadingArchived ? (
              <div className="px-5 py-12 text-center text-sm text-gray-500">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gold" /> Loading archived datasets…
                </span>
              </div>
            ) : filteredArchived.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No Archived Datasets</p>
                <p className="text-xs text-gray-500 mt-1">
                  There are currently no archived datasets in the portal.
                </p>
              </div>
            ) : (
              filteredArchived.map((dataset) => {
                const busy = actionId === dataset.id;
                const thumb = getDatasetImage(dataset);
                const filesCount = dataset.files?.length || 1;
                const fileType = dataset.files?.[0]?.file_type || "DATA";
                const fileSize = dataset.files?.[0]?.file_size ? `${(dataset.files[0].file_size / (1024 * 1024)).toFixed(1)} MB` : "—";
                const visibility = dataset.visibility || "public";
                return (
                  <div key={dataset.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/60 transition">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {thumb ? (
                          <img src={thumb} alt={dataset.title} className="w-full h-full object-cover" />
                        ) : (
                          <Archive className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-serif font-bold text-navy leading-snug">
                          {dataset.title || "Untitled Dataset"}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-medium text-gray-700">{dataset.owner || "Researcher"}</span>
                          {" · "}
                          Updated {formatDate(dataset.updated_at || dataset.archived_at)}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-gray-500">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            {visibility}
                          </span>
                          <span>·</span>
                          <span>{filesCount} File ({fileType.toUpperCase()})</span>
                          <span>·</span>
                          <span>{fileSize}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end shrink-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/datasets/${dataset.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-gray-100 hover:bg-gray-200 rounded-xl px-3.5 py-2 transition shadow-2xs"
                        title="View dataset details"
                      >
                        <Eye className="w-4 h-4 text-navy" />
                        View
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmRestoreDataset(dataset)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4 py-2 disabled:opacity-50 transition shadow-2xs"
                        title="Instant unarchive override"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        Instant Restore
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ARCHIVE REQUESTS QUEUE (Committee Voting) */}
        {activeTab === "archive-requests" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50/70 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                  <th className="px-5 py-3 text-left font-semibold">Requested By</th>
                  <th className="px-5 py-3 text-left font-semibold">Reason / Comment</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingRequests ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gold" /> Loading archive requests…
                      </span>
                    </td>
                  </tr>
                ) : archiveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700">No Archive Requests</p>
                      <p className="text-xs text-gray-500 mt-1">
                        All archive submissions have been reviewed.
                      </p>
                    </td>
                  </tr>
                ) : (
                  archiveRequests.map((request) => {
                    const busy = actionId === request.id;
                    return (
                      <tr key={request.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-navy leading-tight">
                            {request.dataset_title || "Untitled"}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {request.dataset_id}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          {request.owner_name}
                        </td>
                        <td className="px-5 py-4 max-w-[280px]">
                          <p className="text-xs font-semibold text-gray-700">
                            {archiveApi.reasonLabel(request.reason)}
                          </p>
                          {request.comment && (
                            <p className="text-xs text-gray-500 mt-0.5 italic line-clamp-2">
                              &ldquo;{request.comment}&rdquo;
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetailModal(request)}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-dark transition"
                          >
                            <Eye className="w-3 h-3" /> View details
                          </button>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(request.requested_at)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              STATUS_BADGE[request.status] || STATUS_BADGE.pending
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {request.status === "pending" ? (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleResolveArchive(request, "approved")}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-2.5 py-1.5 disabled:opacity-50 transition"
                              >
                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleResolveArchive(request, "rejected")}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-2.5 py-1.5 disabled:opacity-50 transition"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {request.status === "rejected" ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleResolveArchive(request, "approved")}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1.5 transition"
                                  title="Undo rejection and accept archive request"
                                >
                                  <RotateCcw className="w-3 h-3" /> Undo / Accept
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleResolveArchive(request, "rejected")}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-2.5 py-1.5 transition"
                                  title="Undo approval and reject archive request"
                                >
                                  <RotateCcw className="w-3 h-3" /> Undo / Reject
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: RESTORE REQUESTS QUEUE (Single-admin decision) */}
        {activeTab === "unarchive-requests" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50/70 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                  <th className="px-5 py-3 text-left font-semibold">Requester</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingUnarchive ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gold" /> Loading restore requests…
                      </span>
                    </td>
                  </tr>
                ) : unarchiveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700">No Pending Restore Requests</p>
                      <p className="text-xs text-gray-500 mt-1">
                        There are no user unarchive petitions awaiting decision.
                      </p>
                    </td>
                  </tr>
                ) : (
                  unarchiveRequests.map((req) => {
                    const busy = actionId === req.id;
                    return (
                      <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-navy leading-tight">
                            {req.dataset_title || "Archived Dataset"}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {req.dataset_id || req.dataset}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-gray-700 font-medium">
                          {req.requested_by_name || req.requested_by || "User"}
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(req.created_at)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedRestoreReq(req)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-navy bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition shadow-2xs"
                              title="View intended use and reason"
                            >
                              <Eye className="w-3.5 h-3.5 text-navy" />
                              View
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDecideUnarchive(req, "approve")}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-2.5 py-1.5 disabled:opacity-50 transition shadow-2xs"
                            >
                              {busy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDecideUnarchive(req, "reject")}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-2.5 py-1.5 disabled:opacity-50 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Archive Request Details Modal */}
      {detailModal && (
        <ArchiveRequestDetailModal
          request={detailModal}
          onClose={() => setDetailModal(null)}
        />
      )}

      {/* Restore Request Detail Modal */}
      {selectedRestoreReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 sm:p-8 animate-fade-in-up">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Restore Request Details</h3>
                  <p className="text-xs text-gray-500">Petition for &ldquo;{selectedRestoreReq.dataset_title || "Archived Dataset"}&rdquo;</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRestoreReq(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Requester</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{selectedRestoreReq.requested_by_name || selectedRestoreReq.requested_by || "User"}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Intended Use</p>
                <span className="inline-flex items-center mt-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                  {selectedRestoreReq.intended_use || "research"}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason for Restoration</p>
                <div className="mt-1 p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-slate-700 italic leading-relaxed">
                  &ldquo;{selectedRestoreReq.reason || "No detailed reason provided."}&rdquo;
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted At</p>
                <p className="text-xs text-slate-600 mt-0.5">{formatDate(selectedRestoreReq.created_at)}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={() => setSelectedRestoreReq(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const req = selectedRestoreReq;
                  setSelectedRestoreReq(null);
                  handleDecideUnarchive(req, "approve");
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Approve Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pretty Instant Restore Confirmation Modal */}
      {confirmRestoreDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Instant Restore</h3>
                <p className="text-xs text-gray-500">Bypass committee review and restore dataset immediately.</p>
              </div>
            </div>

            <div className="py-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to instantly restore <span className="font-semibold text-navy">&ldquo;{confirmRestoreDataset.title}&rdquo;</span>? This will make the dataset active and searchable again right away.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmRestoreDataset(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionId === confirmRestoreDataset.id}
                onClick={() => executeInstantRestore(confirmRestoreDataset)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {actionId === confirmRestoreDataset.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Yes, Restore Dataset
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}