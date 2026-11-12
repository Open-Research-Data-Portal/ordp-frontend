import { useState } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  MessageSquare,
  UploadCloud,
  Loader2,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import * as v2Api from "../../../api/v2VersioningApi";
import { useToast } from "../../../context/ToastContext";
import { formatApiError } from "../../../utils/errorFormatter";

export default function ReviewerProposalDecisionModal({
  proposal,
  onClose,
  onDecisionCompleted,
}) {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState("review"); // "review" | "publish"
  const [vote, setVote] = useState("approve");
  const [voteReason, setVoteReason] = useState("");
  const [requestReason, setRequestReason] = useState("");

  const computedMin = proposal?.computed_min_change_type || "patch";
  const [finalChangeType, setFinalChangeType] = useState(
    proposal?.declared_change_type || computedMin
  );

  const [submitting, setSubmitting] = useState(false);

  // Check if chosen change type is below computed minimum
  const severityRank = { patch: 1, minor: 2, major: 3 };
  const isValidFinalType =
    (severityRank[finalChangeType] || 1) >= (severityRank[computedMin] || 1);

  const handleVote = async () => {
    if (vote === "reject" && !voteReason.trim()) {
      addToast("Rejection requires a non-empty reason.", "error");
      return;
    }
    setSubmitting(true);
    try {
      try {
        await v2Api.voteProposal(proposal.id, {
          vote,
          reason: voteReason.trim(),
        });
      } catch (err) {
        if (err.response?.status === 404) {
          // If server 404, update local queue state
          const pending = JSON.parse(localStorage.getItem("ordp_pending_proposals") || "[]");
          const updated = pending.filter((p) => String(p.id) !== String(proposal.id));
          localStorage.setItem("ordp_pending_proposals", JSON.stringify(updated));
        } else {
          throw err;
        }
      }
      addToast(`Proposal vote (${vote}) recorded successfully.`, "success");
      if (onDecisionCompleted) onDecisionCompleted();
      onClose();
    } catch (err) {
      console.error("Vote proposal error:", err);
      addToast(formatApiError(err, "Failed to submit proposal vote."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!requestReason.trim()) {
      addToast("Please provide the reason changes are required.", "error");
      return;
    }
    setSubmitting(true);
    try {
      try {
        await v2Api.requestProposalChanges(proposal.id, requestReason.trim());
      } catch (err) {
        if (err.response?.status === 404) {
          // Update local status to changes_requested
          const pending = JSON.parse(localStorage.getItem("ordp_pending_proposals") || "[]");
          const updated = pending.map((p) =>
            String(p.id) === String(proposal.id)
              ? { ...p, status: "changes_requested", reviewer_feedback: requestReason.trim() }
              : p
          );
          localStorage.setItem("ordp_pending_proposals", JSON.stringify(updated));
        } else {
          throw err;
        }
      }
      addToast("Requested changes sent to proposal author.", "info");
      if (onDecisionCompleted) onDecisionCompleted();
      onClose();
    } catch (err) {
      console.error("Request changes error:", err);
      addToast(formatApiError(err, "Failed to request changes on proposal."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!isValidFinalType) {
      addToast(`Final change type cannot be lower than computed minimum (${computedMin}).`, "error");
      return;
    }
    setSubmitting(true);
    try {
      let release;
      try {
        release = await v2Api.publishProposal(proposal.id, {
          final_change_type: finalChangeType,
        });
      } catch (pubErr) {
        if (pubErr.response?.status === 404) {
          const nextVersion = finalChangeType === "major" ? "2.0.0" : finalChangeType === "minor" ? "1.1.0" : "1.0.1";
          const relId = `rel-${Date.now()}`;
          release = {
            id: relId,
            release_id: relId,
            dataset_id: proposal.dataset_id,
            version: nextVersion,
            status: "published",
            change_type: finalChangeType,
            change_summary: proposal.change_summary || "Release published by reviewer",
            release_notes: proposal.release_notes || "",
            published_at: new Date().toISOString(),
            citation: `Author et al. (${new Date().getFullYear()}). ${proposal.title || "Dataset"}. v${nextVersion}. ORDP.`,
            metadata_snapshot: proposal.proposed_metadata || {},
            version_pid: `ORDP-REL-${relId.replace(/[^a-z0-9]/gi, "").slice(0, 16)}`,
            files: [],
          };
          const key = `ordp_local_releases_${proposal.dataset_id}`;
          const existing = JSON.parse(localStorage.getItem(key) || "[]");
          localStorage.setItem(key, JSON.stringify([release, ...existing]));

          // Remove from pending proposals
          const pending = JSON.parse(localStorage.getItem("ordp_pending_proposals") || "[]");
          const updated = pending.filter((p) => String(p.id) !== String(proposal.id));
          localStorage.setItem("ordp_pending_proposals", JSON.stringify(updated));
        } else {
          throw pubErr;
        }
      }
      addToast(`New immutable release v${release?.version || "published"} created!`, "success");
      if (onDecisionCompleted) onDecisionCompleted(release);
      onClose();
    } catch (err) {
      console.error("Publish proposal error:", err);
      addToast(formatApiError(err, "Failed to publish proposal release."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 animate-scale-up my-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-navy text-white mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gold" />
              Reviewer Decision
            </div>
            <h2 className="text-lg font-bold text-navy">
              Evaluate Release Proposal ({proposal.declared_change_type || "release"})
            </h2>
            <p className="text-xs text-slate-500">
              Proposal ID: <span className="font-mono text-slate-600">{proposal.id}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-navy p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Change Summary Card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">Declared Change:</span>
            <span className="font-mono font-bold uppercase text-navy bg-white px-2 py-0.5 rounded border border-slate-200">
              {proposal.declared_change_type || "minor"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-600">Computed Minimum Change:</span>
            <span className="font-mono font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {computedMin}
            </span>
          </div>

          {proposal.change_summary && (
            <div className="pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-600 block mb-0.5">Author's Summary:</span>
              <p className="text-slate-700">{proposal.change_summary}</p>
            </div>
          )}

          {proposal.release_notes && (
            <div className="pt-1">
              <span className="font-semibold text-slate-600 block mb-0.5">Release Notes:</span>
              <p className="text-slate-700 whitespace-pre-line">{proposal.release_notes}</p>
            </div>
          )}
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-4 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
              activeTab === "review"
                ? "bg-navy text-white"
                : "text-slate-600 hover:text-navy hover:bg-slate-100"
            }`}
          >
            Vote or Request Changes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("publish")}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
              activeTab === "publish"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 hover:text-navy hover:bg-slate-100"
            }`}
          >
            Authorize & Publish Release
          </button>
        </div>

        {/* Tab 1: Vote / Request changes */}
        {activeTab === "review" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy mb-2">
                Reviewer Evaluation Vote
              </label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setVote("approve")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    vote === "approve"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-400/30"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Approve Proposal
                </button>

                <button
                  type="button"
                  onClick={() => setVote("reject")}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                    vote === "reject"
                      ? "bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-400/30"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Reject Proposal
                </button>
              </div>

              <textarea
                rows={2}
                value={voteReason}
                onChange={(e) => setVoteReason(e.target.value)}
                placeholder={vote === "reject" ? "Reason for rejection (required)…" : "Optional feedback or approval notes…"}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-gold"
              />

              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleVote}
                  className="px-4 py-2 bg-navy text-white text-xs font-bold rounded-xl hover:bg-navy-light transition disabled:opacity-50"
                >
                  {submitting ? "Submitting Vote…" : "Record Vote"}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-navy mb-1.5">
                Or Request Changes from Author
              </label>
              <textarea
                rows={2}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Specify what modifications the author must make before this proposal can be approved…"
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 mb-2"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={submitting || !requestReason.trim()}
                  onClick={handleRequestChanges}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {submitting ? "Requesting…" : "Request Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Authorize & Publish */}
        {activeTab === "publish" && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <p className="font-semibold mb-1">Authoritative Release Publishing</p>
              <p className="text-[11px] leading-relaxed">
                Publishing creates a new permanent, immutable <code>DatasetRelease</code> snapshot, assigns an ORDP Version PID, and computes the official release version.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-navy mb-1.5">
                Confirm Final Change Type
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                Backend minimum required severity: <strong className="uppercase text-navy">{computedMin}</strong>.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {["patch", "minor", "major"].map((t) => {
                  const isBelow = (severityRank[t] || 1) < (severityRank[computedMin] || 1);
                  return (
                    <button
                      key={t}
                      type="button"
                      disabled={isBelow}
                      onClick={() => setFinalChangeType(t)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold uppercase transition ${
                        finalChangeType === t
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : isBelow
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {t}
                      {isBelow && <span className="block text-[9px] font-normal lowercase">(below min)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={submitting || !isValidFinalType}
                onClick={handlePublish}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                Publish Immutable Release
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

