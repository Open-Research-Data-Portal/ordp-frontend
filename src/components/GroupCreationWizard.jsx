import { useEffect, useMemo, useState } from "react";
import * as api from "../api/accessControl";

const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none";
const action = "rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50";
const stepNames = ["Group information", "Add members", "Select resource", "Assign permissions", "Review"];

export default function GroupCreationWizard({ users, catalog, datasets, onCreated }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberOptions, setMemberOptions] = useState(users);
  const [resourceType, setResourceType] = useState("dataset");
  const [resourceId, setResourceId] = useState("");
  const [codes, setCodes] = useState([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      api.getUsers({ q: memberSearch.trim() })
        .then((rows) => { if (active) setMemberOptions(Array.isArray(rows) ? rows : []); })
        .catch(() => { if (active) setError("Could not search users."); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [memberSearch]);

  const visibleUsers = useMemo(() => memberOptions.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(memberSearch.toLowerCase())
  ), [memberOptions, memberSearch]);
  const permissions = catalog.filter((permission) => permission.resource_type === resourceType && permission.enforced);

  const next = () => {
    if (step === 0 && !name.trim()) {
      setError("Enter a group name.");
      return;
    }
    if (step === 2 && codes.length && resourceType === "dataset" && !resourceId) {
      setError("Select a dataset for these permissions.");
      return;
    }
    setError("");
    setStep((current) => Math.min(4, current + 1));
  };

  const create = async () => {
    if (codes.some((code) => /delete|permission|manage/.test(code))
      && !window.confirm("This group will receive high-impact permissions. Continue?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.createGroup({
        name: name.trim(),
        description: description.trim(),
        members: memberIds,
        grants: codes.map((code) => ({
          permission: code,
          resource_type: resourceType,
          resource_id: resourceType === "platform" ? null : resourceId,
          expires_at: expiresAt || null,
          reason,
        })),
      });
      setNotice("Group created.");
      setName("");
      setDescription("");
      setMemberIds([]);
      setResourceId("");
      setCodes([]);
      setExpiresAt("");
      setReason("");
      setStep(0);
      await onCreated();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail
        || requestError?.response?.data?.name?.[0]
        || requestError?.response?.data?.grants?.[0]?.non_field_errors?.[0]
        || "Could not create this group.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-base font-semibold text-slate-900">Create a group</h2>
    <p className="mt-1 text-sm text-slate-600">An empty group can receive members and permissions later.</p>
    <ol className="mt-4 flex flex-wrap gap-2" aria-label="Group creation steps">
      {stepNames.map((label, index) => <li key={label} className={`rounded-full px-2 py-1 text-xs ${index === step ? "bg-amber-100 font-semibold text-amber-900" : "bg-slate-100 text-slate-600"}`}>{index + 1}. {label}</li>)}
    </ol>
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    <div className="mt-5 space-y-3">
      {step === 0 && <>
        <label className="block text-sm font-medium">Group name
          <input required className={field} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">Description
          <textarea className={field} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
      </>}
      {step === 1 && <>
        <label className="block text-sm font-medium">Search users
          <input className={field} value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} />
        </label>
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {visibleUsers.map((user) => <label key={user.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={memberIds.includes(user.id)}
              onChange={(event) => setMemberIds((current) => event.target.checked
                ? [...current, user.id] : current.filter((id) => id !== user.id))} />
            {user.name} <span className="text-slate-500">{user.email}</span>
          </label>)}
        </div>
        <p className="text-xs text-slate-600">{memberIds.length} member{memberIds.length === 1 ? "" : "s"} selected</p>
      </>}
      {step === 2 && <>
        <label className="block text-sm font-medium">Resource type
          <select className={field} value={resourceType} onChange={(event) => { setResourceType(event.target.value); setResourceId(""); setCodes([]); }}>
            <option value="dataset">Dataset</option>
            <option value="platform">Platform</option>
          </select>
        </label>
        {resourceType === "dataset" && <label className="block text-sm font-medium">Dataset
          <select className={field} value={resourceId} onChange={(event) => setResourceId(event.target.value)}>
            <option value="">Select a dataset (optional for an empty group)</option>
            {datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.title}</option>)}
          </select>
        </label>}
      </>}
      {step === 3 && <>
        <fieldset><legend className="text-sm font-medium">Permissions</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {permissions.map((permission) => <label key={permission.code} className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={codes.includes(permission.code)}
                onChange={(event) => setCodes((current) => event.target.checked
                  ? [...current, permission.code] : current.filter((code) => code !== permission.code))} />
              <span>{permission.name}<span className="block text-xs text-slate-500">{permission.description || permission.code}</span></span>
            </label>)}
          </div>
        </fieldset>
        {codes.length > 0 && <>
          <label className="block text-sm font-medium">Expiry (optional)
            <input type="datetime-local" className={field} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
          <label className="block text-sm font-medium">Reason
            <input className={field} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
        </>}
      </>}
      {step === 4 && <div className="space-y-2 text-sm">
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Members:</strong> {memberIds.length}</p>
        <p><strong>Resource:</strong> {codes.length ? (resourceType === "platform" ? "Platform" : datasets.find((dataset) => dataset.id === resourceId)?.title || "No dataset selected") : "None"}</p>
        <p><strong>Permissions:</strong> {codes.length ? codes.join(", ") : "None yet"}</p>
        {expiresAt && <p><strong>Expiry:</strong> {new Date(expiresAt).toLocaleString()}</p>}
      </div>}
    </div>
    <div className="mt-5 flex justify-between gap-3">
      <button type="button" className={action} disabled={step === 0 || busy} onClick={() => setStep((current) => current - 1)}>Back</button>
      {step < 4
        ? <button type="button" className={action} onClick={next}>Continue</button>
        : <button type="button" className={action} disabled={busy || (codes.length > 0 && resourceType === "dataset" && !resourceId)} onClick={create}>Create group</button>}
    </div>
  </section>;
}
