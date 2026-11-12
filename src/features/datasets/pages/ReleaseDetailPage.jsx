import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  GitBranch,
  Calendar,
  Download,
  Copy,
  Check,
  FileText,
  Shield,
  Layers,
  AlertTriangle,
  Loader2,
  ExternalLink,
  BookOpen,
  Info,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import IdentifierBadge from "../../../components/identifiers/IdentifierBadge";
import * as v2Api from "../../../api/v2VersioningApi";
import { useToast } from "../../../context/ToastContext";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ReleaseDetailPage() {
  const { id: datasetId, releaseId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [copiedCitation, setCopiedCitation] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadRelease() {
      setLoading(true);
      setError(null);
      try {
        const data = await v2Api.getDatasetReleaseDetail(datasetId, releaseId);
        if (active) setRelease(data);
      } catch (err) {
        if (active) {
          console.error("Error loading release snapshot:", err);
          setError("Failed to load the requested release snapshot.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (datasetId && releaseId) {
      loadRelease();
    }
    return () => { active = false; };
  }, [datasetId, releaseId]);

  const handleDownloadFile = async (logicalFileId, filename) => {
    if (!logicalFileId) return;
    setDownloadingFileId(logicalFileId);
    try {
      const blob = await v2Api.getReleaseFileDownloadUrl(datasetId, releaseId, logicalFileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `file-${logicalFileId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast("File download started.", "success");
    } catch (err) {
      console.error("Release file download error:", err);
      addToast("Failed to download release file.", "error");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleCopyCitation = (citationText) => {
    if (!citationText) return;
    navigator.clipboard?.writeText(citationText);
    setCopiedCitation(true);
    addToast("Citation copied to clipboard.", "success");
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  if (loading) {
    return (
      <DashboardShell title="Release Snapshot" subtitle="Loading immutable version data…">
        <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500">Retrieving immutable release snapshot & manifest…</p>
        </div>
      </DashboardShell>
    );
  }

  if (error || !release) {
    return (
      <DashboardShell title="Release Snapshot" subtitle="Snapshot not available">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-navy mb-2">Release Snapshot Unavailable</h2>
          <p className="text-slate-500 mb-6 text-sm">{error || "Could not retrieve the specified release snapshot."}</p>
          <Link
            to={`/datasets/${datasetId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Current Dataset
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const metadataSnapshot = release.metadata_snapshot || {};
  const licenseSnapshot = release.license_snapshot || {};
  const files = release.files || [];
  const citationText = release.citation || release.citation_snapshot || "";
  const isWithdrawn = release.status === "withdrawn" || Boolean(release.withdrawn_at);

  const versionPid =
    release.version_pid ||
    release.ordp_pid ||
    (release.identifiers?.find((id) => id.scheme === "ordp" && id.role === "version")?.identifier_value);

  const relDoi =
    release.doi ||
    release.identifiers?.find((id) => id.scheme === "doi" && id.role === "version");

  const doiValue = typeof relDoi === "string" ? relDoi : relDoi?.identifier_value;
  const doiUrl = relDoi?.landing_page_url;
  const doiStatus = relDoi?.registration_status || (relDoi ? "registered" : "not_requested");

  return (
    <DashboardShell
      title={`Release Snapshot v${release.version}`}
      subtitle={`Published on ${formatDate(release.published_at || release.created_at)}`}
    >
      {/* Back button */}
      <div className="mb-4">
        <Link
          to={`/datasets/${datasetId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Current Dataset
        </Link>
      </div>

      {/* Snapshot preservation banner */}
      <div className={`p-4 rounded-2xl border mb-6 flex flex-wrap items-center justify-between gap-3 ${
        isWithdrawn ? "bg-rose-50 border-rose-200" : "bg-amber-50/70 border-amber-200"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isWithdrawn ? "bg-rose-100 text-rose-700" : "bg-gold/20 text-gold-dark"
          }`}>
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-navy">
              Immutable Snapshot: Version {release.version} ({release.change_type || "release"})
            </p>
            <p className="text-xs text-slate-600">
              {isWithdrawn
                ? `⚠️ This release was marked as withdrawn on ${formatDate(release.withdrawn_at)}.`
                : "This snapshot represents the exact metadata, license, and file manifest published at this version."}
            </p>
          </div>
        </div>

        <Link
          to={`/datasets/${datasetId}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-navy bg-white hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 transition shadow-2xs"
        >
          View Current Living Dataset &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content (Metadata & Files) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Metadata Snapshot Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Metadata Snapshot</span>
              <span className="text-xs font-mono text-slate-500">Release UUID: {release.id}</span>
            </div>

            <h1 className="text-2xl font-bold font-serif text-navy mb-3">
              {metadataSnapshot.title || release.title || "Untitled Dataset Release"}
            </h1>

            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-6">
              {metadataSnapshot.description || release.description || "No description was captured in this release snapshot."}
            </p>

            {/* Keywords */}
            {metadataSnapshot.keywords?.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500 mr-1">Keywords:</span>
                {metadataSnapshot.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"
                  >
                    {typeof kw === "string" ? kw : kw.name || kw.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Files Manifest */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-navy flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold-dark" />
                Preserved File Manifest ({files.length})
              </h2>
            </div>

            {files.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No files associated with this release snapshot.</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {files.map((file, idx) => {
                  const logicalId = file.logical_file_id || file.id;
                  const isBusy = downloadingFileId === logicalId;
                  return (
                    <div
                      key={logicalId || idx}
                      className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">
                          {file.filename || file.name || `file-${idx + 1}`}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>{file.file_type || "File"}</span>
                          <span>•</span>
                          <span>{formatBytes(file.file_size || file.size)}</span>
                          {file.checksum_sha256 && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[11px] text-slate-400" title={`SHA-256: ${file.checksum_sha256}`}>
                                SHA256: {file.checksum_sha256.slice(0, 10)}…
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDownloadFile(logicalId, file.filename || file.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy text-white text-xs font-semibold hover:bg-navy-light transition disabled:opacity-50 cursor-pointer"
                      >
                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Download
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Release Notes & Change Summary */}
          {(release.release_notes || release.change_summary) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
              <h3 className="text-sm font-bold text-navy">Release Documentation</h3>
              {release.change_summary && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Change Summary</h4>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {release.change_summary}
                  </p>
                </div>
              )}
              {release.release_notes && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Release Notes</h4>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line">
                    {release.release_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Info & Identifiers */}
        <div className="lg:col-span-4 space-y-6">
          {/* Identifiers Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Persistent Identifiers</h3>
            <div className="space-y-2">
              {versionPid && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Version ORDP PID:</label>
                  <IdentifierBadge
                    scheme="ordp"
                    role="version"
                    pid={versionPid}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Version DOI:</label>
                <IdentifierBadge
                  scheme="doi"
                  role="version"
                  identifierValue={doiValue}
                  landingPageUrl={doiUrl}
                  registrationStatus={doiStatus}
                />
              </div>
            </div>
          </div>

          {/* Citation Card */}
          {citationText && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-navy" />
                  Citation Snapshot
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopyCitation(citationText)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy hover:text-gold transition cursor-pointer"
                >
                  {copiedCitation ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedCitation ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs font-mono text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                {citationText}
              </p>
            </div>
          )}

          {/* License Snapshot Card */}
          {licenseSnapshot && (licenseSnapshot.name || licenseSnapshot.identifier || licenseSnapshot.url) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-navy" />
                License Snapshot
              </h3>
              <p className="text-xs font-bold text-navy">
                {licenseSnapshot.name || licenseSnapshot.identifier || "Open License"}
              </p>
              {licenseSnapshot.url && (
                <a
                  href={licenseSnapshot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold hover:underline inline-flex items-center gap-1"
                >
                  View license terms <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

