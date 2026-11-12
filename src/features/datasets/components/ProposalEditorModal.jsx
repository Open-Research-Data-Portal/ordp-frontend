import { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  GitBranch,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  RotateCcw,
} from "lucide-react";
import * as v2Api from "../../../api/v2VersioningApi";
import { useToast } from "../../../context/ToastContext";
import { formatApiError } from "../../../utils/errorFormatter";

export default function ProposalEditorModal({
  dataset,
  currentVersion = "1.0.0",
  existingProposal = null,
  onClose,
  onSuccess,
}) {
  const { addToast } = useToast();

  const [proposalId, setProposalId] = useState(existingProposal?.id || null);
  const [status, setStatus] = useState(existingProposal?.status || "draft");
  const [computedMinChangeType, setComputedMinChangeType] = useState(
    existingProposal?.computed_min_change_type || null
  );

  const [declaredChangeType, setDeclaredChangeType] = useState(
    existingProposal?.declared_change_type || "minor"
  );
  const [changeSummary, setChangeSummary] = useState(
    existingProposal?.change_summary || ""
  );
  const [releaseNotes, setReleaseNotes] = useState(
    existingProposal?.release_notes || ""
  );

  // Proposed metadata overrides
  const [title, setTitle] = useState(
    existingProposal?.proposed_metadata?.title || dataset?.title || ""
  );
  const [description, setDescription] = useState(
    existingProposal?.proposed_metadata?.description || dataset?.description || ""
  );
  const [keywords, setKeywords] = useState(
    Array.isArray(existingProposal?.proposed_metadata?.keywords)
      ? existingProposal.proposed_metadata.keywords.join(", ")
      : Array.isArray(dataset?.keywords)
      ? dataset.keywords.join(", ")
      : ""
  );

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // If existing proposal has status, sync it
  useEffect(() => {
    if (existingProposal) {
      setProposalId(existingProposal.id);
      setStatus(existingProposal.status);
      setComputedMinChangeType(existingProposal.computed_min_change_type);
    }
  }, [existingProposal]);

  const buildPayload = () => {
    const kwList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    return {
      declared_change_type: declaredChangeType,
      change_summary: changeSummary.trim(),
      release_notes: releaseNotes.trim(),
      proposed_metadata: {
        title: title.trim(),
        description: description.trim(),
        keywords: kwList,
      },
    };
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const payload = buildPayload();
      let res;
      if (proposalId) {
        res = await v2Api.editProposal(proposalId, payload);
        addToast("Proposal draft updated successfully.", "success");
      } else {
        res = await v2Api.createProposal(dataset.id, payload);
        setProposalId(res.id);
        setStatus(res.status || "draft");
        addToast("New release proposal initiated.", "success");
      }
      if (onSuccess) onSuccess(res);
    } catch (err) {
      console.error("Save proposal error:", err);
      addToast(formatApiError(err, "Failed to save proposal draft."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!changeSummary.trim()) {
      addToast("Please provide a brief change summary.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      let currentId = proposalId;
      if (!currentId) {
        const created = await v2Api.createProposal(dataset.id, payload);
        currentId = created.id;
        setProposalId(currentId);
      } else {
        await v2Api.editProposal(currentId, payload);
      }

      let res;
      if (status === "changes_requested") {
        res = await v2Api.resubmitProposal(currentId, payload);
        addToast("Proposal resubmitted for reviewer evaluation.", "success");
      } else {
        res = await v2Api.submitProposal(currentId);
        addToast("Proposal submitted for reviewer evaluation.", "success");
      }

      setStatus(res.status || "pending_review");
      if (res.computed_min_change_type) {
        setComputedMinChangeType(res.computed_min_change_type);
      }
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      console.error("Submit proposal error:", err);
      addToast(formatApiError(err, "Failed to submit proposal for review."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelProposal = async () => {
    if (!proposalId) {
      onClose();
      return;
    }
    if (!window.confirm("Are you sure you want to cancel this version proposal?")) {
      return;
    }
    setCancelling(true);
    try {
      await v2Api.cancelProposal(proposalId);
      setStatus("cancelled");
      addToast("Proposal was cancelled.", "info");
      if (onSuccess) onSuccess({ id: proposalId, status: "cancelled" });
      onClose();
    } catch (err) {
      console.error("Cancel proposal error:", err);
      addToast(formatApiError(err, "Failed to cancel proposal."), "error");
    } finally {
      setCancelling(false);
    }
  };

  const isReadOnly = status === "published" || status === "cancelled" || status === "pending_review";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 sm:p-8 animate-scale-up my-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gold/20 text-gold-dark mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Dataset Release Proposal
            </div>
            <h2 className="text-xl font-bold text-navy">
              Propose New Release (Current: v{currentVersion})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Declare updates and changes. The backend authoritatively calculates version severity.
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

        {/* Status Alert if proposal already exists */}
        {proposalId && (
          <div className="mb-6 p-4 rounded-xl border bg-slate-50 border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-700">Proposal Lifecycle Status: </span>
              <span className="font-mono font-bold uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-navy">
                {status}
              </span>
              {computedMinChangeType && (
                <span className="ml-2 text-slate-600">
                  • Computed Minimum Change: <strong className="uppercase text-navy">{computedMinChangeType}</strong>
                </span>
              )}
            </div>

            {status === "changes_requested" && (
              <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                Action Required: Revise & Resubmit
              </span>
            )}
          </div>
        )}

        <div className="space-y-5">
          {/* Declared Change Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-navy mb-1.5">
              Declared Change Type (Request / Declaration)
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Note: This is a declaration. The backend reviewer evaluation determines the final change type.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: "patch", label: "Patch", desc: "Documentation, typo, or minor data fixes" },
                { type: "minor", label: "Minor", desc: "Backwards-compatible additions or fields" },
                { type: "major", label: "Major", desc: "Breaking schema or methodology changes" },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setDeclaredChangeType(item.type)}
                  className={`p-3 rounded-xl border text-left transition ${
                    declaredChangeType === item.type
                      ? "border-gold bg-gold/10 ring-2 ring-gold/30 text-navy font-semibold"
                      : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="text-xs font-bold">{item.label}</p>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Change Summary */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-navy mb-1">
              Change Summary <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={isReadOnly}
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="e.g. Added regional coverage for 2024 and updated collection methodology"
              className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {/* Release Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-navy mb-1">
              Release Notes (Public changelog notes)
            </label>
            <textarea
              rows={3}
              disabled={isReadOnly}
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="Detailed notes describing what changed in this version for researchers and citations…"
              className="w-full text-xs rounded-xl border border-slate-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {/* Proposed Metadata Overrides (Optional) */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Proposed Metadata Overrides (Optional)
            </h4>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Proposed Title</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Proposed Description</label>
              <textarea
                rows={2}
                disabled={isReadOnly}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Keywords (comma-separated)</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 mt-6">
          <div>
            {proposalId && status !== "published" && status !== "cancelled" && (
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelProposal}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50 cursor-pointer"
              >
                {cancelling ? "Cancelling…" : "Cancel Proposal"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-navy rounded-xl transition"
            >
              Close
            </button>

            {!isReadOnly && (
              <>
                <button
                  type="button"
                  disabled={saving || submitting}
                  onClick={handleSaveDraft}
                  className="px-4 py-2 text-xs font-semibold text-navy bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving Draft…" : "Save Draft"}
                </button>

                <button
                  type="button"
                  disabled={saving || submitting}
                  onClick={handleSubmit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-navy bg-gold hover:bg-gold-light rounded-xl transition shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {status === "changes_requested" ? "Resubmit Proposal" : "Submit for Evaluation"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

