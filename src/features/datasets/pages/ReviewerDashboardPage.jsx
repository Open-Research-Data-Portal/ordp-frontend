import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName } from "../../../utils/userRoles";
import {
  Shield,
  FileEdit,
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
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} at ${time}`;
}

// ── Tab definitions ──────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "datasets", label: "Datasets" },
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

  // ── Data loading ─────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setForbidden(false);
      try {
        const results = await Promise.allSettled([
          datasetsApi.getReviewerOverview(),
          datasetsApi.getReviewerMetrics(),
          datasetsApi.getReviewerQueue(),
          datasetsApi.getContentUpdateQueue(),
          datasetsApi.getRevisionRequestsQueue(),
          datasetsApi.getAccessRequestsQueue(),
          datasetsApi.getMyReviews(),
          datasetsApi.getAdminPendingReviews(),
        ]);
        if (!active) return;

        // Check if we got 403 on the overview (primary signal)
        if (results[0].status === "rejected" && results[0].reason?.response?.status === 403) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        if (results[0].status === "fulfilled") setOverview(results[0].value);
        if (results[1].status === "fulfilled") setMetrics(results[1].value);

        // Merge reviewer queue with admin pending reviews fallback
        const reviewerQ = results[2].status === "fulfilled" ? normalizeList(results[2].value) : [];
        const adminPending = results[7].status === "fulfilled" ? normalizeList(results[7].value) : [];

        // Use reviewer queue if it has items, otherwise fallback to admin pending reviews
        // Also merge both (deduplicate by ID) so reviewer sees all pending datasets
        const seen = new Set();
        const merged = [];
        for (const item of [...reviewerQ, ...adminPending]) {
          const id = String(item.id || item.dataset_id);
          if (!seen.has(id)) {
            seen.add(id);
            merged.push(item);
          }
        }
        // Only show pending datasets
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

  // ── Load guidelines on demand ────────────────────────────────────────
  const loadGuidelines = useCallback(async () => {
    if (guidelines) {
      setShowGuidelines(true);
      return;
    }
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

  // ── Tab switching ────────────────────────────────────────────────────
  function setTab(tabId) {
    if (tabId === "overview") {
      setSearchParams({});
    } else {
      setSearchParams({ tab: tabId });
    }
  }

  // ── Voting handlers ──────────────────────────────────────────────────
  async function handleDatasetDecide(datasetId, decision, comment = "") {
    setActionId(datasetId);
    try {
      await datasetsApi.moderateDataset(datasetId, { decision, comment });
      addToast(`Dataset ${decision} successfully.`, "success");
      setDatasetQueue((s) => s.filter((d) => String(d.id || d.dataset_id) !== String(datasetId)));
    } catch (err) {
      addToast(err?.response?.data?.detail || err?.message || `Failed to ${decision} dataset.`, "error");
    } finally {
      setActionId(null);
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
      {/* Welcome banner with reviewer note */}
      <div className="bg-gradient-to-r from-navy via-[#162744] to-navy text-white rounded-2xl p-6 mb-8 border border-white/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-6 h-6 text-gold" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/20 text-gold text-xs font-semibold uppercase tracking-wider mb-1.5">
              Peer Reviewer
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-white">
              Hi {getDisplayName(user)}, welcome to the Reviewer Dashboard!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              You are logged in as an authorized peer reviewer. Review pending research datasets, vote on content revisions, and moderate access requests below.
            </p>
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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="PENDING ITEMS"
          value={loading ? "…" : pendingCounts.total}
          icon={Clock}
          hint="Total items awaiting your review"
          delay={50}
        />
        <StatCard
          label="TOTAL REVIEWED"
          value={loading ? "…" : (metrics?.total_reviewed ?? myReviews.length)}
          icon={BarChart3}
          delay={100}
        />
        <StatCard
          label="APPROVED"
          value={loading ? "…" : (metrics?.approved ?? 0)}
          icon={CheckCircle2}
          delay={150}
        />
        <StatCard
          label="REJECTED"
          value={loading ? "…" : (metrics?.rejected ?? 0)}
          icon={XCircle}
          delay={200}
        />
      </div>

      {/* Tab bar */}
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
              {activeTab === "overview" && <OverviewTab overview={overview} metrics={metrics} pendingCounts={pendingCounts} setTab={setTab} />}
              {activeTab === "datasets" && (
                <QueueTable
                  items={datasetQueue}
                  emptyTitle="No pending datasets"
                  emptyDesc="All caught up — no datasets awaiting review."
                  columns={["Dataset Name", "Submitter", "Date", "Status"]}
                  renderRow={(item) => (
                    <>
                      <td className="px-5 py-4">
                        <p className="font-medium text-navy">{item.title || "Untitled"}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.id || item.dataset_id}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{item.owner?.email || item.owner_name || item.submitter || "—"}</td>
                      <td className="px-5 py-4 text-gray-500">{formatDate(item.created_at || item.submitted_at || item.date)}</td>
                      <td className="px-5 py-4"><StatusBadge status={String(item.status || "pending").toLowerCase()} /></td>
                    </>
                  )}
                  renderActions={(item) => {
                    const id = item.id || item.dataset_id;
                    const busy = actionId === id;
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/datasets/${id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                        <ActionBtn color="emerald" icon={CheckCircle2} label="Approve" busy={busy} onClick={() => handleDatasetDecide(id, "approved")} />
                        <ActionBtn color="red" icon={XCircle} label="Reject" busy={busy} onClick={() => handleDatasetDecide(id, "rejected")} />
                        <ActionBtn color="amber" icon={MessageSquare} label="Request Changes" busy={busy} onClick={() => handleDatasetDecide(id, "changes_requested")} />
                      </div>
                    );
                  }}
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

      {/* Guidelines modal */}
      {showGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowGuidelines(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-navy">Moderation Guidelines</h3>
              <button type="button" onClick={() => setShowGuidelines(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 text-sm text-gray-700 space-y-3">
              {guidelines ? (
                <>
                  {guidelines.guidelines && <p>{guidelines.guidelines}</p>}
                  {guidelines.quorum_threshold && (
                    <p className="text-xs text-gray-500">
                      <strong>Quorum threshold:</strong> {guidelines.quorum_threshold} reviewer(s) required.
                    </p>
                  )}
                  {typeof guidelines === "string" && <p>{guidelines}</p>}
                  {!guidelines.guidelines && typeof guidelines !== "string" && (
                    <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-auto">{JSON.stringify(guidelines, null, 2)}</pre>
                  )}
                </>
              ) : (
                <p className="text-gray-400">Loading…</p>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

// ── Overview tab ────────────────────────────────────────────────────────
function OverviewTab({ overview, metrics, pendingCounts, setTab }) {
  const sections = [
    { label: "Pending Datasets", count: pendingCounts.datasets, tab: "datasets", color: "bg-red-50 text-red-600 border-red-100" },
    { label: "Content Updates", count: pendingCounts.contentUpdates, tab: "content-updates", color: "bg-amber-50 text-amber-600 border-amber-100" },
    { label: "Revision Requests", count: pendingCounts.revisionRequests, tab: "revision-requests", color: "bg-blue-50 text-blue-600 border-blue-100" },
    { label: "Access Requests", count: pendingCounts.accessRequests, tab: "access-requests", color: "bg-violet-50 text-violet-600 border-violet-100" },
  ];

  return (
    <div className="space-y-6">
      {/* Pending summary cards */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-3">Pending Items</h3>
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

      {/* Performance metrics */}
      {metrics && (
        <div>
          <h3 className="text-sm font-semibold text-navy mb-3">Your Performance</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard label="Total Reviewed" value={metrics.total_reviewed ?? 0} />
            <MetricCard label="Approved" value={metrics.approved ?? 0} />
            <MetricCard label="Rejected" value={metrics.rejected ?? 0} />
            <MetricCard label="Last 30 Days" value={metrics.reviews_last_30_days ?? metrics.last_30_days ?? 0} />
          </div>
        </div>
      )}

      {/* Overview data from backend */}
      {overview && overview.pending_datasets != null && (
        <div>
          <h3 className="text-sm font-semibold text-navy mb-3">Backend Overview</h3>
          <pre className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600 overflow-auto">{JSON.stringify(overview, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
      <p className="text-xl font-bold text-navy">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── Generic queue table ─────────────────────────────────────────────────
function QueueTable({ items, emptyTitle, emptyDesc, columns, renderRow, renderActions }) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDesc} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-gray-500 bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-5 py-3 text-left font-semibold">{col}</th>
            ))}
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id || item.dataset_id || item.request_id || item.update_id} className="border-t border-gray-100 hover:bg-bg/50">
              {renderRow(item)}
              <td className="px-5 py-4 text-right">{renderActions(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Generic vote table for content-updates, revision-requests, access-requests, deletion-requests
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
            <th className="px-5 py-3 text-left font-semibold">Comment</th>
            <th className="px-5 py-3 text-left font-semibold">Date</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review.id || review.review_id} className="border-t border-gray-100 hover:bg-bg/50">
              <td className="px-5 py-3 font-medium text-navy">{review.dataset_title || review.title || "—"}</td>
              <td className="px-5 py-3"><StatusBadge status={review.decision || review.vote || review.status || "—"} /></td>
              <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{review.comment || review.feedback || "—"}</td>
              <td className="px-5 py-3 text-gray-500">{formatDate(review.decided_at || review.created_at || review.reviewed_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Action button component ─────────────────────────────────────────────
function ActionBtn({ color, icon: Icon, label, busy, onClick }) {
  const colorMap = {
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    red: "bg-red-600 hover:bg-red-700",
    amber: "bg-amber-600 hover:bg-amber-700",
    blue: "bg-blue-600 hover:bg-blue-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-2 disabled:opacity-50 transition-colors ${colorMap[color] || colorMap.blue}`}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
