import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GitBranch,
  Calendar,
  AlertTriangle,
  ArrowRight,
  FileText,
  Tag,
  CheckCircle2,
  ChevronRight,
  Download,
  Info,
} from "lucide-react";
import IdentifierBadge from "../../../components/identifiers/IdentifierBadge";

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

/**
 * ReleaseHistoryList — renders the immutable release history for a dataset.
 * Displayed in the order returned by the backend (newest first).
 */
export default function ReleaseHistoryList({
  datasetId,
  releases = [],
  currentReleaseId,
  loading = false,
  onSelectRelease,
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl animate-pulse">
        <GitBranch className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
        <p className="text-xs font-medium text-slate-500">Loading release history & snapshots…</p>
      </div>
    );
  }

  if (!releases || releases.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl">
        <GitBranch className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-navy mb-1">Initial Publication Release</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          This dataset is at its initial published state (v1.0.0). When subsequent releases are published, their immutable snapshots and version history will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-navy flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-gold-dark" />
            Immutable Release History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Every published release is an immutable snapshot with its own metadata, files manifest, and persistent identifiers.
          </p>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {releases.length} {releases.length === 1 ? "release" : "releases"}
        </span>
      </div>

      <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {releases.map((rel, idx) => {
          const isLatest = idx === 0 || rel.id === currentReleaseId;
          const isWithdrawn = rel.status === "withdrawn" || Boolean(rel.withdrawn_at);
          const changeType = rel.change_type || "minor";

          // Extract version PID and DOI
          const versionPid =
            rel.version_pid ||
            rel.ordp_pid ||
            (rel.identifiers?.find((id) => id.scheme === "ordp" && id.role === "version")?.identifier_value);

          const relDoi =
            rel.doi ||
            rel.identifiers?.find((id) => id.scheme === "doi" && id.role === "version");

          const doiValue = typeof relDoi === "string" ? relDoi : relDoi?.identifier_value;
          const doiUrl = relDoi?.landing_page_url;
          const doiStatus = relDoi?.registration_status || (relDoi ? "registered" : "not_requested");

          return (
            <div
              key={rel.id || rel.version || idx}
              className={`p-5 transition hover:bg-slate-50/70 ${
                isWithdrawn ? "bg-rose-50/30" : isLatest ? "bg-amber-50/20" : ""
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2.5">
                {/* Version and Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold font-mono text-navy">
                    v{rel.version}
                  </span>

                  {isLatest && !isWithdrawn && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold/20 text-gold-dark border border-gold/30">
                      <CheckCircle2 className="w-3 h-3" /> Latest Release
                    </span>
                  )}

                  {isWithdrawn ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                      <AlertTriangle className="w-3 h-3" /> Withdrawn
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700">
                      <Tag className="w-3 h-3" /> {changeType}
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" /> {formatDate(rel.published_at || rel.created_at)}
                  </span>
                </div>

                {/* Snapshot Action Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectRelease) {
                        onSelectRelease(rel);
                      } else {
                        navigate(`/datasets/${datasetId}/releases/${rel.id}`);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy hover:bg-navy-light text-white text-xs font-semibold shadow-2xs hover:shadow transition cursor-pointer"
                  >
                    View Snapshot
                    <ChevronRight className="w-3.5 h-3.5 text-gold" />
                  </button>
                </div>
              </div>

              {/* Withdrawn Notice if applicable */}
              {isWithdrawn && (
                <div className="my-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <p className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Notice: This release was withdrawn on {formatDate(rel.withdrawn_at)}.
                  </p>
                  {rel.withdrawal_reason && (
                    <p className="mt-1 text-rose-700">Reason: {rel.withdrawal_reason}</p>
                  )}
                </div>
              )}

              {/* Change summary / Release notes */}
              {(rel.change_summary || rel.release_notes) && (
                <div className="text-xs text-slate-600 mb-3 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                  {rel.change_summary && (
                    <p className="font-medium text-navy">{rel.change_summary}</p>
                  )}
                  {rel.release_notes && rel.release_notes !== rel.change_summary && (
                    <p className="mt-1 text-slate-500 line-clamp-2">{rel.release_notes}</p>
                  )}
                </div>
              )}

              {/* Version Identifiers */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {versionPid && (
                  <IdentifierBadge
                    scheme="ordp"
                    role="version"
                    pid={versionPid}
                  />
                )}

                <IdentifierBadge
                  scheme="doi"
                  role="version"
                  identifierValue={doiValue}
                  landingPageUrl={doiUrl}
                  registrationStatus={doiStatus}
                />

                {rel.files?.length > 0 && (
                  <span className="text-[11px] font-medium text-slate-500 ml-auto">
                    {rel.files.length} {rel.files.length === 1 ? "file" : "files"} preserved in manifest
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

