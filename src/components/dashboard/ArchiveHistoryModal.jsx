import { useEffect, useState } from "react";
import { X, History, Loader2, Archive, RotateCcw, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import * as datasetsApi from "../../features/datasets/hooks/datasetsApi";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const TYPE_CONFIG = {
  archive_request: {
    label: "Archive Request",
    icon: Archive,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  unarchive_request: {
    label: "Restore Request",
    icon: RotateCcw,
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  admin_restore: {
    label: "Admin Instant Restore",
    icon: ShieldCheck,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
};

const STATUS_ICONS = {
  approved: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  executed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  restored: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  rejected: <XCircle className="w-3.5 h-3.5 text-red-600" />,
  pending: <Clock className="w-3.5 h-3.5 text-amber-600" />,
};

export default function ArchiveHistoryModal({ dataset, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const datasetId = dataset?.id || dataset?.dataset_id;
  const datasetTitle = dataset?.title || dataset?.dataset_title || "Dataset";

  useEffect(() => {
    let active = true;
    async function load() {
      if (!datasetId) return;
      setLoading(true);
      setError("");
      try {
        const events = await datasetsApi.getDatasetArchiveHistory(datasetId);
        if (active) {
          setHistory(Array.isArray(events) ? events : []);
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.detail || err?.message || "Failed to load history.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [datasetId]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Dataset archive history"
    >
      <div
        className="w-full max-w-xl max-h-[85vh] rounded-2xl border border-[#E3E1DA] bg-white p-6 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-navy/5 border border-navy/10 flex items-center justify-center text-navy">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-navy">Archive & Restore Timeline</h2>
              <p className="text-xs text-gray-500 font-medium truncate max-w-md mt-0.5">
                {datasetTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-gray-400 hover:text-navy rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-5 pr-1 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-7 h-7 text-gold animate-spin mb-2" />
              <p className="text-xs text-gray-500 font-medium">Loading lifecycle events…</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 text-center">
              {error}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-14">
              <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No Recorded Archive Events</p>
              <p className="text-xs text-gray-500 mt-1">
                This dataset currently has no logged archive requests, restore petitions, or override actions.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {history.map((event, idx) => {
                const conf = TYPE_CONFIG[event.type] || TYPE_CONFIG.archive_request;
                const Icon = conf.icon;
                return (
                  <div key={idx} className="relative group">
                    <div
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${conf.dot} shadow-xs`}
                    />
                    <div className="bg-[#FBFBFA] border border-[#EBEAE5] rounded-xl p-4 transition hover:border-gold/40">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${conf.badge}`}
                          >
                            <Icon className="w-3 h-3" />
                            {conf.label}
                          </span>
                          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                            {STATUS_ICONS[event.status]}
                            <span className="capitalize">{event.status}</span>
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {formatDate(event.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-navy font-medium mt-1">
                        By: <span className="text-gray-700 font-semibold">{event.requested_by || "System / Administrator"}</span>
                      </p>

                      {event.reason && (
                        <p className="text-xs text-gray-600 bg-white border border-gray-100 rounded-lg p-2.5 mt-2 italic">
                          &ldquo;{event.reason}&rdquo;
                        </p>
                      )}

                      {event.resolved_at && event.resolved_at !== event.created_at && (
                        <p className="text-[11px] text-gray-400 mt-2">
                          Resolved: {formatDate(event.resolved_at)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-3 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-gray-600 hover:text-navy px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
