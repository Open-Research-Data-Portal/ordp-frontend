import { useEffect, useState, useCallback } from "react";
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
  Copy,
  Check,
  RefreshCw,
  Loader2,
  FileCode,
  HardDrive,
  Info,
  Clock,
} from "lucide-react";
import {
  getFileAnalysis,
  getLevelInfo,
  getCheckFriendlyName,
  getCheckDescription,
  formatBytes,
} from "../../api/fileAnalysis";

export default function FileAnalysisModal({
  fileId,
  fileName = "File",
  isOpen,
  onClose,
  initialAnalysis = null,
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [loading, setLoading] = useState(!initialAnalysis);
  const [error, setError] = useState(null);
  const [copiedSha, setCopiedSha] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    if (!fileId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFileAnalysis(fileId);
      setAnalysis(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        setError("Analysis not yet queued or file is inaccessible.");
      } else {
        setError(err?.response?.data?.detail || "Failed to load file analysis details.");
      }
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    if (isOpen) {
      if (initialAnalysis) {
        setAnalysis(initialAnalysis);
      } else if (fileId) {
        fetchAnalysis();
      }
    }
  }, [isOpen, fileId, initialAnalysis, fetchAnalysis]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const levelInfo = getLevelInfo(analysis?.level);
  const isPending = analysis?.status === "queued" || analysis?.status === "running";
  const checks = Array.isArray(analysis?.checks) ? analysis.checks : [];
  const warnings = Array.isArray(analysis?.warnings) ? analysis.warnings : [];
  const technical = analysis?.technical || {};

  const handleCopySha = () => {
    const sha = technical.sha256 || analysis?.checksum;
    if (sha) {
      navigator.clipboard.writeText(sha);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    }
  };

  const renderCheckIcon = (result) => {
    switch (result) {
      case "pass":
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case "warn":
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case "fail":
        return <XCircle className="w-5 h-5 text-red-600 shrink-0" />;
      default:
        return <MinusCircle className="w-5 h-5 text-slate-400 shrink-0" />;
    }
  };

  const renderCheckBadge = (result) => {
    switch (result) {
      case "pass":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
            Pass
          </span>
        );
      case "warn":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            Warning
          </span>
        );
      case "fail":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
            Fail
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">
            Skipped
          </span>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-xs px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-navy text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gold/90">
                  AI File Integrity Inspection
                </span>
                {analysis?.status && (
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      analysis.status === "done"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : analysis.status === "failed"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {analysis.status}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold truncate text-white" title={fileName}>
                {fileName}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchAnalysis}
              disabled={loading}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition disabled:opacity-50"
              title="Refresh check results"
              aria-label="Refresh check results"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-navy" />
              <p className="text-sm font-medium">Loading automated file checks…</p>
            </div>
          ) : error ? (
            <div className="p-5 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Unable to retrieve analysis</p>
                <p className="text-xs text-red-700 mt-1">{error}</p>
              </div>
            </div>
          ) : isPending ? (
            <div className="p-8 rounded-xl border border-amber-200 bg-amber-50/60 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6 text-amber-700 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Analysis In Progress</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                This file is currently being inspected by the ORDP background worker. Checks include format
                integrity, checksum validation, and malware scanning.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={fetchAnalysis}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Check Status Now
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Level & Format Header Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Level Card */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between ${
                    levelInfo ? levelInfo.bgClass : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                      Data Classification Level
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-sm font-bold px-2 py-0.5 rounded ${
                          levelInfo ? levelInfo.badgeClass : "bg-slate-700 text-white"
                        }`}
                      >
                        {levelInfo?.shortName || "Level ?"}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {levelInfo?.name}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] mt-2 opacity-90 leading-relaxed">
                    {levelInfo?.description}
                  </p>
                </div>

                {/* Detected Format Card */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Detected MIME Type
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <FileCode className="w-4 h-4 text-slate-700 shrink-0" />
                      <span className="text-xs font-mono font-bold text-slate-900 truncate">
                        {analysis?.detected_type || "Unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 flex items-center justify-between">
                    <span>Coverage:</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {(analysis?.coverage || "fully_analysed").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* File Hash & Size Card */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Integrity Hash (SHA-256)
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-mono text-slate-800 truncate" title={technical.sha256}>
                        {technical.sha256 ? `${technical.sha256.slice(0, 16)}…` : "—"}
                      </span>
                      {technical.sha256 && (
                        <button
                          type="button"
                          onClick={handleCopySha}
                          className="p-1 text-gray-400 hover:text-slate-900 transition rounded"
                          title="Copy full SHA-256 hash"
                        >
                          {copiedSha ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-gray-500 flex items-center justify-between">
                    <span>Verified Size:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {technical.size_bytes ? formatBytes(technical.size_bytes) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warnings or Failures */}
              {analysis?.status === "failed" && analysis?.error && (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-800">
                      Inspection Error
                    </p>
                    <p className="text-sm font-semibold mt-0.5">{analysis.error}</p>
                    <p className="text-xs text-red-700 mt-1">
                      The file format could not be verified or is corrupted. Please re-check the original
                      file before publication.
                    </p>
                  </div>
                </div>
              )}

              {warnings.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Quality & Safety Warnings ({warnings.length})
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-xs space-y-1 pl-1 text-amber-800">
                    {warnings.map((w, idx) => (
                      <li key={idx}>{typeof w === "string" ? w : JSON.stringify(w)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Checklist Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-navy" />
                    Automated Verification Checklist ({checks.length})
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Deterministic checks without generative AI
                  </span>
                </div>

                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                  {checks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-400">
                      No individual check details recorded.
                    </div>
                  ) : (
                    checks.map((chk, idx) => (
                      <div
                        key={chk.name || idx}
                        className="p-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {renderCheckIcon(chk.result)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-slate-900">
                                {getCheckFriendlyName(chk.name)}
                              </p>
                              {renderCheckBadge(chk.result)}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {getCheckDescription(chk.name)}
                            </p>
                            {chk.detail && (
                              <p className="text-xs text-slate-700 mt-1 font-mono bg-slate-50 px-2 py-1 rounded border border-gray-100 inline-block">
                                {chk.detail}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Audit Timestamps & Technical Drawer */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5" />
                  ORDP Autonomous Inspection Service
                </span>
                <span>
                  {analysis?.finished_at ? (
                    <>Completed at {new Date(analysis.finished_at).toLocaleString()}</>
                  ) : analysis?.created_at ? (
                    <>Initiated at {new Date(analysis.created_at).toLocaleString()}</>
                  ) : null}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span>Levels A and B qualify for standard open publication.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
