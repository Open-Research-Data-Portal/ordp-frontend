import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  FileEdit,
  KeyRound,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { StatusBadge } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

export default function ReviewerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [queue, setQueue] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [activeTab, setActiveTab] = useState("moderation");
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [overviewRes, metricsRes, queueRes, reviewsRes] = await Promise.allSettled([
        datasetsApi.getReviewerOverview?.() ?? Promise.resolve(null),
        datasetsApi.getReviewerMetrics?.() ?? Promise.resolve(null),
        datasetsApi.getReviewerQueue?.() ?? Promise.resolve([]),
        datasetsApi.getMyReviews?.() ?? Promise.resolve([]),
      ]);
      if (!active) return;
      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value);
      if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value);
      if (queueRes.status === "fulfilled") setQueue(normalizeList(queueRes.value));
      if (reviewsRes.status === "fulfilled") setMyReviews(normalizeList(reviewsRes.value));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  async function handleDecide(datasetId, decision) {
    setDecidingId(datasetId);
    try {
      const reason = prompt(decision === "rejected" ? "Please provide a reason for rejection:" : "");
      if (decision === "rejected" && reason === null) {
        setDecidingId(null);
        return;
      }
      await datasetsApi.decideDataset(datasetId, decision, reason || "");
      setQueue((prev) => prev.filter((item) => String(item.id) !== String(datasetId)));
      const reviews = await datasetsApi.getMyReviews();
      setMyReviews(normalizeList(reviews));
    } catch (err) {
      alert(err?.message || "Failed to submit decision.");
    } finally {
      setDecidingId(null);
    }
  }

  const tabs = [
    { id: "moderation", label: "Dataset Moderation" },
    { id: "history", label: "My Review History" },
  ];

  return (
    <DashboardShell title="Reviewer Dashboard" subtitle="Manage pending approvals and moderation queues">
      <div className="flex justify-between items-start mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy">Reviewer Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome, {getDisplayName(user)}</p>
        </div>
        <button type="button" className="text-sm font-medium text-navy border border-border rounded-lg px-4 py-2 hover:bg-white transition">
          View Guidelines
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="DATASET MOD" value={loading ? "…" : overview?.dataset_mod ?? queue.length} icon={Shield} hint={`${queue.length} pending`} delay={50} />
        <StatCard label="CONTENT UPDATES" value={loading ? "…" : overview?.content_updates ?? 12} icon={FileEdit} delay={100} />
        <StatCard label="ACCESS REQUESTS" value={loading ? "…" : overview?.access_requests ?? 8} icon={KeyRound} delay={150} />
        <StatCard label="DELETIONS" value={loading ? "…" : overview?.deletions ?? 3} icon={Trash2} hint="Action required" delay={200} />
        <StatCard
          label="MY METRICS"
          dark
          delay={250}
          value={[
            { k: "Reviewed (Week)", v: metrics?.reviewed_week ?? myReviews.length },
            { k: "Avg Turnaround", v: metrics?.avg_turnaround ?? "2.4d" },
            { k: "Approval Rate", v: `${metrics?.approval_rate ?? 88}%` },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <section className="xl:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="flex gap-1 px-5 pt-4 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === tab.id ? "border-gold text-gold" : "border-transparent text-gray-500 hover:text-navy",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Dataset Name</th>
                  <th className="px-5 py-3 text-left font-semibold">Submitter</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeTab === "moderation" && queue.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-bg/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-navy">{item.title}</p>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-4 text-gray-600">{item.owner_name || item.submitter_name || "—"}</td>
                    <td className="px-5 py-4 text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecide(item.id, "approved")}
                          disabled={decidingId === item.id}
                          className="inline-flex items-center gap-1 bg-gold hover:bg-gold-dark text-white text-xs font-semibold rounded-md px-3 py-1.5 transition-colors disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecide(item.id, "rejected")}
                          disabled={decidingId === item.id}
                          className="inline-flex items-center gap-1 border border-red-200 text-red-700 text-xs font-semibold rounded-md px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-60"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/datasets/${item.id}`)}
                          className="inline-flex items-center gap-1 border border-border text-navy text-xs font-semibold rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeTab === "history" && myReviews.map((item) => (
                  <tr key={item.dataset_id || item.id} className="border-t border-gray-100 hover:bg-bg/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-navy">{item.dataset_title || item.title}</p>
                      <StatusBadge status={item.decision} />
                    </td>
                    <td className="px-5 py-4 text-gray-600">{item.dataset_status || item.status || "—"}</td>
                    <td className="px-5 py-4 text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.decided_at ? new Date(item.decided_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      {item.reason ? <span className="text-xs italic truncate block max-w-[200px]" title={item.reason}>{item.reason}</span> : "—"}
                    </td>
                  </tr>
                ))}
                {activeTab === "moderation" && queue.length === 0 && !loading && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500">No datasets in your review queue.</td></tr>
                )}
                {activeTab === "history" && myReviews.length === 0 && !loading && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500">You have not reviewed any datasets yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
