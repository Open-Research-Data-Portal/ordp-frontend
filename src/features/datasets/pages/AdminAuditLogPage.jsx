import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Clock, Database, AlertTriangle, TrendingUp, BarChart3, ShieldAlert } from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import * as datasetsApi from "../hooks/datasetsApi";

export default function AdminAuditLogPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [peakHours, setPeakHours] = useState([]);
  const [mostAccessed, setMostAccessed] = useState([]);
  const [flagged, setFlagged] = useState({ bursts: [], off_hours: [] });
  const [graphs, setGraphs] = useState({ uploads: [], downloads: [], views: [] });
  const [daysWindow, setDaysWindow] = useState("30");

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const days = parseInt(daysWindow, 10) || 30;
        const [peakRes, mostRes, flaggedRes, graphsRes] = await Promise.allSettled([
          datasetsApi.getAdminAuditPeakHours({ days }),
          datasetsApi.getAdminAuditMostAccessedDatasets({ days, limit: 8 }),
          datasetsApi.getAdminAuditFlagged({ days: Math.min(days, 7) }),
          datasetsApi.getAdminGraphs(),
        ]);

        if (cancelled) return;

        if (peakRes.status === "fulfilled") setPeakHours(Array.isArray(peakRes.value) ? peakRes.value : []);
        if (mostRes.status === "fulfilled") setMostAccessed(Array.isArray(mostRes.value) ? mostRes.value : []);
        if (flaggedRes.status === "fulfilled") setFlagged(flaggedRes.value || { bursts: [], off_hours: [] });
        if (graphsRes.status === "fulfilled") setGraphs(graphsRes.value || { uploads: [], downloads: [], views: [] });
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load audit analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [daysWindow]);

  const handleExport = async (format) => {
    try {
      const data = await datasetsApi.exportAdminAuditLog(format);
      const blob = new Blob([data], { type: format === "pdf" ? "application/pdf" : "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export audit log.");
    }
  };

  const peakHourItem = peakHours.reduce((max, curr) => (curr.count > (max?.count || 0) ? curr : max), null);
  const totalPeakCount = peakHours.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const maxPeakCount = peakHours.reduce((max, curr) => Math.max(max, curr.count || 0), 1);

  return (
    <DashboardShell role="admin">
      <section className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-border shadow-sm">
          <div>
            <button
              type="button"
              onClick={() => navigate("/admin-dashboard")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-navy mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-navy flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-gold" /> Audit Log & Platform Analytics
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Aggregated platform activity patterns, peak usage hours, top accessed datasets, and security heuristics. Individual logs are available via CSV/PDF export.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={daysWindow}
              onChange={(e) => setDaysWindow(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-white font-medium text-navy focus:outline-none focus:ring-2 focus:ring-gold"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExport("csv")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy-dark transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button
                type="button"
                onClick={() => handleExport("pdf")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-gold text-gold rounded-lg hover:bg-gold-light transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-sm font-medium text-gray-500 bg-white rounded-xl border border-border">
            Loading analytics and audit insights...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-2">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Peak Activity Hour</span>
                  <Clock className="w-4 h-4 text-gold" />
                </div>
                <div className="text-2xl font-extrabold text-navy">
                  {peakHourItem ? `${String(peakHourItem.hour).padStart(2, "0")}:00` : "—"}
                </div>
                <p className="text-xs text-gray-500">
                  {peakHourItem ? `${peakHourItem.count} events recorded at this hour (${Math.round((peakHourItem.count / (totalPeakCount || 1)) * 100)}% of total peak volume)` : "No peak activity recorded"}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-2">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Top Accessed Dataset</span>
                  <Database className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-lg font-bold text-navy truncate" title={mostAccessed[0]?.title || "None"}>
                  {mostAccessed[0]?.title || "No datasets accessed"}
                </div>
                <p className="text-xs text-gray-500">
                  {mostAccessed[0] ? `${mostAccessed[0].total_activity} combined views & downloads` : "0 interactions"}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-2">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <span>Security Heuristics (Flagged)</span>
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-extrabold text-navy">
                  {(flagged.bursts?.length || 0) + (flagged.off_hours?.length || 0)} Alerts
                </div>
                <p className="text-xs text-gray-500">
                  {flagged.bursts?.length || 0} download bursts, {flagged.off_hours?.length || 0} off-hours patterns
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-navy">Activity by Hour of Day (0–23)</h2>
                  <p className="text-xs text-gray-500">Hourly volume distribution across the trailing {daysWindow} days window.</p>
                </div>
              </div>
              <div className="pt-4">
                <div className="grid grid-cols-12 md:grid-cols-24 gap-1.5 items-end h-48 pt-6 border-b border-border pb-2">
                  {Array.from({ length: 24 }).map((_, h) => {
                    const found = peakHours.find((item) => item.hour === h);
                    const count = found ? found.count : 0;
                    const heightPct = Math.max(8, Math.round((count / maxPeakCount) * 100));
                    return (
                      <div key={h} className="flex flex-col items-center h-full justify-end group relative">
                        <div className="absolute -top-10 bg-navy text-white text-[10px] font-medium px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {String(h).padStart(2, "0")}:00 — {count} events
                        </div>
                        <div
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-t transition-all ${
                            peakHourItem?.hour === h ? "bg-gold" : "bg-navy/80 hover:bg-navy"
                          }`}
                        />
                        <span className="text-[10px] font-mono text-gray-500 mt-1">{h}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3">
                  <span>00:00 (Midnight)</span>
                  <span>12:00 (Noon)</span>
                  <span>23:00 (11 PM)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                    <Database className="w-5 h-5 text-emerald-600" /> Top Datasets by Views & Downloads
                  </h2>
                </div>
                <div className="overflow-x-auto flex-1">
                  {mostAccessed.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">No dataset access activity recorded.</p>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-xs text-gray-500 uppercase">
                          <th className="py-2.5 px-3">Dataset Title</th>
                          <th className="py-2.5 px-3 text-right">Views</th>
                          <th className="py-2.5 px-3 text-right">Downloads</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {mostAccessed.map((item, idx) => (
                          <tr key={idx} className="hover:bg-bg/50">
                            <td className="py-3 px-3 font-medium text-navy max-w-[220px] truncate" title={item.title}>
                              {item.title}
                            </td>
                            <td className="py-3 px-3 text-right text-gray-600 font-mono text-xs">{item.views}</td>
                            <td className="py-3 px-3 text-right text-gray-600 font-mono text-xs">{item.downloads}</td>
                            <td className="py-3 px-3 text-right font-bold text-navy font-mono text-xs">{item.total_activity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" /> Flagged Activity & Heuristics
                  </h2>
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Download Bursts (Hourly)</h3>
                    {(!flagged.bursts || flagged.bursts.length === 0) ? (
                      <p className="text-xs text-gray-500 bg-bg p-3 rounded-lg">No abnormal download bursts detected.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {flagged.bursts.map((b, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-amber-50/60 border border-amber-200 p-2.5 rounded-lg">
                            <span className="font-medium text-navy">{b.user_name || `User #${b.user_id}`}</span>
                            <span className="font-mono text-amber-800 font-bold">{b.count} downloads in hour</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Off-Hours Access (Midnight – 5 AM)</h3>
                    {(!flagged.off_hours || flagged.off_hours.length === 0) ? (
                      <p className="text-xs text-gray-500 bg-bg p-3 rounded-lg">No unusual off-hours access patterns detected.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {flagged.off_hours.map((o, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-red-50/60 border border-red-200 p-2.5 rounded-lg">
                            <span className="font-medium text-navy">{o.user_name || `User #${o.user_id}`}</span>
                            <span className="font-mono text-red-800 font-bold">{o.count} off-hours requests</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-navy flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gold" /> Platform Trends (Past 30 Days)
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-bg p-4 rounded-xl border border-border">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Total Uploads</span>
                  <div className="text-2xl font-extrabold text-navy mt-1">
                    {graphs.uploads?.reduce((sum, d) => sum + (d.count || 0), 0) || 0}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Files uploaded in the last 30 days</p>
                </div>
                <div className="bg-bg p-4 rounded-xl border border-border">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Total Downloads</span>
                  <div className="text-2xl font-extrabold text-navy mt-1">
                    {graphs.downloads?.reduce((sum, d) => sum + (d.count || 0), 0) || 0}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Dataset downloads in the last 30 days</p>
                </div>
                <div className="bg-bg p-4 rounded-xl border border-border">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Total Views</span>
                  <div className="text-2xl font-extrabold text-navy mt-1">
                    {graphs.views?.reduce((sum, d) => sum + (d.count || 0), 0) || 0}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Dataset detail views in the last 30 days</p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </DashboardShell>
  );
}
