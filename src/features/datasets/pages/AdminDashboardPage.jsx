import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  Database,
  ClipboardList,
  Trash2,
  UserCheck,
  UserX,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import DashboardShell from "../../../components/dashboard/DashboardShell";
import StatCard from "../../../components/dashboard/StatCard";
import { SectionHeader, StatusBadge, ProfileSavedNotice, EmptyState } from "../../../components/dashboard/dashboardUi";
import { useToast } from "../../../context/ToastContext.jsx";
import AdminSettingsPage from "./AdminSettingsPage.jsx";
import * as datasetsApi from "../hooks/datasetsApi.js";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

// Normalize one user row returned by /admin-panel/users/ (or users/create/) into
// the shape the users table expects. Defensive against id/user_id, name/full_name,
// role/user_role, is_active/status key variants.
function normalizeUser(u) {
  if (!u || typeof u !== "object") return null;
  const rawStatus = String(u.status || "").toLowerCase();
  const isActive =
    u.is_active !== false && !["inactive", "deactivated", "disabled"].includes(rawStatus);
  const fullName = u.full_name || u.name || [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  const rawRole = u.role || u.user_role || (Array.isArray(u.roles) && u.roles[0]) || "user";
  const role = rawRole === "checker" ? "reviewer" : rawRole;
  return {
    id: u.id ?? u.user_id ?? u.pk ?? u.email ?? u.username,
    email: u.email || u.username || "",
    full_name: fullName,
    role,
    status: isActive ? rawStatus || "active" : "inactive",
    is_active: isActive,
    initials: (fullName || u.email || u.username || "U").slice(0, 2).toUpperCase(),
  };
}

const CHART_COLORS = ["#B8860B", "#0B1526", "#ef4444", "#10b981", "#6366f1", "#f59e0b"];

const MOCK_USERS = [
  { id: "u1", email: "admin@aastu.edu.et", full_name: "Admin User", role: "admin", status: "active", initials: "AU" },
  { id: "u2", email: "reviewer@aastu.edu.et", full_name: "Reviewer One", role: "checker", status: "active", initials: "RO" },
  { id: "u3", email: "researcher@aastu.edu.et", full_name: "Researcher Abebe", role: "researcher", status: "active", initials: "RA" },
  { id: "u4", email: "student1@aastustudent.edu.et", full_name: "Student Alem", role: "user", status: "pending", initials: "SA" },
  { id: "u5", email: "lecturer@aastu.edu.et", full_name: "Lecturer Tadesse", role: "user", status: "active", initials: "LT" },
];

const MOCK_DELETIONS = [
  { id: "d1", code: "DS-2015-112", reason: "Expired retention policy", requested_by: "admin@aastu.edu.et", requested_at: "2024-10-25" },
  { id: "d2", code: "DS-2018-044", reason: "Owner request approved", requested_by: "researcher@aastu.edu.et", requested_at: "2024-10-26" },
  { id: "d3", code: "DS-2019-087", reason: "Duplicate dataset", requested_by: "reviewer@aastu.edu.et", requested_at: "2024-10-27" },
];

const roleBadge = {
  user: "bg-gray-100 text-gray-700 border-gray-200",
  public: "bg-gray-100 text-gray-700 border-gray-200",
  checker: "bg-violet-50 text-violet-700 border-violet-200",
  reviewer: "bg-violet-50 text-violet-700 border-violet-200",
  admin: "bg-gold-light text-gold border-gold/30",
  researcher: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function AdminDashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get("tab") || "overview";
  const { addToast } = useToast();

  const [cards, setCards] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [deletions, setDeletions] = useState(MOCK_DELETIONS);
  const [queue, setQueue] = useState([]);
  const [contentUpdates, setContentUpdates] = useState([]);
  const [users, setUsers] = useState(MOCK_USERS);
  const [loading, setLoading] = useState(false);

  const [userSearch, setUserSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState("reviewer");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const [cardsRes, auditRes, delRes, queueRes, cuRes, usersRes] = await Promise.allSettled([
        datasetsApi.getAdminCards?.() ?? Promise.resolve(null),
        datasetsApi.getAdminAuditLog?.() ?? Promise.resolve([]),
        datasetsApi.getAdminDeletionQueue?.() ?? Promise.resolve([]),
        datasetsApi.getAdminQueue?.() ?? Promise.resolve([]),
        datasetsApi.getContentUpdateQueue?.() ?? Promise.resolve([]),
        datasetsApi.getAdminUsers?.() ?? Promise.resolve([]),
      ]);
      if (!active) return;
      if (cardsRes.status === "fulfilled") setCards(cardsRes.value);
      if (auditRes.status === "fulfilled") setAuditLog(normalizeList(auditRes.value));
      if (delRes.status === "fulfilled") setDeletions(normalizeList(delRes.value));
      if (queueRes.status === "fulfilled") setQueue(normalizeList(queueRes.value));
      if (cuRes.status === "fulfilled") setContentUpdates(normalizeList(cuRes.value));
      if (usersRes.status === "fulfilled") {
        const list = normalizeList(usersRes.value).map(normalizeUser).filter(Boolean)
        if (list.length) setUsers(list);
      }
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
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
    pending: "bg-amber-50 text-amber-700",
  }), []);

  const reviewStats = useMemo(() => {
    const pending = queue.length;
    const approved = queue.filter((d) => String(d.status || "").toLowerCase() === "approved").length;
    const rejected = queue.filter((d) => String(d.status || "").toLowerCase() === "rejected").length;
    const total = queue.length || 1;
    return {
      total: queue.length,
      pending,
      approved,
      rejected,
      approvedPct: queue.length ? Math.round((approved / total) * 100) : 0,
      rejectedPct: queue.length ? Math.round((rejected / total) * 100) : 0,
      pendingPct: queue.length ? Math.round((pending / total) * 100) : 0,
    };
  }, [queue]);

  const pieData = useMemo(() => {
    if (!reviewStats.total) return [];
    return [
      { name: "Pending", value: reviewStats.pending },
      { name: "Approved", value: reviewStats.approved },
      { name: "Rejected", value: reviewStats.rejected },
    ].filter((d) => d.value > 0);
  }, [reviewStats]);

  const barData = useMemo(() => {
    const map = new Map();
    const list = [...queue, ...contentUpdates];
    list.forEach((r) => {
      const day = new Date(r.created_at || r.submitted_at || r.timestamp || 0).toLocaleDateString();
      map.set(day, (map.get(day) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .slice(-14);
  }, [queue, contentUpdates]);

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

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreateError("");
    setCreatingUser(true);
    const email = newUserEmail.trim();
    const fullName = newUserFullName.trim();
    const isReviewer = newUserRole === "checker" || newUserRole === "reviewer";
    const backendRole = isReviewer ? "reviewer" : "public";

    try {
      const createdRes = await datasetsApi.createAdminUser({
        full_name: fullName,
        email: email,
        role: backendRole,
      });
      const created = {
        id: createdRes?.user_id || createdRes?.id || `new-${Date.now()}`,
        email: email,
        full_name: fullName,
        role: isReviewer ? "reviewer" : "public",
        status: "active",
        is_active: true,
        initials: (fullName || email).slice(0, 2).toUpperCase(),
      };
      setUsers((s) => [created, ...s.filter((u) => String(u.email || "").toLowerCase() !== created.email.toLowerCase())]);
      setNewUserEmail("");
      setNewUserFullName("");
      setNewUserRole("reviewer");
      setShowCreateForm(false);

      if (isReviewer) {
        addToast("Reviewer created. An email with a link to create their password was sent.", "success");
        navigate(
          `/invite-sent?email=${encodeURIComponent(created.email)}&full_name=${encodeURIComponent(created.full_name || "")}`
        );
      } else {
        addToast(`${created.full_name || "User"} created successfully.`, "success");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.error?.message ||
        (typeof err?.response?.data === "string" && !err.response.data.startsWith("<") ? err.response.data : null) ||
        err?.message ||
        "Failed to create user.";
      setCreateError(msg);
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleToggleUserActive(user) {
    const id = user.id || user.user_id;
    if (!id) return;
    const currentlyActive = user.is_active !== false && String(user.status || "").toLowerCase() !== "inactive";
    try {
      if (currentlyActive) await datasetsApi.deactivateUser(id);
      else await datasetsApi.reactivateUser(id);
      setUsers((s) =>
        s.map((u) => {
          if ((u.id || u.user_id) !== id) return u;
          const nextActive = !currentlyActive;
          return { ...u, is_active: nextActive, status: nextActive ? "active" : "inactive" };
        })
      );
      addToast(currentlyActive ? "User deactivated." : "User reactivated.", "success");
    } catch (err) {
      addToast(err?.message || "Failed to update user status.", "error");
    }
  }

  return (
    <DashboardShell title="ORDP Admin Console" subtitle="System status and key metrics">
      <ProfileSavedNotice />
      <div className="flex justify-between items-start mb-6 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-serif font-bold text-navy">
            {tab === "datasets" ? "Dataset Management" : tab === "users" ? "User Management" : tab === "settings" ? "Settings" : tab === "audit" ? "System Audit Log" : "Overview"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {tab === "datasets"
              ? "Review and moderate pending datasets."
              : tab === "users"
                ? "Manage institutional access and role delegations."
                : tab === "settings"
                  ? "Manage categories, colleges, centers, departments, and languages."
                  : "System status and key metrics for the Open Research Data Portal."}
          </p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p className="uppercase tracking-wide">Last synced</p>
          <p className="font-medium text-navy">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {tab === "datasets" ? (
        <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-sm text-gray-500">{queue.length} pending dataset{queue.length === 1 ? "" : "s"}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Dataset</th>
                  <th className="px-5 py-3 text-left font-semibold">Owner</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-gray-500">
                      No pending datasets.
                    </td>
                  </tr>
                ) : (
                  queue.map((d) => (
                    <tr key={d.id || d.dataset_id} className="border-t border-gray-100 hover:bg-bg/50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-navy">{d.title || "Untitled"}</p>
                        <p className="text-xs text-gray-500 font-mono">{d.id || d.dataset_id}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{d.owner?.email || d.owner_name || "—"}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={String(d.status || "pending").toLowerCase()} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/datasets/${d.id || d.dataset_id}`)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-navy text-white rounded-lg px-4 py-2.5 hover:bg-navy-light transition-colors min-h-[40px]"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => addToast("Dataset delete is not yet available in the backend.", "info")}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg px-4 py-2.5 hover:bg-red-700 transition-colors min-h-[40px]"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : tab === "users" ? (
        <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, or ID"
                className="rounded-lg border border-slate-200 text-sm py-2 pl-3 pr-3 bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((s) => !s)}
              className="bg-gold hover:bg-gold-dark text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors min-h-[40px]"
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
                    <option value="reviewer">Reviewer (Checker)</option>
                    <option value="public">Normal User</option>
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
                  className="bg-navy hover:bg-navy-light text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-50 transition-colors min-h-[40px]"
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
                        <StatusBadge status={u.status || "active"} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleUserActive(u)}
                          title={u.is_active === false ? "Reactivate" : "Deactivate"}
                          className={`transition-colors min-h-[40px] px-2 ${
                            u.is_active === false
                              ? "text-emerald-500 hover:text-emerald-700"
                              : "text-gray-400 hover:text-red-600"
                          }`}
                          aria-label={`${u.is_active === false ? "Reactivate" : "Deactivate"} ${u.email}`}
                        >
                          {u.is_active === false ? (
                            <UserCheck className="w-4 h-4" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : tab === "settings" ? (
        <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in-up">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-border overflow-x-auto">
            {[
              { key: "categories", label: "Categories" },
              { key: "colleges", label: "Colleges" },
              { key: "coe", label: "Centers of Excellence" },
              { key: "departments", label: "Departments" },
              { key: "languages", label: "Languages" },
            ].map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => navigate(`/admin-dashboard?tab=settings-${tabKey}`)}
                className={`text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors min-h-[40px] ${searchParams.get("tab") === `settings-${tabKey}` ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {tabKey.label}
              </button>
            ))}
          </div>
          <div className="p-6">
            <AdminSettingsPage />
          </div>
        </section>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <StatCard
              label="TOTAL USERS"
              value={loading ? "…" : ((cards?.total_users ?? 0)).toLocaleString()}
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
              value={loading ? "…" : (queue.length || cards?.pending_reviews || 0)}
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
              <button type="button" className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg py-2.5 transition-colors min-h-[40px]">
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
                  className="text-xs font-semibold text-gold border border-gold rounded-md px-3 py-2 hover:bg-gold-light transition-colors min-h-[32px]"
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

