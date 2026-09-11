import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Clock, CheckCircle2, XCircle, Inbox } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import { useAuth } from "../../../context/useAuth";
import { getDashboardPath } from "../../../utils/userRoles";
import { getDatasetImage } from "../../../utils/datasetImage";
import * as datasetsApi from "../hooks/datasetsApi";
import * as archiveApi from "../../../api/archiveRequests";

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

  const [datasets, setDatasets] = useState([]);
  const [requestsMap, setRequestsMap] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                    <p className="text-sm font-semibold text-navy line-clamp-2">{dataset.title}</p>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}