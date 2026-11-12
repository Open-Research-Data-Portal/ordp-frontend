import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ExternalLink, ShieldCheck, Clock, AlertCircle } from "lucide-react";

/**
 * IdentifierBadge renders either an ORDP-owned PID (Concept or Version)
 * or an external DOI ResourceIdentifier, strictly respecting the rules in Section 3 & 5.
 */
export default function IdentifierBadge({
  scheme = "ordp", // "ordp" | "doi"
  role = "concept", // "concept" | "version"
  pid, // ORDP-DS-... or ORDP-REL-...
  identifierValue, // Provider-assigned DOI value (e.g. "10.1234/ordp.abc")
  landingPageUrl, // returned landing page URL or resolver URL
  registrationStatus = "not_requested", // "not_requested" | "pending" | "registered" | "failed" | "cancelled"
  className = "",
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. ORDP Persistent Identifier
  if (scheme?.toLowerCase() === "ordp" || pid) {
    const rawPid = pid || identifierValue;
    if (!rawPid) return null;

    const isConcept = rawPid.startsWith("ORDP-DS") || role === "concept";
    const resolverPath = `/id/${encodeURIComponent(rawPid)}`;

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border bg-slate-50 border-slate-200 text-navy ${className}`}
        title={`${isConcept ? "ORDP Concept PID" : "ORDP Version PID"}: ${rawPid}`}
      >
        <span className="inline-flex items-center gap-1 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-navy" />
          {isConcept ? "Concept PID" : "Version PID"}:
        </span>
        <Link
          to={resolverPath}
          className="text-navy hover:text-gold hover:underline font-semibold"
        >
          {rawPid}
        </Link>
        <button
          type="button"
          onClick={(e) => handleCopy(rawPid, e)}
          className="p-0.5 text-slate-400 hover:text-navy rounded transition"
          title="Copy PID"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    );
  }

  // 2. DOI Identifier (external provider)
  if (scheme?.toLowerCase() === "doi" || registrationStatus) {
    const status = String(registrationStatus || "not_requested").toLowerCase();

    if (status === "registered" && identifierValue) {
      const doiUrl = landingPageUrl || `https://doi.org/${identifierValue}`;
      return (
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-emerald-50 border-emerald-200 text-emerald-900 ${className}`}
          title={`Registered DOI: ${identifierValue}`}
        >
          <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-700">DOI:</span>
          <a
            href={doiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono font-semibold hover:underline inline-flex items-center gap-1"
          >
            {identifierValue}
            <ExternalLink className="w-3 h-3 text-emerald-600" />
          </a>
          <button
            type="button"
            onClick={(e) => handleCopy(doiUrl, e)}
            className="p-0.5 text-emerald-600 hover:text-emerald-900 rounded transition"
            title="Copy DOI Link"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      );
    }

    if (status === "pending") {
      return (
        <div
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-amber-50 border-amber-200 text-amber-800 ${className}`}
          title="DOI Registration is queued or processing"
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span className="font-semibold">DOI: Registration pending</span>
        </div>
      );
    }

    if (status === "failed") {
      return (
        <div
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-rose-50 border-rose-200 text-rose-700 ${className}`}
          title="DOI Registration could not be completed"
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span className="font-semibold">DOI: Registration failed</span>
        </div>
      );
    }

    if (status === "cancelled") {
      return (
        <div
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-slate-100 border-slate-300 text-slate-600 ${className}`}
        >
          <span className="font-semibold">DOI: Registration cancelled</span>
        </div>
      );
    }

    // not_requested or disabled
    return (
      <div
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-slate-50 border-slate-200 text-slate-500 ${className}`}
      >
        <span>DOI: Not requested</span>
      </div>
    );
  }

  return null;
}

