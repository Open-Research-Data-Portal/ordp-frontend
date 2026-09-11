import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Trash2,
  Archive,
  Download,
  FileText,
  ImageIcon,
  Send,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName, getDashboardPath } from "../../../utils/userRoles";
import { getDatasetImage } from "../../../utils/datasetImage";
import * as datasetsApi from "../hooks/datasetsApi";
import * as archiveApi from "../../../api/archiveRequests";
import { useToast } from "../../../context/ToastContext.jsx";

const STATUS_META = {
  approved: { label: "APPROVED", dot: "bg-success", text: "text-success" },
  pending: { label: "PENDING", dot: "bg-[#D98A0D]", text: "text-[#D98A0D]" },
  rejected: { label: "REJECTED", dot: "bg-danger", text: "text-danger" },
  draft: { label: "DRAFT", dot: "bg-gray-400", text: "text-gray-500" },
};

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const ROWS_PER_PAGE_OPTIONS = [6, 12, 18];

function formatDate(dateString) {
  if (!dateString) return "—";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Updated today";
  if (days === 1) return "Updated 1 day ago";
  if (days < 30) return `Updated ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Updated ${months} mo ago`;
  return `Updated ${Math.floor(months / 12)}y ago`;
}

function formatFileSize(bytes) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DatasetListPage() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [page, setPage] = useState(0);
  const [confirmDraft, setConfirmDraft] = useState(null);

  // Archive request state
  const [requestedMap, setRequestedMap] = useState(() => new Map());
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveComment, setArchiveComment] = useState("");
  const [archiveSubmitting, setArchiveSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  async function deleteDraft(dataset) {
    const s = String(dataset.status || "").toLowerCase();
    if (s !== "draft") return;
    try {
      await datasetsApi.deleteDataset(dataset.id);
      setDatasets((items) => items.filter((item) => item.id !== dataset.id));
      addToast("Draft deleted successfully.", "success");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete draft.");
    }
  }

  function openArchiveModal(dataset) {
    setArchiveTarget(dataset);
    setArchiveReason("");
    setArchiveComment("");
  }

  async function submitArchiveRequestModal() {
    if (!archiveTarget || !archiveReason) return;
    setArchiveSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const comment = archiveComment.trim();
      const reasonText = comment || archiveApi.reasonLabel(archiveReason);
      let entry;
      try {
        const resp = await datasetsApi.archiveDataset(archiveTarget.id, {
          reason_category: archiveReason,
          reason: reasonText,
        });
        entry = {
          id: resp?.request_id || `arch-req-${Date.now()}`,
          dataset_id: String(archiveTarget.id),
          dataset_title: archiveTarget.title,
          owner_name: getDisplayName(user),
          owner_email: user?.email,
          reason: archiveReason,
          comment,
          requested_at: new Date().toISOString(),
          status: "pending",
          source: "api",
        };
        archiveApi.mirrorSubmittedRequest(entry);
      } catch {
        entry = archiveApi.submitArchiveRequest({
          dataset_id: archiveTarget.id,
          dataset_title: archiveTarget.title,
          owner_name: getDisplayName(user),
          owner_email: user?.email,
          reason: archiveReason,
          comment,
        });
      }
      setRequestedMap((prev) => {
        const next = new Map(prev);
        next.set(String(archiveTarget.id), entry);
        return next;
      });
      addToast("Archive request sent to the review queue.", "success");
      setArchiveTarget(null);
      setArchiveReason("");
      setArchiveComment("");
    } catch (err) {
      addToast(err?.message || "Failed to send archive request.", "error");
    } finally {
      setArchiveSubmitting(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    const loadDatasets = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all datasets for the user so tabs can be toggled without roundtrip delays
        const data = await datasetsApi.getMyDatasets();
        if (isMounted) {
          const list = Array.isArray(data) ? data : data?.results || [];
          setDatasets(list);
          const map = new Map();
          list.forEach((d) => {
            const req = archiveApi.getArchiveRequestsForDataset(d.id)[0];
            if (req) map.set(String(d.id), req);
          });
          setRequestedMap(map);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || "Failed to load your datasets.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDatasets();
    return () => { isMounted = false; };
  }, []);

  // Compute counts for tabs
  const tabCounts = useMemo(() => {
    const active = datasets.filter((d) => d.is_active !== false);
    return {
      all: active.length,
      draft: active.filter((d) => String(d.status || "").toLowerCase() === "draft").length,
      pending: active.filter((d) => {
        const s = String(d.status || "").toLowerCase();
        return s === "pending" || s === "submitted" || s === "in_review";
      }).length,
      approved: active.filter((d) => String(d.status || "").toLowerCase() === "approved").length,
      rejected: active.filter((d) => {
        const s = String(d.status || "").toLowerCase();
        return s === "rejected" || s === "changes_requested";
      }).length,
    };
  }, [datasets]);

  // Filter datasets strictly according to active tab and search
  const filtered = useMemo(() => {
    const active = datasets.filter((d) => d.is_active !== false);
    return active
      .filter((d) => {
        if (statusFilter === "all") return true;
        const s = String(d.status || "").toLowerCase();
        if (statusFilter === "pending") {
          return s === "pending" || s === "submitted" || s === "in_review";
        }
        if (statusFilter === "rejected") {
          return s === "rejected" || s === "changes_requested";
        }
        return s === statusFilter;
      })
      .filter((d) => (search.trim() ? d.title?.toLowerCase().includes(search.trim().toLowerCase()) : true))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [datasets, statusFilter, search]);

  // Reset to first page whenever filters change
  useEffect(() => { queueMicrotask(() => setPage(0)); }, [statusFilter, search, rowsPerPage]);

  const totalRows = filtered.length;
  const pageStart = page * rowsPerPage;
  const pageEnd = Math.min(pageStart + rowsPerPage, totalRows);
  const pageRows = filtered.slice(pageStart, pageEnd);
  const canGoPrev = page > 0;
  const canGoNext = pageEnd < totalRows;

  return (
    <DashboardShell title="My Datasets" subtitle="Track the status of every dataset you've submitted.">
      <div className="p-8 lg:p-10 bg-white min-h-full rounded-2xl border border-[#E3E1DA]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <button
              type="button"
              onClick={() => navigate(getDashboardPath(user))}
              className="mb-3 inline-flex items-center text-xs font-semibold text-gray-500 hover:text-navy transition-colors"
            >
              ← Back to dashboard
            </button>
            <h1 className="text-3xl font-serif font-bold text-navy">My Datasets</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your submissions, track peer review status, and initiate archive requests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/datasets/contribute?new=1")}
            className="flex items-center gap-2 bg-navy hover:bg-navy-dark text-white rounded-full px-5 py-2.5 text-sm font-semibold shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Dataset
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 border border-[#E3E1DA] rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="w-full text-sm text-navy placeholder:text-gray-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Status Tabs with Visual Separation */}
        <div className="flex border-b border-[#E3E1DA] mb-8 overflow-x-auto gap-2">
          {STATUS_TABS.map((tab) => {
            const count = tabCounts[tab.id] ?? 0;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap ${
                  isActive
                    ? "border-navy text-navy"
                    : "border-transparent text-gray-500 hover:text-navy hover:border-gray-300"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-navy text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {error && <p role="alert" className="text-danger mb-4">{error}</p>}
        {loading && <p className="text-gray-500">Loading datasets…</p>}

        {/* Empty State when no datasets match current tab */}
        {!loading && !error && totalRows === 0 && (
          <div className="bg-[#F7F6F2] rounded-xl p-10 text-center border border-[#E3E1DA]">
            {statusFilter === "approved" ? (
              <p className="text-base text-gray-600 font-medium">No approved datasets yet.</p>
            ) : statusFilter === "draft" ? (
              <p className="text-base text-gray-600 font-medium">No draft datasets found.</p>
            ) : statusFilter === "pending" ? (
              <p className="text-base text-gray-600 font-medium">No datasets currently pending review.</p>
            ) : statusFilter === "rejected" ? (
              <p className="text-base text-gray-600 font-medium">No rejected datasets.</p>
            ) : datasets.length === 0 ? (
              <>
                <p className="text-gray-500 mb-4">You haven't uploaded any datasets yet.</p>
                <button
                  onClick={() => navigate("/datasets/contribute?new=1")}
                  className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-4 py-2 text-sm font-semibold transition"
                >
                  Upload your first dataset
                </button>
              </>
            ) : (
              <p className="text-gray-500">No datasets match your search.</p>
            )}
          </div>
        )}

        {!loading && !error && totalRows > 0 && (
          <>
            {/* Card grid — 6 visible per page */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pageRows.map((dataset) => {
                const statusNormalized = String(dataset.status || "draft").toLowerCase();
                const isDraft = statusNormalized === "draft";
                const isApproved = statusNormalized === "approved";
                const isPending = statusNormalized === "pending" || statusNormalized === "submitted" || statusNormalized === "in_review";
                const isRejected = statusNormalized === "rejected" || statusNormalized === "changes_requested";

                const meta = STATUS_META[statusNormalized] || STATUS_META.draft;
                const size = formatFileSize(dataset.file_size);
                const pendingArchive = requestedMap.get(String(dataset.id)) || null;
                const archivePending = pendingArchive?.status === "pending";

                return (
                  <div
                    key={dataset.id}
                    className="bg-white rounded-xl border border-[#E3E1DA] overflow-hidden hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
                    onClick={() =>
                      navigate(isDraft ? `/datasets/contribute?draft=${dataset.id}` : `/my-datasets/${dataset.id}`)
                    }
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <div className="h-40 w-full bg-gray-100 overflow-hidden">
                        {getDatasetImage(dataset) ? (
                          <img
                            src={getDatasetImage(dataset)}
                            alt={dataset.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-navy/10 to-gold/10">
                            <ImageIcon className="w-8 h-8 text-navy/30" />
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-navy line-clamp-2">{dataset.title}</p>
                          {/* DRAFT SPEC: Draft cards only have a Delete button, no menu */}
                          {isDraft && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDraft(dataset);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 shrink-0 rounded hover:bg-red-50 transition"
                              title="Delete draft"
                              aria-label="Delete draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold mt-1.5 ${meta.text}`}>
                          <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>

                        <p className="text-xs text-gray-500 mt-2">
                          {dataset.category || dataset.subject_name || "Uncategorized"} · {formatDate(dataset.created_at)}
                        </p>

                        <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {dataset.file_count ?? 1} File{(dataset.file_count ?? 1) !== 1 ? "s" : ""}
                            {size ? ` · ${size}` : ""}
                          </span>
                          {dataset.downloads != null && (
                            <span className="flex items-center gap-1">
                              <Download className="w-3.5 h-3.5" />
                              {dataset.downloads.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* REJECTED FEEDBACK */}
                        {isRejected && (dataset.moderation_reason || dataset.feedback || dataset.reason) && (
                          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-red-700 flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <p className="line-clamp-2">
                              {dataset.moderation_reason || dataset.feedback || dataset.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Bottom Area */}
                    {/* SPEC RULE: Archive button ONLY on Approved datasets! */}
                    {isApproved && (
                      <div className="px-4 pb-4 pt-2.5 border-t border-[#F0EFEA] mt-2">
                        {archivePending ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                            <Archive className="w-3.5 h-3.5" />
                            Request Pending Review
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openArchiveModal(dataset);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-[#F0EFEA] hover:bg-[#E3E1DA] rounded-full px-3.5 py-1.5 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            Request Archive
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end gap-4 mt-8 text-sm text-gray-500">
              <span>Rows per page</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="border border-[#E3E1DA] rounded-full px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-navy"
              >
                {ROWS_PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{totalRows === 0 ? "0" : pageStart + 1} to {pageEnd} of {totalRows}</span>
              <button
                type="button"
                disabled={!canGoPrev}
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                className="text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:text-navy"
                aria-label="Previous page"
              >
                ‹
              </button>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setPage((p) => p + 1)}
                className="text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:text-navy"
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </>
        )}
      </div>

      {/* Archive Modal */}
      {archiveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4"
          onClick={() => !archiveSubmitting && setArchiveTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-[#E3E1DA] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <h2 className="text-base font-semibold text-navy">Request Dataset Archive</h2>
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                className="p-1 text-gray-400 hover:text-navy rounded-lg transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              “{archiveTarget.title}” will be sent to the review queue for archiving.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="archive-reason" className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Reason for archiving
                </label>
                <select
                  id="archive-reason"
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full rounded-lg border border-[#E3E1DA] text-sm py-2.5 px-3 bg-white focus:outline-none focus:border-navy"
                >
                  <option value="">Select a reason…</option>
                  {archiveApi.ARCHIVE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="archive-comment" className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Comment <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="archive-comment"
                  rows={3}
                  value={archiveComment}
                  onChange={(e) => setArchiveComment(e.target.value)}
                  placeholder="Add any additional details for the reviewer…"
                  className="w-full rounded-lg border border-[#E3E1DA] text-sm py-2.5 px-3 bg-white focus:outline-none focus:border-navy resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveTarget(null)}
                className="rounded-md border border-[#E3E1DA] px-4 py-2 text-sm font-medium text-gray-600 hover:bg-[#F7F6F2] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!archiveReason || archiveSubmitting}
                onClick={submitArchiveRequestModal}
                className="inline-flex items-center gap-2 rounded-md bg-[#A67A0D] hover:bg-[#8f690b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {archiveSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {archiveSubmitting ? "Sending…" : "Send Archive Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Confirmation Modal */}
      {confirmDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={() => setConfirmDraft(null)}>
          <div className="w-full max-w-sm rounded-xl border border-[#E3E1DA] bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-navy">Delete draft?</h2>
            <p className="mt-2 text-sm text-gray-500">This will permanently remove “{confirmDraft.title}”.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDraft(null)} className="rounded-md border border-[#E3E1DA] px-3 py-2 text-sm font-medium text-gray-600">Cancel</button>
              <button type="button" onClick={() => { const draft = confirmDraft; setConfirmDraft(null); deleteDraft(draft); }} className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
