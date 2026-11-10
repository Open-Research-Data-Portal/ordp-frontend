import { useEffect, useMemo, useState } from "react";
import * as api from "../api/accessControl";
import GroupCreationWizard from "./GroupCreationWizard";
import { accessError } from "../utils/accessError";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none";
const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50";
const tabs = ["Members", "Permissions", "Resources", "Activity"];
const errorMessage = (error) => accessError(error, "Could not complete this change.");

export default function GroupsPanel({ users, groups, catalog, datasets = [], projects = [], collections = [], onGroupsChanged }) {
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("Members");
  const [access, setAccess] = useState(new Set());
  const [activity, setActivity] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOptions, setMemberOptions] = useState(users);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [permission, setPermission] = useState("");
  const [scope, setScope] = useState("dataset");
  const [resourceId, setResourceId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.getMyPermissions().then((me) =>
      setAccess(new Set(me.effective.filter((item) => item.resource_type === "platform").map((item) => item.code)))
    ).catch(() => setAccess(new Set()));
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      api.getUsers({ q: memberSearch.trim() })
        .then((rows) => { if (active) setMemberOptions(Array.isArray(rows) ? rows : []); })
        .catch((requestError) => { if (active) setError(errorMessage(requestError)); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [memberSearch]);

  const can = (code) => access.has(code);
  const availableMembers = useMemo(() => memberOptions.filter((user) =>
    !detail?.members.some((member) => member.user_id === user.id)
    && `${user.name} ${user.email}`.toLowerCase().includes(memberSearch.toLowerCase())
  ), [memberOptions, detail, memberSearch]);
  const scopePermissions = catalog.filter((item) => item.resource_type === scope && item.enforced);

  const loadGroup = async (id) => {
    const result = await api.getGroup(id);
    setSelectedId(id);
    setDetail(result);
    setName(result.group.name);
    setDescription(result.group.description || "");
  };

  const run = async (action, success, refreshSelected = true) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (selectedId && refreshSelected) await loadGroup(selectedId);
      await onGroupsChanged();
      window.dispatchEvent(new Event("ordp:permissions-changed"));
      setNotice(success);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const addMembers = () => run(async () => {
    for (const id of selectedMembers) await api.addMember(selectedId, id);
    setSelectedMembers([]);
  }, "Members added.");

  const grant = (event) => {
    event.preventDefault();
    run(async () => {
      await api.grantGroup(selectedId, {
        permission,
        resource_type: scope,
        resource_id: scope === "platform" ? null : resourceId,
        expires_at: expiresAt || null,
        reason,
      });
      setPermission("");
      setReason("");
    }, "Group permission granted.");
  };

  const changeTab = (next) => {
    setTab(next);
    if (next === "Activity" && selectedId) {
      api.getGroupActivity(selectedId).then(setActivity).catch((requestError) => setError(errorMessage(requestError)));
    }
  };

  return <div className="grid gap-6 lg:grid-cols-[minmax(300px,1fr)_minmax(360px,1.3fr)]">
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Groups</h2>
        {groups.length ? groups.map((group) =>
          <button type="button" key={group.id} className={`mt-3 block w-full rounded-lg border p-3 text-left ${selectedId === group.id ? "border-amber-600 bg-amber-50" : "border-slate-200"}`} onClick={() => loadGroup(group.id).catch((requestError) => setError(errorMessage(requestError)))}>
            <strong className="block text-sm">{group.name}</strong>
            <span className="block text-xs text-slate-600">{group.description}</span>
            <span className="block text-xs text-slate-500">{group.member_count} members · {group.permission_count} permissions · Updated {new Date(group.updated_at).toLocaleDateString()}</span>
          </button>
        ) : <p className="mt-3 text-sm text-slate-500">No groups yet.</p>}
      </section>
      {can("group.create") && <GroupCreationWizard users={users} catalog={catalog} datasets={datasets} projects={projects} collections={collections} onCreated={onGroupsChanged} />}
    </div>
    <div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {!detail ? <p className="text-sm text-slate-500">Select a group to view its members and permissions.</p> :
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-slate-900">{detail.group.name}</h2><p className="text-sm text-slate-600">{detail.group.description}</p></div>
            {can("group.delete") && <button type="button" className={button} disabled={busy} onClick={() => {
              if (!window.confirm("Archive this group? Members will lose inherited access.")) return;
              run(async () => {
                await api.archiveGroup(selectedId);
                setSelectedId("");
                setDetail(null);
              }, "Group archived.", false);
            }}>Archive group</button>}
          </div>
          {can("group.edit") && <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            run(() => api.updateGroup(selectedId, { name, description }), "Group updated.");
          }}>
            <label className="text-xs font-medium">Name<input required className={field} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="text-xs font-medium">Description<input className={field} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <button type="submit" disabled={busy} className={button}>Save group details</button>
          </form>}
          <div role="tablist" aria-label="Group details" className="mt-5 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
            {tabs.map((name) => <button key={name} type="button" role="tab" aria-selected={tab === name} className={`rounded-lg px-3 py-2 text-sm ${tab === name ? "bg-amber-100 font-semibold text-amber-900" : "text-slate-600"}`} onClick={() => changeTab(name)}>{name}</button>)}
          </div>
          {tab === "Members" && <div className="mt-4 space-y-3">
            {detail.members.map((member) => <div key={member.user_id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm">
              <span>{member.user__email}</span>
              {can("group.member.manage") && <button type="button" className={button} disabled={busy} onClick={() => {
                if (!window.confirm("Remove this member and their inherited group access?")) return;
                run(() => api.removeMember(selectedId, member.user_id), "Member removed.");
              }}>Remove</button>}
            </div>)}
            {!detail.members.length && <p className="text-sm text-slate-500">No members yet.</p>}
            {can("group.member.manage") && <>
              <label className="block text-sm font-medium">Find users<input className={field} value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} /></label>
              <div className="max-h-44 space-y-2 overflow-y-auto">{availableMembers.map((user) =>
                <label key={user.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedMembers.includes(user.id)}
                  onChange={(event) => setSelectedMembers((current) => event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id))} />
                  {user.name} <span className="text-slate-500">{user.email}</span>
                </label>)}</div>
              <button type="button" className={button} disabled={!selectedMembers.length || busy} onClick={addMembers}>Add selected members ({selectedMembers.length})</button>
            </>}
          </div>}
          {tab === "Permissions" && <div className="mt-4 space-y-3">
            {detail.grants.map((grant) => <div key={grant.id} className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 text-sm">
              <span>{grant.permission} · {grant.resource_type}{grant.resource_id ? ` · ${grant.resource_id}` : ""}{grant.expires_at ? ` · Expires ${new Date(grant.expires_at).toLocaleDateString()}` : ""}</span>
              {can("group.permission.manage") && <button type="button" className={button} disabled={busy} onClick={() => {
                if (!window.confirm("Revoke this group permission?")) return;
                run(() => api.revokeGroupGrant(grant.id), "Permission revoked.");
              }}>Revoke</button>}
            </div>)}
            {!detail.grants.length && <p className="text-sm text-slate-500">No active permissions.</p>}
            {can("group.permission.manage") && <form onSubmit={grant} className="space-y-2 rounded-lg border border-slate-200 p-3">
              <h3 className="text-sm font-semibold">Add permission</h3>
              <select className={field} value={scope} onChange={(event) => { setScope(event.target.value); setPermission(""); setResourceId(""); }}>
                <option value="dataset">Dataset</option>
                <option value="platform">Platform</option>
                <option value="project">Project</option>
                <option value="collection">Collection</option>
                <option value="dataset_file">Dataset file</option>
              </select>
              {scope === "dataset" && <select required className={field} value={resourceId} onChange={(event) => setResourceId(event.target.value)}><option value="">Select dataset</option>{datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.title}</option>)}</select>}
              {scope === "project" && <select required className={field} value={resourceId} onChange={(event) => setResourceId(event.target.value)}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>}
              {scope === "collection" && <select required className={field} value={resourceId} onChange={(event) => setResourceId(event.target.value)}><option value="">Select collection</option>{collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select>}
              {scope === "dataset_file" && <input required className={field} value={resourceId} onChange={(event) => setResourceId(event.target.value)} placeholder="Dataset file UUID" />}
              <select required className={field} value={permission} onChange={(event) => setPermission(event.target.value)}><option value="">Select permission</option>{scopePermissions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select>}
              <input type="datetime-local" aria-label="Expiry" className={field} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
              <input aria-label="Reason" placeholder="Reason (optional)" className={field} value={reason} onChange={(event) => setReason(event.target.value)} />
              <button type="submit" className={button} disabled={busy || !permission}>Grant permission</button>
            </form>}
          </div>}
          {tab === "Resources" && <div className="mt-4 space-y-2">
            {Object.entries(detail.grants.reduce((result, grant) => {
              const resource = grant.resource_type === "platform" ? "Platform" : datasets.find((dataset) => dataset.id === grant.resource_id)?.title || grant.resource_id;
              (result[resource] ||= []).push(grant);
              return result;
            }, {})).map(([resource, grants]) =>
              <div key={resource} className="rounded-lg border border-slate-200 p-3"><h3 className="text-sm font-semibold">{resource}</h3><p className="mt-1 text-xs text-slate-600">{grants.map((grant) => grant.permission).join(", ")}</p></div>)}
            {!detail.grants.length && <p className="text-sm text-slate-500">No resources assigned.</p>}
          </div>}
          {tab === "Activity" && <div className="mt-4 space-y-2">
            {activity.map((event) => <div key={event.id} className="border-b border-slate-100 py-2 text-sm">{event.action} · {event.actor || "System"} · {new Date(event.timestamp).toLocaleString()}</div>)}
            {!activity.length && <p className="text-sm text-slate-500">No activity available.</p>}
          </div>}
        </section>}
    </div>
  </div>;
}
