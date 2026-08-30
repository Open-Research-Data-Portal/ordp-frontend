import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  Database,
  ClipboardList,
  HardDrive,
  Trash2,
  Download,
  Activity,
  ShieldCheck,
} from "lucide-react";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { SectionHeader, StatusBadge, ProfileSavedNotice } from "../../../components/dashboard/dashboardUi";
import * as datasetsApi from "../hooks/datasetsApi";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

const PLACEHOLDER_AUDIT = [
  { id: "a1", timestamp: "2024-10-27 14:32", user: "Dr. Chen", action: "Dataset Update", resource: "DS-2024-089" },
  { id: "a2", timestamp: "2024-10-27 13:15", user: "Admin", action: "Access Granted", resource: "USR-4421" },
  { id: "a3", timestamp: "2024-10-27 11:48", user: "System", action: "Backup", resource: "AUTO-BKP-1027" },
  { id: "a4", timestamp: "2024-10-27 09:22", user: "Admin", action: "Role Change", resource: "USR-3301" },
];

const PLACEHOLDER_USERS = [
  { id: "u1", name: "Dr. Robert Chen", email: "r.chen@aastu.edu", role: "Researcher", status: "Active", initials: "RC" },
  { id: "u2", name: "Sarah Jenkins", email: "s.jenkins@aastu.edu", role: "Admin", status: "Pending", initials: "SJ" },
  { id: "u3", name: "Prof. Michael Abebe", email: "m.abebe@aastu.edu", role: "Reviewer", status: "Active", initials: "MA" },
];

const roleBadge = {
  Researcher: "bg-blue-50 text-blue-700 border-blue-200",
  Admin: "bg-gold-light text-gold border-gold/30",
  Reviewer: "bg-violet-50 text-violet-700 border-violet-200",
};

const PLACEHOLDER_DELETIONS = [
  { id: "d1", code: "DS-2015-112", reason: "Expired retention policy" },
  { id: "d2", code: "DS-2018-044", reason: "Owner request approved" },
  { id: "d3", code: "DS-2019-087", reason: "Duplicate dataset" },
];

export default function AdminDashboardPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const [cards, setCards] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [deletions, setDeletions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [cardsRes, auditRes, delRes] = await Promise.allSettled([
        datasetsApi.getAdminCards?.() ?? Promise.resolve(null),
        datasetsApi.getAdminAuditLog?.() ?? Promise.resolve([]),
        datasetsApi.getAdminDeletionQueue?.() ?? Promise.resolve([]),
      ]);
      if (!active) return;
      if (cardsRes.status === "fulfilled") setCards(cardsRes.value);
      if (auditRes.status === "fulfilled") {
        const items = normalizeList(auditRes.value);
        setAuditLog(items.length ? items : PLACEHOLDER_AUDIT);
      } else {
        setAuditLog(PLACEHOLDER_AUDIT);
      }
      if (delRes.status === "fulfilled") {
        const items = normalizeList(delRes.value);
        setDeletions(items.length ? items : PLACEHOLDER_DELETIONS);
      } else {
        setDeletions(PLACEHOLDER_DELETIONS);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const actionColors = {
    "Dataset Update": "bg-blue-50 text-blue-700",
    "Access Granted": "bg-gray-100 text-gray-700",
    Backup: "bg-indigo-50 text-indigo-700",
    "Role Change": "bg-amber-50 text-amber-700",
    Upload: "bg-emerald-50 text-emerald-700",
    "Record Deletion": "bg-red-50 text-red-700",
  };

  return (
    <DashboardShell title="ORDP Admin Console" subtitle="System status and key metrics">
      <ProfileSavedNotice />
      <div className="flex justify-between items-start mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy">
            {tab === "users" ? "User Management" : tab === "audit" ? "System Audit Log" : "Overview"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tab === "users"
              ? "Manage institutional access and role delegations."
              : "System status and key metrics for the Open Research Data Portal."}
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p className="uppercase tracking-wide">Last synced</p>
          <p className="font-medium text-navy">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {tab === "users" ? (
        <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-sm text-gray-500">Search by name, email, or ID</p>
            <button type="button" className="bg-gold hover:bg-gold-dark text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors">
              + Create User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">User</th>
                  <th className="px-5 py-3 text-left font-semibold">Role</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {PLACEHOLDER_USERS.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-bg/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">{u.initials}</span>
                        <div>
                          <p className="font-medium text-navy">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleBadge[u.role] || "bg-gray-100 text-gray-700"}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={u.status.toLowerCase()} /></td>
                    <td className="px-5 py-4 text-right text-gray-400">···</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard label="TOTAL USERS" value={loading ? "…" : (cards?.total_users ?? 4281).toLocaleString()} icon={Users} trend="+12% this month" delay={50} />
        <StatCard label="ACTIVE DATASETS" value={loading ? "…" : (cards?.active_datasets ?? 12504).toLocaleString()} icon={Database} trend="+3.4% this month" delay={100} />
        <StatCard label="PENDING REVIEWS" value={loading ? "…" : cards?.pending_reviews ?? 87} icon={ClipboardList} hint="Requires attention" delay={150} />
        <StatCard label="STORAGE USED (TB)" value={loading ? "…" : cards?.storage_tb ?? "842.5"} icon={HardDrive} hint="76% of quota" delay={200} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Analytics placeholder */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-6 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
          <SectionHeader title="System Analytics" subtitle="30-day activity overview" />
          <div className="flex gap-4 mb-4">
            <span className="text-xs font-medium text-gold">Uploads</span>
            <span className="text-xs text-gray-400">Active Users</span>
          </div>
          <div className="flex items-end gap-2 h-40 px-2">
            {[40, 55, 45, 70, 60, 85, 50, 65, 90, 75, 55, 80].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-md transition-all ${i === 8 ? "bg-gold" : "bg-gray-200"}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </section>

        {/* Deletion queue */}
        <section className="bg-red-50 rounded-xl border border-red-200 p-5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="w-5 h-5 text-red-600" />
            <h2 className="text-base font-semibold text-red-800">Deletion Queue</h2>
          </div>
          <ul className="space-y-2 mb-4">
            {deletions.map((d) => (
              <li key={d.id} className="text-sm text-red-900">
                <span className="font-mono font-semibold">{d.code || d.dataset_id}</span>
                <span className="text-red-700/70 ml-2 text-xs">{d.reason}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors">
            Execute Deletions
          </button>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Audit log */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: "350ms" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-navy">Recent Audit Log</h2>
            <button type="button" className="text-xs font-semibold text-gold border border-gold rounded-md px-3 py-1.5 hover:bg-gold-light transition-colors">
              <Download className="w-3.5 h-3.5 inline mr-1" />
              Export
            </button>
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
                {auditLog.slice(0, 5).map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-bg/50">
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{row.timestamp}</td>
                    <td className="px-5 py-3 font-medium text-navy">{row.user || row.user_name}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${actionColors[row.action] || "bg-gray-100 text-gray-700"}`}>
                        {row.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{row.resource || row.resource_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* System health */}
        <section className="bg-white rounded-xl border border-border shadow-sm p-5 animate-fade-in-up" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gold" />
            <h2 className="text-base font-semibold text-navy">System Health</h2>
          </div>
          <ul className="space-y-4">
            {[
              { label: "API Endpoint", status: "Operational" },
              { label: "Data Indexing", status: "98% Complete" },
              { label: "Auth Services", status: "Operational" },
            ].map(({ label, status }) => (
              <li key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
        </>
      )}
    </DashboardShell>
  );
}
