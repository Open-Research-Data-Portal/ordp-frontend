import { useEffect, useMemo, useState } from "react";
import * as api from "../api/accessControl";
import { accessError } from "../utils/accessError";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none";
const primary = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const secondary = "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800";
const describeError = (error) => accessError(error, "This request could not be completed.");

export default function GroupRequestsPanel({ requests, catalog, datasets, canReview, user, onChanged, openRequestId }) {
  const [groups, setGroups] = useState([]);
  const [canRequestGroupPermission, setCanRequestGroupPermission] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [kind, setKind] = useState("group_membership");
  const [groupId, setGroupId] = useState("");
  const [resourceType, setResourceType] = useState("dataset");
  const [resourceId, setResourceId] = useState("");
  const [permissionCodes, setPermissionCodes] = useState([]);
  const [justification, setJustification] = useState("");
  const [decisions, setDecisions] = useState({});
  const [membershipDecision, setMembershipDecision] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.allSettled([api.getGroupDirectory(), api.getMyPermissions()]).then(([directory, me]) => {
      if (directory.status === "fulfilled") setGroups(directory.value);
      if (me.status === "fulfilled") {
        setCanRequestGroupPermission(me.value.effective.some((permission) => permission.code === "group.permission.manage"));
      }
    });
  }, []);

  useEffect(() => {
    if (!openRequestId) return;
    api.getRequest(openRequestId).then((value) => {
      if (value.kind !== "permission") setSelected(value);
    }).catch(() => setError("This request is unavailable."));
  }, [openRequestId]);

  const groupRequests = useMemo(() => requests.filter((request) =>
    request.kind !== "permission" && (statusFilter === "all" || request.status === statusFilter)
  ), [requests, statusFilter]);
  const availableDatasets = datasets.filter((dataset) => dataset.status === "published" && dataset.visibility !== "private");
  const permissions = catalog.filter((permission) => permission.resource_type === resourceType && permission.enforced);

  const run = async (action, success) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await onChanged();
      setNotice(success);
      window.dispatchEvent(new Event("ordp:permissions-changed"));
    } catch (requestError) {
      setError(describeError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const sendRequest = (event) => {
    event.preventDefault();
    const body = kind === "group_membership"
      ? { kind, group: groupId, resource_type: "platform", resource_id: null, justification }
      : { kind, group: groupId, resource_type: resourceType,
          resource_id: resourceType === "platform" ? null : resourceId,
          permissions: permissionCodes, justification };
    run(async () => {
      await api.createRequest(body);
      setJustification("");
      setPermissionCodes([]);
    }, "Request sent.");
  };

  const selectRequest = (request) => {
    setSelected(request);
    setDecisions({});
    setMembershipDecision("");
    setComment("");
    setError("");
  };

  const submitDecision = () => {
    if (!selected) return;
    if (selected.kind === "group_membership" && !membershipDecision) {
      setError("Choose Approve or Reject.");
      return;
    }
    if (selected.kind === "group_permission" && selected.items.some((item) => !decisions[item.permission]?.decision)) {
      setError("Decide every requested permission.");
      return;
    }
    const highImpact = Object.entries(decisions).some(([code, value]) =>
      value.decision === "approved" && /delete|permission|manage/.test(code)
    );
    if (highImpact && !window.confirm("This grants a high-impact permission to the group. Continue?")) return;
    const body = selected.kind === "group_membership"
      ? { decision: membershipDecision, comment }
      : { decisions: selected.items.map((item) => ({
          permission: item.permission,
          decision: decisions[item.permission].decision,
          reason: decisions[item.permission].reason || "",
          expires_at: decisions[item.permission].expires_at || null,
        })), comment };
    run(async () => {
      await api.reviewRequest(selected.id, body);
      setSelected(null);
    }, "Decision recorded.");
  };

  return <div className="grid gap-6 lg:grid-cols-2">
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Group requests</h2>
          <select aria-label="Group request status" className={field} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {["pending", "approved", "partially_approved", "rejected", "cancelled", "expired", "all"].map((status) =>
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
        </div>
        {groupRequests.length ? groupRequests.map((request) =>
          <button type="button" key={request.id} onClick={() => selectRequest(request)}
            className="block w-full border-b border-slate-100 py-3 text-left last:border-0">
            <strong className="block text-sm text-slate-900">{request.group_name}</strong>
            <span className="text-xs text-slate-600">{request.requester_name || request.requester_email} · {request.kind === "group_membership" ? "Join group" : "Group permissions"} · {request.status.replaceAll("_", " ")}</span>
          </button>
        ) : <p className="py-3 text-sm text-slate-500">No group requests in this view.</p>}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Request group access</h2>
        <form onSubmit={sendRequest} className="space-y-3">
          <label className="block text-sm font-medium">Request type
            <select className={field} value={kind} onChange={(event) => { setKind(event.target.value); setPermissionCodes([]); }}>
              <option value="group_membership">Join a group</option>
              {canRequestGroupPermission && <option value="group_permission">More permissions for a group</option>}
            </select>
          </label>
          <label className="block text-sm font-medium">Group
            <select required className={field} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
              <option value="">Select a group</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          {kind === "group_permission" && <>
            <label className="block text-sm font-medium">Resource type
              <select className={field} value={resourceType} onChange={(event) => { setResourceType(event.target.value); setPermissionCodes([]); setResourceId(""); }}>
                <option value="dataset">Dataset</option>
                <option value="platform">Platform</option>
              </select>
            </label>
            {resourceType === "dataset" && <label className="block text-sm font-medium">Dataset
              <select required className={field} value={resourceId} onChange={(event) => setResourceId(event.target.value)}>
                <option value="">Select a dataset</option>
                {availableDatasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.title}</option>)}
              </select>
            </label>}
            <fieldset><legend className="text-sm font-medium">Permissions needed</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {permissions.map((permission) => <label key={permission.code} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={permissionCodes.includes(permission.code)}
                    onChange={(event) => setPermissionCodes((current) => event.target.checked
                      ? [...current, permission.code] : current.filter((code) => code !== permission.code))} />
                  {permission.name}
                </label>)}
              </div>
            </fieldset>
          </>}
          <label className="block text-sm font-medium">Why do you need this access?
            <textarea required minLength={10} className={field} value={justification} onChange={(event) => setJustification(event.target.value)} />
          </label>
          <button type="submit" className={primary} disabled={busy || !groupId || (kind === "group_permission" && !permissionCodes.length)}>Send request</button>
        </form>
      </section>
    </div>
    <div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {selected && <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">{selected.group_name}</h2>
        <p className="mt-1 text-sm text-slate-600">{selected.requester_email} · {selected.status.replaceAll("_", " ")}</p>
        <p className="mt-3 text-sm">{selected.justification}</p>
        {selected.review_comment && <p className="mt-2 text-sm text-slate-600">Reviewer: {selected.review_comment}</p>}
        {selected.items.map((item) => <p key={item.permission} className="mt-2 text-sm">{item.name} · {item.decision}</p>)}
        {selected.status === "pending" && selected.requester === user?.id &&
          <button type="button" className={secondary} onClick={() => run(async () => {
            await api.cancelRequest(selected.id); setSelected(null);
          }, "Request cancelled.")}>Cancel request</button>}
        {canReview && selected.status === "pending" && selected.requester !== user?.id &&
          <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
            {selected.kind === "group_membership"
              ? <fieldset><legend className="text-sm font-medium">Membership decision</legend>
                  {["approved", "rejected"].map((decision) =>
                    <label key={decision} className="mr-4 text-sm"><input type="radio" name="membership-decision" checked={membershipDecision === decision} onChange={() => setMembershipDecision(decision)} /> {decision}</label>)}
                </fieldset>
              : selected.items.map((item) => <div key={item.permission} className="border-b border-slate-100 pb-3">
                  <strong className="text-sm">{item.name}</strong>
                  <div className="mt-2 flex gap-4">{["approved", "rejected"].map((decision) =>
                    <label key={decision} className="text-sm"><input type="radio" name={item.permission}
                      checked={decisions[item.permission]?.decision === decision}
                      onChange={() => setDecisions((current) => ({ ...current, [item.permission]: { ...current[item.permission], decision } }))} /> {decision}</label>)}</div>
                  {decisions[item.permission]?.decision === "approved" && <input type="datetime-local" aria-label={`Expiry for ${item.name}`} className={field}
                    value={decisions[item.permission]?.expires_at || ""}
                    onChange={(event) => setDecisions((current) => ({ ...current, [item.permission]: { ...current[item.permission], expires_at: event.target.value } }))} />}
                  <input aria-label={`Reason for ${item.name}`} placeholder="Reason (optional)" className={field}
                    value={decisions[item.permission]?.reason || ""}
                    onChange={(event) => setDecisions((current) => ({ ...current, [item.permission]: { ...current[item.permission], reason: event.target.value } }))} />
                </div>)}
            <label className="block text-sm font-medium">Review comment<textarea className={field} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
            <button type="button" className={primary} disabled={busy} onClick={submitDecision}>Submit decision</button>
          </div>}
      </section>}
    </div>
  </div>;
}
