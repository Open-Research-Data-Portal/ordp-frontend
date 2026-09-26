import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  MoreVertical,
  FileText,
  Download,
  Image as ImageIcon,
  Trash2,
  Eye,
  Mail,
  Users,
  Loader2,
  X,
  Archive,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { useAuth } from "../../../context/useAuth";
import { getDatasetImage } from "../../../utils/datasetImage";
import { getDashboardPath } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";
import DatasetPreviewModal from "../../../components/dashboard/DatasetPreviewModal";

const STATUS_META = {
  published: { label: "PUBLISHED", dot: "bg-success", text: "text-success" },
  approved: { label: "PUBLISHED", dot: "bg-success", text: "text-success" },
  pending: { label: "PENDING", dot: "bg-[#D98A0D]", text: "text-[#D98A0D]" },
  rejected: { label: "REJECTED", dot: "bg-danger", text: "text-danger" },
  draft: { label: "DRAFT", dot: "bg-gray-400", text: "text-gray-500" },
  archived: { label: "ARCHIVED", dot: "bg-gray-500", text: "text-gray-600" },
};

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending", label: "Pending" },
  { id: "published", label: "Published" },
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

function isPendingReviewStatus(status) {
  const value = String(status || "").toLowerCase();
  return value === "pending" || value === "submitted" || value === "in_review";
}

export default function DatasetListPage({
  defaultStatusFilter = "all",
  title = "My Datasets",
  subtitle = "Track the status of every dataset you've submitted.",
}) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(defaultStatusFilter);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [page, setPage] = useState(0);
  const [menuId, setMenuId] = useState(null);
  const [confirmDraft, setConfirmDraft] = useState(null);
  const [previewDataset, setPreviewDataset] = useState(null);
  const [reviewerModal, setReviewerModal] = useState(null);
  const [reviewerLoadingId, setReviewerLoadingId] = useState("");
  const [reviewerError, setReviewerError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  async function deleteDraft(dataset) {
    setMenuId(null);
    if (dataset.status !== "draft") return;
    try {
      await datasetsApi.deleteDataset(dataset.id);
      setDatasets((items) => items.filter((item) => item.id !== dataset.id));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to delete draft.");
    }
  }

  async function openReviewerContacts(dataset) {
    setReviewerModal({ dataset, reviewers: [] });
    setReviewerError("");
    setReviewerLoadingId(dataset.id);
    try {
      const data = await datasetsApi.getDatasetReviewers(dataset.id);
      setReviewerModal({
        dataset,
        reviewers: Array.isArray(data?.reviewers) ? data.reviewers : [],
      });
    } catch (err) {
      setReviewerError(err.response?.data?.detail || "Unable to load reviewer contacts.");
    } finally {
      setReviewerLoadingId("");
    }
  }

  const isArchivedPage = title.toLowerCase().includes("archived");

  useEffect(() => {
    let isMounted = true;

    const loadDatasets = async () => {
      setLoading(true);
      setError(null);
      try {
        let data;
        if (isArchivedPage) {
          try {
            data = await datasetsApi.getArchivedDatasets();
          } catch {
            try {
              data = await datasetsApi.getAdminArchivedDatasets();
            } catch {
              // If both endpoints fail, gracefully fallback to an empty array instead of crashing/throwing
              data = [];
            }
          }
        } else {
          const params = {};
          if (statusFilter !== "all") {
            params.status = statusFilter === "approved" ? "published" : statusFilter;
          }
          try {
            data = await datasetsApi.getMyDatasets(params);
          } catch {
            // Fallback to general datasets or empty array if /datasets/mine/ errors out
            try {
              data = await datasetsApi.getDatasets();
            } catch {
              data = [];
            }
          }
        }
        if (isMounted) {
          const list = Array.isArray(data) ? data : data?.results || [];
          setDatasets(list);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.detail || "Failed to load datasets.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDatasets();
    return () => { isMounted = false; };
  }, [statusFilter, title, isArchivedPage]);

  const datasetsArray = useMemo(() => (Array.isArray(datasets) ? datasets : []), [datasets]);

  // Compute counts for tabs
  const tabCounts = useMemo(() => {
    const active = datasetsArray.filter((d) => d.is_active !== false);
    return {
      all: active.length,
      draft: active.filter((d) => String(d.status || "").toLowerCase() === "draft").length,
      pending: active.filter((d) => {
        const s = String(d.status || "").toLowerCase();
        return s === "pending" || s === "submitted" || s === "in_review";
      }).length,
      published: active.filter((d) => {
        const s = String(d.status || "").toLowerCase();
        return s === "published" || s === "approved";
      }).length,
      rejected: active.filter((d) => {
        const s = String(d.status || "").toLowerCase();
        return s === "rejected" || s === "changes_requested";
      }).length,
    };
  }, [datasetsArray]);

  // Filter datasets strictly according to active tab and search
  const filtered = useMemo(() => {
    const active = datasetsArray.filter((d) => d.is_active !== false);
    return active
      .filter((d) => {
        if (isArchivedPage) return true;
        if (d.is_archived) return false;
        if (statusFilter === "all") return true;
        const s = String(d.status || "").toLowerCase();
        if (statusFilter === "pending") {
          return s === "pending" || s === "submitted" || s === "in_review";
        }
        if (statusFilter === "published" || statusFilter === "approved") {
          return s === "published" || s === "approved";
        }
        if (statusFilter === "rejected") {
          return s === "rejected" || s === "changes_requested";
        }
        return s === statusFilter;
      })
      .filter((d) => (search.trim() ? d.title?.toLowerCase().includes(search.trim().toLowerCase()) : true))
      .sort((a, b) => new Date(b.created_at || b.archived_at || 0).getTime() - new Date(a.created_at || a.archived_at || 0).getTime());
  }, [datasetsArray, search, statusFilter, isArchivedPage]);

  // Reset to first page whenever filters change
  useEffect(() => { queueMicrotask(() => setPage(0)); }, [statusFilter, search, rowsPerPage]);

  const totalRows = filtered.length;
  const pageStart = page * rowsPerPage;
  const pageEnd = Math.min(pageStart + rowsPerPage, totalRows);
  const pageRows = filtered.slice(pageStart, pageEnd);
  const canGoPrev = page > 0;
  const canGoNext = pageEnd < totalRows;

  return (
    <DashboardShell title={title} subtitle={subtitle}>
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
            <h1 className="text-3xl font-serif font-bold text-navy">{title}</h1>
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          </div>
          {!isArchivedPage && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/my-archive")}
                className="flex items-center gap-2 border border-slate-300 hover:border-navy text-slate-700 hover:text-navy bg-white rounded-full px-4 py-2.5 text-sm font-semibold shrink-0 transition-all shadow-2xs cursor-pointer"
                title="View your archived datasets"
              >
                <Archive className="w-4 h-4 text-slate-500" />
                My Archive
              </button>
              <button
                type="button"
                onClick={() => navigate("/datasets/contribute?new=1")}
                className="flex items-center gap-2 bg-navy hover:bg-navy-dark text-white rounded-full px-5 py-2.5 text-sm font-semibold shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Dataset
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2 border border-[#E3E1DA] rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search datasets"
              className="w-full text-sm text-navy placeholder:text-gray-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-2 bg-navy hover:bg-navy-dark text-white rounded-full px-5 py-2.5 text-sm font-semibold shrink-0 transition-colors"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>

        {/* Status filter pills */}
        {!isArchivedPage && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {STATUS_TABS.map((f) => {
              const count = tabCounts?.[f.id] ?? 0;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={[
                    "px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors flex items-center gap-1.5",
                    statusFilter === f.id
                      ? "bg-gold text-white"
                      : "bg-[#F0EFEA] text-gray-600 hover:bg-[#E3E1DA]",
                  ].join(" ")}
                >
                  <span>{f.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      statusFilter === f.id
                        ? "bg-white/25 text-white"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {error && <p role="alert" className="text-danger mb-4">{error}</p>}
        {loading && <p className="text-gray-500">Loading datasets…</p>}

        {!loading && !error && totalRows === 0 && (
          <div className="bg-[#F7F6F2] rounded-xl p-10 text-center border border-[#E3E1DA]">
            <p className="text-gray-500 mb-4">
              {datasetsArray.length === 0
                ? (isArchivedPage ? "No archived datasets available." : "You haven't uploaded any datasets yet.")
                : "No datasets match your search or filter."}
            </p>
            {datasetsArray.length === 0 && !isArchivedPage && (
              <button
                onClick={() => navigate("/datasets/contribute?new=1")}
                className="bg-[#A67A0D] hover:bg-[#8f690b] text-white rounded-md px-4 py-2 text-sm font-semibold transition"
              >
                Upload your first dataset
              </button>
            )}
          </div>
        )}

              {!loading && !error && totalRows > 0 && (
                <>
                  {/* Card grid — 6 visible per page */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {pageRows.map((dataset) => {
                      const meta = dataset.is_archived ? (STATUS_META.archived || STATUS_META.published) : (STATUS_META[dataset.status] || STATUS_META.draft);
                      const size = formatFileSize(dataset.file_size);
                      const canContactReviewers = !isArchivedPage && isPendingReviewStatus(dataset.status);
                      return (
                        <div
                          key={dataset.id}
                          className="bg-white rounded-xl border border-[#E3E1DA] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => navigate(dataset.status === "draft" ? `/datasets/contribute?draft=${dataset.id}` : `/my-datasets/${dataset.id}`)}
                        >
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
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setPreviewDataset(dataset); }}
                                  className="p-1.5 text-gray-400 hover:text-navy rounded-full hover:bg-gray-100 transition"
                                  title="Preview dataset details"
                                  aria-label="Preview dataset details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); dataset.status === "draft" ? setConfirmDraft(dataset) : setMenuId(menuId === dataset.id ? null : dataset.id); }}
                                  className="p-1 text-gray-400 hover:text-navy"
                                  aria-label={dataset.status === "draft" ? "Delete draft" : "More options"}
                                >
                                  {dataset.status === "draft" ? <Trash2 className="w-4 h-4 text-red-500" /> : <MoreVertical className="w-4 h-4" />}
                                </button>
                              </div>
                              {menuId === dataset.id && dataset.status !== "draft" && (
                                <div className="absolute right-4 mt-2 z-10 w-36 rounded-lg border border-[#E3E1DA] bg-white p-1.5 shadow-lg">
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDraft(dataset); setMenuId(null); }} className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50">Delete draft</button>
                                </div>
                              )}
                            </div>

                            {/* Status under the title */}
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
                            {canContactReviewers && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReviewerContacts(dataset);
                                }}
                                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                              >
                                {reviewerLoadingId === dataset.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Users className="w-3.5 h-3.5" />
                                )}
                                Reviewer contacts
                              </button>
                            )}
                          </div>
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
      {previewDataset && (
        <DatasetPreviewModal
          dataset={previewDataset}
          onClose={() => setPreviewDataset(null)}
        />
      )}
      {reviewerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setReviewerModal(null)}>
          <div className="w-full max-w-lg rounded-xl border border-[#E3E1DA] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[#E3E1DA] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-navy">Reviewer contacts</h2>
                <p className="mt-1 text-xs text-gray-500">{reviewerModal.dataset?.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewerModal(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-navy"
                aria-label="Close reviewer contacts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              {reviewerLoadingId === reviewerModal.dataset?.id ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin text-gold" />
                  Loading reviewer contacts...
                </div>
              ) : reviewerError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{reviewerError}</p>
              ) : reviewerModal.reviewers.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No reviewers have been assigned yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {reviewerModal.reviewers.map((reviewer) => (
                    <article key={reviewer.id} className="rounded-lg border border-[#E3E1DA] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy">{reviewer.full_name || reviewer.username || reviewer.email}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {[reviewer.academic_title, reviewer.affiliation, reviewer.college].filter(Boolean).join(" - ") || "Reviewer"}
                          </p>
                        </div>
                        {reviewer.contact_email && (
                          <a
                            href={reviewer.contact_url || `mailto:${reviewer.contact_email}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-dark"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            Email
                          </a>
                        )}
                      </div>
                      {reviewer.contact_email && (
                        <p className="mt-3 break-all text-xs text-gray-500">{reviewer.contact_email}</p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
