import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Download,
  FileText,
  Table,
  Shield,
  Loader2,
  ExternalLink,
  Info,
  Calendar,
  User,
  Tag,
  X,
  Trash2,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { StatusBadge } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { isReviewer, isAdmin, getDashboardPath } from "../../../utils/userRoles";
import { useToast } from "../../../context/ToastContext.jsx";
import * as datasetsApi from "../hooks/datasetsApi.js";

const EVALUATION_QUESTIONS = [
  {
    id: "quality",
    title: "1. Data Quality & Completeness",
    description: "Are the data files structurally sound, complete, uncorrupted, and provided in standard readable formats?",
  },
  {
    id: "methodology",
    title: "2. Methodology Soundness",
    description: "Is the data collection, experimental methodology, and scientific processing rigorous and well-grounded?",
  },
  {
    id: "ethics",
    title: "3. Ethical Compliance & Privacy",
    description: "Does the dataset strictly protect confidential information and anonymize Personally Identifiable Information (PII)?",
  },
  {
    id: "documentation",
    title: "4. Documentation & Metadata",
    description: "Are variable descriptions, units, data dictionaries, keywords, and domain categories accurately documented?",
  },
  {
    id: "contribution",
    title: "5. Originality & Research Contribution",
    description: "Does this submission provide substantial academic, scientific, or applied research value to the community?",
  },
  {
    id: "reproducibility",
    title: "6. Reproducibility & Openness",
    description: "Can another independent researcher interpret, reproduce, or build upon the research findings using this data?",
  },
];

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

export default function ReviewDatasetPage() {
  const { datasetId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Role validation
  useEffect(() => {
    if (user && !isReviewer(user) && !isAdmin(user)) {
      navigate(getDashboardPath(user), { replace: true });
    }
  }, [user, navigate]);

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Questionnaire responses: { [questionId]: number (1-5) }
  const [ratings, setRatings] = useState({});
  const [evalNotes, setEvalNotes] = useState("");

  // Modals & submission state
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [decisionModal, setDecisionModal] = useState(null); // "rejected" | "changes_requested"
  const [modalReason, setModalReason] = useState("");

  // Suggest thumbnail & deletion modals
  const [showThumbModal, setShowThumbModal] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [submittingThumb, setSubmittingThumb] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Load dataset
  useEffect(() => {
    let active = true;
    async function fetchDetail() {
      setLoading(true);
      setError("");
      try {
        const data = await datasetsApi.getDatasetDetail(datasetId);
        if (active) setDataset(data);
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.detail || "Could not load dataset details.");
          addToast("Failed to load dataset.", "error");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    if (datasetId) fetchDetail();
    return () => { active = false; };
  }, [datasetId, addToast]);

  // Scoring computations
  const totalQuestions = EVALUATION_QUESTIONS.length;
  const answeredCount = Object.keys(ratings).length;
  const isComplete = answeredCount === totalQuestions;

  const passedCriteriaCount = useMemo(() => {
    return Object.values(ratings).filter((score) => Number(score) >= 3).length;
  }, [ratings]);

  const failedCriteriaCount = useMemo(() => {
    return Object.values(ratings).filter((score) => Number(score) < 3).length;
  }, [ratings]);

  // Scoring Rules:
  // - If >= 4 rated >= 3 -> Approve enabled
  // - If >= 4 rated < 3 -> Reject enabled
  // - If 3 and 3 -> both enabled
  const canApprove = isComplete && passedCriteriaCount >= 4;
  const canReject = isComplete && failedCriteriaCount >= 4;
  const isSplit = isComplete && passedCriteriaCount === 3 && failedCriteriaCount === 3;

  const approveAllowed = canApprove || isSplit;
  const rejectAllowed = canReject || isSplit;

  function handleScoreChange(questionId, score) {
    setRatings((prev) => ({
      ...prev,
      [questionId]: Number(score),
    }));
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const url = await datasetsApi.getDownloadUrl(datasetId);
      if (url) {
        window.open(url, "_blank");
      } else {
        addToast("Download link not available.", "error");
      }
    } catch {
      addToast("Failed to initiate file download.", "error");
    } finally {
      setDownloading(false);
    }
  }

  async function submitDecision(decision, reason = "") {
    setSubmitting(true);
    try {
      const scoreSummary = `[Score: ${passedCriteriaCount}/${totalQuestions} Passed (>=3)]`;
      const combinedReason = reason ? `${reason} ${scoreSummary}` : `${scoreSummary} ${evalNotes.trim()}`;
      await datasetsApi.decideDataset(datasetId, decision, combinedReason);
      addToast(
        decision === "approved"
          ? "Dataset approved successfully!"
          : decision === "rejected"
          ? "Dataset rejected."
          : "Changes requested from author.",
        "success"
      );
      navigate("/reviewer/review-queue");
    } catch (err) {
      console.error("Decision submission error:", err);
      if (err?.response?.status === 404) {
        addToast("This dataset has already been reviewed or is no longer pending evaluation.", "info");
        navigate("/reviewer/review-queue");
        return;
      }
      const rawData = err?.response?.data;
      const isHtml = typeof rawData === "string" && (rawData.includes("<html>") || rawData.includes("<h1>Not Found"));
      const serverMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (!isHtml && typeof rawData === "string" ? rawData : null) ||
        err?.message ||
        "Failed to submit decision.";
      addToast(serverMsg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleModalDecisionSubmit(e) {
    e.preventDefault();
    if (!modalReason.trim() || !decisionModal) return;
    await submitDecision(decisionModal, modalReason.trim());
    setDecisionModal(null);
    setModalReason("");
  }

  async function handleSuggestThumbnail(e) {
    e.preventDefault();
    setSubmittingThumb(true);
    try {
      if (thumbnailFile) {
        const formData = new FormData();
        formData.append("thumbnail", thumbnailFile);
        if (thumbnailUrl.trim()) formData.append("reason", thumbnailUrl.trim());
        await datasetsApi.suggestThumbnail(datasetId, formData);
      } else if (thumbnailUrl.trim()) {
        await datasetsApi.suggestThumbnail(datasetId, { thumbnail_url: thumbnailUrl.trim() });
      } else {
        addToast("Select an image or enter a URL.", "error");
        setSubmittingThumb(false);
        return;
      }
      addToast("Thumbnail suggestion sent!", "success");
      setShowThumbModal(false);
      setThumbnailUrl("");
      setThumbnailFile(null);
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to submit thumbnail.", "error");
    } finally {
      setSubmittingThumb(false);
    }
  }

  async function handleRequestDeletion(e) {
    e.preventDefault();
    if (!deleteReason.trim()) return;
    setSubmittingDelete(true);
    try {
      await datasetsApi.requestDatasetDeletion(datasetId, deleteReason.trim());
      addToast("Deletion request submitted to administrators.", "success");
      setShowDeleteModal(false);
      setDeleteReason("");
    } catch (err) {
      addToast(err?.response?.data?.detail || "Failed to submit deletion request.", "error");
    } finally {
      setSubmittingDelete(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell title="Dataset Evaluation" subtitle="Peer review in progress…">
        <div className="bg-white rounded-2xl border border-border p-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-500">Loading dataset details & review rubric…</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !dataset) {
    return (
      <DashboardShell title="Dataset Evaluation" subtitle="Error">
        <div className="bg-white rounded-2xl border border-border p-12 text-center max-w-lg mx-auto mt-6">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-navy mb-1">Dataset Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">{error || "The requested dataset could not be retrieved."}</p>
          <Link
            to="/reviewer/review-queue"
            className="inline-flex items-center gap-2 bg-navy text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-navy/90 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Review Queue
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const files = dataset.files || [];

  return (
    <DashboardShell title="Dataset Evaluation" subtitle={`Reviewing: ${dataset.title || "Dataset"}`}>
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
        <Link
          to="/reviewer/review-queue"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-navy transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Review Queue
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowThumbModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 transition shadow-xs"
          >
            🖼️ Suggest Thumbnail
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-xl px-3 py-2 transition shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Flag for Deletion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Complete Dataset Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-xs font-mono text-gray-400">ID: {dataset.id}</span>
              <StatusBadge status={String(dataset.status || "pending").toLowerCase()} />
            </div>
            <h1 className="text-2xl font-serif font-bold text-navy mb-3 leading-snug">
              {dataset.title || "Untitled Dataset"}
            </h1>

            {/* Metadata pills */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-600 mb-4 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gold" />
                <strong>Submitter:</strong> {dataset.owner?.email || dataset.owner_name || dataset.submitter || "—"}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gold" />
                <strong>Submitted:</strong> {formatDate(dataset.created_at || dataset.submitted_at)}
              </span>
              {dataset.category && (
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-gold" />
                  <strong>Category:</strong> {dataset.category}
                </span>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">Description & Abstract</h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
                {dataset.description || dataset.abstract || "No description provided by author."}
              </p>
            </div>

            {/* Tags & Keywords */}
            {dataset.tags && dataset.tags.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Keywords & Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(dataset.tags) ? dataset.tags : String(dataset.tags).split(",")).map((tag, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                      #{String(tag).trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link
                to={`/datasets/${dataset.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold hover:text-gold-dark transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open public preview page in new tab &rarr;
              </Link>
            </div>
          </div>

          {/* Files & Data Integrity Inspection */}
          <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                <FileText className="w-5 h-5 text-gold" />
                Submitted Files ({files.length})
              </h3>
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-slate-100 hover:bg-slate-200 rounded-xl px-3.5 py-2 transition"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-gold" />}
                Download All Files
              </button>
            </div>

            {files.length === 0 ? (
              <p className="text-xs text-gray-400 italic bg-slate-50 p-4 rounded-xl text-center">
                No files listed on this record.
              </p>
            ) : (
              <div className="space-y-4">
                {files.map((file, idx) => (
                  <div key={file.id || idx} className="border border-border rounded-xl overflow-hidden bg-white">
                    <div className="p-3.5 bg-slate-50 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-navy flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gold shrink-0" />
                          {file.filename || file.name || `File ${idx + 1}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatFileSize(file.file_size || file.size)} · {file.file_type || file.content_type || "data"}
                        </p>
                      </div>
                      {file.preview_rows && file.preview_rows.length > 0 && (
                        <button
                          type="button"
                          onClick={() => downloadPreviewCsv(file, dataset.title)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 transition"
                          title="Download preview rows as CSV"
                        >
                          <Download className="w-3 h-3 text-gold" />
                          Export CSV Preview
                        </button>
                      )}
                    </div>

                    {/* Preview Table if structured */}
                    {file.preview_rows && file.preview_rows.length > 0 ? (
                      <div className="p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
                          <Table className="w-3.5 h-3.5 text-gold" />
                          <span>Structured Data Preview (First {file.preview_rows.length} rows)</span>
                        </div>
                        <div className="overflow-x-auto max-h-56 border border-slate-100 rounded-lg">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-semibold uppercase sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-center text-[10px] w-10">#</th>
                                {(file.columns || file.headers || Object.keys(file.preview_rows[0] || {})).map((col, cIdx) => (
                                  <th key={cIdx} className="px-3 py-2 text-left text-[11px] whitespace-nowrap">
                                    {String(col)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {file.preview_rows.map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                                  <td className="px-3 py-1.5 text-center text-slate-400 font-mono text-[10px]">{rIdx + 1}</td>
                                  {(Array.isArray(row) ? row : Object.values(row)).map((val, vIdx) => (
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
                        Raw binary file or preview rows not generated for this file format.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 6-Question Evaluation Questionnaire (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-border p-6 shadow-sm sticky top-6">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-gold" />
              <h2 className="text-lg font-bold text-navy">Peer Review Evaluation</h2>
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Rate all 6 standard criteria (1–5). At least 4 criteria must score 3+ to enable approval.
            </p>

            {/* Questions List */}
            <div className="space-y-5">
              {EVALUATION_QUESTIONS.map((q) => {
                const currentScore = ratings[q.id];
                return (
                  <div key={q.id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-xs font-bold text-navy">{q.title}</h4>
                      {currentScore ? (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            currentScore >= 3
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          Score: {currentScore}/5
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Required</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2.5 leading-normal">{q.description}</p>

                    {/* 1 to 5 radio buttons */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => {
                        const selected = currentScore === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleScoreChange(q.id, val)}
                            className={`py-2 text-center rounded-xl text-xs font-bold transition-all border ${
                              selected
                                ? val >= 3
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                  : "bg-red-600 text-white border-red-600 shadow-xs"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="block text-sm">{val}</span>
                            <span className="block text-[9px] font-normal opacity-90">
                              {val === 1 ? "Poor" : val === 3 ? "Pass" : val === 5 ? "Top" : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional notes */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1.5">
                Evaluation Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={evalNotes}
                onChange={(e) => setEvalNotes(e.target.value)}
                placeholder="Add confidential feedback or notes for the review record…"
                className="w-full text-xs rounded-xl border border-slate-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>

            {/* Score Summary Box */}
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-navy">Evaluation Score</span>
                <span className="text-xs font-mono font-bold text-navy">
                  {answeredCount} / {totalQuestions} answered
                </span>
              </div>

              {isComplete ? (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-emerald-700">{passedCriteriaCount} Passed (&ge;3)</span>
                    <span className="text-red-600">{failedCriteriaCount} Failed (&lt;3)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${(passedCriteriaCount / totalQuestions) * 100}%` }}
                    />
                    <div
                      className="bg-red-500 h-full transition-all"
                      style={{ width: `${(failedCriteriaCount / totalQuestions) * 100}%` }}
                    />
                  </div>

                  <p className="text-[11px] mt-2 text-slate-600">
                    {canApprove
                      ? "✓ Approval threshold met (4+ criteria rated ≥ 3)."
                      : canReject
                      ? "✗ Rejection threshold reached (4+ criteria rated < 3)."
                      : "Balanced evaluation (3 pass / 3 fail). You may approve, reject, or request changes."}
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>Please rate all 6 criteria above to unlock decision actions.</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                disabled={!approveAllowed || submitting}
                onClick={() => submitDecision("approved")}
                className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl py-3 shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  !isComplete
                    ? "Complete all 6 questions first"
                    : !approveAllowed
                    ? "Approval requires at least 4 criteria rated ≥ 3"
                    : "Approve and publish dataset"
                }
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Approve Dataset
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!rejectAllowed || submitting}
                  onClick={() => {
                    setDecisionModal("rejected");
                    setModalReason("");
                  }}
                  className="inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl py-2.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title={
                    !isComplete
                      ? "Complete all 6 questions first"
                      : !rejectAllowed
                      ? "Score passed approval threshold — reject disabled unless failing criteria"
                      : "Reject dataset with reason"
                  }
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject Dataset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Reason Modal (for Reject / Changes Requested) */}
      {decisionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => {
            setDecisionModal(null);
            setModalReason("");
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base font-bold text-navy flex items-center gap-2">
                {decisionModal === "rejected" ? (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    Reject Dataset
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5 text-amber-600" />
                    Request Changes
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDecisionModal(null);
                  setModalReason("");
                }}
                className="text-gray-400 hover:text-navy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              {decisionModal === "rejected"
                ? "Specify why this dataset is rejected. This reason will be logged and communicated to the author."
                : "Describe the specific revisions required before this dataset can be reconsidered for approval."}
            </p>

            <form onSubmit={handleModalDecisionSubmit}>
              <textarea
                required
                rows={4}
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                placeholder={
                  decisionModal === "rejected"
                    ? "Enter rejection rationale (e.g. Unanonymized patient records, duplicate study, corrupt file headers)..."
                    : "Describe required changes (e.g. Please add column definitions in the data dictionary and upload CSV format)..."
                }
                className="w-full rounded-xl border border-slate-200 text-xs p-3 resize-none focus:outline-none focus:ring-2 focus:ring-gold mb-4"
              />

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDecisionModal(null);
                    setModalReason("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !modalReason.trim()}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition disabled:opacity-50 ${
                    decisionModal === "rejected" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Confirm {decisionModal === "rejected" ? "Rejection" : "Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggest Thumbnail Modal */}
      {showThumbModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => {
            setShowThumbModal(false);
            setThumbnailUrl("");
            setThumbnailFile(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base font-bold text-navy">Suggest Dataset Thumbnail</h3>
              <button
                type="button"
                onClick={() => {
                  setShowThumbModal(false);
                  setThumbnailUrl("");
                  setThumbnailFile(null);
                }}
                className="text-gray-400 hover:text-navy"
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
                  Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/cover.png"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 text-xs p-3 focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowThumbModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingThumb}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-navy bg-gold hover:bg-gold-light rounded-xl transition disabled:opacity-50"
                >
                  {submittingThumb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Submit Suggestion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Flag For Deletion Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          onClick={() => {
            setShowDeleteModal(false);
            setDeleteReason("");
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Flag Dataset For Removal
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteReason("");
                }}
                className="text-gray-400 hover:text-navy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Please specify why this dataset should be deleted from the repository (e.g. copyright infringement, privacy violation, or ethics breach).
            </p>
            <form onSubmit={handleRequestDeletion}>
              <textarea
                required
                rows={4}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Describe reason for deletion request..."
                className="w-full rounded-xl border border-slate-200 text-xs p-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              />
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-gray-500 hover:text-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDelete || !deleteReason.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition disabled:opacity-50"
                >
                  {submittingDelete ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Submit Deletion Flag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
