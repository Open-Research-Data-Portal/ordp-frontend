import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Database,
  ClipboardList,
  Trash2,
  Activity,
  ShieldCheck,
  Search,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { SectionHeader, StatusBadge, ProfileSavedNotice, EmptyState } from "../../../components/dashboard/dashboardUi";
import * as datasetsApi from "../hooks/datasetsApi";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

const CHART_COLORS = ["#B8860B", "#0B1526", "#ef4444", "#10b981", "#6366f1", "#f59e0b"];

const ROLE_OPTIONS = [
  { value: "user", label: "Normal User" },
  { value: "checker", label: "Reviewer (Checker)" },
];

const roleBadge = {
  user: "bg-gray-100 text-gray-700 border-gray-200",
  checker: "bg-violet-50 text-violet-700 border-violet-200",
  admin: "bg-gold-light text-gold border-gold/30",
  researcher: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function AdminDashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get("tab") || "overview";

  const [cards, setCards] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [deletions, setDeletions] = useState([]);
  const [users, setUsers] = useState([]);
  const [queue, setQueue] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userSearch, setUserSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [cardsRes, auditRes, delRes, usersRes, queueRes, reviewsRes] = await Promise.allSettled([
        datasetsApi.getAdminCards?.() ?? Promise.resolve(null),
        datasetsApi.getAdminAuditLog?.() ?? Promise.resolve([]),
        datasetsApi.getAdminDeletionQueue?.() ?? Promise.resolve([]),
        datasetsApi.getAdminUsers?.() ?? Promise.resolve([]),
        datasetsApi.getAdminQueue?.() ?? Promise.resolve([]),
        datasetsApi.getMyReviews?.() ?? Promise.resolve([]),
      ]);
      if (!active) return;
      if (cardsRes.status === "fulfilled") setCards(cardsRes.value);
      if (auditRes.status === "fulfilled") setAuditLog(normalizeList(auditRes.value));
      if (delRes.status === "fulfilled") setDeletions(normalizeList(delRes.value));
      if (usersRes.status === "fulfilled") setUsers(normalizeList(usersRes.value));
      if (queueRes.status === "fulfilled") setQueue(normalizeList(queueRes.value));
      if (reviewsRes.status === "fulfilled") setReviews(normalizeList(reviewsRes.value));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const actionColors = useMemo(() => ({
    "Dataset Update": "bg-blue-50 text-blue-700",
    "Access Granted": "bg-gray-100 text-gray-700",
    Backup: "bg-indigo-50 text-indigo-700",
    "Role Change": "bg-amber-50 text-amber-700",
    Upload: "bg-emerald-50 text-emerald-700",
    "Record Deletion": "bg-red-50 text-red-700",
    "User Created": "bg-emerald-50 text-emerald-700",
    "User Deleted": "bg-red-50 text-red-700",
  }), []);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.trim().toLowerCase();
    return users.filter(
      (u) =>
        String(u.email || "").toLowerCase().includes(q) ||
        String(u.full_name || u.name || "").toLowerCase().includes(q) ||
        String(u.id || u.user_id || "").includes(q)
    );
  }, [users, userSearch]);

  const reviewStats = useMemo(() => {
    const list = normalizeList(reviews);
    const pending = list.filter((r) => String(r.status || "").toLowerCase() === "pending").length;
    const approved = list.filter((r) => String(r.status || "").toLowerCase() === "approved").length;
    const rejected = list.filter((r) => String(r.status || "").toLowerCase() === "rejected").length;
    const total = list.length || pending + approved + rejected || 1;
    return {
      total: list.length || pending + approved + rejected,
      pending,
      approved,
      rejected,
      approvedPct: Math.round((approved / total) * 100),
      rejectedPct: Math.round((rejected / total) * 100),
      pendingPct: Math.round((pending / total) * 100),
    };
  }, [reviews]);

  const pieData = useMemo(() => {
    const queueItems = normalizeList(queue);
    const pendingCount = queueItems.length || reviewStats.pending || 0;
    return [
      { name: "Pending", value: pendingCount },
      { name: "Approved", value: reviewStats.approved },
      { name: "Rejected", value: reviewStats.rejected },
    ].filter((d) => d.value > 0);
  }, [queue, reviewStats]);

  const barData = useMemo(() => {
    const map = new Map();
    const list = normalizeList(reviews);
    list.forEach((r) => {
      const day = new Date(r.decided_at || r.created_at || r.timestamp || 0).toLocaleDateString();
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .slice(-14);
  }, [reviews]);

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError("");
    setCreatingUser(true);
    try {
      const created = await datasetsApi.createAdminUser({
        email: newUserEmail.trim(),
        full_name: newUserFullName.trim(),
        role: newUserRole,
      });
      setUsers((s) => [
        {
          id: created.id || created.user_id || `new-${Date.now()}`,
          email: newUserEmail.trim(),
          full_name: newUserFullName.trim(),
          role: newUserRole,
          status: "Active",
          initials: (newUserFullName.trim() || newUserEmail.trim()).slice(0, 2).toUpperCase(),
          ...created,
        },
        ...s,
      ]);
      setNewUserEmail("");
      setNewUserFullName("");
      setNewUserRole("user");
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err?.message || "Failed to create user.");
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleDeleteUser(user) {
    const id = user.id || user.user_id;
    if (!id || deletingId) return;
    const previous = users;
    setDeletingId(id);
    setUsers((s) => s.filter((u) => (u.id || u.user_id) !== id));
    setDeleteConfirmId(null);
    try {
      await datasetsApi.deleteAdminUser(id);
    } catch (err) {
      setUsers(previous);
      alert(err?.message || "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteDataset(dataset) {
    const id = dataset.id || dataset.dataset_id;
    if (!id || deletingId) return;
    setDeletingId(id);
    try {
      await datasetsApi.deleteDataset(id);
      setQueue((items) => items.filter((item) => (item.id || item.dataset_id) !== id));
    } catch (err) {
      alert(err?.message || "Failed to delete dataset.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <DashboardShell title="ORDP Admin Console" subtitle="System status and key metrics">
      <ProfileSavedNotice />
      <div className="flex justify-between items-start mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy">
            {tab === "users" ? "User Management" : tab === "datasets" ? "Dataset Management" : tab === "audit" ? "System Audit Log" : "Overview"}
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, or ID"
                className="rounded-lg border border-slate-200 text-sm py-2 pl-9 pr-3 bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((s) => !s)}
              className="bg-gold hover:bg-gold-dark text-white text-sm font-semibold rounded-lg px-4 py-2 transition-colors"
            >
              {showCreateForm ? "Cancel" : "+ Create User"}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateUser} className="mx-5 mt-4 mb-2 rounded-xl border border-slate-200 bg-[#F8F7F4] p-5">
              <p className="text-sm font-semibold text-navy mb-3">New User</p>
              {createError && (
                <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1" htmlFor="newEmail">
                    Email
                  </label>
                  <input
                    id="newEmail"
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 text-sm py-2 px-3"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1" htmlFor="newFullName">
                    Full Name
                  </label>
                  <input
                    id="newFullName"
                    type="text"
                    required
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 text-sm py-2 px-3"
                    placeholder="Dr. Jane Doe"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1" htmlFor="newRole">
                    Role
                  </label>
                  <select
                    id="newRole"
                    required
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 text-sm py-2 px-3 bg-[#F7F6F2]"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs font-semibold text-gray-600 hover:text-navy px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="bg-navy hover:bg-navy-light text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50 transition-colors"
                >
                  {creatingUser ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          )}

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
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id || u.user_id} className="border-t border-gray-100 hover:bg-bg/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                            {(u.full_name || u.name || u.email || "U").slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-medium text-navy">{u.full_name || u.name || "—"}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleBadge[u.role] || "bg-gray-100 text-gray-700"}`}>{u.role || "user"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={u.is_active === false ? "inactive" : "active"} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {deleteConfirmId === (u.id || u.user_id) ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-600">Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={deletingId === (u.id || u.user_id)}
                              className="text-xs font-semibold bg-red-600 text-white rounded-md px-2.5 py-1.5 disabled:opacity-50"
                            >
                              {deletingId === (u.id || u.user_id) ? "…" : "Yes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs font-semibold text-gray-600 hover:text-navy px-2 py-1.5"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(u.id || u.user_id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            aria-label={`Delete ${u.email}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : tab === "datasets" ? (
        <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-navy">Datasets</h2>
            <p className="text-xs text-gray-500 mt-1">Review pending submissions or remove datasets.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-sm text-gray-500">No datasets require review.</td></tr>
                ) : queue.map((dataset) => {
                  const id = dataset.id || dataset.dataset_id;
                  return (
                    <tr key={id} className="border-t border-gray-100">
                      <td className="px-5 py-3 font-medium text-navy">{dataset.title || dataset.name || `Dataset ${id}`}</td>
                      <td className="px-5 py-3"><StatusBadge status={dataset.status || "pending"} /></td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => navigate(`/datasets/${id}`)} className="border border-gold text-gold-dark rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-gold-light">Review</button>
                          <button type="button" onClick={() => handleDeleteDataset(dataset)} disabled={deletingId === id} className="border border-red-200 text-red-700 rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-red-50 disabled:opacity-60">{deletingId === id ? "Deleting..." : "Delete"}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              label="TOTAL USERS"
              value={loading ? "…" : ((cards?.total_users ?? users.length) || 0).toLocaleString()}
              icon={Users}
              trend="+12% this month"
              delay={50}
            />
            <StatCard
              label="ACTIVE DATASETS"
              value={loading ? "…" : (cards?.active_datasets ?? 0).toLocaleString()}
              icon={Database}
              trend="+3.4% this month"
              delay={100}
            />
            <StatCard
              label="PENDING REVIEWS"
              value={loading ? "…" : (queue.length || cards?.pending_reviews || reviewStats.pending || 0)}
              icon={ClipboardList}
              hint="Requires attention"
              delay={150}
            />
            <StatCard
              label="APPROVAL RATE"
              value={loading ? "…" : `${reviewStats.approvedPct}%`}
              icon={ShieldCheck}
              hint={`${reviewStats.approved} approved / ${reviewStats.rejected} rejected`}
              delay={200}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Analytics charts */}
            <section className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm p-6 animate-fade-in-up" style={{ animationDelay: "250ms" }}>
              <SectionHeader title="Review Decisions" subtitle="Approved vs rejected" />
              {loading ? (
                <div className="h-56 flex items-center justify-center text-sm text-gray-500">Loading charts…</div>
              ) : pieData.length === 0 ? (
                <EmptyState title="No review data yet" description="Decisions will appear here once reviews are processed." />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {pieData.map((entry, idx) => (
                          <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {!loading && barData.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <SectionHeader title="Activity Trend" subtitle="Last 14 entries" />
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#B8860B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </section>

            {/* Deletion queue */}
            <section className="bg-red-50 rounded-xl border border-red-200 p-5 animate-fade-in-up" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center gap-2 mb-3">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h2 className="text-base font-semibold text-red-800">Deletion Queue</h2>
              </div>
              <ul className="space-y-2 mb-4">
                {deletions.length === 0 ? (
                  <li className="text-sm text-red-900">No pending deletions.</li>
                ) : (
                  deletions.map((d) => (
                    <li key={d.id} className="text-sm text-red-900">
                      <span className="font-mono font-semibold">{d.code || d.dataset_id}</span>
                      <span className="text-red-700/70 ml-2 text-xs">{d.reason}</span>
                    </li>
                  ))
                )}
              </ul>
              <button type="button" className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors">
                Execute Deletions
              </button>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Audit log widget */}
            <section className="lg:col-span-2 bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up" style={{ animationDelay: "350ms" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-base font-semibold text-navy">Recent Audit Log</h2>
                <button
                  type="button"
                  onClick={() => navigate("/admin/audit-log")}
                  className="text-xs font-semibold text-gold border border-gold rounded-md px-3 py-1.5 hover:bg-gold-light transition-colors"
                >
                  View all
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
                    {auditLog.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500">
                          No audit entries yet.
                        </td>
                      </tr>
                    ) : (
                      auditLog.slice(0, 5).map((row) => (
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
                      ))
                    )}
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
