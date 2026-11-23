import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Clock,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { getFileAnalysis, getLevelInfo } from "../../api/fileAnalysis";
import FileAnalysisModal from "./FileAnalysisModal";

export default function FileAnalysisBadge({
  fileId,
  fileName = "File",
  initialAnalysis = null,
  showModalOnClick = true,
  pollInterval = 4000,
  size = "md",
  className = "",
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [loading, setLoading] = useState(!initialAnalysis && !!fileId);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    if (!fileId) return;
    try {
      const data = await getFileAnalysis(fileId);
      setAnalysis(data);
      return data;
    } catch {
      // Ignore 404 or transient fetch errors in passive badge
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    if (initialAnalysis) {
      setAnalysis(initialAnalysis);
    } else if (fileId) {
      fetchAnalysis();
    }
  }, [fileId, initialAnalysis, fetchAnalysis]);

  // Auto-polling while status is queued or running
  useEffect(() => {
    if (!fileId) return;
    const isPending = analysis?.status === "queued" || analysis?.status === "running";
    if (!isPending) return;

    const timer = setInterval(async () => {
      const data = await fetchAnalysis();
      if (data && data.status !== "queued" && data.status !== "running") {
        clearInterval(timer);
      }
    }, pollInterval);

    return () => clearInterval(timer);
  }, [fileId, analysis?.status, pollInterval, fetchAnalysis]);

  const handleClick = (e) => {
    if (showModalOnClick) {
      e.preventDefault();
      e.stopPropagation();
      setModalOpen(true);
    }
  };

  const levelInfo = getLevelInfo(analysis?.level);
  const status = analysis?.status;

  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2",
  }[size] || "text-xs px-2.5 py-1 gap-1.5";

  // Render badge content based on status & level
  let badgeContent = null;
  if (loading) {
    badgeContent = (
      <span className="inline-flex items-center gap-1 text-gray-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Checking…</span>
      </span>
    );
  } else if (!analysis) {
    badgeContent = (
      <span className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600">
        <Shield className="w-3 h-3" />
        <span>File Check</span>
      </span>
    );
  } else if (status === "running") {
    badgeContent = (
      <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
        <span>Analyzing…</span>
      </span>
    );
  } else if (status === "queued") {
    badgeContent = (
      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>Queued</span>
      </span>
    );
  } else if (status === "failed") {
    badgeContent = (
      <span className="inline-flex items-center gap-1 text-red-700 font-medium">
        <ShieldAlert className="w-3 h-3 text-red-600" />
        <span>Check Failed</span>
      </span>
    );
  } else if (status === "partial") {
    badgeContent = (
      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
        <AlertTriangle className="w-3 h-3 text-amber-600" />
        <span>Partial</span>
      </span>
    );
  } else {
    // status === "done" or successful with level
    badgeContent = (
      <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>{levelInfo ? levelInfo.shortName : "Verified"}</span>
      </span>
    );
  }

  const containerStyle =
    status === "done"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/80"
      : status === "failed"
      ? "bg-red-50 border-red-200 text-red-800 hover:bg-red-100/80"
      : status === "running"
      ? "bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100/80"
      : status === "queued"
      ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/80"
      : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center font-medium rounded-full border transition-all cursor-pointer shadow-2xs ${sizeClasses} ${containerStyle} ${className}`}
        title={`Click to inspect automated file analysis for ${fileName}`}
      >
        {badgeContent}
      </button>

      {showModalOnClick && (
        <FileAnalysisModal
          fileId={fileId}
          fileName={fileName}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          initialAnalysis={analysis}
        />
      )}
    </>
  );
}
