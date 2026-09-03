import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/useAuth";
import { getDisplayName } from "../../../utils/userRoles";
import {
  Shield,
  FileEdit,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { StatusBadge, ProfileSavedNotice, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useToast } from "../../../context/ToastContext.jsx";
import * as datasetsApi from "../hooks/datasetsApi.js";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

export default function ReviewerDashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [queue, setQueue] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState(null);
  const [activeTab, setActiveTab] = useState("moderation");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [queueRes] = await Promise.allSettled([
          datasetsApi.getReviewerQueue?.() ?? Promise.resolve([]),
        ]);
        if (!active) return;
        if (queueRes.status === "fulfilled") {
          const items = normalizeList(queueRes.value);
          setQueue(items);
        }
      } catch (err) {
        addToast(err?.message || "Failed to load reviewer queue.", "error");
      } finally {
        if (!active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [addToast]);

  const stats = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter((d) => String(d.status || "").toLowerCase() === "pending").length;
    const changes = queue.filter((d) => String(d.status || "").toLowerCase() === "changes_requested").length;
    return { total, pending, changes };
  }, [queue]);

  async function handleDecide(datasetId, decision) {
    setDecidingId(datasetId);
    try {
      await datasetsApi.moderateDataset(datasetId, { decision });
      addToast(`Dataset ${decision} successfully.`, "success");
      setQueue((s) => s.filter((d) => String(d.id || d.dataset_id) !== String(datasetId)));
      setMyReviews((s) => [
        {
          id: datasetId,
          title: queue.find((d) => String(d.id || d.dataset_id) === String(datasetId))?.title || "Untitled",
          decision,
          decided_at: new Date().toLocaleString(),
        },
        ...s,
      ]);
    } catch (err) {
      addToast(err?.message || `Failed to ${decision} dataset.`, "error");
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
      <ProfileSavedNotice />
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="PENDING REVIEWS" value={loading ? "…" : stats.pending} icon={Clock} hint="Awaiting your action" delay={50} />
        <StatCard label="CHANGES REQUESTED" value={loading ? "…" : stats.changes} icon={FileEdit} delay={100} />
        <StatCard label="TOTAL IN QUEUE" value={loading ? "…" : stats.total} icon={Shield} delay={150} />
        <StatCard label="MY REVIEWS" value={myReviews.length} icon={CheckCircle2} delay={200} />
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
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

        <div className="p-6">
          {activeTab === "moderation" ? (
            <>
              {loading ? (
                <p className="text-sm text-gray-500">Loading moderation queue…</p>
              ) : queue.length === 0 ? (
                <EmptyState title="No pending datasets" description="All caught up — no datasets awaiting review." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold">Dataset Name</th>
                        <th className="px-5 py-3 text-left font-semibold">Submitter</th>
                        <th className="px-5 py-3 text-left font-semibold">Date</th>
                        <th className="px-5 py-3 text-left font-semibold">Status</th>
                        <th className="px-5 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queue.map((item) => (
                        <tr key={item.id || item.dataset_id} className="border-t border-gray-100 hover:bg-bg/50">
                          <td className="px-5 py-4">
                            <p className="font-medium text-navy">{item.title || "Untitled"}</p>
                            <p className="text-xs text-gray-500 font-mono">{item.id || item.dataset_id}</p>
                          </td>
                          <td className="px-5 py-4 text-gray-600">{item.owner?.email || item.owner_name || item.submitter || "—"}</td>
                          <td className="px-5 py-4 text-gray-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {item.created_at || item.date || "—"}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge status={String(item.status || "pending").toLowerCase()} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleDecide(item.id || item.dataset_id, "approved")}
                                disabled={decidingId === (item.id || item.dataset_id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-50 transition-colors min-h-[40px]"
                              >
                                {decidingId === (item.id || item.dataset_id) ? (
                                  <Clock className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecide(item.id || item.dataset_id, "rejected")}
                                disabled={decidingId === (item.id || item.dataset_id)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg px-4 py-2.5 hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[40px]"
                              >
                                {decidingId === (item.id || item.dataset_id) ? (
                                  <Clock className="w-4 h-4 animate-spin" />
                                ) : (
                                  <XCircle className="w-4 h-4" />
                                )}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {myReviews.length === 0 ? (
                <EmptyState title="No reviews yet" description="Your approved/rejected datasets will appear here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                        <th className="px-5 py-3 text-left font-semibold">Decision</th>
                        <th className="px-5 py-3 text-left font-semibold">Decided At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myReviews.map((review) => (
                        <tr key={review.id} className="border-t border-gray-100 hover:bg-bg/50">
                          <td className="px-5 py-3 font-medium text-navy">{review.title}</td>
                          <td className="px-5 py-3">
                            <StatusBadge status={review.decision} />
                          </td>
                          <td className="px-5 py-3 text-gray-500">{review.decided_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
