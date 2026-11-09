import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import DashboardShell from "../components/dashboard/DashboardShell";
import * as access from "../api/accessControl";
import { accessError } from "../utils/accessError";

const button = "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50";
const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none";

export default function SharedAccessPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ title: "", description: "" });

  const refresh = useCallback(async () => {
    try {
      setResources(await access.getMyResources());
      setError("");
    } catch (requestError) {
      setError(accessError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(refresh); }, [refresh]);

  const perform = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
      window.dispatchEvent(new Event("ordp:permissions-changed"));
    } catch (requestError) {
      setError(accessError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (id) => perform(async () => {
    const dataset = await access.getSharedDataset(id);
    setDraft({ title: dataset.title || "", description: dataset.description || "" });
    setEditing({ id, hasMetadata: Boolean(dataset.metadata) });
  });

  const saveEdit = (event) => {
    event.preventDefault();
    perform(async () => {
      const payload = editing.hasMetadata
        ? { title: draft.title, description: draft.description }
        : { title: draft.title };
      await access.updateSharedDataset(editing.id, payload);
      setEditing(null);
    });
  };

  const deleteDataset = (item) => {
    if (!window.confirm(`Delete "${item.title}"? This removes it from the portal.`)) return;
    perform(() => access.deleteSharedDataset(item.id));
  };

  const downloadDataset = (id) => perform(async () => {
    const result = await access.downloadSharedDataset(id);
    if (!result?.download_url) throw new Error("Download link unavailable.");
    window.location.assign(result.download_url);
  });

  return (
    <DashboardShell title="Shared with me" subtitle="Datasets you can access through individual or group permissions">
      <div className="mx-auto max-w-5xl space-y-5">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="text-sm text-slate-600">Loading your access…</p> : null}
        {!loading && resources.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="font-medium text-slate-900">No datasets have been shared with you yet.</p>
            <p className="mt-1 text-sm text-slate-600">You can request access from the Access page.</p>
            <Link to="/access-management" className="mt-3 inline-block text-sm font-semibold text-amber-700">Request access</Link>
          </div>
        ) : null}
        {resources.map((item) => {
          const permissions = new Set(item.permissions);
          return (
            <section key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
                  <p className="text-xs capitalize text-slate-500">{item.status} · {item.visibility}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/datasets/${item.id}`} className={button}><Eye size={15} /> View</Link>
                  {permissions.has("dataset.edit") && <button type="button" className={button} disabled={busy} onClick={() => startEdit(item.id)}><Pencil size={15} /> Edit</button>}
                  {permissions.has("dataset.download") && <button type="button" className={button} disabled={busy} onClick={() => downloadDataset(item.id)}><Download size={15} /> Download</button>}
                  {permissions.has("dataset.delete") && <button type="button" className={button} disabled={busy} onClick={() => deleteDataset(item)}><Trash2 size={15} /> Delete</button>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2" aria-label="Your permissions">
                {(item.permission_details || []).map((permission) => {
                  const groups = permission.sources.filter((source) => source.type === "group");
                  const direct = permission.sources.some((source) => source.type === "direct");
                  const origin = [direct ? "Direct" : null, ...groups.map((source) => source.group_name)].filter(Boolean).join(" + ");
                  return <span key={permission.code} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900" title={origin}>{permission.code.replace("dataset.", "")} · {origin}</span>;
                })}
              </div>
              {editing?.id === item.id && (
                <form onSubmit={saveEdit} className="mt-5 space-y-3 border-t border-slate-200 pt-4">
                  <label className="block text-sm font-medium text-slate-700">Title<input required className={input} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
                  {editing.hasMetadata && <label className="block text-sm font-medium text-slate-700">Description<textarea className={input} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></label>}
                  <div className="flex gap-2"><button type="submit" disabled={busy} className={button}>Save changes</button><button type="button" className={button} onClick={() => setEditing(null)}>Cancel</button></div>
                </form>
              )}
            </section>
          );
        })}
      </div>
    </DashboardShell>
  );
}
