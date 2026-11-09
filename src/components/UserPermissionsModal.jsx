import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none";

export default function UserPermissionsModal({ user, catalog, datasets, busy, error, onClose, onGrant, onRevoke }) {
  const [scope, setScope] = useState("platform");
  const [datasetId, setDatasetId] = useState("");
  const [selected, setSelected] = useState([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  if (!user) return null;
  const scopeId = scope === "platform" ? null : datasetId;
  const current = new Set((user.effective || []).filter((grant) =>
    grant.resource_type === scope && String(grant.resource_id || "") === String(scopeId || "")
  ).map((grant) => grant.code));
  const choices = catalog.filter((permission) => permission.resource_type === scope && permission.enforced);
  const submit = (event) => {
    event.preventDefault();
    if (!selected.length || (scope === "dataset" && !datasetId)) return;
    const grants = selected.map((permission) => ({
      permission, resource_type: scope, resource_id: scopeId,
      expires_at: expiresAt || null, reason,
    }));
    onGrant(grants).then((saved) => { if (saved) { setSelected([]); setReason(""); } });
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="user-permissions-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-700" /><h2 id="user-permissions-title" className="text-xl font-semibold text-slate-900">Manage access</h2></div>
          <p className="mt-1 font-medium text-slate-800">{user.name}</p><p className="break-all text-sm text-slate-500">{user.email}</p></div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close access panel"><X size={20} /></button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="space-y-5 pt-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Where can they act?
            <select className={`${field} mt-1`} value={scope} onChange={(event) => { setScope(event.target.value); setSelected([]); }}>
              <option value="platform">Across the platform</option><option value="dataset">On one dataset</option>
            </select>
          </label>
          {scope === "dataset" && <label className="text-sm font-medium text-slate-700">Dataset
            <select required className={`${field} mt-1`} value={datasetId} onChange={(event) => { setDatasetId(event.target.value); setSelected([]); }}>
              <option value="">Choose a dataset</option>{datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.title}</option>)}
            </select>
          </label>}
        </div>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Permissions to grant</legend>
          <p className="mt-1 text-xs text-slate-500">Turn on permissions, then save. Turn off a direct permission to revoke it. Group permissions are managed in Groups.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {choices.map((permission) => {
              const grant = (user.effective || []).find((row) => row.code === permission.code
                && row.resource_type === scope && String(row.resource_id || "") === String(scopeId || ""));
              const direct = grant?.sources.find((source) => source.type === "direct");
              const inherited = Boolean(grant?.sources.some((source) => source.type === "group"));
              const enabled = current.has(permission.code) || selected.includes(permission.code);
              return <div key={permission.code} className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm ${enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
                <span><span className="font-medium text-slate-900">{permission.name}</span>{inherited && <span className="ml-2 text-xs font-semibold text-emerald-700">From group</span>}
                  {permission.description && <span className="block text-xs text-slate-500">{permission.description}</span>}</span>
                <button type="button" role="switch" aria-label={`${permission.name} for ${user.email}`} aria-checked={enabled}
                  disabled={busy || inherited || (scope === "dataset" && !datasetId)}
                  onClick={() => direct ? onRevoke(direct.id) : setSelected((value) => value.includes(permission.code)
                    ? value.filter((code) => code !== permission.code) : [...value, permission.code])}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${enabled ? "bg-emerald-600" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "left-5" : "left-0.5"}`} />
                </button>
              </div>;
            })}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Expires (optional)<input type="datetime-local" className={`${field} mt-1`} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
          <label className="text-sm font-medium text-slate-700">Reason (optional)<input className={`${field} mt-1`} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </div>
        <div className="flex justify-end"><button type="submit" disabled={busy || !selected.length || (scope === "dataset" && !datasetId)} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : `Grant ${selected.length} permission${selected.length === 1 ? "" : "s"}`}</button></div>
      </form>
      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="font-semibold text-slate-900">Current access</h3>
        <p className="mt-1 text-xs text-slate-500">Direct permissions can be revoked here. Group permissions come from group membership.</p>
        <div className="mt-3 space-y-2">{!(user.effective || []).length && <p className="text-sm text-slate-500">No additional permissions granted.</p>}
          {(user.effective || []).map((grant) => <div key={`${grant.code}-${grant.resource_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
            <div><strong className="text-slate-900">{grant.name || grant.code}</strong><p className="text-xs text-slate-500">{grant.resource_type === "platform" ? "Platform" : datasets.find((row) => String(row.id) === String(grant.resource_id))?.title || "Dataset"} · {grant.sources.map((source) => source.type === "group" ? source.group_name : "Direct").join(" + ")}</p></div>
            <div className="flex gap-1">{grant.sources.filter((source) => source.type === "direct").map((source) => <button key={source.id} type="button" disabled={busy} onClick={() => onRevoke(source.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Revoke direct</button>)}</div>
          </div>)}
        </div>
      </div>
    </section>
  </div>;
}
