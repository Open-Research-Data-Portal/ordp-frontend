import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, Plus, Search, Trash2, X } from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import PermissionMatrix from "../components/PermissionMatrix";
import { useAuth } from "../context/useAuth";
import * as api from "../api/accessControl";

const tabs = ["Overview", "Users", "Groups", "Access Requests", "Resources & Permissions", "Permission Catalog", "Audit History"];
const input = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none";
const primary = "inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50";
const secondary = "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50";
const list = (value) => Array.isArray(value) ? value : value?.results || [];
const message = (err) => err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || "The request could not be completed.";
const date = (value) => value ? new Date(value).toLocaleDateString() : "No expiry";

function Section({ title, actions, children }) {
  return <section className="border-b border-slate-200 py-5 first:pt-0 last:border-0"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold text-slate-900">{title}</h2>{actions}</div>{children}</section>;
}

function Notice({ text, error }) {
  return text ? <p role="status" className={`mb-4 rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{text}</p> : null;
}

function GrantList({ items, onRevoke, inherited = false }) {
  if (!items?.length) return <p className="text-sm text-slate-500">No permissions here.</p>;
  return <div className="divide-y divide-slate-100 border-y border-slate-100">{items.map((item) => (
    <div key={item.id || `${item.code}-${item.resource_id}`} className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="min-w-0"><div className="font-medium text-slate-900">{item.code || item.permission}</div><div className="break-all text-xs text-slate-500">{item.resource_type}{item.resource_id ? ` · ${item.resource_id}` : ""} · {date(item.expires_at)}{inherited && item.group_name ? ` · ${item.group_name}` : ""}</div></div>
      {onRevoke && <button type="button" className={secondary} title="Revoke this direct grant" onClick={() => onRevoke(item.id)}><Trash2 size={15} /><span className="sr-only">Revoke</span></button>}
    </div>
  ))}</div>;
}

function GrantForm({ catalog, onSubmit, disabled }) {
  const [scope, setScope] = useState("dataset");
  const [resourceId, setResourceId] = useState("");
  const [permission, setPermission] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const choices = catalog.filter((p) => p.resource_type === scope);
  const submit = async (e) => {
    e.preventDefault();
    await onSubmit({ permission, resource_type: scope, resource_id: scope === "platform" ? null : resourceId, expires_at: expiresAt || null, reason });
    setPermission(""); setReason("");
  };
  return <form onSubmit={submit} className="grid gap-3 rounded-md border border-slate-200 p-4 sm:grid-cols-2">
    <label className="text-xs font-medium text-slate-600">Scope<select className={input} value={scope} onChange={(e) => { setScope(e.target.value); setPermission(""); }}><option value="dataset">Dataset</option><option value="platform">Platform</option></select></label>
    <label className="text-xs font-medium text-slate-600">Permission<select required className={input} value={permission} onChange={(e) => setPermission(e.target.value)}><option value="">Select permission</option>{choices.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
    {scope !== "platform" && <label className="text-xs font-medium text-slate-600">Resource ID<input required className={input} value={resourceId} onChange={(e) => setResourceId(e.target.value)} placeholder="Dataset or file ID" /></label>}
    <label className="text-xs font-medium text-slate-600">Expires on<input type="datetime-local" className={input} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label>
    <label className="text-xs font-medium text-slate-600 sm:col-span-2">Reason<input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this access needed?" /></label>
    <button type="submit" className={primary} disabled={disabled || !permission}><Plus size={15} /> Grant permission</button>
  </form>;
}

export default function AccessManagementPage() {
  const { user } = useAuth();
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Access Requests");
  const [manager, setManager] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [overview, setOverview] = useState(null);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [audit, setAudit] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [resource, setResource] = useState(null);
  const [resourceDirty, setResourceDirty] = useState(false);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [newGroup, setNewGroup] = useState({ name: "", description: "" });
  const [newMember, setNewMember] = useState("");
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
    if (overviewResult.status === "fulfilled") { setOverview(overviewResult.value); setManager(true); }
    else setManager(false);
    if (meResult.status === "fulfilled") setCanReview(meResult.value.can_review_requests);
  }, []);

  useEffect(() => { queueMicrotask(refresh); }, [refresh]);
  useEffect(() => {
    if (!requestId) return;
    api.getRequest(requestId).then((value) => {
      setSelectedRequest(value);
      setDecisions(Object.fromEntries(value.items.map((row) => [row.permission, { decision: "rejected", reason: "", expires_at: "" }])));
      setTab("Access Requests");
    }).catch(() => setError("Request not found or unavailable."));
  }, [requestId]);
  useEffect(() => {
    if (!manager) return;
    Promise.allSettled([api.getUsers(), api.getGroups(), api.getAudit()]).then(([u, g, a]) => {
      if (u.status === "fulfilled") setUsers(list(u.value));
      if (g.status === "fulfilled") setGroups(list(g.value));
      if (a.status === "fulfilled") setAudit(list(a.value));
    });
  }, [manager]);

  const perform = async (action, success) => {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(success); await refresh(); }
    catch (err) { setError(message(err)); }
    finally { setBusy(false); }
  };
  const selectUser = async (id) => { try { setSelectedUser(await api.getUser(id)); } catch (err) { setError(message(err)); } };
  const selectGroup = async (id) => { try { setSelectedGroup(await api.getGroup(id)); } catch (err) { setError(message(err)); } };
  const selectRequest = (item) => {
    setSelectedRequest(item);
    setDecisions(Object.fromEntries(item.items.map((row) => [row.permission, { decision: "rejected", reason: "", expires_at: "" }])));
    navigate(`/access-management/requests/${item.id}`);
  };
  const filteredUsers = useMemo(() => users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(filter.toLowerCase())), [users, filter]);
  const visibleRequests = useMemo(() => requests.filter((r) => statusFilter === "all" || r.status === statusFilter), [requests, statusFilter]);
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
      <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200" role="tablist" aria-label="Access management views">
        {(manager ? tabs : ["Access Requests", "Permission Catalog"]).map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} onClick={() => { if (resourceDirty && !window.confirm("Discard unsaved permission changes?")) return; setTab(name); }} className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === name ? "border-amber-600 text-slate-900" : "border-transparent text-slate-600 hover:text-slate-900"}`}>{name}</button>)}
      </div>
      <Notice text={error} error /><Notice text={notice} />
      {tab === "Overview" && manager && <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Users", overview?.total_users], ["Active users", overview?.active_users], ["Groups", overview?.total_groups], ["Pending requests", overview?.pending_requests], ["Direct grants", overview?.active_direct_grants], ["Group grants", overview?.active_group_grants]].map(([label, value]) => <div key={label} className="border-b border-slate-200 py-3"><div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-semibold text-slate-900">{value ?? "-"}</div></div>)}</div><Section title="Recent permission changes">{audit.slice(0, 8).map((row) => <div key={row.id} className="border-b border-slate-100 py-2 text-sm"><strong>{row.action}</strong> · {row.actor || "System"} · {date(row.timestamp)}</div>)}</Section></div>}
      {tab === "Users" && manager && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]"><Section title="Users" actions={<label className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Search users" className={`${input} pl-8`} value={filter} onChange={(e) => setFilter(e.target.value)} /></label>}><div className="divide-y divide-slate-100">{filteredUsers.map((u) => <button type="button" key={u.id} onClick={() => selectUser(u.id)} className="flex w-full items-center justify-between gap-2 py-3 text-left hover:bg-slate-50"><span><strong className="block text-sm text-slate-900">{u.name}</strong><span className="text-xs text-slate-500">{u.email}</span></span><span className="text-xs text-slate-500">{u.is_active ? "Active" : "Inactive"} · {u.groups.length} groups</span></button>)}</div></Section><div>{selectedUser ? <><Section title={selectedUser.name}><p className="text-sm text-slate-600">{selectedUser.email}</p></Section><Section title="Direct permissions"><GrantList items={selectedUser.direct} onRevoke={(id) => { if (window.confirm("Revoke this direct permission?")) perform(async () => { await api.revokeUserGrant(id); await selectUser(selectedUser.id); }, "Permission revoked."); }} /><div className="mt-4"><GrantForm catalog={catalog} disabled={busy} onSubmit={(payload) => perform(async () => { await api.grantUser(selectedUser.id, payload); await selectUser(selectedUser.id); }, "Permission granted.")} /></div></Section><Section title="Inherited permissions"><GrantList inherited items={selectedUser.effective.flatMap((p) => p.sources.filter((s) => s.type === "group").map((s) => ({ ...p, ...s }))) } /></Section><Section title="Effective permissions"><GrantList items={selectedUser.effective.map((p) => ({ ...p, id: `${p.code}-${p.resource_id}`, expires_at: p.sources.map((s) => s.expires_at).filter(Boolean)[0] }))} /></Section></> : <p className="text-sm text-slate-500">Select a user to see their access.</p>}</div></div>}
      {tab === "Groups" && manager && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]"><div><Section title="Groups"><div className="divide-y divide-slate-100">{groups.map((g) => <button type="button" key={g.id} onClick={() => selectGroup(g.id)} className="flex w-full items-center justify-between py-3 text-left hover:bg-slate-50"><span><strong className="block text-sm">{g.name}</strong><span className="text-xs text-slate-500">{g.description}</span></span><span className="text-xs text-slate-500">{g.member_count} members · {g.permission_count} grants</span></button>)}</div></Section><Section title="Create group"><form onSubmit={(e) => { e.preventDefault(); perform(async () => { await api.createGroup(newGroup); setGroups(list(await api.getGroups())); setNewGroup({ name: "", description: "" }); }, "Group created."); }} className="space-y-2"><input required aria-label="Group name" className={input} placeholder="Group name" value={newGroup.name} onChange={(e) => setNewGroup((v) => ({ ...v, name: e.target.value }))} /><textarea aria-label="Description" className={input} placeholder="Description" value={newGroup.description} onChange={(e) => setNewGroup((v) => ({ ...v, description: e.target.value }))} /><button className={primary} disabled={busy}><Plus size={15} /> Create</button></form></Section></div><div>{selectedGroup ? <><Section title={selectedGroup.group.name} actions={<button type="button" className={secondary} onClick={() => { if (window.confirm("Archive this group? Members will lose inherited access.")) perform(async () => { await api.archiveGroup(selectedGroup.group.id); setGroups(list(await api.getGroups())); setSelectedGroup(null); }, "Group archived."); }}>Archive</button>}><p className="text-sm text-slate-600">{selectedGroup.group.description}</p></Section><Section title="Members"><div className="space-y-2">{selectedGroup.members.map((m) => <div key={m.user_id} className="flex justify-between text-sm"><span>{m.user__email}</span><button type="button" title="Remove member" onClick={() => { if (window.confirm("Remove this member?")) perform(async () => { await api.removeMember(selectedGroup.group.id, m.user_id); await selectGroup(selectedGroup.group.id); }, "Member removed."); }}><X size={16} /></button></div>)}</div><form onSubmit={(e) => { e.preventDefault(); perform(async () => { await api.addMember(selectedGroup.group.id, newMember); await selectGroup(selectedGroup.group.id); setNewMember(""); }, "Member added."); }} className="mt-3 flex gap-2"><select aria-label="Add member" required className={input} value={newMember} onChange={(e) => setNewMember(e.target.value)}><option value="">Select a user</option>{users.filter((u) => !selectedGroup.members.some((m) => m.user_id === u.id)).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}</select><button className={primary} disabled={busy}><Plus size={15} /></button></form></Section><Section title="Group permissions"><GrantList items={selectedGroup.grants} onRevoke={(id) => { if (window.confirm("Revoke this group permission?")) perform(async () => { await api.revokeGroupGrant(id); await selectGroup(selectedGroup.group.id); }, "Group permission revoked."); }} /><div className="mt-4"><GrantForm catalog={catalog} disabled={busy} onSubmit={(payload) => perform(async () => { await api.grantGroup(selectedGroup.group.id, payload); await selectGroup(selectedGroup.group.id); }, "Group permission granted.")} /></div></Section></> : <p className="text-sm text-slate-500">Select a group to manage members and permissions.</p>}</div></div>}
      {tab === "Access Requests" && <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]"><div><Section title="Requests" actions={<select aria-label="Request status" className={input} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{["pending", "approved", "partially_approved", "rejected", "cancelled", "all"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}</select>}><div className="divide-y divide-slate-100">{visibleRequests.length ? visibleRequests.map((r) => <button type="button" key={r.id} onClick={() => selectRequest(r)} className="block w-full py-3 text-left hover:bg-slate-50"><strong className="text-sm">{r.requester_name || r.requester_email}</strong><div className="text-xs text-slate-500">{r.resource_type} · {r.items.map((i) => i.name).join(", ")} · {r.status.replaceAll("_", " ")} · {date(r.created_at)}</div></button>) : <p className="py-4 text-sm text-slate-500">No requests in this view.</p>}</div></Section><Section title="Request access"><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); perform(async () => { await api.createRequest({ resource_type: "dataset", ...newRequest }); setNewRequest({ resource_id: "", permissions: [], justification: "" }); }, "Request sent."); }}><label className="block text-xs font-medium">Dataset<select required className={input} value={newRequest.resource_id} onChange={(e) => setNewRequest((v) => ({ ...v, resource_id: e.target.value }))}><option value="">Select a dataset</option>{datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label><fieldset><legend className="text-xs font-medium">Permissions needed</legend><div className="flex flex-wrap gap-3 py-2">{catalog.filter((p) => p.resource_type === "dataset").map((p) => <label key={p.code} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={newRequest.permissions.includes(p.code)} onChange={(e) => setNewRequest((v) => ({ ...v, permissions: e.target.checked ? [...v.permissions, p.code] : v.permissions.filter((x) => x !== p.code) }))} />{p.name}</label>)}</div></fieldset><label className="block text-xs font-medium">Justification<textarea required minLength={10} className={input} value={newRequest.justification} onChange={(e) => setNewRequest((v) => ({ ...v, justification: e.target.value }))} /></label><button type="submit" className={primary} disabled={busy || !newRequest.permissions.length}>Send request</button></form></Section></div><div>{selectedRequest && <><Section title="Request details" actions={selectedRequest.status === "pending" && selectedRequest.requester === user?.id ? <button className={secondary} onClick={() => { if (window.confirm("Cancel this request?")) perform(async () => { await api.cancelRequest(selectedRequest.id); setSelectedRequest(null); navigate("/access-management"); }, "Request cancelled."); }}>Cancel request</button> : null}><p className="text-sm">{selectedRequest.requester_email} · {selectedRequest.status.replaceAll("_", " ")}</p><p className="mt-2 text-sm text-slate-600">{selectedRequest.justification}</p>{selectedRequest.review_comment && <p className="mt-2 text-sm text-slate-600">Reviewer: {selectedRequest.review_comment}</p>}</Section><Section title="Requested permissions">{selectedRequest.items.map((item) => <div key={item.permission} className="border-b border-slate-100 py-2 text-sm"><span className="font-medium">{item.name}</span><span className="ml-2 text-slate-500">{item.decision}</span>{item.reason && <div className="text-xs text-slate-500">{item.reason}</div>}</div>)}</Section>{canReview && selectedRequest.status === "pending" && <Section title="Review request"><div className="space-y-4">{selectedRequest.items.map((item) => <div key={item.permission} className="border-b border-slate-100 pb-3"><strong className="text-sm">{item.name}</strong><div className="mt-2 flex gap-3">{["approved", "rejected"].map((decision) => <label key={decision} className="flex items-center gap-1 text-sm"><input type="radio" name={item.permission} checked={decisions[item.permission]?.decision === decision} onChange={() => setDecisions((v) => ({ ...v, [item.permission]: { ...v[item.permission], decision } }))} />{decision}</label>)}</div>{decisions[item.permission]?.decision === "approved" && <input type="datetime-local" aria-label={`Expiration for ${item.name}`} className={`${input} mt-2`} value={decisions[item.permission]?.expires_at || ""} onChange={(e) => setDecisions((v) => ({ ...v, [item.permission]: { ...v[item.permission], expires_at: e.target.value } }))} />}<input aria-label={`Reason for ${item.name}`} className={`${input} mt-2`} placeholder="Decision reason" value={decisions[item.permission]?.reason || ""} onChange={(e) => setDecisions((v) => ({ ...v, [item.permission]: { ...v[item.permission], reason: e.target.value } }))} /></div>)}<textarea aria-label="Review comment" className={input} placeholder="Comment to requester" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} /><button type="button" className={primary} disabled={busy || selectedRequest.requester === user?.id} onClick={() => { const approved = Object.entries(decisions).filter(([, v]) => v.decision === "approved").map(([k]) => k); if (approved.some((k) => /delete|permission|manage/.test(k)) && !window.confirm("This grants a high-impact permission. Continue?")) return; perform(async () => { await api.reviewRequest(selectedRequest.id, { decisions: Object.entries(decisions).map(([permission, row]) => ({ permission, ...row, expires_at: row.expires_at || null })), comment: reviewComment }); setSelectedRequest(null); navigate("/access-management"); }, "Decision recorded."); }}><Check size={15} /> Submit decision</button></div></Section>}</>}</div></div>}
      {tab === "Resources & Permissions" && manager && <Section title="Dataset access"><div className="max-w-lg"><select aria-label="Select resource" className={input} value={resource?.resource?.id || ""} onChange={(e) => { if (resourceDirty && !window.confirm("Discard unsaved permission changes?")) return; perform(async () => { setResource(e.target.value ? await api.getResourceAccess("dataset", e.target.value) : null); }, ""); }}><option value="">Select a dataset</option>{datasets.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></div>{resource && <div className="mt-5"><PermissionMatrix key={resource.resource.id} resource={resource} users={users} groups={groups} catalog={catalog} onSave={saveMatrix} onDirtyChange={setResourceDirty} disabled={busy} /></div>}</Section>}
      {tab === "Permission Catalog" && <Section title="Available permissions"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{catalog.map((p) => <div key={p.code} className="border-b border-slate-200 py-2"><div className="text-sm font-medium text-slate-900">{p.name}</div><div className="text-xs text-slate-500">{p.resource_type} · {p.code}</div></div>)}</div></Section>}
      {tab === "Audit History" && manager && <Section title="Permission history"><div className="divide-y divide-slate-100">{audit.map((a) => <div key={a.id} className="flex flex-wrap justify-between gap-1 py-2 text-sm"><span><strong>{a.action}</strong> · {a.actor || "System"} · {a.target_user || a.target_group || ""}</span><span className="text-slate-500">{date(a.timestamp)}</span></div>)}</div></Section>}
    </div>
  </DashboardShell>;
}
