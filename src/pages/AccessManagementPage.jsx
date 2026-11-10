import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, Download, Inbox, KeyRound, Search, Shield, ShieldCheck, Users, UsersRound } from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import StatCard from "../components/dashboard/StatCard";
import PermissionMatrix from "../components/PermissionMatrix";
import GroupRequestsPanel from "../components/GroupRequestsPanel";
import GroupsPanel from "../components/GroupsPanel";
import UserPermissionsModal from "../components/UserPermissionsModal";
import PermissionCatalog from "../components/PermissionCatalog";
import UserManagementAudit from "../components/UserManagementAudit";
import { useAuth } from "../context/useAuth";
import { getEffectiveRoles } from "../utils/userRoles";
import * as api from "../api/accessControl";
import { accessError } from "../utils/accessError";
import { formatDateTime, isHighImpact, plainStatusLabel } from "../utils/accessManagement";

const tabs = [
  "Overview",
  "Users",
  "Groups",
  "Access Requests",
  "Group Requests",
  "Resources & Permissions",
  "Permission Catalog",
  "Audit History",
];
const input = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none";
const primary = "inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50";
const list = (value) => (Array.isArray(value) ? value : value?.results || []);
const message = (err) => accessError(err, "The request could not be completed.");
const date = (value) => (value ? new Date(value).toLocaleDateString() : "No expiry");

function Section({ title, actions, children }) {
  return (
    <section className="border-b border-slate-200 py-5 first:pt-0 last:border-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Notice({ text, error }) {
  return text ? (
    <p
      role="status"
      className={`mb-4 rounded-md border px-3 py-2 text-sm ${
        error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {text}
    </p>
  ) : null;
}

export default function AccessManagementPage() {
  const { user, accessControlMe } = useAuth();
  const adminAccount = Boolean(user?.is_superuser || user?.is_staff || getEffectiveRoles(user).includes("admin"));
  const { requestId } = useParams();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get("user");
  const navigate = useNavigate();
  const [tab, setTab] = useState(() =>
    tabs.includes(searchParams.get("tab")) ? searchParams.get("tab") : "Access Requests"
  );
  const requestedTab = searchParams.get("tab");
  const [manager, setManager] = useState(false);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [canExportAudit, setCanExportAudit] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [collections, setCollections] = useState([]);
  const [overview, setOverview] = useState(null);
  const [auditRows, setAuditRows] = useState([]);
  const [auditTab, setAuditTab] = useState("permissions");
  const [exporting, setExporting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [resource, setResource] = useState(null);
  const [resourceDirty, setResourceDirty] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [newRequest, setNewRequest] = useState({ resource_id: "", permissions: [], justification: "" });
  const [decisions, setDecisions] = useState({});
  const [reviewComment, setReviewComment] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [
      catalogResult,
      requestsResult,
      overviewResult,
      datasetsResult,
      meResult,
      auditResult,
      projectsResult,
      collectionsResult,
    ] = await Promise.allSettled([
      api.getCatalog(),
      api.getRequests(),
      api.getOverview(),
      api.getDiscoverableDatasets(),
      api.getMyPermissions(),
      api.getAudit(),
      api.listProjects(),
      api.listCollections(),
    ]);
    if (catalogResult.status === "fulfilled") setCatalog(list(catalogResult.value));
    if (requestsResult.status === "fulfilled") setRequests(list(requestsResult.value));
    if (datasetsResult.status === "fulfilled") setDatasets(list(datasetsResult.value));
    if (projectsResult.status === "fulfilled") setProjects(list(projectsResult.value));
    if (collectionsResult.status === "fulfilled") setCollections(list(collectionsResult.value));
    if (auditResult.status === "fulfilled") setAuditRows(list(auditResult.value));
    if (overviewResult.status === "fulfilled") {
      setOverview(overviewResult.value);
      setManager(true);
      setBackendUnavailable(false);
    } else {
      setOverview(null);
      setManager(false);
      setBackendUnavailable(overviewResult.reason?.response?.status === 404);
    }
    if (meResult.status === "fulfilled") {
      setCanReview(Boolean(meResult.value.can_review_requests));
      setCanExportAudit(Boolean(meResult.value.can_export_audit));
      if (meResult.value.can_view_users) setManager(true);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(refresh);
  }, [refresh]);

  useEffect(() => {
    if (requestedTab && tabs.includes(requestedTab)) queueMicrotask(() => setTab(requestedTab));
  }, [requestedTab]);

  useEffect(() => {
    if (!manager || !targetUserId) return;
    queueMicrotask(() => {
      setTab("Users");
      api
        .getUser(targetUserId)
        .then((value) => {
          setSelectedUser(value);
          setUserModalOpen(true);
        })
        .catch((err) => setError(message(err)));
    });
  }, [manager, targetUserId]);

  useEffect(() => {
    if (!requestId) return;
    api
      .getRequest(requestId)
      .then((value) => {
        setSelectedRequest(value);
        setDecisions(
          Object.fromEntries(
            (value.items || []).map((row) => [row.permission, { decision: "rejected", reason: "", expires_at: "" }])
          )
        );
        setTab(value.kind === "permission" ? "Access Requests" : "Group Requests");
      })
      .catch(() => setError("Request not found or unavailable."));
  }, [requestId]);

  useEffect(() => {
    if (!manager) return;
    Promise.allSettled([api.getUsers(), api.getGroups()]).then(([u, g]) => {
      if (u.status === "fulfilled") setUsers(list(u.value));
      if (g.status === "fulfilled") setGroups(list(g.value));
    });
  }, [manager]);

  useEffect(() => {
    if (!manager) return;
    const timer = window.setTimeout(() => {
      const params = { q: filter.trim() };
      if (userStatusFilter === "active" || userStatusFilter === "inactive") params.status = userStatusFilter;
      api
        .getUsers(params)
        .then((value) => setUsers(list(value)))
        .catch((err) => setError(message(err)));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [manager, filter, userStatusFilter]);

  const perform = async (action, success) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await refresh();
      window.dispatchEvent(new Event("ordp:permissions-changed"));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const selectUser = async (id) => {
    try {
      setSelectedUser(await api.getUser(id));
      setUserModalOpen(true);
    } catch (err) {
      setError(message(err));
    }
  };

  const grantSelected = async (grants) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.grantUserBulk(selectedUser.id, grants);
      setSelectedUser(await api.getUser(selectedUser.id));
      setNotice("Permissions granted.");
      window.dispatchEvent(new Event("ordp:permissions-changed"));
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const revokeSelected = (grantId) => {
    if (!window.confirm("Revoke this direct permission?")) return;
    perform(async () => {
      await api.revokeUserGrant(grantId);
      setSelectedUser(await api.getUser(selectedUser.id));
    }, "Permission revoked.");
  };

  const refreshGroups = async () => {
    setGroups(list(await api.getGroups()));
  };

  const selectRequest = (item) => {
    setSelectedRequest(item);
    setDecisions(
      Object.fromEntries(
        (item.items || []).map((row) => [row.permission, { decision: "rejected", reason: "", expires_at: "" }])
      )
    );
    navigate(`/access-management/requests/${item.id}`);
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const matchesText = `${u.name} ${u.email}`.toLowerCase().includes(filter.toLowerCase());
        const matchesStatus =
          userStatusFilter === "all" ||
          (userStatusFilter === "active" && u.is_active) ||
          (userStatusFilter === "inactive" && !u.is_active);
        return matchesText && matchesStatus;
      }),
    [users, filter, userStatusFilter]
  );

  const visibleRequests = useMemo(
    () =>
      requests.filter(
        (r) => r.kind === "permission" && (statusFilter === "all" || r.status === statusFilter)
      ),
    [requests, statusFilter]
  );

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending").slice(0, 5),
    [requests]
  );

  const saveMatrix = async (edits) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.saveResourceMatrix("dataset", resource.resource.id, edits);
      setResource(await api.getResourceAccess("dataset", resource.resource.id));
      setNotice("Permissions saved.");
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleExportAudit = async () => {
    setExporting(true);
    setError("");
    try {
      const data = await api.exportAudit();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `permission-audit-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(message(err));
    } finally {
      setExporting(false);
    }
  };

  const visibleTabs = tabs.filter((name) => {
    if (name === "Overview" || name === "Users" || name === "Groups" || name === "Resources & Permissions") {
      return manager || Boolean(accessControlMe?.can_view_users);
    }
    if (name === "Audit History") return Boolean(accessControlMe?.can_view_audit) || canExportAudit;
    return true;
  });

  return (
    <DashboardShell title="Access Management" subtitle="Manage permissions and access requests">
      <div className="mx-auto max-w-7xl">
        {userModalOpen && selectedUser && (
          <UserPermissionsModal
            key={selectedUser.id}
            user={selectedUser}
            catalog={catalog}
            datasets={datasets}
            projects={projects}
            collections={collections}
            busy={busy}
            error={error}
            onClose={() => {
              setUserModalOpen(false);
              setError("");
              if (targetUserId) navigate("/access-management?tab=Users", { replace: true });
            }}
            onGrant={grantSelected}
            onRevoke={revokeSelected}
          />
        )}
        <Notice text={error} error />
        <Notice text={notice} />

        <div className="mb-5 flex flex-wrap gap-2">
          {visibleTabs.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setTab(name);
                navigate(`/access-management?tab=${encodeURIComponent(name)}`);
              }}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                tab === name ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {tab === "Overview" && (
          <div className="space-y-6">
            {!manager && (
              <div className="rounded-xl border border-amber-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-slate-900">Overview unavailable</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {backendUnavailable
                    ? "Permission management is not available on this backend yet."
                    : "You need user.view permission to see access overview stats."}
                </p>
              </div>
            )}
            {manager && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard label="Total users" value={overview?.total_users ?? "—"} icon={Users} />
                  <StatCard label="Active users" value={overview?.active_users ?? "—"} icon={Shield} delay={40} />
                  <StatCard label="Groups" value={overview?.total_groups ?? "—"} icon={UsersRound} delay={80} />
                  <StatCard label="Pending requests" value={overview?.pending_requests ?? "—"} icon={Inbox} delay={120} />
                  <StatCard
                    label="Active grants"
                    value={(overview?.active_direct_grants ?? 0) + (overview?.active_group_grants ?? 0)}
                    icon={KeyRound}
                    delay={160}
                    hint={`${overview?.active_direct_grants ?? 0} direct · ${overview?.active_group_grants ?? 0} group`}
                  />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-900">Pending requests</h2>
                      <button
                        type="button"
                        className="text-sm font-semibold text-amber-700 hover:underline"
                        onClick={() => {
                          setTab("Access Requests");
                          setStatusFilter("pending");
                          navigate("/access-management?tab=Access%20Requests");
                        }}
                      >
                        View all
                      </button>
                    </div>
                    {!pendingRequests.length && <p className="text-sm text-slate-500">No pending requests.</p>}
                    <ul className="divide-y divide-slate-100">
                      {pendingRequests.map((req) => (
                        <li key={req.id} className="flex items-start justify-between gap-3 py-3">
                          <button type="button" className="min-w-0 text-left" onClick={() => selectRequest(req)}>
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {req.requester_name || req.requester_email || "Requester"}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {req.resource_type}
                              {req.resource_id ? ` · ${req.resource_id}` : ""}
                            </p>
                          </button>
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {plainStatusLabel(req.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-900">Recent audit</h2>
                      <button
                        type="button"
                        className="text-sm font-semibold text-amber-700 hover:underline"
                        onClick={() => {
                          setTab("Audit History");
                          navigate("/access-management?tab=Audit%20History");
                        }}
                      >
                        View history
                      </button>
                    </div>
                    {!auditRows.length && <p className="text-sm text-slate-500">No recent events.</p>}
                    <ul className="divide-y divide-slate-100">
                      {auditRows.slice(0, 5).map((row) => (
                        <li key={row.id} className="py-3">
                          <p className="text-sm font-medium text-slate-900">{row.action}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {row.actor || "System"}
                            {row.permission ? ` · ${row.permission}` : ""}
                            {" · "}
                            {formatDateTime(row.timestamp)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "Users" && !manager && (
          <div className="rounded-xl border border-amber-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">User access management</h2>
            <p className="mt-2 text-sm text-slate-600">
              {backendUnavailable
                ? "Permission management is not available on this backend yet. Deploy the backend access-control changes first."
                : "Access denied. You don't have permission to manage user permissions. Ask a permission manager to grant access to your account."}
            </p>
          </div>
        )}

        {tab === "Group Requests" && (
          <GroupRequestsPanel
            requests={requests}
            catalog={catalog}
            datasets={datasets}
            canReview={canReview}
            user={user}
            onChanged={refresh}
            openRequestId={requestId}
            allowSelfRequests={!adminAccount}
          />
        )}

        {tab === "Users" && manager && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Users</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Find an account, then review direct, inherited, and effective permissions.
                </p>
              </div>
              <div className="flex w-full max-w-xl flex-wrap gap-2">
                <label className="relative block min-w-[14rem] flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    aria-label="Search users by name or email"
                    placeholder="Search name or email"
                    className={`${input} pl-9`}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Filter by account status"
                  className={input}
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            {adminAccount && (
              <p className="mt-3 text-sm text-slate-600">
                Admin accounts can also open{" "}
                <button type="button" className="font-semibold text-amber-700 hover:underline" onClick={() => navigate("/admin-dashboard?tab=users")}>
                  Admin Users
                </button>
                .
              </p>
            )}
            <div className="mt-5 divide-y divide-slate-100">
              {filteredUsers.length ? (
                filteredUsers.map((account) => (
                  <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{account.name}</p>
                      <p className="break-all text-sm text-slate-500">{account.email}</p>
                      <p className="text-xs text-slate-500">
                        {account.is_active ? "Active" : "Inactive"} · {account.groups?.length || 0} groups ·{" "}
                        {account.direct_count ?? 0} direct
                      </p>
                    </div>
                    <button type="button" onClick={() => selectUser(account.id)} className={primary}>
                      <ShieldCheck size={16} /> Manage access
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">No matching users found.</p>
              )}
            </div>
          </section>
        )}

        {tab === "Groups" && manager && (
          <GroupsPanel
            users={users}
            groups={groups}
            catalog={catalog}
            datasets={datasets}
            projects={projects}
            collections={collections}
            onGroupsChanged={refreshGroups}
          />
        )}

        {tab === "Access Requests" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
            <div>
              <Section
                title={adminAccount ? "Incoming requests" : "Requests"}
                actions={
                  <select
                    aria-label="Request status"
                    className={input}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {["pending", "approved", "partially_approved", "rejected", "cancelled", "all"].map((s) => (
                      <option key={s} value={s}>
                        {s.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                }
              >
                <div className="divide-y divide-slate-100">
                  {visibleRequests.length ? (
                    visibleRequests.map((r) => (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => selectRequest(r)}
                        className="block w-full py-3 text-left hover:bg-slate-50"
                      >
                        <strong className="text-sm">{r.requester_name || r.requester_email}</strong>
                        <div className="text-xs text-slate-500">
                          {r.resource_type} · {(r.items || []).map((i) => i.name).join(", ")} ·{" "}
                          {r.status.replaceAll("_", " ")} · {date(r.created_at)}
                        </div>
                        {r.justification && (
                          <div className="mt-1 line-clamp-2 text-xs text-slate-500">{r.justification}</div>
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="py-4 text-sm text-slate-500">No requests in this view.</p>
                  )}
                </div>
              </Section>
              {!adminAccount && (
                <Section title="Request access">
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      perform(async () => {
                        await api.createRequest({ resource_type: "dataset", ...newRequest });
                        setNewRequest({ resource_id: "", permissions: [], justification: "" });
                      }, "Request sent.");
                    }}
                  >
                    <label className="block text-xs font-medium">
                      Dataset
                      <select
                        required
                        className={input}
                        value={newRequest.resource_id}
                        onChange={(e) => setNewRequest((v) => ({ ...v, resource_id: e.target.value }))}
                      >
                        <option value="">Select a dataset</option>
                        {datasets.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset>
                      <legend className="text-xs font-medium">Permissions needed</legend>
                      <div className="flex flex-wrap gap-3 py-2">
                        {catalog
                          .filter((p) => p.resource_type === "dataset" && p.enforced)
                          .map((p) => (
                            <label key={p.code} className="flex items-center gap-1 text-sm">
                              <input
                                type="checkbox"
                                checked={newRequest.permissions.includes(p.code)}
                                onChange={(e) =>
                                  setNewRequest((v) => ({
                                    ...v,
                                    permissions: e.target.checked
                                      ? [...v.permissions, p.code]
                                      : v.permissions.filter((x) => x !== p.code),
                                  }))
                                }
                              />
                              {p.name}
                            </label>
                          ))}
                      </div>
                    </fieldset>
                    <label className="block text-xs font-medium">
                      Justification
                      <textarea
                        required
                        minLength={10}
                        className={input}
                        value={newRequest.justification}
                        onChange={(e) => setNewRequest((v) => ({ ...v, justification: e.target.value }))}
                      />
                    </label>
                    <button type="submit" className={primary} disabled={busy || !newRequest.permissions.length}>
                      Send request
                    </button>
                  </form>
                </Section>
              )}
            </div>
            <div>
              {selectedRequest && (
                <>
                  <Section
                    title="Request details"
                    actions={
                      selectedRequest.status === "pending" && selectedRequest.requester === user?.id ? (
                        <button
                          className={secondary}
                          onClick={() => {
                            if (window.confirm("Cancel this request?")) {
                              perform(async () => {
                                await api.cancelRequest(selectedRequest.id);
                                setSelectedRequest(null);
                                navigate("/access-management");
                              }, "Request cancelled.");
                            }
                          }}
                        >
                          Cancel request
                        </button>
                      ) : null
                    }
                  >
                    <p className="text-sm">
                      {selectedRequest.requester_email} · {selectedRequest.status.replaceAll("_", " ")}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{selectedRequest.justification}</p>
                    {selectedRequest.review_comment && (
                      <p className="mt-2 text-sm text-slate-600">Reviewer: {selectedRequest.review_comment}</p>
                    )}
                  </Section>
                  <Section title="Requested permissions">
                    {(selectedRequest.items || []).map((item) => (
                      <div key={item.permission} className="border-b border-slate-100 py-2 text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-slate-500">{item.decision}</span>
                        {item.reason && <div className="text-xs text-slate-500">{item.reason}</div>}
                        {item.expires_at && (
                          <div className="text-xs text-slate-500">Expires {formatDateTime(item.expires_at)}</div>
                        )}
                      </div>
                    ))}
                  </Section>
                  {canReview && selectedRequest.status === "pending" && (
                    <Section title="Review request">
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={secondary}
                            onClick={() =>
                              setDecisions((current) =>
                                Object.fromEntries(
                                  Object.keys(current).map((permission) => [
                                    permission,
                                    { ...current[permission], decision: "approved" },
                                  ])
                                )
                              )
                            }
                          >
                            Approve all
                          </button>
                          <button
                            type="button"
                            className={secondary}
                            onClick={() =>
                              setDecisions((current) =>
                                Object.fromEntries(
                                  Object.keys(current).map((permission) => [
                                    permission,
                                    { ...current[permission], decision: "rejected" },
                                  ])
                                )
                              )
                            }
                          >
                            Reject all
                          </button>
                        </div>
                        {(selectedRequest.items || []).map((item) => (
                          <div key={item.permission} className="border-b border-slate-100 pb-3">
                            <strong className="text-sm">{item.name}</strong>
                            <div className="mt-2 flex gap-3">
                              {["approved", "rejected"].map((decision) => (
                                <label key={decision} className="flex items-center gap-1 text-sm">
                                  <input
                                    type="radio"
                                    name={item.permission}
                                    checked={decisions[item.permission]?.decision === decision}
                                    onChange={() =>
                                      setDecisions((v) => ({
                                        ...v,
                                        [item.permission]: { ...v[item.permission], decision },
                                      }))
                                    }
                                  />
                                  {decision}
                                </label>
                              ))}
                            </div>
                            {decisions[item.permission]?.decision === "approved" && (
                              <input
                                type="datetime-local"
                                aria-label={`Expiration for ${item.name}`}
                                className={`${input} mt-2`}
                                value={decisions[item.permission]?.expires_at || ""}
                                onChange={(e) =>
                                  setDecisions((v) => ({
                                    ...v,
                                    [item.permission]: { ...v[item.permission], expires_at: e.target.value },
                                  }))
                                }
                              />
                            )}
                            <input
                              aria-label={`Reason for ${item.name}`}
                              className={`${input} mt-2`}
                              placeholder="Decision reason"
                              value={decisions[item.permission]?.reason || ""}
                              onChange={(e) =>
                                setDecisions((v) => ({
                                  ...v,
                                  [item.permission]: { ...v[item.permission], reason: e.target.value },
                                }))
                              }
                            />
                          </div>
                        ))}
                        <textarea
                          aria-label="Review comment"
                          className={input}
                          placeholder="Comment to requester"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                        />
                        <button
                          type="button"
                          className={primary}
                          disabled={busy || selectedRequest.requester === user?.id}
                          onClick={() => {
                            const approved = Object.entries(decisions)
                              .filter(([, v]) => v.decision === "approved")
                              .map(([k]) => k);
                            if (approved.some((k) => isHighImpact(k)) && !window.confirm("This grants a high-impact permission. Continue?")) {
                              return;
                            }
                            perform(async () => {
                              await api.reviewRequest(selectedRequest.id, {
                                decisions: Object.entries(decisions).map(([permission, row]) => ({
                                  permission,
                                  ...row,
                                  expires_at: row.expires_at || null,
                                })),
                                comment: reviewComment,
                              });
                              setSelectedRequest(null);
                              navigate("/access-management");
                            }, "Decision recorded.");
                          }}
                        >
                          <Check size={15} /> Submit decision
                        </button>
                      </div>
                    </Section>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {tab === "Resources & Permissions" && manager && (
          <Section title="Dataset access">
            <div className="max-w-lg">
              <select
                aria-label="Select resource"
                className={input}
                value={resource?.resource?.id || ""}
                onChange={(e) => {
                  if (resourceDirty && !window.confirm("Discard unsaved permission changes?")) return;
                  perform(async () => {
                    setResource(e.target.value ? await api.getResourceAccess("dataset", e.target.value) : null);
                  }, "");
                }}
              >
                <option value="">Select a dataset</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
            {resource && (
              <div className="mt-5">
                <PermissionMatrix
                  key={resource.resource.id}
                  resource={resource}
                  users={users}
                  groups={groups}
                  catalog={catalog}
                  onSave={saveMatrix}
                  onDirtyChange={setResourceDirty}
                  disabled={busy}
                />
              </div>
            )}
          </Section>
        )}

        {tab === "Permission Catalog" && <PermissionCatalog catalog={catalog} />}

        {tab === "Audit History" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2">
                <button
                  type="button"
                  onClick={() => setAuditTab("permissions")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    auditTab === "permissions" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Permission history
                </button>
                <button
                  type="button"
                  onClick={() => setAuditTab("user-management")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    auditTab === "user-management" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  User management
                </button>
              </div>
              {canExportAudit && (
                <button type="button" className={primary} disabled={exporting} onClick={handleExportAudit}>
                  <Download size={16} />
                  {exporting ? "Exporting…" : "Export"}
                </button>
              )}
            </div>
            {auditTab === "user-management" ? (
              <UserManagementAudit />
            ) : (
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                {!auditRows.length ? (
                  <p className="p-6 text-sm text-slate-500">No audit events.</p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">When</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Actor</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditRows.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(row.timestamp)}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{row.action}</td>
                          <td className="px-4 py-3 text-slate-600">{row.actor || "System"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.target || row.target_user || row.target_group || "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.detail ||
                              [row.permission, row.resource_type, row.resource_id].filter(Boolean).join(" · ") ||
                              "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}
            <p className="text-xs text-slate-500">
              Prefer the dedicated audit page?{" "}
              <Link to="/audit-log" className="font-semibold text-amber-700 hover:underline">
                Open user audit log
              </Link>
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
