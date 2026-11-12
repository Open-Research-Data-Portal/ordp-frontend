import { GitBranch, History, Sparkles, Layers } from "lucide-react";
import IdentifierBadge from "./IdentifierBadge";

/**
 * DatasetIdentityPanel — displays concept-level identity, current published semantic version,
 * concept PID, DOI registration status, and versioning actions.
 */
export default function DatasetIdentityPanel({
  dataset,
  currentRelease,
  releaseCount = 0,
  onOpenReleaseHistory,
  onProposeNewRelease,
  canPropose = false,
  className = "",
}) {
  if (!dataset) return null;

  // Extract concept PID
  const conceptPid =
    dataset.concept_pid ||
    dataset.ordp_pid ||
    (dataset.identifiers?.find((id) => id.scheme === "ordp" && (id.role === "concept" || !id.role))?.identifier_value);

  // Extract concept DOI
  const conceptDoi =
    dataset.concept_doi ||
    dataset.doi ||
    dataset.identifiers?.find((id) => id.scheme === "doi" && (id.role === "concept" || !id.role));

  const doiStatus = conceptDoi?.registration_status || dataset.doi_registration_status || (conceptDoi ? "registered" : "not_requested");
  const doiValue = typeof conceptDoi === "string" ? conceptDoi : conceptDoi?.identifier_value;
  const doiUrl = conceptDoi?.landing_page_url;

  // Semantic version from backend (never construct locally)
  const currentVersion =
    currentRelease?.version ||
    dataset.current_version ||
    dataset.version ||
    "1.0.0";

  return (
    <div className={`bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200/90 rounded-2xl p-4 shadow-2xs ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Version & Identifiers */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Current Semantic Version Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-navy text-white rounded-lg text-xs font-bold shadow-2xs">
            <GitBranch className="w-3.5 h-3.5 text-gold" />
            <span>v{currentVersion}</span>
            <span className="text-[10px] font-normal text-slate-300 uppercase tracking-wider ml-1">Current Release</span>
          </div>

          {/* Concept PID */}
          {conceptPid && (
            <IdentifierBadge
              scheme="ordp"
              role="concept"
              pid={conceptPid}
            />
          )}

          {/* Concept DOI */}
          <IdentifierBadge
            scheme="doi"
            role="concept"
            identifierValue={doiValue}
            landingPageUrl={doiUrl}
            registrationStatus={doiStatus}
          />
        </div>

        {/* Right: Release History link & Proposal Trigger */}
        <div className="flex items-center gap-2">
          {onOpenReleaseHistory && (
            <button
              type="button"
              onClick={onOpenReleaseHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer"
              title="View all immutable published releases"
            >
              <History className="w-3.5 h-3.5 text-gold-dark" />
              Releases & History
              {releaseCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">
                  {releaseCount}
                </span>
              )}
            </button>
          )}

          {canPropose && onProposeNewRelease && (
            <button
              type="button"
              onClick={onProposeNewRelease}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-navy bg-gold hover:bg-gold-light rounded-xl transition shadow-2xs cursor-pointer"
              title="Propose a new semantic version release for this dataset"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Propose New Release
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

