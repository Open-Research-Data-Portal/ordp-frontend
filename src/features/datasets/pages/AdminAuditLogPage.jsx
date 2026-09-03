import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import * as datasetsApi from "../hooks/datasetsApi";

const PAGE_SIZE = 20;

const ACTION_COLORS = {
  "Dataset Update": "bg-blue-50 text-blue-700",
  "Access Granted": "bg-gray-100 text-gray-700",
  Backup: "bg-indigo-50 text-indigo-700",
  "Role Change": "bg-amber-50 text-amber-700",
  Upload: "bg-emerald-50 text-emerald-700",
  "Record Deletion": "bg-red-50 text-red-700",
  "User Created": "bg-emerald-50 text-emerald-700",
  "User Deleted": "bg-red-50 text-red-700",
};

export default function AdminAuditLogPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState("desc");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await datasetsApi.getAdminAuditLog();
        const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
        if (!cancelled) setItems(list);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load audit log.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const uniqueActions = useMemo(() => {
    const set = new Set(items.map((i) => i.action).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let out = items;
    if (actionFilter) out = out.filter((i) => i.action === actionFilter);
    if (userFilter.trim()) {
      const q = userFilter.trim().toLowerCase();
      out = out.filter(
        (i) =>
          String(i.user || i.user_name || "").toLowerCase().includes(q) ||
          String(i.resource || i.resource_id || "").toLowerCase().includes(q)
      );
    }
    out = out.slice().sort((a, b) => {
      const ta = new Date(a.timestamp || a.created_at || 0).getTime();
      const tb = new Date(b.timestamp || b.created_at || 0).getTime();
      return sortDir === "asc" ? ta - tb : tb - ta;
    });
    return out;
  }, [items, actionFilter, userFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function exportCsv() {
    const header = "Timestamp,User,Action,Resource\n";
    const rows = filtered
      .map(
        (i) =>
          `${i.timestamp || i.created_at || ""},${i.user || i.user_name || ""},${i.action || ""},${i.resource || i.resource_id || ""}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell title="ORDP Admin Console" subtitle="System status and key metrics">
      <button
        type="button"
        onClick={() => navigate("/admin-dashboard")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-navy transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">System activity and admin actions.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-2 bg-navy hover:bg-navy-light text-white text-xs font-semibold rounded-lg px-3 py-2 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600" htmlFor="actionFilter">
              Action
            </label>
            <select
              id="actionFilter"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 text-sm py-2 pl-3 pr-8 bg-[#F7F6F2]"
            >
              <option value="">All</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600" htmlFor="userFilter">
              User / Resource
            </label>
            <input
              id="userFilter"
              type="text"
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="w-56 rounded-lg border border-slate-200 text-sm py-2 pl-3 pr-3 bg-white"
            />
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="text-xs font-semibold text-gold border border-gold rounded-md px-3 py-2 hover:bg-gold-light transition-colors"
            >
              Date {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold">Timestamp</th>
                <th className="px-5 py-3 text-left font-semibold">User</th>
                <th className="px-5 py-3 text-left font-semibold">Action</th>
                <th className="px-5 py-3 text-left font-semibold">Resource</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                    Loading audit log…
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                    No entries match your filters.
                  </td>
                </tr>
              ) : (
                pageItems.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-bg/50">
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {row.timestamp || row.created_at || "—"}
                    </td>
                    <td className="px-5 py-3 font-medium text-navy">{row.user || row.user_name || "—"}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${ACTION_COLORS[row.action] || "bg-gray-100 text-gray-700"}`}
                      >
                        {row.action || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{row.resource || row.resource_id || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-gray-500">
              Page {safePage} of {totalPages} — {filtered.length} entries
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs font-semibold text-gold border border-gold rounded-md px-3 py-1.5 disabled:opacity-50 hover:bg-gold-light transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs font-semibold text-gold border border-gold rounded-md px-3 py-1.5 disabled:opacity-50 hover:bg-gold-light transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
