import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName } from "../../../utils/userRoles";
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  BarChart3,
  MessageSquare,
  Loader2,
  BookOpen,
  X,
  ExternalLink,
  ChevronRight,
  FileText,
  TrendingUp,
  Database,
  Download,
  Table,
  Info,
  Tag,
  Trash2,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { StatusBadge, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useToast } from "../../../context/ToastContext.jsx";
import * as datasetsApi from "../hooks/datasetsApi.js";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return String(dateString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadPreviewCsv(file, datasetTitle) {
  if (!file?.preview_rows || !file.preview_rows.length) return;
  const header = file.columns && file.columns.length > 0
    ? file.columns.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",") + "\n"
    : "";
  const rows = file.preview_rows
    .map((row) => (Array.isArray(row) ? row : [row]).map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(datasetTitle || "dataset").replace(/[^a-z0-9_-]/gi, "_")}_preview.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "datasets", label: "Review Datasets" },
  { id: "content-updates", label: "Content Updates" },
  { id: "revision-requests", label: "Revision Requests" },
  { id: "access-requests", label: "Access Requests" },
  { id: "my-reviews", label: "My Reviews" },
];

export default function ReviewerDashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  // ── State ────────────────────────────────────────────────────────────
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [guidelines, setGuidelines] = useState(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  const [datasetQueue, setDatasetQueue] = useState([]);
  const [contentUpdates, setContentUpdates] = useState([]);
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [myReviews, setMyReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  // Dataset detail drawer
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [datasetDetail, setDatasetDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decisionModal, setDecisionModal] = useState(null); // { id, type } "rejected"|"changes_requested"
  const [decisionReason, setDecisionReason] = useState("");

  // Reviewer thumbnail suggestion & dataset deletion request state
  const [thumbnailModal, setThumbnailModal] = useState(null); // dataset item
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [submittingThumbnail, setSubmittingThumbnail] = useState(false);

  const [deletionModal, setDeletionModal] = useState(null); // dataset item
  const [deletionReason, setDeletionReason] = useState("");
  const [submittingDeletion, setSubmittingDeletion] = useState(false);

  // ── Data loading ─────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setForbidden(false);
      try {
        const results = await Promise.allSettled([
          datasetsApi.getReviewerOverview(),   // 0
          datasetsApi.getReviewerMetrics(),    // 1
          datasetsApi.getReviewerQueue(),      // 2 — /admin-panel/queue/
          datasetsApi.getContentUpdateQueue(), // 3
          datasetsApi.getRevisionRequestsQueue(), // 4
          datasetsApi.getAccessRequestsQueue(), // 5
          datasetsApi.getMyReviews(),          // 6 — /admin-panel/my-reviews/
          datasetsApi.getAdminPendingReviews(), // 7 fallback
        ]);
        if (!active) return;

        if (results[0].status === "rejected" && results[0].reason?.response?.status === 403) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        if (results[0].status === "fulfilled") setOverview(results[0].value);
        if (results[1].status === "fulfilled") setMetrics(results[1].value);

        const reviewerQ = results[2].status === "fulfilled" ? normalizeList(results[2].value) : [];
        const adminPending = results[7].status === "fulfilled" ? normalizeList(results[7].value) : [];
        const seen = new Set();
        const merged = [];
        for (const item of [...reviewerQ, ...adminPending]) {
          const id = String(item.id || item.dataset_id);
          if (!seen.has(id)) { seen.add(id); merged.push(item); }
        }
        const pendingOnly = merged.filter((d) => {
          const s = String(d.status || "").toLowerCase();
          return !s || s === "pending" || s === "submitted" || s === "in_review";
        });
        setDatasetQueue(pendingOnly.length > 0 ? pendingOnly : merged);

        if (results[3].status === "fulfilled") setContentUpdates(normalizeList(results[3].value));
        if (results[4].status === "fulfilled") setRevisionRequests(normalizeList(results[4].value));
        if (results[5].status === "fulfilled") setAccessRequests(normalizeList(results[5].value));
        if (results[6].status === "fulfilled") setMyReviews(normalizeList(results[6].value));
      } catch {
        addToast("Failed to load reviewer dashboard.", "error");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [addToast]);

  const loadGuidelines = useCallback(async () => {
    if (guidelines) { setShowGuidelines(true); return; }
    try {
      const data = await datasetsApi.getReviewerGuidelines();
      setGuidelines(data);
      setShowGuidelines(true);
    } catch {
      addToast("Failed to load guidelines.", "error");
    }
  }, [guidelines, addToast]);

  // ── Computed stats ───────────────────────────────────────────────────
  const pendingCounts = useMemo(() => ({
    datasets: datasetQueue.length,
    contentUpdates: contentUpdates.length,
    revisionRequests: revisionRequests.length,
    accessRequests: accessRequests.length,
    total: datasetQueue.length + contentUpdates.length + revisionRequests.length + accessRequests.length,
  }), [datasetQueue, contentUpdates, revisionRequests, accessRequests]);

  const reviewStats = useMemo(() => {
    const approved = metrics?.approved ?? myReviews.filter(r => String(r.decision || r.vote || r.status || "").toLowerCase() === "approved").length;
    const rejected = metrics?.rejected ?? myReviews.filter(r => String(r.decision || r.vote || r.status || "").toLowerCase() === "rejected").length;
    const total = metrics?.total_reviewed ?? myReviews.length;
    return { total, approved, rejected, pending: pendingCounts.datasets };
  }, [metrics, myReviews, pendingCounts.datasets]);

  function setTab(tabId) {
    if (tabId === "overview") setSearchParams({});
    else setSearchParams({ tab: tabId });
  }

  // ── View Dataset ─────────────────────────────────────────────────────
  async function handleViewDataset(item) {
    setSelectedDataset(item);
    setDatasetDetail(null);
    setDetailLoading(true);
    try {
      const id = item.id || item.dataset_id;
      const raw = await datasetsApi.getDatasetDetail(id);
      setDatasetDetail(raw);
    } catch {
      setDatasetDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedDataset(null);
    setDatasetDetail(null);
    setDecisionModal(null);
    setDecisionReason("");
  }

  const [downloading, setDownloading] = useState(false);

  async function handleDownloadDataset(datasetId) {
    setDownloading(true);
    try {
      const url = await datasetsApi.getDownloadUrl(datasetId);
      if (url) {
        window.open(url, "_blank");
        addToast("Dataset download started.", "success");
        return;
      }
    } catch {
      // Fallback
    } finally {
      setDownloading(false);
    }

    const firstFile = datasetDetail?.files?.[0];
    if (firstFile?.preview_rows && firstFile.preview_rows.length > 0) {
      downloadPreviewCsv(firstFile, datasetDetail?.title || selectedDataset?.title);
      addToast("Exported sample preview rows to CSV.", "success");
    } else {
      addToast("Download link is not available yet for this pending submission.", "info");
    }
  }

  // ── Decision handlers ─────────────────────────────────────────────────
  async function handleDecide(datasetId, decision, reason = "") {
    if ((decision === "rejected" || decision === "changes_requested") && !reason.trim()) {
      setDecisionModal({ id: datasetId, type: decision });
      return;
    }
    setActionId(datasetId);
    try {
      await datasetsApi.moderateDataset(datasetId, { decision, reason });
      addToast(`Dataset ${decision.replace("_", " ")} successfully.`, "success");
      setDatasetQueue((s) => s.filter((d) => String(d.id || d.dataset_id) !== String(datasetId)));
      setMetrics((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          approved: decision === "approved" ? (prev.approved || 0) + 1 : prev.approved,
          rejected: decision === "rejected" ? (prev.rejected || 0) + 1 : prev.rejected,
          total_reviewed: (prev.total_reviewed || 0) + 1,
        };
      });
      setMyReviews((prev) => [
        {
          dataset_id: datasetId,
          dataset_title: selectedDataset?.title || "Dataset",
          decision,
          reason,
          decided_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      closeDetail();
    } catch (err) {
      addToast(err?.response?.data?.detail || err?.message || `Failed to ${decision} dataset.`, "error");
    } finally {
      setActionId(null);
    }
  }

  async function submitDecisionWithReason() {
    if (!decisionModal || !decisionReason.trim()) return;
    await handleDecide(decisionModal.id, decisionModal.type, decisionReason.trim());
    setDecisionModal(null);
    setDecisionReason("");
  }

  async function handleSuggestThumbnail(e) {
    e.preventDefault();
    if (!thumbnailModal) return;
    const id = thumbnailModal.id || thumbnailModal.dataset_id;
    setSubmittingThumbnail(true);
    try {
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append("thumbnail", thumbnailFile);
        if (thumbnailUrlInput.trim()) formData.append("reason", thumbnailUrlInput.trim());
        await datasetsApi.suggestThumbnail(id, formData);
      } else if (thumbnailUrlInput.trim()) {
        await datasetsApi.suggestThumbnail(id, { thumbnail_url: thumbnailUrlInput.trim() });
      } else {
        addToast("Please select an image file or enter a thumbnail URL.", "error");
        setSubmittingThumbnail(false);
        return;
      }
      addToast("Thumbnail suggestion submitted successfully!", "success");
      setThumbnailModal(null);
      setThumbnailUrlInput("");
      setThumbnailFile(null);
    } catch (err) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to submit thumbnail suggestion.", "error");
    } finally {
      setSubmittingThumbnail(false);
    }
  }

  async function handleRequestDeletion(e) {
    e.preventDefault();
    if (!deletionModal || !deletionReason.trim()) return;
    const id = deletionModal.id || deletionModal.dataset_id;
    setSubmittingDeletion(true);
    try {
      await datasetsApi.requestDatasetDeletion(id, deletionReason.trim());
      addToast("Dataset deletion request submitted to administrative queue.", "success");
      setDeletionModal(null);
      setDeletionReason("");
      closeDetail();
    } catch (err) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to submit deletion request.", "error");
    } finally {
      setSubmittingDeletion(false);
    }
  }

  async function handleVote(type, itemId, vote, comment = "") {
    setActionId(itemId);
    const voterMap = {
      "content-updates": { fn: datasetsApi.voteContentUpdate, setter: setContentUpdates },
      "revision-requests": { fn: datasetsApi.voteRevisionRequest, setter: setRevisionRequests },
      "access-requests": { fn: datasetsApi.voteAccessRequest, setter: setAccessRequests },
    };
    const handler = voterMap[type];
    if (!handler) return;
    try {
      await handler.fn(itemId, { vote, comment });
      addToast(`Vote recorded: ${vote}`, "success");
      handler.setter((s) => s.filter((item) => String(item.id || item.request_id || item.update_id) !== String(itemId)));
    } catch (err) {
      addToast(err?.response?.data?.detail || err?.message || "Failed to record vote.", "error");
    } finally {
      setActionId(null);
    }
  }

  // ── 403 Forbidden screen ─────────────────────────────────────────────
  if (forbidden) {
    return (
      <DashboardShell title="Reviewer Dashboard" subtitle="Access Restricted">
        <div className="flex flex-col items-center justify-center py-24 animate-fade-in-up">
          <span className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-5">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </span>
          <h2 className="text-xl font-bold text-navy mb-2">Permission Denied</h2>
          <p className="text-sm text-gray-500 max-w-sm text-center">
            You don&apos;t have reviewer permissions. Please contact an administrator if you believe this is an error.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Reviewer Dashboard" subtitle="Manage pending approvals and moderation queues">
      {/* Welcome banner (compact) */}
      <div className="bg-gradient-to-r from-navy via-[#162744] to-navy text-white rounded-xl px-4 py-3 mb-5 border border-white/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-gold" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-serif font-bold text-white leading-tight">
              Hi {getDisplayName(user)}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-[10px] font-semibold uppercase tracking-wider">
              Peer Reviewer
            </span>
            <span className="hidden md:inline text-xs text-slate-300">
              • Moderate datasets, examine sample rows & manage approvals
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={loadGuidelines}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-navy bg-gold hover:bg-gold-light rounded-xl px-4 py-2.5 transition shadow-sm shrink-0"
        >
          <BookOpen className="w-4 h-4" />
          View Guidelines
        </button>
      </div>

      {/* Analytics stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="TOTAL REVIEWED"
          value={loading ? "…" : reviewStats.total}
          icon={BarChart3}
          hint="All-time decisions made"
          delay={0}
        />
        <StatCard
          label="PENDING"
          value={loading ? "…" : reviewStats.pending}
          icon={Clock}
          hint="Datasets awaiting review"
          delay={60}
        />
        <StatCard
          label="APPROVED"
          value={loading ? "…" : reviewStats.approved}
          icon={CheckCircle2}
          hint="Datasets approved"
          delay={120}
        />
        <StatCard
          label="REJECTED"
          value={loading ? "…" : reviewStats.rejected}
          icon={XCircle}
          hint="Datasets rejected"
          delay={180}
        />
      </div>

      {/* Tab panel */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex gap-1 px-5 pt-4 border-b border-border overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                activeTab === tab.id ? "border-gold text-gold" : "border-transparent text-gray-500 hover:text-navy",
              ].join(" ")}
            >
              {tab.label}
              {tab.id === "datasets" && pendingCounts.datasets > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingCounts.datasets}</span>
              )}
              {tab.id === "content-updates" && pendingCounts.contentUpdates > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingCounts.contentUpdates}</span>
              )}
              {tab.id === "access-requests" && pendingCounts.accessRequests > 0 && (
                <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingCounts.accessRequests}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
              <span className="ml-3 text-sm text-gray-500">Loading review data…</span>
            </div>
          ) : (
            <>
              {activeTab === "overview" && <OverviewTab overview={overview} metrics={metrics} reviewStats={reviewStats} pendingCounts={pendingCounts} setTab={setTab} />}

              {activeTab === "datasets" && (
                <ReviewDatasetsTab
                  items={datasetQueue}
                  actionId={actionId}
                  onView={handleViewDataset}
                  onDecide={handleDecide}
                />
              )}

              {activeTab === "content-updates" && (
                <VoteTable
                  type="content-updates"
                  items={contentUpdates}
                  emptyTitle="No pending content updates"
                  emptyDesc="No significant content updates awaiting review."
                  idKey="update_id"
                  titleKey="dataset_title"
                  descKey="summary"
                  actionId={actionId}
                  onVote={handleVote}
                />
              )}
              {activeTab === "revision-requests" && (
                <VoteTable
                  type="revision-requests"
                  items={revisionRequests}
                  emptyTitle="No pending revision requests"
                  emptyDesc="No revision permission requests awaiting review."
                  idKey="request_id"
                  titleKey="dataset_title"
                  descKey="reason"
                  actionId={actionId}
                  onVote={handleVote}
                />
              )}
              {activeTab === "access-requests" && (
                <VoteTable
                  type="access-requests"
                  items={accessRequests}
                  emptyTitle="No pending access requests"
                  emptyDesc="No restricted dataset access requests awaiting review."
                  idKey="request_id"
                  titleKey="dataset_title"
                  descKey="reason"
                  actionId={actionId}
                  onVote={handleVote}
                />
              )}
              {activeTab === "my-reviews" && <MyReviewsTab reviews={myReviews} />}
            </>
          )}
        </div>
      </div>

      {/* Dataset detail side-panel */}
      {selectedDataset && (
        <div className="fixed inset-0 z-50 flex bg-black/50" onClick={closeDetail}>
          <div className="ml-auto w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-navy text-white">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Dataset Review</p>
                <h3 className="text-base font-bold truncate max-w-lg">{datasetDetail?.title || selectedDataset.title || "Untitled Dataset"}</h3>
              </div>
              <button type="button" onClick={closeDetail} className="p-2 rounded-lg hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
                  <span className="text-sm font-medium text-gray-500">Fetching complete dataset details…</span>
                </div>
              ) : (() => {
                const item = datasetDetail || selectedDataset;
                const metadata = item.metadata || {};
                const categoryName =
                  metadata.category_name ||
                  (typeof metadata.category === "object" ? metadata.category?.name : null) ||
                  (typeof item.category === "object" ? item.category?.name : item.category) ||
                  selectedDataset.category ||
                  "—";
                const languagesList = Array.isArray(item.languages) && item.languages.length > 0
                  ? item.languages.join(", ")
                  : (metadata.language?.name || "English");
                const keywords = metadata.keywords || [];
                const files = item.files || [];

                return (
                  <>
                    {/* Top status & quick badges */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <StatusBadge status={item.status || "pending"} />
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-slate-200 text-slate-700">
                          {item.visibility || "restricted"}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          v{item.version || 1}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 font-mono select-all">ID: {item.id || selectedDataset.id}</span>
                    </div>

                    {/* Submitter & Thumbnail */}
                    <div className="flex flex-col sm:flex-row gap-5 items-start">
                      {(item.thumbnail_url || item.thumbnail_key) && (
                        <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden border border-border bg-slate-100 shrink-0">
                          <img
                            src={item.thumbnail_url || item.thumbnail_key}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      )}
                      <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Author / Submitter</p>
                          <p className="text-navy font-bold">{item.owner_name || selectedDataset.owner_name || item.owner?.email || "—"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{item.owner?.email || (typeof item.owner === 'number' ? `User #${item.owner}` : "")}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Submitted On</p>
                          <p className="text-navy font-medium">{formatDate(item.created_at || item.submitted_at)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Terms: {item.terms_accepted ? `Accepted (${item.terms_version || "v1.0"})` : "No"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description / Abstract</h4>
                      <p className="text-sm text-gray-800 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-4 whitespace-pre-line">
                        {metadata.description || item.description || "No description provided."}
                      </p>
                    </div>

                    {/* Category, Languages, Tags */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
                      <h4 className="text-xs font-bold text-navy uppercase tracking-wider">Classification & Metadata</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                          <span className="text-gray-500 text-xs font-medium">Category</span>
                          <span className="font-bold text-navy text-xs">{categoryName}</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                          <span className="text-gray-500 text-xs font-medium">Languages</span>
                          <span className="font-semibold text-navy text-xs">{languagesList}</span>
                        </div>
                        {metadata.license && (
                          <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                            <span className="text-gray-500 text-xs font-medium">License</span>
                            <span className="font-semibold text-navy text-xs">{metadata.license}</span>
                          </div>
                        )}
                        {metadata.doi_citation && (
                          <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-100">
                            <span className="text-gray-500 text-xs font-medium">DOI</span>
                            <span className="font-mono text-navy text-xs truncate max-w-[150px]">{metadata.doi_citation}</span>
                          </div>
                        )}
                      </div>

                      {/* Keywords */}
                      {keywords.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1.5 font-medium">Keywords</p>
                          <div className="flex flex-wrap gap-1.5">
                            {keywords.map((kw, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-700 font-medium">
                                #{typeof kw === 'object' ? kw.name : kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Extended metadata fields if present */}
                      {(metadata.sponsor_or_grant || metadata.collection_method || metadata.geographic_coverage || metadata.temporal_coverage || metadata.data_preprocessing) && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-xs">
                          {metadata.sponsor_or_grant && (
                            <p><strong className="text-gray-600">Sponsor / Grant:</strong> <span className="text-navy">{metadata.sponsor_or_grant}</span></p>
                          )}
                          {metadata.collection_method && (
                            <p><strong className="text-gray-600">Collection Method:</strong> <span className="text-navy">{metadata.collection_method}</span></p>
                          )}
                          {metadata.geographic_coverage && (
                            <p><strong className="text-gray-600">Geographic Coverage:</strong> <span className="text-navy">{metadata.geographic_coverage}</span></p>
                          )}
                          {metadata.temporal_coverage && (
                            <p><strong className="text-gray-600">Temporal Coverage:</strong> <span className="text-navy">{metadata.temporal_coverage}</span></p>
                          )}
                          {metadata.data_preprocessing && (
                            <p><strong className="text-gray-600">Data Preprocessing:</strong> <span className="text-navy">{metadata.data_preprocessing}</span></p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Files & Live Data Preview */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-2">
                          <Database className="w-4 h-4 text-gold" />
                          Submitted Data Files ({files.length})
                        </h4>
                      </div>

                      {files.length === 0 ? (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-xs text-gray-500">
                          No file attachments detected in this dataset package.
                        </div>
                      ) : (
                        files.map((file, fIdx) => (
                          <div key={file.id || fIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            {/* File info bar */}
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center uppercase">
                                  {file.file_type || "CSV"}
                                </span>
                                <div>
                                  <p className="text-xs font-bold text-navy">{file.name || `Data File #${fIdx + 1} (${(file.file_type || "csv").toUpperCase()})`}</p>
                                  <p className="text-[11px] text-gray-500">
                                    Size: {formatFileSize(file.file_size)} • Uploaded: {formatDate(file.uploaded_at)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {file.preview_rows && file.preview_rows.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => downloadPreviewCsv(file, item.title)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-navy bg-white border border-slate-200 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 transition"
                                  >
                                    <Download className="w-3.5 h-3.5 text-gold" />
                                    Export CSV Preview
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Live Preview Table */}
                            {file.preview_rows && file.preview_rows.length > 0 ? (
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                    <Table className="w-3.5 h-3.5 text-slate-400" />
                                    Sample Data Preview ({file.preview_rows.length} rows)
                                  </span>
                                  <span className="text-[11px] text-gray-400 font-mono">
                                    Checksum: {file.checksum ? file.checksum.slice(0, 16) + "…" : "—"}
                                  </span>
                                </div>
                                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0">
                                      <tr>
                                        <th className="px-3 py-2 border-b border-slate-200 w-12 text-center text-slate-400">#</th>
                                        {file.columns && file.columns.length > 0
                                          ? file.columns.map((col, cIdx) => (
                                              <th key={cIdx} className="px-3 py-2 border-b border-slate-200">{col}</th>
                                            ))
                                          : (file.preview_rows[0] || []).map((_, cIdx) => (
                                              <th key={cIdx} className="px-3 py-2 border-b border-slate-200">Col {cIdx + 1}</th>
                                            ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {file.preview_rows.map((row, rIdx) => (
                                        <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                          <td className="px-3 py-1.5 text-center text-slate-400 font-mono text-[11px]">{rIdx + 1}</td>
                                          {(Array.isArray(row) ? row : [row]).map((val, vIdx) => (
                                            <td key={vIdx} className="px-3 py-1.5 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                                              {String(val ?? "")}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 text-xs text-gray-400 text-center">
                                No preview rows generated for this file.
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Open full page link */}
                    <div className="pt-2">
                      <Link
                        to={`/datasets/${item.id || selectedDataset.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-navy hover:text-gold transition"
                      >
                        <ExternalLink className="w-4 h-4 text-gold" />
                        Open complete dataset page in new tab &rarr;
                      </Link>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Action bar */}
            <div className="px-6 py-4 border-t border-border bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              {(() => {
                const id = selectedDataset.id || selectedDataset.dataset_id;
                const busy = actionId === id;
                return (
                  <>
                    <button
                      type="button"
                      disabled={downloading}
                      onClick={() => handleDownloadDataset(id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl px-4 py-2.5 transition shadow-sm"
                    >
                      {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-gold" />}
                      Download Dataset
                    </button>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecide(id, "changes_requested", "")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl px-4 py-2.5 disabled:opacity-50 transition"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Request Changes
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecide(id, "rejected", "")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl px-4 py-2.5 disabled:opacity-50 transition"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Reject
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecide(id, "approved", "Approved by reviewer.")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl px-4 py-2.5 disabled:opacity-50 transition shadow-sm"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve Dataset
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Decision reason modal (for reject / changes_requested) */}
      {decisionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => { setDecisionModal(null); setDecisionReason(""); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-1">
              {decisionModal.type === "rejected" ? "Reject Dataset" : "Request Changes"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">Please provide a reason. This will be sent to the submitter.</p>
            <textarea
              className="w-full rounded-xl border border-slate-200 text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-gold"
              rows={4}
              placeholder="Enter reason…"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button type="button" onClick={() => { setDecisionModal(null); setDecisionReason(""); }} className="text-sm font-medium text-gray-500 hover:text-navy px-3 py-2">
                Cancel
              </button>
              <button
                type="button"
                disabled={!decisionReason.trim() || actionId !== null}
                onClick={submitDecisionWithReason}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-navy hover:bg-navy/90 disabled:opacity-50 rounded-xl px-4 py-2.5 transition"
              >
                {decisionModal.type === "rejected" ? <XCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest Thumbnail Modal */}
      {thumbnailModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => {
            setThumbnailModal(null);
            setThumbnailUrlInput("");
            setThumbnailFile(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 font-bold">
                  🖼️
                </span>
                <div>
                  <h3 className="text-base font-bold text-navy">Suggest Dataset Thumbnail</h3>
                  <p className="text-xs text-gray-500">
                    Propose a clearer thumbnail for &quot;{thumbnailModal.title}&quot;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setThumbnailModal(null);
                  setThumbnailUrlInput("");
                  setThumbnailFile(null);
                }}
                className="p-1 text-gray-400 hover:text-navy rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSuggestThumbnail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Upload Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gold/20 file:text-gold-dark hover:file:bg-gold/30 cursor-pointer"
                />
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="shrink-0 mx-3 text-xs uppercase text-gray-400 font-semibold">Or enter URL</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
                  Thumbnail Image URL / Note
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/images/dataset-thumbnail.png"
                  value={thumbnailUrlInput}
                  onChange={(e) => setThumbnailUrlInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setThumbnailModal(null);
                    setThumbnailUrlInput("");
                    setThumbnailFile(null);
                  }}
                  className="text-sm font-medium text-gray-500 hover:text-navy px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingThumbnail || (!thumbnailFile && !thumbnailUrlInput.trim())}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gold hover:bg-gold-dark disabled:opacity-50 rounded-xl px-4 py-2.5 transition shadow-sm"
                >
                  {submittingThumbnail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Submit Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dataset Deletion Request Modal */}
      {deletionModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => {
            setDeletionModal(null);
            setDeletionReason("");
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-red-100 mb-4">
              <span className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-red-900">Request Dataset Deletion</h3>
                <p className="text-xs text-red-700">
                  Flag &quot;{deletionModal.title}&quot; for removal
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Please specify the ethical, copyright, privacy (PII), or institutional reason why this dataset should be deleted.
            </p>

            <form onSubmit={handleRequestDeletion}>
              <textarea
                required
                rows={4}
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Describe reason for deletion (e.g. Contains unanonymized patient data, duplicate accession, violation of university policy)..."
                className="w-full rounded-xl border border-slate-200 text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletionModal(null);
                    setDeletionReason("");
                  }}
                  className="text-sm font-medium text-gray-500 hover:text-navy px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDeletion || !deletionReason.trim()}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl px-4 py-2.5 transition shadow-sm"
                >
                  {submittingDeletion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Submit Deletion Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guidelines modal */}
      {showGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowGuidelines(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-navy text-white">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-gold" />
                <h3 className="text-base font-bold">ORDP Dataset Moderation Guidelines</h3>
              </div>
              <button type="button" onClick={() => setShowGuidelines(false)} className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-gray-700 space-y-4">
              {guidelines?.quorum_threshold && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span><strong>Quorum Requirement:</strong> At least {guidelines.quorum_threshold} reviewer decision(s) are required before publication.</span>
                </div>
              )}
              {guidelines?.guidelines && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700">
                  <p className="font-semibold text-navy mb-1">Institutional Policy:</p>
                  <p className="leading-relaxed">{guidelines.guidelines}</p>
                </div>
              )}

              {/* Comprehensive reviewer criteria */}
              <div className="space-y-3">
                <div className="border border-border rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                    Metadata & Classification Verification
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Verify that the dataset title, description, category name, language, and keywords are accurate and clear. Category must be properly assigned from institutional categories (e.g. Agriculture, Computer Science, Health).
                  </p>
                </div>

                <div className="border border-border rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center">2</span>
                    Data Integrity & File Usability
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Examine submitted data files. Datasets must be formatted in standard non-proprietary formats (CSV, JSON, NetCDF, GeoTIFF, etc.) and be well-structured with valid checksums and sample rows.
                  </p>
                </div>

                <div className="border border-border rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center">3</span>
                    Ethical Compliance & Privacy (Anonymization)
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Ensure the dataset does NOT expose Personally Identifiable Information (PII), confidential research participant data, or unauthorized institutional secrets without explicit consent and ethical clearance.
                  </p>
                </div>

                <div className="border border-border rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold flex items-center justify-center">4</span>
                    Decision Actions
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    <li><strong className="text-emerald-700">Approve:</strong> Dataset meets all documentation, structural integrity, and ethics requirements.</li>
                    <li><strong className="text-amber-700">Request Changes:</strong> Minor metadata gaps, missing column descriptors, or incomplete description.</li>
                    <li><strong className="text-red-700">Reject:</strong> Irreparable flaws, severe privacy violations, or plagiarism.</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-border bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuidelines(false)}
                className="px-4 py-2 bg-navy text-white rounded-xl text-xs font-semibold hover:bg-navy/90 transition"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

// ── Overview tab ────────────────────────────────────────────────────────
function OverviewTab({ overview, metrics, reviewStats, pendingCounts, setTab }) {
  const sections = [
    { label: "Pending Datasets", count: pendingCounts.datasets, tab: "datasets", color: "bg-red-50 text-red-600 border-red-100" },
    { label: "Content Updates", count: pendingCounts.contentUpdates, tab: "content-updates", color: "bg-amber-50 text-amber-600 border-amber-100" },
    { label: "Revision Requests", count: pendingCounts.revisionRequests, tab: "revision-requests", color: "bg-blue-50 text-blue-600 border-blue-100" },
    { label: "Access Requests", count: pendingCounts.accessRequests, tab: "access-requests", color: "bg-violet-50 text-violet-600 border-violet-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Pending quick-nav cards */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-3">Pending Items by Category</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {sections.map((s) => (
            <button
              key={s.tab}
              type="button"
              onClick={() => setTab(s.tab)}
              className={`rounded-xl border px-4 py-4 text-left hover:shadow-md transition-shadow ${s.color}`}
            >
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium mt-1">{s.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Personal performance */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold" /> Your Review Stats
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Total Reviewed" value={reviewStats.total} color="text-navy" />
          <MetricCard label="Approved" value={reviewStats.approved} color="text-emerald-600" />
          <MetricCard label="Rejected" value={reviewStats.rejected} color="text-red-600" />
          <MetricCard label="Last 30 Days" value={metrics?.reviews_last_30_days ?? metrics?.last_30_days ?? "—"} color="text-gold" />
        </div>
      </div>

      {/* Quick CTA to datasets */}
      {pendingCounts.datasets > 0 && (
        <button
          type="button"
          onClick={() => setTab("datasets")}
          className="w-full flex items-center justify-between bg-navy text-white rounded-xl px-5 py-4 hover:bg-navy/90 transition"
        >
          <span className="text-sm font-semibold">
            {pendingCounts.datasets} dataset{pendingCounts.datasets !== 1 ? "s" : ""} awaiting your review
          </span>
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

function MetricCard({ label, value, color = "text-navy" }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Review Datasets tab ───────────────────────────────────────────────────
function ReviewDatasetsTab({ items, actionId, onView, onDecide }) {
  if (items.length === 0) {
    return <EmptyState title="No pending datasets" description="All caught up — no datasets awaiting review." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-gray-500 bg-gray-50">
          <tr>
            <th className="px-5 py-3 text-left font-semibold">Dataset</th>
            <th className="px-5 py-3 text-left font-semibold">Submitter</th>
            <th className="px-5 py-3 text-left font-semibold">Date</th>
            <th className="px-5 py-3 text-left font-semibold">Status</th>
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const id = item.id || item.dataset_id;
            const busy = actionId === id;
            return (
              <tr key={id} className="border-t border-gray-100 hover:bg-bg/50">
                <td className="px-5 py-4">
                  <p className="font-medium text-navy">{item.title || "Untitled"}</p>
                  <p className="text-xs text-gray-400 font-mono">{id}</p>
                </td>
                <td className="px-5 py-4 text-gray-600">{item.owner?.email || item.owner_name || item.submitter || "—"}</td>
                <td className="px-5 py-4 text-gray-500">{formatDate(item.created_at || item.submitted_at)}</td>
                <td className="px-5 py-4"><StatusBadge status={String(item.status || "pending").toLowerCase()} /></td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onView(item)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Dataset
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDecide(id, "approved", "Approved by reviewer.")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-2 disabled:opacity-50 transition-colors"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDecide(id, "rejected", "")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg px-3 py-2 disabled:opacity-50 transition-colors"
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDecide(id, "changes_requested", "")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg px-3 py-2 disabled:opacity-50 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Changes
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Generic vote table ──────────────────────────────────────────────────
function VoteTable({ type, items, emptyTitle, emptyDesc, idKey, titleKey, descKey, actionId: currentActionId, onVote }) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDesc} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-gray-500 bg-gray-50">
          <tr>
            <th className="px-5 py-3 text-left font-semibold">Title / Dataset</th>
            <th className="px-5 py-3 text-left font-semibold">Description</th>
            <th className="px-5 py-3 text-left font-semibold">Requester</th>
            <th className="px-5 py-3 text-left font-semibold">Date</th>
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const id = item[idKey] || item.id;
            const busy = currentActionId === id;
            return (
              <tr key={id} className="border-t border-gray-100 hover:bg-bg/50">
                <td className="px-5 py-4">
                  <p className="font-medium text-navy">{item[titleKey] || item.title || item.dataset?.title || "—"}</p>
                  <p className="text-xs text-gray-500 font-mono">{id}</p>
                </td>
                <td className="px-5 py-4 text-gray-600 max-w-[200px] truncate">{item[descKey] || item.description || "—"}</td>
                <td className="px-5 py-4 text-gray-500">{item.requester?.email || item.requested_by || item.user?.email || "—"}</td>
                <td className="px-5 py-4 text-gray-500">{formatDate(item.created_at || item.requested_at)}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <ActionBtn color="emerald" icon={CheckCircle2} label="Approve" busy={busy} onClick={() => onVote(type, id, "approved")} />
                    <ActionBtn color="red" icon={XCircle} label="Reject" busy={busy} onClick={() => onVote(type, id, "rejected")} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── My Reviews tab ──────────────────────────────────────────────────────
function MyReviewsTab({ reviews }) {
  if (reviews.length === 0) {
    return <EmptyState title="No reviews yet" description="Your approved/rejected decisions will appear here." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-gray-500 bg-gray-50">
          <tr>
            <th className="px-5 py-3 text-left font-semibold">Dataset</th>
            <th className="px-5 py-3 text-left font-semibold">Decision</th>
            <th className="px-5 py-3 text-left font-semibold">Reason / Comment</th>
            <th className="px-5 py-3 text-left font-semibold">Date</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review.id || review.review_id} className="border-t border-gray-100 hover:bg-bg/50">
              <td className="px-5 py-3 font-medium text-navy">{review.dataset_title || review.title || "—"}</td>
              <td className="px-5 py-3"><StatusBadge status={review.decision || review.vote || review.status || "—"} /></td>
              <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{review.reason || review.comment || review.feedback || "—"}</td>
              <td className="px-5 py-3 text-gray-500">{formatDate(review.decided_at || review.created_at || review.reviewed_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Action button ───────────────────────────────────────────────────────
function ActionBtn({ color, icon: Icon, label, busy, onClick }) {
  const colorMap = {
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    red: "bg-red-600 hover:bg-red-700",
    amber: "bg-amber-600 hover:bg-amber-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-2 disabled:opacity-50 transition-colors ${colorMap[color] || colorMap.emerald}`}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
