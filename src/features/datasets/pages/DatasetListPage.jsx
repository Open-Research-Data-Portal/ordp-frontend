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
} from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import Sidebar from "../../../layouts/Sidebar";
import { useAuth } from "../../../context/useAuth";
import { getDatasetImage } from "../../../utils/datasetImage";

import * as datasetsApi from "../hooks/datasetsApi";

const STATUS_META = {
  approved: { label: "APPROVED", dot: "bg-success", text: "text-success" },
  pending: { label: "PENDING", dot: "bg-[#D98A0D]", text: "text-[#D98A0D]" },
  rejected: { label: "REJECTED", dot: "bg-danger", text: "text-danger" },
  draft: { label: "DRAFT", dot: "bg-gray-400", text: "text-gray-500" },
};

const STATUS_FILTERS = [
  { id: "all", label: "All Datasets" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "rejected", label: "Rejected" },
  { id: "draft", label: "Draft" },
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
  const [menuId, setMenuId] = useState(null);
  const [confirmDraft, setConfirmDraft] = useState(null);
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

  useEffect(() => {
    let isMounted = true;

    const loadDatasets = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        if (statusFilter !== "all") {
          params.status = statusFilter;
        }
        const data = await datasetsApi.getMyDatasets(params);
        if (isMounted) {
          const list = Array.isArray(data) ? data : data?.results || [];
          setDatasets(list);
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
  }, [statusFilter]);

  const displayName =
    (user?.full_name ??
      [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim()) ||
    user?.username ||
    user?.email ||
    "User";

  const filtered = useMemo(() => {
    const active = datasets.filter((d) => d.is_active !== false);
    return active
      .filter((d) => (search.trim() ? d.title?.toLowerCase().includes(search.trim().toLowerCase()) : true))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [datasets, search]);

  // Reset to first page whenever filters change
  useEffect(() => { queueMicrotask(() => setPage(0)); }, [statusFilter, search, rowsPerPage]);

  const totalRows = filtered.length;
  const pageStart = page * rowsPerPage;
  const pageEnd = Math.min(pageStart + rowsPerPage, totalRows);
  const pageRows = filtered.slice(pageStart, pageEnd);
  const canGoPrev = page > 0;
  const canGoNext = pageEnd < totalRows;

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F3]">
      <TopBar title="My Datasets" user={{ name: displayName }} />
      <div className="flex flex-1 min-w-0">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 px-8 py-8">
            <div className="p-8 lg:p-10 bg-white min-h-screen rounded-2xl border border-[#E3E1DA]">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-serif font-bold text-navy">My Datasets</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Track the status of every dataset you've submitted.
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
                {/* Filtering is already live as you type (see `filtered` above),
                    so this button has no onClick logic of its own — it's the
                    visible "Search" affordance in place of the old Filters
                    button, not a separate trigger. */}
                <button
                  type="button"
                  className="flex items-center gap-2 bg-navy hover:bg-navy-dark text-white rounded-full px-5 py-2.5 text-sm font-semibold shrink-0 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>

              {/* Status filter pills */}
              <div className="flex flex-wrap items-center gap-2 mb-8">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id)}
                    className={[
                      "px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors",
                      statusFilter === f.id
                        ? "bg-gold text-white"
                        : "bg-[#F0EFEA] text-gray-600 hover:bg-[#E3E1DA]",
                    ].join(" ")}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {error && <p role="alert" className="text-danger mb-4">{error}</p>}
              {loading && <p className="text-gray-500">Loading datasets…</p>}

              {!loading && !error && totalRows === 0 && (
                <div className="bg-[#F7F6F2] rounded-xl p-10 text-center border border-[#E3E1DA]">
                  <p className="text-gray-500 mb-4">
                    {datasets.length === 0
                      ? "You haven't uploaded any datasets yet."
                      : "No datasets match your search or filter."}
                  </p>
                  {datasets.length === 0 && (
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
                      const meta = STATUS_META[dataset.status] || STATUS_META.draft;
                      const size = formatFileSize(dataset.file_size);
                      return (
                        <div
                          key={dataset.id}
                          className="bg-white rounded-xl border border-[#E3E1DA] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                          // FIX: this used to navigate to /datasets/${id}, which now
                          // resolves to the PUBLIC DatasetViewPage. This is the
                          // researcher's own dataset list, so it needs to land on
                          // /my-datasets/${id} -> DatasetDetailPage instead.
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
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); dataset.status === "draft" ? setConfirmDraft(dataset) : setMenuId(menuId === dataset.id ? null : dataset.id); }}
                                className="p-1 text-gray-400 hover:text-navy shrink-0"
                                aria-label={dataset.status === "draft" ? "Delete draft" : "More options"}
                              >
                                {dataset.status === "draft" ? <Trash2 className="w-4 h-4 text-red-500" /> : <MoreVertical className="w-4 h-4" />}
                              </button>
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
      </main>
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
        </div>
      </div>
    </div>
  );
}
