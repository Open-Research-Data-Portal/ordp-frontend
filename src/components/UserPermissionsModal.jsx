import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { useConfirm } from "../context/ConfirmContext";
import { groupPermissions } from "../utils/permissionCategories";
import { formatDateTime, isHighImpact } from "../utils/accessManagement";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-600 focus:outline-none";
const SCOPES = [
  { value: "platform", label: "Across the platform" },
  { value: "dataset", label: "On one dataset" },
  { value: "dataset_file", label: "On one dataset file" },
  { value: "project", label: "On one project" },
  { value: "collection", label: "On one collection" },
];

function resourceLabel(grant, datasets, projects, collections) {
  if (grant.resource_type === "platform") return "Platform";
  if (grant.resource_type === "dataset") {
    return datasets.find((row) => String(row.id) === String(grant.resource_id))?.title || `Dataset ${grant.resource_id || ""}`;
  }
  if (grant.resource_type === "project") {
    return projects.find((row) => String(row.id) === String(grant.resource_id))?.name || `Project ${grant.resource_id || ""}`;
  }
  if (grant.resource_type === "collection") {
    return collections.find((row) => String(row.id) === String(grant.resource_id))?.name || `Collection ${grant.resource_id || ""}`;
  }
  if (grant.resource_type === "dataset_file") return `File ${grant.resource_id || ""}`;
  return `${grant.resource_type} ${grant.resource_id || ""}`.trim();
}

export default function UserPermissionsModal({
  user,
  catalog,
  datasets = [],
  projects = [],
  collections = [],
  busy,
  error,
  onClose,
  onGrant,
  onRevoke,
}) {
  const { confirm } = useConfirm();
  const [scope, setScope] = useState("platform");
  const [resourceId, setResourceId] = useState("");
  const [selected, setSelected] = useState([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const needsResourceId = scope !== "platform";
  const scopeId = needsResourceId ? resourceId : null;
  const groupedChoices = useMemo(() => groupPermissions(catalog, scope), [catalog, scope]);
  const directGrants = user?.direct || [];
  const inherited = useMemo(
    () => (user?.effective || []).filter((row) => (row.sources || []).some((s) => s.type === "group")),
    [user]
  );
  const effective = user?.effective || [];

  if (!user) return null;

  const resourceOptions = scope === "dataset"
    ? datasets.map((d) => ({ id: d.id, label: d.title }))
    : scope === "project"
      ? projects.map((p) => ({ id: p.id, label: p.name }))
      : scope === "collection"
        ? collections.map((c) => ({ id: c.id, label: c.name }))
        : [];

  const submit = async (event) => {
    event.preventDefault();
    if (!selected.length || (needsResourceId && !resourceId)) return;
    if (selected.some((code) => isHighImpact(code))
      && !(await confirm({
        title: "Powerful access",
        message: "This grants powerful access to this user. Continue?",
        confirmLabel: "Continue",
        variant: "warning",
      }))) return;
    const grants = selected.map((permission) => ({
      permission,
      resource_type: scope,
      resource_id: scopeId,
      expires_at: expiresAt || null,
      reason,
    }));
    onGrant(grants).then((saved) => { if (saved) { setSelected([]); setReason(""); } });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-permissions-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-700" />
              <h2 id="user-permissions-title" className="text-xl font-semibold text-slate-900">Manage access</h2>
            </div>
            <p className="mt-1 font-medium text-slate-800">{user.name}</p>
            <p className="break-all text-sm text-slate-500">{user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close access panel">
            <X size={20} />
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 space-y-6">
          <section>
            <h3 className="text-base font-semibold text-slate-900">Direct permissions</h3>
            <p className="mt-1 text-xs text-slate-500">Assigned specifically to this user. Add or revoke below.</p>
            <div className="mt-3 space-y-2">
              {!directGrants.length && <p className="text-sm text-slate-500">No direct grants.</p>}
              {directGrants.map((grant) => (
                <div key={grant.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                  <div>
                    <strong className="text-slate-900">{grant.permission}</strong>
                    <p className="text-xs text-slate-500">
                      {resourceLabel(grant, datasets, projects, collections)}
                      {grant.expires_at ? ` · expires ${formatDateTime(grant.expires_at)}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRevoke(grant.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={submit} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Add permission</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Where can they act?
                  <select
                    className={`${field} mt-1`}
                    value={scope}
                    onChange={(event) => { setScope(event.target.value); setResourceId(""); setSelected([]); }}
                  >
                    {SCOPES.map((row) => <option key={row.value} value={row.value}>{row.label}</option>)}
                  </select>
                </label>
                {needsResourceId && scope !== "dataset_file" && (
                  <label className="text-sm font-medium text-slate-700">
                    Resource
                    <select
                      required
                      className={`${field} mt-1`}
                      value={resourceId}
                      onChange={(event) => { setResourceId(event.target.value); setSelected([]); }}
                    >
                      <option value="">Choose…</option>
                      {resourceOptions.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
                    </select>
                  </label>
                )}
                {scope === "dataset_file" && (
                  <label className="text-sm font-medium text-slate-700">
                    File ID
                    <input
                      required
                      className={`${field} mt-1`}
                      value={resourceId}
                      onChange={(event) => setResourceId(event.target.value)}
                      placeholder="Dataset file UUID"
                    />
                  </label>
                )}
              </div>
              <fieldset>
                <legend className="text-sm font-semibold text-slate-900">Permissions to grant</legend>
                <div className="mt-3 space-y-4">
                  {groupedChoices.map((group) => (
                    <section key={group.title}>
                      <h4 className="mb-2 text-sm font-semibold text-slate-800">{group.title}</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {group.permissions.map((permission) => {
                          const checked = selected.includes(permission.code);
                          return (
                            <label key={permission.code} className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${checked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={checked}
                                disabled={busy || !permission.enforced || (needsResourceId && !resourceId)}
                                onChange={(event) => setSelected((value) =>
                                  event.target.checked
                                    ? [...value, permission.code]
                                    : value.filter((code) => code !== permission.code)
                                )}
                              />
                              <span
                                aria-hidden="true"
                                className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                                  checked ? "bg-emerald-600" : "bg-slate-300"
                                } peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-disabled:opacity-50`}
                              >
                                <span
                                  className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                    checked ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </span>
                              <span>
                                <span className="font-medium text-slate-900">{permission.name}</span>
                                {!permission.enforced && <span className="ml-2 text-xs font-semibold text-amber-700">Coming later</span>}
                                {permission.description && <span className="block text-xs text-slate-500">{permission.description}</span>}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                  {!groupedChoices.length && <p className="text-sm text-slate-500">No enforced permissions for this resource type.</p>}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Expires (optional)
                  <input type="datetime-local" className={`${field} mt-1`} value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Reason (optional)
                  <input className={`${field} mt-1`} value={reason} onChange={(event) => setReason(event.target.value)} />
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy || !selected.length || (needsResourceId && !resourceId)}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Saving…" : `Grant ${selected.length} permission${selected.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </form>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-900">Inherited permissions</h3>
            <p className="mt-1 text-xs text-slate-500">Received from groups. Change these in Groups, not here.</p>
            <div className="mt-3 space-y-2">
              {!inherited.length && <p className="text-sm text-slate-500">No inherited permissions.</p>}
              {inherited.map((row) => (
                <div key={`inherited-${row.code}-${row.resource_type}-${row.resource_id}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <strong className="text-slate-900">{row.name || row.code}</strong>
                  <p className="text-xs text-slate-500">
                    {resourceLabel(row, datasets, projects, collections)}
                    {" · "}
                    {(row.sources || [])
                      .filter((s) => s.type === "group")
                      .map((s) => s.group_name || "Group")
                      .join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-base font-semibold text-slate-900">Effective permissions</h3>
            <p className="mt-1 text-xs text-slate-500">Combined access from direct grants and groups.</p>
            <div className="mt-3 space-y-2">
              {!effective.length && <p className="text-sm text-slate-500">No effective permissions.</p>}
              {effective.map((row) => (
                <div key={`effective-${row.code}-${row.resource_type}-${row.resource_id}`} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <strong className="text-slate-900">{row.name || row.code}</strong>
                  <p className="text-xs text-slate-500">
                    {resourceLabel(row, datasets, projects, collections)}
                    {" · "}
                    {(row.sources || [])
                      .map((s) => (s.type === "group" ? `Group: ${s.group_name || s.group_id}` : "Direct"))
                      .join(" + ")}
                    {row.sources?.some((s) => s.expires_at)
                      ? ` · expires ${formatDateTime(row.sources.find((s) => s.expires_at)?.expires_at)}`
                      : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
