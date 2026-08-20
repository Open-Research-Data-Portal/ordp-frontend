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
import { SectionHeader, StatusBadge } from "../../../components/dashboard/dashboardUi";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

const PLACEHOLDER_QUEUE = [
  { id: "r1", title: "Global Climate Models 2023", submitter: "Dr. Sarah Jenkins", date: "2h ago", status: "pending" },
  { id: "r2", title: "Urban Traffic Flow Analysis", submitter: "Prof. Michael Chen", date: "5h ago", status: "changes_requested" },
  { id: "r3", title: "Teff Yield Variables Dataset", submitter: "S. Gossaye", date: "1d ago", status: "pending" },
];

const PLACEHOLDER_SUGGESTIONS = [
  { id: "ps1", title: "Category Addition", detail: "Quantum Computing", type: "category" },
  { id: "ps2", title: "Language Metadata", detail: "Afaan Oromo corpus tag", type: "language" },
];

export default function ReviewerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [queue, setQueue] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState("moderation");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [overviewRes, metricsRes, queueRes] = await Promise.allSettled([
        datasetsApi.getReviewerOverview?.() ?? Promise.resolve(null),
        datasetsApi.getReviewerMetrics?.() ?? Promise.resolve(null),
        datasetsApi.getReviewerQueue?.() ?? Promise.resolve([]),
      ]);
      if (!active) return;
      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value);
      if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value);
      if (queueRes.status === "fulfilled") {
        const items = normalizeList(queueRes.value);
        setQueue(items.length ? items : PLACEHOLDER_QUEUE);
      } else {
        setQueue(PLACEHOLDER_QUEUE);
      }
      setSuggestions(PLACEHOLDER_SUGGESTIONS);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const tabs = [
    { id: "moderation", label: "Dataset Moderation" },
    { id: "updates", label: "Content Updates" },
    { id: "access", label: "Access Requests" },
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
        <StatCard label="DATASET MOD" value={loading ? "…" : overview?.dataset_mod ?? 24} icon={Shield} hint="+5 today" delay={50} />
        <StatCard label="CONTENT UPDATES" value={loading ? "…" : overview?.content_updates ?? 12} icon={FileEdit} delay={100} />
        <StatCard label="ACCESS REQUESTS" value={loading ? "…" : overview?.access_requests ?? 8} icon={KeyRound} delay={150} />
        <StatCard label="DELETIONS" value={loading ? "…" : overview?.deletions ?? 3} icon={Trash2} hint="Action required" delay={200} />
        <StatCard
          label="MY METRICS"
          dark
          delay={250}
          value={[
            { k: "Reviewed (Week)", v: metrics?.reviewed_week ?? 14 },
            { k: "Avg Turnaround", v: metrics?.avg_turnaround ?? "2.4d" },
            { k: "Approval Rate", v: `${metrics?.approval_rate ?? 88}%` },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main queue */}
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
                {queue.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-bg/50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-navy">{item.title}</p>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-4 text-gray-600">{item.submitter || item.submitter_name || item.owner_name}</td>
                    <td className="px-5 py-4 text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {item.date || item.created_at || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" className="inline-flex items-center gap-1 bg-gold hover:bg-gold-dark text-white text-xs font-semibold rounded-md px-3 py-1.5 transition-colors">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/datasets/${item.id}`)}
                          className="inline-flex items-center gap-1 border border-border text-navy text-xs font-semibold rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
                        >
                          {item.status === "changes_requested" ? "Review" : "Changes"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pending suggestions */}
        <section className="animate-fade-in-up" style={{ animationDelay: "350ms" }}>
          <SectionHeader title="Pending Suggestions" />
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-border p-4 shadow-sm">
                <p className="text-xs font-semibold text-gold uppercase tracking-wide">{s.title}</p>
                <p className="text-sm font-medium text-navy mt-1">{s.detail}</p>
                <div className="flex gap-2 mt-3">
                  <button type="button" className="flex-1 text-xs font-semibold bg-gold text-white rounded-md py-1.5 hover:bg-gold-dark transition-colors">Approve</button>
                  <button type="button" className="flex-1 text-xs font-semibold border border-border text-navy rounded-md py-1.5 hover:bg-gray-50 transition-colors">
                    <XCircle className="w-3.5 h-3.5 inline mr-1" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
