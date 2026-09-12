import { X, Eye } from "lucide-react";
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

/**
 * Popup that shows the full details of an archive request — the reason text is
 * often truncated inside the table row, so clicking "View" opens this panel to
 * read the complete comment.
 */
export default function ArchiveRequestDetailModal({ request, onClose }) {
  if (!request) return null;
  const status = request?.status || "pending";
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Archive request details"
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[#E3E1DA] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Eye className="w-4 h-4 text-violet-700" />
            </span>
            <h2 className="text-base font-bold text-navy">Archive Request Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-navy rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 text-sm">
          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dataset</dt>
            <dd className="mt-0.5 font-medium text-navy">{request.dataset_title || "Untitled dataset"}</dd>
            <dd className="text-xs text-gray-400 font-mono">{request.dataset_id}</dd>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Requested By</dt>
              <dd className="mt-0.5 text-gray-600">{request.owner_name || request.requested_by || "—"}</dd>
              <dd className="text-xs text-gray-400">{request.owner_email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</dt>
              <dd className="mt-0.5 text-gray-600">{formatDate(request.requested_at || request.created_at)}</dd>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reason</dt>
              <dd className="mt-0.5 text-gray-700">{archiveApi.reasonLabel(request.reason)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</dt>
              <dd className="mt-0.5">
                <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_BADGE[status] || STATUS_BADGE.pending}`}>
                  {status}
                </span>
              </dd>
            </div>
          </div>

          <div>
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Comment / Reason Detail</dt>
            <dd className="mt-1 rounded-lg bg-[#F7F6F2] border border-[#E3E1DA] p-3 text-gray-700 whitespace-pre-line">
              {request.comment || request.reason || "No additional details provided."}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#E3E1DA] px-4 py-2 text-sm font-medium text-gray-600 hover:bg-[#F7F6F2] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}