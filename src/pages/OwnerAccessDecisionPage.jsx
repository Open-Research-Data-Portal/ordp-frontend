import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  FileText,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";
import DashboardAwareLayout from "../layouts/DashboardAwareLayout";
import { useAuth } from "../context/useAuth";
import { getAccessRequestDetail, decideAccessRequestAsOwner } from "../api/sharing";
import Button from "../components/ui/Button";

export default function OwnerAccessDecisionPage() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const reqId =
    params.id ||
    params.requestId ||
    searchParams.get("request_id") ||
    searchParams.get("id");

  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [decisionResult, setDecisionResult] = useState(null); // 'approved' | 'rejected'
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadRequest() {
      if (!reqId) {
        setLoading(false);
        setError("Missing access request identifier.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await getAccessRequestDetail(reqId);
        if (active) {
          setRequestData(data);
          if (data?.status && data.status !== "pending") {
            setDecisionResult(data.status);
          }
        }
      } catch (err) {
        // If GET endpoint returns 404 or isn't available, we still allow owner decision
        if (active) {
          console.warn("Could not load full access request details via GET, showing decision card:", err);
          setRequestData({
            id: reqId,
            status: "pending",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (!authLoading) {
      loadRequest();
    }

    return () => {
      active = false;
    };
  }, [reqId, authLoading]);

  async function handleDecision(decision) {
    if (!reqId) return;
    setSubmitting(true);
    setActionError("");

    try {
      const backendDecision = decision === "approved" ? "approve" : "reject";
      await decideAccessRequestAsOwner(reqId, {
        decision: backendDecision,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setDecisionResult(backendDecision);
    } catch (err) {
      console.error("Owner decision failed:", err);
      setActionError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        `Failed to submit ${decision} decision. Please make sure you are signed in as the dataset owner.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  const datasetId =
    requestData?.dataset_id ||
    requestData?.dataset?.id ||
    requestData?.dataset;

  const datasetTitle =
    requestData?.dataset_title ||
    requestData?.dataset?.title ||
    requestData?.dataset_name ||
    "Restricted Dataset";

  const requesterName =
    requestData?.user_name ||
    requestData?.requester_name ||
    requestData?.user?.full_name ||
    requestData?.user?.name ||
    requestData?.requester ||
    "Researcher";

  const requesterEmail =
    requestData?.user_email ||
    requestData?.requester_email ||
    requestData?.user?.email ||
    requestData?.email ||
    "";

  const purpose =
    requestData?.purpose ||
    requestData?.reason ||
    "Academic research and evaluation.";

  const justification = requestData?.justification || "";
  const duration = requestData?.requested_duration_days || requestData?.duration || 30;

  return (
    <DashboardAwareLayout>
      <div className="max-w-2xl mx-auto py-6 animate-fade-in-up">
        {/* Breadcrumb / Back button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate(datasetId ? `/datasets/${datasetId}` : "/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {datasetId ? "Back to Dataset" : "Back to Dashboard"}
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-navy px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Dataset Access Request</h1>
                <p className="text-xs text-slate-300">
                  Owner review and decision portal
                </p>
              </div>
            </div>

            {decisionResult && (
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  decisionResult === "approved" || decisionResult === "approve"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-red-500/20 text-red-300 border border-red-500/40"
                }`}
              >
                {decisionResult}
              </span>
            )}
          </div>

          <div className="p-6 space-y-6">
            {!isAuthenticated && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold block text-amber-950 mb-0.5">
                    Owner Authentication Required
                  </span>
                  Please{" "}
                  <Link
                    to="/login"
                    state={{ returnUrl: window.location.pathname }}
                    className="font-bold underline text-amber-950 hover:text-black"
                  >
                    sign in
                  </Link>{" "}
                  with your dataset owner account to review and decide on this access request.
                </div>
              </div>
            )}

            {error ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to load access request</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            ) : null}

            {actionError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold block text-red-900">Decision Error</span>
                  {actionError}
                </div>
              </div>
            )}

            {decisionResult ? (
              <div className="text-center py-6 space-y-4 animate-fade-in">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                    decisionResult === "approved" || decisionResult === "approve"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {decisionResult === "approved" || decisionResult === "approve" ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <XCircle className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-bold text-navy">
                    {decisionResult === "approved" || decisionResult === "approve"
                      ? "Access Request Approved"
                      : "Access Request Rejected"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                    {decisionResult === "approved" || decisionResult === "approve"
                      ? "The requester has been granted permission to access and download this restricted dataset."
                      : "The access request has been formally declined."}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  {datasetId && (
                    <Link
                      to={`/datasets/${datasetId}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy text-xs font-semibold transition"
                    >
                      <Database className="w-3.5 h-3.5" /> View Dataset
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy hover:bg-navy-light text-white text-xs font-semibold shadow-xs transition"
                  >
                    Go to Dashboard <ArrowRight className="w-3.5 h-3.5 text-gold" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Details Section */}
                <div className="space-y-4 bg-slate-50/70 border border-slate-100 rounded-xl p-4.5 text-xs text-slate-600">
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Target Dataset
                      </span>
                      <p className="text-sm font-bold text-navy">
                        {datasetTitle}
                      </p>
                    </div>
                    {datasetId && (
                      <Link
                        to={`/datasets/${datasetId}`}
                        className="text-gold font-semibold hover:underline shrink-0 text-xs mt-1"
                      >
                        Inspect Dataset →
                      </Link>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Requester
                      </span>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{requesterName}</span>
                      </div>
                      {requesterEmail && (
                        <p className="text-slate-500 mt-0.5 pl-5">{requesterEmail}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Requested Duration
                      </span>
                      <div className="flex items-center gap-2 text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{duration} days</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Purpose of Access
                    </span>
                    <p className="text-slate-800 leading-relaxed whitespace-pre-line bg-white border border-slate-200/60 rounded-lg p-3">
                      {purpose}
                    </p>
                  </div>

                  {justification && (
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Restricted Access Justification
                      </span>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-line bg-white border border-slate-200/60 rounded-lg p-3">
                        {justification}
                      </p>
                    </div>
                  )}
                </div>

                {/* Owner Decision Form */}
                <div className="space-y-4 pt-2">
                  <div>
                    <label
                      htmlFor="decision-comment"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Decision Note / Remarks (Optional)
                    </label>
                    <textarea
                      id="decision-comment"
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      disabled={submitting}
                      className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                      placeholder="Add any instructions, usage conditions, or reasons for your decision..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      disabled={submitting || !isAuthenticated}
                      onClick={() => handleDecision("rejected")}
                      className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-red-600" />
                      Reject Request
                    </button>

                    <button
                      type="button"
                      disabled={submitting || !isAuthenticated}
                      onClick={() => handleDecision("approved")}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      Approve Request
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardAwareLayout>
  );
}
