import { groupPermissions } from "../utils/permissionCategories";

export default function PermissionCatalog({ catalog }) {
  return <div className="space-y-8">
    {[["platform", "Platform permissions"], ["dataset", "Dataset permissions"]].map(([scope, heading]) =>
      <section key={scope} aria-label={heading}>
        <h2 className="text-xl font-semibold text-slate-900">{heading}</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {groupPermissions(catalog, scope).map((group) => <div key={group.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 font-semibold text-slate-900">{group.title}</h3>
            <ul className="divide-y divide-slate-100">{group.permissions.map((permission) => <li key={permission.code} className="flex items-start justify-between gap-3 py-2 text-sm">
              <span><strong className="text-slate-800">{permission.name}</strong><span className="block text-xs text-slate-500">{permission.code}</span></span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${permission.enforced ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                {permission.enforced ? "Available" : "Coming later"}
              </span>
            </li>)}</ul>
          </div>)}
        </div>
      </section>)}
  </div>;
}
