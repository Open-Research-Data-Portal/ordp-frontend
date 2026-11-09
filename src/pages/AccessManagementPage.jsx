import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, Search, ShieldCheck } from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import PermissionMatrix from "../components/PermissionMatrix";
import GroupRequestsPanel from "../components/GroupRequestsPanel";
import GroupsPanel from "../components/GroupsPanel";
import UserPermissionsModal from "../components/UserPermissionsModal";
import PermissionCatalog from "../components/PermissionCatalog";
import { useAuth } from "../context/useAuth";
import { getEffectiveRoles } from "../utils/userRoles";
import * as api from "../api/accessControl";
import { accessError } from "../utils/accessError";

const tabs = ["Users", "Groups", "Access Requests", "Group Requests", "Resources & Permissions", "Permission Catalog"];
const input = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none";
const primary = "inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50";
const list = (value) => Array.isArray(value) ? value : value?.results || [];
const message = (err) => accessError(err, "The request could not be completed.");
const date = (value) => value ? new Date(value).toLocaleDateString() : "No expiry";

function Section({ title, actions, children }) {
  return <section className="border-b border-slate-200 py-5 first:pt-0 last:border-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold text-slate-900">{title}</h2>{actions}</div>{children}</section>;
}

function Notice({ text, error }) {
  return text ? <p role="status" className={`mb-4 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{text}</p> : null;
}

export default function AccessManagementPage() {
  const { user } = useAuth();
  const adminAccount = Boolean(user?.is_superuser || user?.is_staff || getEffectiveRoles(user).includes("admin"));
  const { requestId } = useParams();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get("user");
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => tabs.includes(searchParams.get("tab")) ? searchParams.get("tab") : "Access Requests");
  const requestedTab = searchParams.get("tab");
  const [manager, setManager] = useState(false);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [resource, setResource] = useState(null);
  const [resourceDirty, setResourceDirty] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [newRequest, setNewRequest] = useState({ resource_id: "", permissions: [], justification: "" });
  const [decisions, setDecisions] = useState({});
  const [reviewComment, setReviewComment] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [catalogResult, requestsResult, overviewResult, datasetsResult, meResult] = await Promise.allSettled([
      api.getCatalog(), api.getRequests(), api.getOverview(), api.getDiscoverableDatasets(), api.getMyPermissions(),
    ]);
    if (catalogResult.status === "fulfilled") setCatalog(list(catalogResult.value));
    if (requestsResult.status === "fulfilled") setRequests(list(requestsResult.value));
    if (datasetsResult.status === "fulfilled") setDatasets(list(datasetsResult.value));
    if (overviewResult.status === "fulfilled") { setManager(true); setBackendUnavailable(false); }
    else {
      setManager(false);
      setBackendUnavailable(overviewResult.reason?.response?.status === 404);
    }
    if (meResult.status === "fulfilled") {
      setCanReview(meResult.value.can_review_requests);
    }
  }, []);

  useEffect(() => { queueMicrotask(refresh); }, [refresh]);
  useEffect(() => {
    if (requestedTab && tabs.includes(requestedTab)) queueMicrotask(() => setTab(requestedTab));
  }, [requestedTab]);
  useEffect(() => {
    if (!manager || !targetUserId) return;
    queueMicrotask(() => {
      setTab("Users");
      api.getUser(targetUserId).then((value) => { setSelectedUser(value); setUserModalOpen(true); })
        .catch((err) => setError(message(err)));
    });
  }, [manager, targetUserId]);
  useEffect(() => {
    if (!requestId) return;
    api.getRequest(requestId).then((value) => {
      setSelectedRequest(value);
      setDecisions(Object.fromEntries(value.items.map((row) => [row.permission, { decision: "rejected", reason: "", expires_at: "" }])));
      setTab(value.kind === "permission" ? "Access Requests" : "Group Requests");
    }).catch(() => setError("Request not found or unavailable."));
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
      api.getUsers({ q: filter.trim() }).then((value) => setUsers(list(value)))
        .catch((err) => setError(message(err)));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [manager, filter]);

  const perform = async (action, success) => {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(success); await refresh(); window.dispatchEvent(new Event("ordp:permissions-changed")); }
    catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  };
  const selectUser = async (id) => { try { setSelectedUser(await api.getUser(id)); setUserModalOpen(true); } catch (err) { setError(message(err)); } };
  const grantSelected = async (grants) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await api.grantUserBulk(selectedUser.id, grants);
      setSelectedUser(await api.getUser(selectedUser.id));
      setNotice("Permissions granted.");
      window.dispatchEvent(new Event("ordp:permissions-changed"));
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally { setBusy(false); }
  };
  const revokeSelected = (grantId) => {
    if (!window.confirm("Revoke this direct permission?")) return;
    perform(async () => {
      await api.revokeUserGrant(grantId);
      setSelectedUser(await api.getUser(selectedUser.id));
    }, "Permission revoked.");
  };
  const refreshGroups = async () => { setGroups(list(await api.getGroups())); };
  const selectRequest = (item) => {
    setSelectedRequest(item);
    setDecisions(Object.fromEntries(item.items.map((row) => [row.permission, { decision: "rejected", reason: "", expires_at: "" }])));
    navigate(`/access-management/requests/${item.id}`);
  };
  const filteredUsers = useMemo(() => users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(filter.toLowerCase())), [users, filter]);
  const visibleRequests = useMemo(() => requests.filter((r) => r.kind === "permission" && (statusFilter === "all" || r.status === statusFilter)), [requests, statusFilter]);
  const saveMatrix = async (edits) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await api.saveResourceMatrix("dataset", resource.resource.id, edits);
      setResource(await api.getResourceAccess("dataset", resource.resource.id));
      setNotice("Permissions saved.");
      return true;
    } catch (err) {
      setError(message(err));
      return false;
    } finally { setBusy(false); }
  };

  return <DashboardShell title="Access Management" subtitle="Manage permissions and access requests">
    <div className="mx-auto max-w-7xl">
      {userModalOpen && selectedUser && <UserPermissionsModal key={selectedUser.id} user={selectedUser} catalog={catalog} datasets={datasets} busy={busy} error={error}
        onClose={() => { setUserModalOpen(false); setError(""); if (targetUserId) navigate("/access-management?tab=Users", { replace: true }); }}
        onGrant={grantSelected} onRevoke={revokeSelected} />}
      <Notice text={error} error /><Notice text={notice} />
      {tab === "Users" && !manager && <div className="rounded-xl border border-amber-200 bg-white p-6"><h2 className="text-lg font-semibold text-slate-900">User access management</h2><p className="mt-2 text-sm text-slate-600">{backendUnavailable ? "Permission management is not available on this backend yet. Deploy the backend access-control changes first." : "Access denied. You don't have permission to manage user permissions. Ask a permission manager to grant access to your account."}</p></div>}
      {tab === "Group Requests" && <GroupRequestsPanel requests={requests} catalog={catalog} datasets={datasets} canReview={canReview} user={user} onChanged={refresh} openRequestId={requestId} allowSelfRequests={!adminAccount} />}
      {tab === "Users" && manager && adminAccount && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-900">User permissions</h2><p className="mt-2 text-sm text-slate-600">Open Admin Users to find an account and manage its permissions beside the user's email.</p><button type="button" className={`${primary} mt-4`} onClick={() => navigate("/admin-dashboard?tab=users")}>Open Admin Users</button></section>}
      {tab === "Users" && manager && !adminAccount && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-xl font-semibold text-slate-900">Give a user access</h2><p className="mt-1 text-sm text-slate-600">Find an account, then choose the actions they can perform.</p></div>
          <label className="relative block w-full max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input aria-label="Search users by name or email" placeholder="Search name or email" className={`${input} pl-9`} value={filter} onChange={(e) => setFilter(e.target.value)} /></label>
        </div>
        <div className="mt-5 divide-y divide-slate-100">
          {filteredUsers.length ? filteredUsers.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0"><p className="font-semibold text-slate-900">{account.name}</p><p className="break-all text-sm text-slate-500">{account.email}</p><p className="text-xs text-slate-500">{account.is_active ? "Active" : "Inactive"} · {account.groups.length} groups · {account.direct_count} direct permissions</p></div>
            <button type="button" onClick={() => selectUser(account.id)} className={primary}><ShieldCheck size={16} /> Manage access</button>
          </div>) : <p className="py-8 text-center text-sm text-slate-500">No matching users found.</p>}
        </div>
      </section>}      {tab === "Groups" && manager && <GroupsPanel users={users} groups={groups} catalog={catalog} datasets={datasets} onGroupsChanged={refreshGroups} />}
      {tab === "Access Requests" && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]"><div><Section title={adminAccount ? "Incoming requests" : "Requests"} actions={<select aria-label="Request status" className={input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{["pending", "approved", "partially_approved", "rejected", "cancelled", "all"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select>}><div className="divide-y divide-slate-100">{visibleRequests.length ? visibleRequests.map((r) => <button type="button" key={r.id} onClick={() => selectRequest(r)} className="block w-full py-3 text-left hover:bg-slate-50"><strong className="text-sm">{r.requester_name || r.requester_email}</strong><div className="text-xs text-slate-500">{r.resource_type} · {r.items.map((i) => i.name).join(", ")} · {r.status.replaceAll("_", " ")} · {date(r.created_at)}</div></button>) : <p className="py-4 text-sm text-slate-500">No requests in this view.</p>}</div></Section>{!adminAccount && <Section title="Request access"><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); perform(async () => { await api.createRequest({ resource_type: "dataset", ...newRequest }); setNewRequest({ resource_id: "", permissions: [], justification: "" }); }, "Request sent."); }}><label className="block text-xs font-medium">Dataset<select required className={input} value={newRequest.resource_id} onChange={(e) => setNewRequest((v) => ({ ...v, resource_id: e.target.value }))}><option value="">Select a dataset</option>{datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label><fieldset><legend className="text-xs font-medium">Permissions needed</legend><div className="flex flex-wrap gap-3 py-2">{catalog.filter((p) => p.resource_type === "dataset" && p.enforced).map((p) => <label key={p.code} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={newRequest.permissions.includes(p.code)} onChange={(e) => setNewRequest((v) => ({ ...v, permissions: e.target.checked ? [...v.permissions, p.code] : v.permissions.filter((x) => x !== p.code) }))} />{p.name}</label>)}</div></fieldset><label className="block text-xs font-medium">Justification<textarea required minLength={10} className={input} value={newRequest.justification} onChange={(e) => setNewRequest((v) => ({ ...v, justification: e.target.value }))} /></label><button type="submit" className={primary} disabled={busy || !newRequest.permissions.length}>Send request</button></form></Section>}</div><div>{selectedRequest && <><Section title="Request details" actions={selectedRequest.status === "pending" && selectedRequest.requester === user?.id ? <button className={secondary} onClick={() => { if (window.confirm("Cancel this request?")) perform(async () => { await api.cancelRequest(selectedRequest.id); setSelectedRequest(null); navigate("/access-management"); }, "Request cancelled."); }}>Cancel request</button> : null}><p className="text-sm">{selectedRequest.requester_email} · {selectedRequest.status.replaceAll("_", " ")}</p><p className="mt-2 text-sm text-slate-600">{selectedRequest.justification}</p>{selectedRequest.review_comment && <p className="mt-2 text-sm text-slate-600">Reviewer: {selectedRequest.review_comment}</p>}</Section><Section title="Requested permissions">{selectedRequest.items.map((item) => <div key={item.permission} className="border-b border-slate-100 py-2 text-sm"><span className="font-medium">{item.name}</span><span className="ml-2 text-slate-500">{item.decision}</span>{item.reason && <div className="text-xs text-slate-500">{item.reason}</div>}</div>)}</Section>{canReview && selectedRequest.status === "pending" && <Section title="Review request"><div className="space-y-4">{selectedRequest.items.map((item) => <div key={item.permission} className="border-b border-slate-100 pb-3"><strong className="text-sm">{item.name}</strong><div className="mt-2 flex gap-3">{["approved", "rejected"].map((decision) => <label key={decision} className="flex items-center gap-1 text-sm"><input type="radio" name={item.permission} checked={decisions[item.permission]?.decision === decision} onChange={() => setDecisions((v) => ({ ...v, [item.permission]: { ...v[item.permission], decision } }))} />{decision}</label>)}</div>{decisions[item.permission]?.decision === "approved" && <input type="datetime-local" aria-label={`Expiration for ${item.name}`} className={`${input} mt-2`} value={decisions[item.permission]?.expires_at || ""} onChange={(e) => setDecisions((v) => ({ ...v, [item.permission]: { ...v[item.permission], expires_at: e.target.value } }))} />}<input aria-label={`Reason for ${item.name}`} className={`${input} mt-2`} placeholder="Decision reason" value={decisions[item.permission]?.reason || ""} onChange={(e) => setDecisions((v) => ({ ...v, [item.permission]: { ...v[item.permission], reason: e.target.value } }))} /></div>)}<textarea aria-label="Review comment" className={input} placeholder="Comment to requester" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} /><button type="button" className={primary} disabled={busy || selectedRequest.requester === user?.id} onClick={() => { const approved = Object.entries(decisions).filter(([, v]) => v.decision === "approved").map(([k]) => k); if (approved.some((k) => /delete|permission|manage/.test(k)) && !window.confirm("This grants a high-impact permission. Continue?")) return; perform(async () => { await api.reviewRequest(selectedRequest.id, { decisions: Object.entries(decisions).map(([permission, row]) => ({ permission, ...row, expires_at: row.expires_at || null })), comment: reviewComment }); setSelectedRequest(null); navigate("/access-management"); }, "Decision recorded."); }}><Check size={15} /> Submit decision</button></div></Section>}</>}</div></div>}
      {tab === "Resources & Permissions" && manager && <Section title="Dataset access"><div className="max-w-lg"><select aria-label="Select resource" className={input} value={resource?.resource?.id || ""} onChange={(e) => { if (resourceDirty && !window.confirm("Discard unsaved permission changes?")) return; perform(async () => { setResource(e.target.value ? await api.getResourceAccess("dataset", e.target.value) : null); }, ""); }}><option value="">Select a dataset</option>{datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></div>{resource && <div className="mt-5"><PermissionMatrix key={resource.resource.id} resource={resource} users={users} groups={groups} catalog={catalog} onSave={saveMatrix} onDirtyChange={setResourceDirty} disabled={busy} /></div>}</Section>}
      {tab === "Permission Catalog" && <PermissionCatalog catalog={catalog} />}
    </div>
  </DashboardShell>;
}
