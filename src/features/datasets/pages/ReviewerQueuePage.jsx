import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { isReviewer, isAdmin, getDashboardPath } from "../../../utils/userRoles";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  Loader2,
  ChevronRight,
  RotateCcw,
  Layers,
  ArrowLeft,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { StatusBadge, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useToast } from "../../../context/ToastContext.jsx";
import * as datasetsApi from "../hooks/datasetsApi.js";
import { fetchAllDatasets } from "../../../api/datasetsHub";

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

const TABS = [
  { id: "datasets", label: "Review Datasets" },
  { id: "content-updates", label: "Content Updates" },
  { id: "revision-requests", label: "Revision Requests" },
  { id: "access-requests", label: "Access Requests" },
  { id: "my-reviews", label: "My Reviews" },
];

export default function ReviewerQueuePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "datasets";

  // Access control
  useEffect(() => {
    if (user && !isReviewer(user) && !isAdmin(user)) {
      navigate(getDashboardPath(user), { replace: true });
    }
  }, [user, navigate]);

  // ── State ────────────────────────────────────────────────────────────
  const [datasetQueue, setDatasetQueue] = useState([]);
  const [contentUpdates, setContentUpdates] = useState([]);
  const [revisionRequests, setRevisionRequests] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [myReviews, setMyReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  // Undo support for accidental rejections
  const [recentAction, setRecentAction] = useState(null);

  // ── Data loading ─────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setForbidden(false);
      try {
        const results = await Promise.allSettled([
          datasetsApi.getReviewerQueue(),        // 0 — /admin-panel/queue/
          datasetsApi.getContentUpdateQueue(),   // 1
          datasetsApi.getRevisionRequestsQueue(), // 2
          datasetsApi.getAccessRequestsQueue(),   // 3
          datasetsApi.getMyReviews(),            // 4 — /admin-panel/my-reviews/
          datasetsApi.getAdminPendingReviews(),   // 5 fallback
        ]);
        if (!active) return;

        if (results[0].status === "rejected" && results[0].reason?.response?.status === 403) {
          setForbidden(true);
          setLoading(false);
          return;
        }

        const reviewerQ = results[0].status === "fulfilled" ? normalizeList(results[0].value) : [];
        const adminPending = results[5].status === "fulfilled" ? normalizeList(results[5].value) : [];
        const seen = new Set();
        const merged = [];
        for (const item of [...reviewerQ, ...adminPending]) {
          const id = String(item.id || item.dataset_id);
          if (id && !seen.has(id)) { seen.add(id); merged.push(item); }
        }

        // Also check if any datasets in the repository are in pending/submitted/in_review status
        if (merged.length === 0) {
          try {
            const myData = await datasetsApi.getMyDatasets();
            const myList = Array.isArray(myData) ? myData : (myData?.results || []);
            for (const item of myList) {
              const s = String(item.status || "").toLowerCase();
              const id = String(item.id || item.dataset_id);
              if (id && (s === "pending" || s === "submitted" || s === "in_review") && !seen.has(id)) {
                seen.add(id);
                merged.push(item);
              }
            }
          } catch {
            // non-fatal
          }
        }

        const pendingOnly = merged.filter((d) => {
          const s = String(d.status || "").toLowerCase();
          return !s || s === "pending" || s === "submitted" || s === "in_review";
        });
        setDatasetQueue(pendingOnly);

        if (results[1].status === "fulfilled") setContentUpdates(normalizeList(results[1].value));
        if (results[2].status === "fulfilled") setRevisionRequests(normalizeList(results[2].value));
        if (results[3].status === "fulfilled") setAccessRequests(normalizeList(results[3].value));
        if (results[4].status === "fulfilled") setMyReviews(normalizeList(results[4].value));
      } catch {
        addToast("Failed to load review queue.", "error");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [addToast]);

  const pendingCounts = useMemo(() => ({
    datasets: datasetQueue.length,
    contentUpdates: contentUpdates.length,
    revisionRequests: revisionRequests.length,
    accessRequests: accessRequests.length,
  }), [datasetQueue, contentUpdates, revisionRequests, accessRequests]);

  function setTab(tabId) {
    setSearchParams({ tab: tabId });
  }

  // ── Undo Action Handlers ─────────────────────────────────────────────
  async function handleUndoToAccept(item) {
    const id = item.id || item.dataset_id || item.review_id;
    setActionId(id);
    try {
      await datasetsApi.decideDataset(id, "approved", "Rejection undone by reviewer — approved.");
      addToast(`Undone! Dataset "${item.dataset_title || item.title || "Dataset"}" has been approved.`, "success");

      setMyReviews((prev) =>
        prev.map((r) => {
          const rId = r.id || r.dataset_id || r.review_id;
          if (String(rId) === String(id)) {
            return { ...r, decision: "approved", vote: "approved", status: "approved" };
          }
          return r;
        })
      );
      setRecentAction((prev) => (String(prev?.id) === String(id) ? null : prev));
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to update review decision.", "error");
    } finally {
      setActionId(null);
    }
  }

  async function handleReturnToQueue(item) {
    const id = item.id || item.dataset_id || item.review_id;
    setMyReviews((prev) => prev.filter((r) => String(r.id || r.dataset_id || r.review_id) !== String(id)));
    setDatasetQueue((prev) => {
      const exists = prev.some((d) => String(d.id || d.dataset_id) === String(id));
      if (exists) return prev;
      return [
        {
          id,
          title: item.dataset_title || item.title || "Dataset",
          status: "pending",
          created_at: item.decided_at || item.created_at || new Date().toISOString(),
          owner_name: item.owner_name || item.owner?.email || "Submitter",
        },
        ...prev,
      ];
    });
    setRecentAction((prev) => (String(prev?.id) === String(id) ? null : prev));
    addToast(`Dataset "${item.dataset_title || item.title || "Dataset"}" returned to pending queue.`, "info");
  }

  // ── Voting on Secondary Queues ────────────────────────────────────────
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

  // ── 403 Forbidden Screen ─────────────────────────────────────────────
  if (forbidden) {
    return (
      <DashboardShell title="Review Queue" subtitle="Access restricted">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-lg mx-auto text-center mt-12">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">Reviewer Access Required</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your account does not have active reviewer privileges.
          </p>
          <button
            type="button"
            onClick={() => navigate(getDashboardPath(user))}
            className="px-5 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:bg-navy/90 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Review Queue" subtitle="Evaluate pending datasets, content updates, and revision requests.">
      {/* Header with navigation back to overview */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <Link
            to="/reviewer-dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-navy transition mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Reviewer Analytics
          </Link>
          <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
            <Layers className="w-6 h-6 text-gold" />
            Moderation & Review Queue
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Select a dataset to view complete files, metadata, and perform 6-point evaluation.
          </p>
        </div>
      </div>

      {/* Undo Notification Banner for Accidental Rejections */}
      {recentAction && (recentAction.decision === "rejected" || recentAction.decision === "changes_requested") && (
        <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Item marked as {recentAction.decision === "rejected" ? "Rejected" : "Changes Requested"}: &ldquo;{recentAction.title}&rdquo;
              </p>
              <p className="text-xs text-amber-700">
                Touched Reject by mistake? You can undo it or return the dataset to the queue.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => handleReturnToQueue(recentAction)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 transition shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Return to Queue
            </button>
            <button
              type="button"
              disabled={actionId === recentAction.id}
              onClick={() => handleUndoToAccept(recentAction)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3.5 py-2 shadow-xs transition disabled:opacity-50"
            >
              {actionId === recentAction.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Undo & Accept (Approve)
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex gap-1 px-5 pt-4 border-b border-border overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-2",
                activeTab === tab.id ? "border-gold text-gold font-bold" : "border-transparent text-gray-500 hover:text-navy",
              ].join(" ")}
            >
              {tab.label}
              {tab.id === "datasets" && pendingCounts.datasets > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                  {pendingCounts.datasets}
                </span>
              )}
              {tab.id === "content-updates" && pendingCounts.contentUpdates > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                  {pendingCounts.contentUpdates}
                </span>
              )}
              {tab.id === "revision-requests" && pendingCounts.revisionRequests > 0 && (
                <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                  {pendingCounts.revisionRequests}
                </span>
              )}
              {tab.id === "access-requests" && pendingCounts.accessRequests > 0 && (
                <span className="bg-violet-500 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                  {pendingCounts.accessRequests}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
              <span className="ml-3 text-sm text-gray-500">Loading moderation queue…</span>
            </div>
          ) : (
            <>
              {activeTab === "datasets" && (
                <ReviewDatasetsQueueTab
                  items={datasetQueue}
                  onView={(item) => {
                    const id = item.id || item.dataset_id;
                    navigate(`/reviewer/review/${id}`);
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
                  descKey="purpose"
                  actionId={actionId}
                  onVote={handleVote}
                />
              )}

              {activeTab === "my-reviews" && (
                <MyReviewsTab
                  reviews={myReviews}
                  actionId={actionId}
                  onUndoToAccept={handleUndoToAccept}
                  onReturnToQueue={handleReturnToQueue}
                />
              )}
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

// ── Review Datasets Queue Tab ─────────────────────────────────────────────
// SPEC REQUIREMENT: Table with columns: Dataset title, Submitter, Date, Status badge.
// Each row has EXACTLY ONE button: "View" -> navigates to /reviewer/review/:datasetId
function ReviewDatasetsQueueTab({ items, onView }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No pending datasets"
        description="All caught up — no datasets awaiting reviewer evaluation."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-gray-500 bg-gray-50/80 rounded-t-xl">
          <tr>
            <th className="px-5 py-3.5 text-left font-semibold">Dataset Title</th>
            <th className="px-5 py-3.5 text-left font-semibold">Submitter</th>
            <th className="px-5 py-3.5 text-left font-semibold">Submission Date</th>
            <th className="px-5 py-3.5 text-left font-semibold">Status</th>
            <th className="px-5 py-3.5 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const id = item.id || item.dataset_id;
            return (
              <tr key={id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-semibold text-navy">{item.title || "Untitled Dataset"}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {id}</p>
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {item.owner?.email || item.owner_name || item.submitter || "—"}
                </td>
                <td className="px-5 py-4 text-gray-500">
                  {formatDate(item.created_at || item.submitted_at)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={String(item.status || "pending").toLowerCase()} />
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => onView(item)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-gold hover:bg-gold-light rounded-xl px-4 py-2 transition shadow-xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View & Review
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Generic Vote Table ──────────────────────────────────────────────────
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
              <tr key={id} className="border-t border-gray-100 hover:bg-slate-50/50">
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
function MyReviewsTab({ reviews, onUndoToAccept, onReturnToQueue, actionId }) {
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
            <th className="px-5 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => {
            const id = review.dataset_id || review.id || review.review_id;
            const decisionStr = String(review.decision || review.vote || review.status || "").toLowerCase();
            const isRejected = decisionStr === "rejected" || decisionStr === "changes_requested";
            const busy = actionId === id;
            return (
              <tr key={id || Math.random()} className="border-t border-gray-100 hover:bg-slate-50/50">
                <td className="px-5 py-3">
                  <p className="font-medium text-navy">{review.dataset_title || review.title || "—"}</p>
                  {id && <p className="text-xs text-gray-400 font-mono">{id}</p>}
                </td>
                <td className="px-5 py-3"><StatusBadge status={review.decision || review.vote || review.status || "—"} /></td>
                <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{review.reason || review.comment || review.feedback || "—"}</td>
                <td className="px-5 py-3 text-gray-500">{formatDate(review.decided_at || review.created_at || review.reviewed_at)}</td>
                <td className="px-5 py-3 text-right">
                  {isRejected && onUndoToAccept ? (
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {onReturnToQueue && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onReturnToQueue(review)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 disabled:opacity-50 transition shadow-2xs"
                          title="Return dataset to pending review queue"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          To Queue
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onUndoToAccept(review)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg px-2.5 py-1.5 disabled:opacity-50 transition shadow-2xs"
                        title="Undo accidental rejection and approve this dataset"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Undo / Accept
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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
