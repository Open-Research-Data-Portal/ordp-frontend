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
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { useAuth } from "../../../context/useAuth";
import { useToast } from "../../../context/ToastContext.jsx";
import { isAdmin, getDashboardPath } from "../../../utils/userRoles";
import * as archiveApi from "../../../api/archiveRequests";
import * as datasetsApi from "../hooks/datasetsApi";
import ArchiveRequestDetailModal from "../../../components/dashboard/ArchiveRequestDetailModal";
import ArchiveHistoryModal from "../../../components/dashboard/ArchiveHistoryModal";

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

  // Tab 2: Archive Requests Queue (GET /api/admin-panel/archive-requests/queue/)
  const [archiveRequests, setArchiveRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Tab 3: Restore Requests Queue (GET /api/admin-panel/unarchive-requests/queue/)
  const [unarchiveRequests, setUnarchiveRequests] = useState([]);
  const [loadingUnarchive, setLoadingUnarchive] = useState(true);

  const [actionId, setActionId] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
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

  // 2. Fetch archive requests queue
  const loadArchiveRequests = async () => {
    setLoadingRequests(true);
    try {
      const real = await datasetsApi.getAdminArchiveRequestQueue();
      if (Array.isArray(real) && real.length > 0) {
        setArchiveRequests(real.map((r) => archiveApi.normalizeBackendRequest(r)));
        setLoadingRequests(false);
        return;
      }
    } catch {
      // fallback to local store
    }
    setArchiveRequests(archiveApi.getAllArchiveRequests());
    setLoadingRequests(false);
  };

  // 3. Fetch unarchive requests queue
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
    loadArchiveRequests();
    loadUnarchiveRequests();
  }, []);

  // Instant Unarchive (Admin Override - no request body needed)
  async function handleInstantRestore(dataset) {
    const id = dataset.id;
    if (!id || actionId) return;

    const confirmed = window.confirm(
      `Instant Restore Override:\n\nRestore "${dataset.title}" immediately?\nThis bypasses committee voting and un-archives the dataset instantly.`
    );
    if (!confirmed) return;

    setActionId(id);
    try {
      await datasetsApi.adminRestoreDataset(id);
      addToast(`Dataset "${dataset.title}" instantly restored.`, "success");
      setArchivedDatasets((list) => list.filter((d) => d.id !== id));
      loadArchiveRequests();
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

  const pendingArchiveCount = useMemo(
    () => archiveRequests.filter((r) => r.status === "pending").length,
    [archiveRequests]
  );
  const pendingUnarchiveCount = unarchiveRequests.length;

  return (
    <DashboardShell
      title="ORDP Admin Console"
      subtitle="Comprehensive Archive & Restore Management"
    >
      {/* Top summary metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-fade-in-up">
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
              Archived Datasets
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
          onClick={() => switchTab("archive-requests")}
          className={`cursor-pointer rounded-2xl border p-5 transition ${
            activeTab === "archive-requests"
              ? "bg-navy text-white border-navy shadow-md"
              : "bg-white border-border hover:border-gold/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Archive Requests
            </span>
            <Clock
              className={`w-5 h-5 ${activeTab === "archive-requests" ? "text-gold" : "text-amber-500"}`}
            />
          </div>
          <p className="text-3xl font-bold mt-2">{pendingArchiveCount}</p>
          <p className="text-xs mt-1 opacity-70">
            Awaiting committee review
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

      {/* Main Table Section */}
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
                All Archived Datasets ({archivedDatasets.length})
              </button>
              <button
                type="button"
                onClick={() => switchTab("archive-requests")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === "archive-requests"
                    ? "bg-navy text-white shadow-xs"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Archive Requests Queue ({pendingArchiveCount})
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

        {/* TAB 1: ALL ARCHIVED DATASETS (Admin Management Table) */}
        {activeTab === "archived" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50/70 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                  <th className="px-5 py-3 text-left font-semibold">Owner</th>
                  <th className="px-5 py-3 text-left font-semibold">Archived At</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    Admin Actions (Override)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingArchived ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gold" /> Loading archived datasets…
                      </span>
                    </td>
                  </tr>
                ) : filteredArchived.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-700">No Archived Datasets</p>
                      <p className="text-xs text-gray-500 mt-1">
                        There are currently no archived datasets in the portal.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredArchived.map((dataset) => {
                    const busy = actionId === dataset.id;
                    return (
                      <tr key={dataset.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-navy leading-tight">
                            {dataset.title || "Untitled Dataset"}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {dataset.id}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-gray-700 font-medium">
                          {dataset.owner || "Researcher"}
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(dataset.archived_at)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                            <Archive className="w-3 h-3" /> Archived
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setHistoryTarget(dataset)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-navy bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 transition"
                              title="View full archive/unarchive history"
                            >
                              <History className="w-3.5 h-3.5 text-navy" />
                              History
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleInstantRestore(dataset)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5 disabled:opacity-50 transition shadow-2xs"
                              title="Instant unarchive override (no request body needed)"
                            >
                              {busy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                              Instant Restore
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
                  <th className="px-5 py-3 text-right font-semibold">Review Actions</th>
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
                  <th className="px-5 py-3 text-left font-semibold">Intended Use & Reason</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Admin Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingUnarchive ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gold" /> Loading restore requests…
                      </span>
                    </td>
                  </tr>
                ) : unarchiveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
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
                        <td className="px-5 py-4 max-w-[320px]">
                          {req.intended_use && (
                            <p className="text-xs font-semibold text-navy">
                              Use: {req.intended_use}
                            </p>
                          )}
                          <p className="text-xs text-gray-600 mt-0.5 italic">
                            &ldquo;{req.reason || "No detailed reason provided."}&rdquo;
                          </p>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                          {formatDate(req.created_at)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
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
                              Approve Restore
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

      {/* Full Archive/Unarchive History Timeline Modal */}
      {historyTarget && (
        <ArchiveHistoryModal
          dataset={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </DashboardShell>
  );
}