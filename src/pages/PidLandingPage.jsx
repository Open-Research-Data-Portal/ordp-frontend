import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  GitBranch,
  ArrowRight,
  Calendar,
  AlertTriangle,
  Loader2,
  BookOpen,
  Copy,
  Check,
  FileText,
  ExternalLink,
} from "lucide-react";
import * as v2Api from "../api/v2VersioningApi";
import IdentifierBadge from "../components/identifiers/IdentifierBadge";

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

export default function PidLandingPage() {
  const { pid } = useParams();
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function resolve() {
      if (!pid) return;
      setLoading(true);
      setError(null);
      try {
        const data = await v2Api.resolvePid(pid);
        if (active) setRecord(data);
      } catch (err) {
        if (active) {
          console.error("PID resolution error:", err);
          const status = err.response?.status;
          if (status === 404) {
            setError("The persistent identifier was not found or is no longer accessible.");
          } else if (status === 403 || status === 401) {
            setError("This persistent identifier points to a restricted or private dataset. Authentication or access permission is required.");
          } else {
            setError("Could not resolve this persistent identifier.");
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    resolve();
    return () => { active = false; };
  }, [pid]);

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
          <h2 className="text-base font-bold text-navy mb-1">Resolving Persistent Identifier</h2>
          <p className="text-xs font-mono text-slate-400 break-all">{pid}</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-navy mb-2">PID Resolution Notice</h2>
          <p className="text-xs font-mono text-slate-400 mb-3 break-all">{pid}</p>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">{error || "Resource could not be loaded."}</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/datasets"
              className="px-4 py-2 bg-navy text-white text-xs font-semibold rounded-xl hover:bg-navy-light transition"
            >
              Browse Public Datasets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const resourceType = record.resource_type || (record.release_id ? "release" : "dataset");
  const isRelease = resourceType === "release";
  const datasetId = record.dataset_id || record.dataset?.id || record.id;
  const releaseId = record.release_id || record.release?.id;

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-navy text-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-gold text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              ORDP {isRelease ? "Version PID" : "Concept PID"}
            </div>
            {record.version && (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/10 text-slate-200">
                v{record.version}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-serif font-bold text-white mb-3">
            {record.title || record.metadata_snapshot?.title || "Persistent Identifier Record"}
          </h1>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-mono text-slate-300 select-all">{pid}</span>
            <button
              type="button"
              onClick={() => handleCopy(pid)}
              className="text-slate-400 hover:text-white p-1 rounded transition"
              title="Copy PID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Metadata Overview */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {isRelease ? "Snapshot Description" : "Dataset Description"}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {record.description || record.metadata_snapshot?.description || "No description provided for this persistent identifier."}
            </p>
          </div>

          {/* Citation */}
          {(record.citation || record.citation_snapshot) && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-navy" />
                Canonical Citation
              </h4>
              <p className="text-xs font-mono text-slate-700 leading-relaxed">
                {record.citation || record.citation_snapshot}
              </p>
            </div>
          )}

          {/* Action Navigation */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {isRelease ? "Target: Immutable Published Release" : "Target: Living Dataset Concept"}
            </div>

            <div className="flex items-center gap-2">
              {isRelease && releaseId && datasetId ? (
                <Link
                  to={`/datasets/${datasetId}/releases/${releaseId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy-light transition shadow-2xs"
                >
                  View Release Snapshot
                  <ArrowRight className="w-4 h-4 text-gold" />
                </Link>
              ) : datasetId ? (
                <Link
                  to={`/datasets/${datasetId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy-light transition shadow-2xs"
                >
                  View Dataset Detail
                  <ArrowRight className="w-4 h-4 text-gold" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

