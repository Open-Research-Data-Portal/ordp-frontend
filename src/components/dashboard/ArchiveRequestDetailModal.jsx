import { X, Archive, Shield, User, Calendar, FileText, CheckCircle2 } from "lucide-react";
import * as archiveApi from "../../api/archiveRequests";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const STATUS_BADGE = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  restored: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function ArchiveRequestDetailModal({ request, onClose, footer, votesText }) {
  if (!request) return null;
  const status = request?.status || "pending";
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Archive request details form"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-2xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-navy text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center shrink-0">
              <Archive className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-bold">Dataset Archival Request Form</h2>
              <p className="text-xs text-slate-300">Detailed review of researcher archival submission</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Dataset info card */}
          <div className="bg-slate-50 border border-border rounded-xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Target Dataset</span>
            <h3 className="text-lg font-extrabold text-navy mt-0.5">{request.dataset_title || "Untitled dataset"}</h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {request.dataset_id}</p>
          </div>

          {/* Field 1: Archival Category */}
          <div className="bg-white border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <FileText className="w-4 h-4 text-gold" /> 1. Archival Category
            </div>
            <div className="inline-block bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-lg">
              {request.type === "unarchive"
                ? archiveApi.intendedUseLabel(request.intended_use)
                : archiveApi.reasonLabel(request.reason_category || request.reason)}
            </div>
          </div>

          {/* Field 2: Research Impact Assessment */}
          <div className="bg-white border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <Shield className="w-4 h-4 text-gold" /> 2. Research Impact Assessment
            </div>
            <div className="inline-block bg-slate-50 border border-border text-navy text-xs font-bold px-3 py-1.5 rounded-lg">
              {request.impact || "No Active Citations / No Impact"}
            </div>
          </div>

          {/* Field 3: Detailed Archival Justification */}
          <div className="bg-white border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <FileText className="w-4 h-4 text-gold" /> 3. Detailed Archival Justification
            </div>
            <div className="rounded-xl bg-slate-50 border border-border p-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {request.comment || request.reason || "No detailed justification provided."}
            </div>
          </div>

          {/* Field 4: Data Preservation & Backup Storage Plan */}
          <div className="bg-white border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <Archive className="w-4 h-4 text-gold" /> 4. Data Preservation & Backup Storage Plan
            </div>
            <div className="rounded-xl bg-slate-50 border border-border p-4 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {request.preservation || "No preservation plan specified."}
            </div>
          </div>

          {/* Field 5: Contact Email for Inquiries */}
          <div className="bg-white border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <User className="w-4 h-4 text-gold" /> 5. Contact Email for Inquiries
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-navy">{request.owner_email || request.owner_name || "—"}</p>
                <p className="text-xs text-gray-400 mt-0.5">Requested by: {request.owner_name || "Researcher"}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Status</span>
                <span className={`inline-block text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${STATUS_BADGE[status] || STATUS_BADGE.pending}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          {votesText && (
            <div className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-200 p-3 text-xs font-semibold text-violet-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>{votesText}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-border flex items-center justify-end gap-3">
          {footer ? footer : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-100 transition shadow-xs"
            >
              Close Form
            </button>
          )}
        </div>
      </div>
    </div>
  );
}