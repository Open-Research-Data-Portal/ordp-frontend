import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";
import * as api from "../api/accessControl";
import { accessError } from "../utils/accessError";
import { formatDateTime, plainStatusLabel } from "../utils/accessManagement";

export default function MyAccessPage() {
  const [resources, setResources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [res, req] = await Promise.allSettled([api.getMyResources(), api.getRequests()]);
        if (!active) return;
        if (res.status === "fulfilled") setResources(Array.isArray(res.value) ? res.value : []);
        if (req.status === "fulfilled") {
          const rows = Array.isArray(req.value) ? req.value : req.value?.results || [];
          setRequests(rows);
        }
        if (res.status === "rejected" && req.status === "rejected") {
          setError(accessError(res.reason, "Failed to load your access."));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardShell title="My Access" subtitle="Datasets you can use and your request history">
      <div className="mx-auto max-w-5xl space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-bold text-navy">My Access</h1>
          <p className="mt-1 text-sm text-slate-600">
            Current dataset permissions and the status of your access requests.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="text-sm text-slate-500">Loading your access…</div>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-base font-bold text-navy">Datasets I can access</h2>
              {resources.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                  No dataset access yet. When a manager grants permissions or approves a request, datasets will show here.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <ul className="divide-y divide-slate-100">
                    {resources.map((r) => (
                      <li key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                        <div>
                          <Link to={`/datasets/${r.id}`} className="text-sm font-semibold text-navy hover:underline">
                            {r.title}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {(r.permissions || []).join(", ") || "No permission codes"}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {r.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-navy">My access requests</h2>
                <Link to="/access-management?tab=Access%20Requests" className="text-sm font-semibold text-amber-700 hover:underline">
                  Open Access Management
                </Link>
              </div>
              {requests.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                  No requests yet. Request access from a restricted dataset page to get started.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Resource</th>
                        <th className="px-4 py-3">Permissions</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((req) => (
                        <tr key={req.id} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-navy">
                            <Link
                              to={`/access-management/requests/${req.id}`}
                              className="hover:underline"
                            >
                              {req.resource_type}
                              {req.resource_id ? ` · ${String(req.resource_id).slice(0, 8)}…` : ""}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {(req.items || []).map((i) => i.name || i.permission).join(", ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{plainStatusLabel(req.status)}</td>
                          <td className="px-4 py-3 text-slate-500">{formatDateTime(req.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
