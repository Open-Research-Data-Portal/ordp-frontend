import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Clock, CheckCircle2, XCircle, Inbox, RotateCcw, X, Loader2, Send, Eye } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { useAuth } from "../../../context/useAuth";
import { getDashboardPath, getDisplayName } from "../../../utils/userRoles";
import { getDatasetImage } from "../../../utils/datasetImage";
import * as datasetsApi from "../hooks/datasetsApi";
import * as archiveApi from "../../../api/archiveRequests";
import { useToast } from "../../../context/ToastContext.jsx";
import DatasetPreviewModal from "../../../components/dashboard/DatasetPreviewModal";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function RequestBadge({ request }) {
  if (!request) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
        <Archive className="w-3.5 h-3.5" /> Archived
      </span>
    );
  }
  if (request.status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
        <Archive className="w-3.5 h-3.5" /> Archived
      </span>
    );
  }
  if (request.status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
        <XCircle className="w-3.5 h-3.5" /> Archive Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
      <Clock className="w-3.5 h-3.5" /> Archive Requested
    </span>
  );
}

export default function UserArchivedDatasetsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [datasets, setDatasets] = useState([]);
  const [requestsMap, setRequestsMap] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewDataset, setPreviewDataset] = useState(null);

  // Unarchive (restore) request state — routed to admins only.
  const [unarchiveTarget, setUnarchiveTarget] = useState(null);
  const [unarchiveUse, setUnarchiveUse] = useState("");
  const [unarchiveReason, setUnarchiveReason] = useState("");
  const [unarchiveSubmitting, setUnarchiveSubmitting] = useState(false);
  const [unarchiveMap, setUnarchiveMap] = useState(() => new Map());

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await datasetsApi.getMyDatasets();
        if (!active) return;
        const list = Array.isArray(data) ? data : (data?.results || []);
        setDatasets(list);
        const map = new Map();
        list.forEach((d) => {
          const reqs = archiveApi.getArchiveRequestsForDataset(d.id);
          map.set(String(d.id), reqs[0] || null);
        });
        setRequestsMap(map);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.detail || err?.message || "Failed to load your datasets.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  // Seed unarchive request status from the local store (persisted demo data).
  useEffect(() => {
    const map = new Map();
    archiveApi.getUnarchiveRequests().forEach((r) => {
      map.set(String(r.dataset_id), r);
    });
    setUnarchiveMap(map);
  }, []);

  function openUnarchiveModal(dataset) {
    setUnarchiveTarget(dataset);
    setUnarchiveUse("");
    setUnarchiveReason("");
  }

  async function submitUnarchive() {
    if (!unarchiveTarget) return;
    if (!unarchiveUse || !unarchiveReason.trim()) {
      addToast("Please pick an intended use and write the reason.", "error");
      return;
    }
    setUnarchiveSubmitting(true);
    try {
      let entry;
      try {
        // Real backend first — this request is routed to admins only.
        await datasetsApi.requestDatasetUnarchive(unarchiveTarget.id, {
          intendedUse: unarchiveUse,
          reason: unarchiveReason.trim(),
        });
        entry = {
          id: `unarch-req-${Date.now()}`,
          dataset_id: String(unarchiveTarget.id),
          status: "pending",
        };
      } catch {
        entry = archiveApi.submitUnarchiveRequest({
          dataset_id: unarchiveTarget.id,
          dataset_title: unarchiveTarget.title,
          owner_name: getDisplayName(user),
          owner_email: user?.email,
          intended_use: unarchiveUse,
          reason: unarchiveReason,
        });
      }
      setUnarchiveMap((prev) => {
        const next = new Map(prev);
        next.set(String(unarchiveTarget.id), entry);
        return next;
      });
      addToast("Unarchive request sent to the administrators for review.", "success");
      setUnarchiveTarget(null);
      setUnarchiveUse("");
      setUnarchiveReason("");
    } catch (err) {
      addToast(err?.message || "Failed to send unarchive request.", "error");
    } finally {
      setUnarchiveSubmitting(false);
    }
  }

  // SPEC: Add a frontend filter: only show items where status === "archived" (or archive_status === "archived" or approved archive request)
  const sortedArchived = useMemo(() => {
    return datasets
      .filter((d) => {
        const s = String(d.status || "").toLowerCase();
        const archS = String(d.archive_status || "").toLowerCase();
        const req = requestsMap.get(String(d.id));
        return (
          s === "archived" ||
          archS === "archived" ||
          d.is_archived === true ||
          req?.status === "approved"
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [datasets, requestsMap]);

  return (
    <DashboardShell title="Archived Datasets" subtitle="Browse datasets that have been archived.">
      <div className="p-8 lg:p-10 bg-white min-h-full rounded-2xl border border-[#E3E1DA]">
        <button
          type="button"
          onClick={() => navigate(getDashboardPath(user))}
          className="mb-3 inline-flex items-center text-xs font-semibold text-gray-500 hover:text-navy transition-colors"
        >
          ← Back to dashboard
        </button>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-serif font-bold text-navy">Archived Datasets</h1>
            <p className="text-sm text-gray-500 mt-1">
              Archived datasets are preserved for institutional research records and are withdrawn from active discovery.
            </p>
          </div>
        </div>

        {error && <p role="alert" className="text-danger mt-4">{error}</p>}
        {loading && <p className="text-gray-500 mt-6">Loading archived datasets…</p>}

        {!loading && !error && sortedArchived.length === 0 && (
          <div className="mt-8 bg-[#F7F6F2] rounded-xl p-10 text-center border border-[#E3E1DA]">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-navy mb-1">No Archived Datasets</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto text-sm">
              You do not have any archived datasets. You can request archiving for eligible published datasets from My Datasets.
            </p>
            <button
              type="button"
              onClick={() => navigate("/my-datasets")}
              className="bg-navy hover:bg-navy-dark text-white rounded-md px-4 py-2 text-sm font-semibold transition"
            >
              View My Datasets
            </button>
          </div>
        )}

        {!loading && !error && sortedArchived.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedArchived.map((dataset) => {
              const request = requestsMap.get(String(dataset.id)) || null;
              return (
                <div
                  key={dataset.id}
                  onClick={() => navigate(`/my-datasets/${dataset.id}`)}
                  className="bg-white rounded-xl border border-[#E3E1DA] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="h-32 w-full bg-gray-100 overflow-hidden">
                    {getDatasetImage(dataset) ? (
                      <img src={getDatasetImage(dataset)} alt={dataset.title} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-navy/10 to-gold/10">
                        <Archive className="w-8 h-8 text-navy/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-navy line-clamp-2">{dataset.title}</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPreviewDataset(dataset); }}
                        className="p-1.5 text-gray-400 hover:text-navy rounded-full hover:bg-gray-100 transition shrink-0"
                        title="Preview dataset details"
                        aria-label="Preview dataset details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <RequestBadge request={request} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {dataset.category || dataset.subject_name || "Uncategorized"} ·{" "}
                      {new Date(dataset.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    {request && (
                      <div className="mt-3 text-xs text-gray-600 bg-[#F7F6F2] rounded-lg p-3 space-y-1">
                        <p className="font-semibold text-navy">{formatDate(request.requested_at)}</p>
                        <p className="text-gray-500">{archiveApi.reasonLabel(request.reason)}</p>
                        {request.comment && <p className="text-gray-500 italic line-clamp-2">"{request.comment}"</p>}
                      </div>
                    )}
                    <div className="mt-3 border-t border-[#F0EFEA] pt-2.5">
                      {(() => {
                        const ur = unarchiveMap.get(String(dataset.id)) || null;
                        if (ur?.status === "pending") {
                          return (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                              <Clock className="w-3.5 h-3.5" /> Restore Under Review
                            </span>
                          );
                        }
                        return (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openUnarchiveModal(dataset); }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy bg-[#F0EFEA] hover:bg-[#E3E1DA] rounded-full px-3 py-1.5 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Unarchive
                          </button>
                        );
                      })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {unarchiveTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4"
          onClick={() => !unarchiveSubmitting && setUnarchiveTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-[#E3E1DA] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold text-navy">Request Dataset Restoration</h2>
              <button type="button" onClick={() => setUnarchiveTarget(null)} aria-label="Close" className="p-1 text-gray-400 hover:text-navy rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              “{unarchiveTarget.title}” is archived. Your request will be reviewed by an administrator.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="unarchive-use" className="block text-xs font-semibold text-gray-600 mb-1.5">Intended use</label>
                <select
                  id="unarchive-use"
                  value={unarchiveUse}
                  onChange={(e) => setUnarchiveUse(e.target.value)}
                  className="w-full rounded-lg border border-[#E3E1DA] text-sm py-2.5 px-3 bg-white focus:outline-none focus:border-navy"
                >
                  <option value="">Select intended use…</option>
                  {archiveApi.UNARCHIVE_INTENDED_USES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="unarchive-reason" className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Reason <span className="font-normal text-gray-400">(required)</span>
                </label>
                <textarea
                  id="unarchive-reason"
                  rows={3}
                  value={unarchiveReason}
                  onChange={(e) => setUnarchiveReason(e.target.value)}
                  placeholder="Explain why this dataset should be made publicly visible again…"
                  className="w-full rounded-lg border border-[#E3E1DA] text-sm py-2.5 px-3 bg-white focus:outline-none focus:border-navy resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUnarchiveTarget(null)}
                className="rounded-md border border-[#E3E1DA] px-4 py-2 text-sm font-medium text-gray-600 hover:bg-[#F7F6F2] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unarchiveSubmitting || !unarchiveUse || !unarchiveReason.trim()}
                onClick={submitUnarchive}
                className="inline-flex items-center gap-2 rounded-md bg-[#A67A0D] hover:bg-[#8f690b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {unarchiveSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {unarchiveSubmitting ? "Sending…" : "Send Unarchive Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDataset && (
        <DatasetPreviewModal
          dataset={previewDataset}
          onClose={() => setPreviewDataset(null)}
        />
      )}
    </DashboardShell>
  );
}