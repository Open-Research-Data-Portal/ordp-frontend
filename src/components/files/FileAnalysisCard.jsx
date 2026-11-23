import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { getFileAnalysis, getLevelInfo, getCheckFriendlyName } from "../../api/fileAnalysis";
import FileAnalysisModal from "./FileAnalysisModal";

export default function FileAnalysisCard({
  fileId,
  fileName = "File",
  initialAnalysis = null,
  compact = false,
  className = "",
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [prevInitial, setPrevInitial] = useState(initialAnalysis);
  const [loading, setLoading] = useState(!initialAnalysis && !!fileId);
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (initialAnalysis !== prevInitial) {
    setPrevInitial(initialAnalysis);
    setAnalysis(initialAnalysis);
  }

  useEffect(() => {
    let ignore = false;
    if (!initialAnalysis && fileId) {
      getFileAnalysis(fileId)
        .then((data) => {
          if (!ignore) setAnalysis(data);
        })
        .catch(() => {})
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [fileId, initialAnalysis]);

  const levelInfo = getLevelInfo(analysis?.level);
  const checks = Array.isArray(analysis?.checks) ? analysis.checks : [];
  const passedCount = checks.filter((c) => c.result === "pass").length;
  const skippedCount = checks.filter((c) => c.result === "skipped").length;
  const effectiveTotal = checks.length - skippedCount;
  const malwareCheck = checks.find((c) => c.name === "malware_scan");
  const warningsCount = Array.isArray(analysis?.warnings) ? analysis.warnings.length : 0;
  const status = analysis?.status || "queued";

  // Malware note: never say "Zero malware detected" if the scanner was skipped.
  const malwareNote =
    malwareCheck?.result === "skipped"
      ? " \u00b7 Malware scan skipped, not configured"
      : malwareCheck?.result === "pass"
      ? " \u00b7 Zero malware detected"
      : "";

  const warningsNote =
    warningsCount > 0
      ? ` \u00b7 ${warningsCount} warning${warningsCount > 1 ? "s" : ""}`
      : "";

  if (loading) {
    return (
      <div className={`p-3.5 rounded-xl border border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-500 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-navy" />
        <span>Loading AI file analysis&hellip;</span>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`p-3 rounded-xl border border-dashed border-gray-200 bg-white flex items-center justify-between text-xs text-gray-400 ${className}`}>
        <span>File analysis pending or unavailable.</span>
        {fileId && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-navy hover:underline font-semibold"
          >
            Check
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`rounded-xl border transition-all ${
          status === "failed"
            ? "border-red-200 bg-red-50/40"
            : status === "done"
            ? "border-emerald-200 bg-emerald-50/30"
            : "border-amber-200 bg-amber-50/30"
        } ${className}`}
      >
        <div className="p-3.5 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            {status === "done" ? (
              <span className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
              </span>
            ) : status === "failed" ? (
              <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4 text-red-700" />
              </span>
            ) : (
              <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-700" />
              </span>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">AI File Check</span>
                {levelInfo && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${levelInfo.badgeClass}`}
                  >
                    {levelInfo.shortName}
                  </span>
                )}
                {analysis.detected_type && (
                  <span className="text-[11px] font-mono text-gray-600 bg-white px-1.5 py-0.2 rounded border border-gray-200">
                    {analysis.detected_type}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {status === "done" || status === "partial"
                  ? `${passedCount} of ${effectiveTotal} checks passed${malwareNote}${warningsNote}`
                  : status === "failed"
                  ? analysis.error || "File format or integrity check failed"
                  : "Automated analysis in progress"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!compact && checks.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-black/5"
              >
                {expanded ? "Hide Details" : "Quick View"}
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-xs font-semibold text-navy hover:text-navy-light inline-flex items-center gap-1 bg-white border border-gray-200 hover:border-navy/30 px-2.5 py-1 rounded-lg shadow-2xs transition"
            >
              <span>Full Report</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Expandable checks list */}
        {expanded && checks.length > 0 && (
          <div className="border-t border-gray-200/60 p-3 bg-white/60 space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checks.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {c.result === "pass" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : c.result === "warn" ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : c.result === "skipped" ? (
                      <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    )}
                    <span className="text-slate-700 font-medium truncate">
                      {getCheckFriendlyName(c.name)}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded shrink-0 ${
                      c.result === "pass"
                        ? "bg-emerald-50 text-emerald-700"
                        : c.result === "warn"
                        ? "bg-amber-50 text-amber-700"
                        : c.result === "skipped"
                        ? "bg-slate-50 text-slate-500"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {c.result === "skipped" ? "Skipped" : c.result}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <FileAnalysisModal
        fileId={fileId}
        fileName={fileName}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialAnalysis={analysis}
      />
    </>
  );
}
