import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName, isReviewer, isAdmin, getDashboardPath } from "../../../utils/userRoles";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  X,
  ChevronRight,
  TrendingUp,
  Database,
  Info,
  Archive,
  Layers,
  ArrowRight,
  Loader2,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { useToast } from "../../../context/ToastContext.jsx";
import * as datasetsApi from "../hooks/datasetsApi.js";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

export default function ReviewerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  // If a tab query parameter was supplied (e.g. ?tab=datasets from an old link),
  // forward it directly to the new review queue page.
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && tab !== "overview") {
      navigate(`/reviewer/review-queue?tab=${tab}`, { replace: true });
    }
  }, [searchParams, navigate]);

  // Non-reviewer / non-admin users shouldn't browse the reviewer console
  useEffect(() => {
    if (user && !isReviewer(user) && !isAdmin(user)) {
      navigate(getDashboardPath(user), { replace: true });
    }
  }, [user, navigate]);

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
  const [forbidden, setForbidden] = useState(false);

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
        addToast("Failed to load reviewer metrics.", "error");
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

  // ── 403 Forbidden screen ─────────────────────────────────────────────
  if (forbidden) {
    return (
      <DashboardShell title="Reviewer Portal" subtitle="Access restricted">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-lg mx-auto text-center mt-12">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">Reviewer Access Required</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your account does not have active reviewer privileges. If you are an academic reviewer or institutional moderator, please contact your administrator.
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
    <DashboardShell title="Reviewer Analytics" subtitle="Moderation performance, queue volume, and peer review metrics.">
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-navy text-white rounded-2xl p-6 mb-6 shadow-sm">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold bg-white/10 px-3 py-1 rounded-full mb-2">
            <Shield className="w-3.5 h-3.5" />
            ORDP Reviewer Dashboard
          </span>
          <h2 className="text-xl font-bold">Welcome back, {getDisplayName(user)}</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Track evaluation metrics and review queue velocity across institutional submissions.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/reviewer/review-queue"
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-navy bg-gold hover:bg-gold-light rounded-xl px-4 py-2.5 transition shadow-sm"
          >
            <Layers className="w-4 h-4" />
            Open Review Queue
            <ArrowRight className="w-4 h-4" />
          </Link>
          <button
            type="button"
            onClick={loadGuidelines}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2.5 transition"
          >
            <BookOpen className="w-4 h-4 text-gold" />
            Guidelines
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-border p-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-500">Loading reviewer performance data…</p>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in-up">
          {/* Main KPI cards */}
          <div>
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold" /> Personal Review Performance
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">Total Reviewed</span>
                  <div className="w-8 h-8 rounded-xl bg-navy/5 flex items-center justify-center">
                    <Database className="w-4 h-4 text-navy" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-navy">{reviewStats.total}</p>
                <p className="text-xs text-gray-400 mt-1">Lifetime completed decisions</p>
              </div>

              <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-emerald-700">Approved</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-emerald-600">{reviewStats.approved}</p>
                <p className="text-xs text-emerald-700/70 mt-1">
                  {reviewStats.total > 0
                    ? `${Math.round((reviewStats.approved / reviewStats.total) * 100)}% approval rate`
                    : "Published datasets"}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-red-600">Rejected</span>
                  <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-red-600">{reviewStats.rejected}</p>
                <p className="text-xs text-red-600/70 mt-1">
                  {reviewStats.total > 0
                    ? `${Math.round((reviewStats.rejected / reviewStats.total) * 100)}% rejection rate`
                    : "Returned or rejected"}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-border p-5 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-700">Recent Activity</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-3xl font-extrabold text-gold">
                  {metrics?.reviews_last_30_days ?? metrics?.last_30_days ?? reviewStats.total}
                </p>
                <p className="text-xs text-gray-400 mt-1">Reviews in last 30 days</p>
              </div>
            </div>
          </div>

          {/* Pending Queue Overview Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold" /> Pending Workload by Category
              </h3>
              <Link
                to="/reviewer/review-queue"
                className="text-xs font-semibold text-gold hover:text-gold-dark flex items-center gap-1 transition"
              >
                View all queues &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/reviewer/review-queue?tab=datasets"
                className="bg-white hover:bg-slate-50 border border-border hover:border-red-300 rounded-2xl p-5 transition group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-red-700">Pending Datasets</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                </div>
                <p className="text-3xl font-bold text-red-600">{pendingCounts.datasets}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                  <span>Awaiting peer decision</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </p>
              </Link>

              <Link
                to="/reviewer/review-queue?tab=content-updates"
                className="bg-white hover:bg-slate-50 border border-border hover:border-amber-300 rounded-2xl p-5 transition group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-700">Content Updates</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </div>
                <p className="text-3xl font-bold text-amber-600">{pendingCounts.contentUpdates}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                  <span>Metadata & file updates</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </p>
              </Link>

              <Link
                to="/reviewer/review-queue?tab=revision-requests"
                className="bg-white hover:bg-slate-50 border border-border hover:border-blue-300 rounded-2xl p-5 transition group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-blue-700">Revision Requests</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                </div>
                <p className="text-3xl font-bold text-blue-600">{pendingCounts.revisionRequests}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                  <span>Author edit permissions</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </p>
              </Link>

              <Link
                to="/reviewer/review-queue?tab=access-requests"
                className="bg-white hover:bg-slate-50 border border-border hover:border-violet-300 rounded-2xl p-5 transition group shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-violet-700">Access Requests</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                </div>
                <p className="text-3xl font-bold text-violet-600">{pendingCounts.accessRequests}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                  <span>Restricted dataset access</span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </p>
              </Link>
            </div>
          </div>

          {/* Quick CTA to review queue */}
          {pendingCounts.datasets > 0 ? (
            <div className="bg-gradient-to-r from-navy to-navy-dark text-white rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h4 className="text-base font-bold">
                    {pendingCounts.datasets} dataset{pendingCounts.datasets !== 1 ? "s" : ""} awaiting peer evaluation
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Evaluate datasets using the standardized 6-point criteria rubric and submit decisions.
                  </p>
                </div>
              </div>
              <Link
                to="/reviewer/review-queue"
                className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-navy text-sm font-bold rounded-xl px-5 py-3 transition shrink-0 shadow-sm"
              >
                Start Evaluating
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200 text-emerald-900 rounded-2xl p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Review Queue is Caught Up</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    There are currently no datasets pending peer review. Check back later or review your history.
                  </p>
                </div>
              </div>
              <Link
                to="/reviewer/review-queue?tab=my-reviews"
                className="text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl px-4 py-2 transition shrink-0"
              >
                View My Past Reviews
              </Link>
            </div>
          )}

          {/* Additional navigation card: Archive Requests */}
          <div className="bg-white rounded-2xl border border-border p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-navy">Dataset Archive Requests</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Review and vote on requests from researchers seeking to archive published datasets.
                </p>
              </div>
            </div>
            <Link
              to="/reviewer/archive-requests"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-slate-100 hover:bg-slate-200 rounded-xl px-4 py-2.5 transition"
            >
              Open Archive Requests &rarr;
            </Link>
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
                    Verify that the dataset title, description, category name, language, and keywords are accurate and clear. Category must be properly assigned from institutional categories.
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
                    Ensure the dataset does NOT expose Personally Identifiable Information (PII), confidential research participant data, or unauthorized institutional secrets without explicit consent.
                  </p>
                </div>

                <div className="border border-border rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-navy text-xs uppercase tracking-wider flex items-center gap-2 mb-1">
                    <span className="w-5 h-5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold flex items-center justify-center">4</span>
                    Decision Actions
                  </h4>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                    <li><strong className="text-emerald-700">Approve:</strong> Dataset meets all documentation, structural integrity, and ethics requirements (at least 4 criteria &ge; 3).</li>
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
