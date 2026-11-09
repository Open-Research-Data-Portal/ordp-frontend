import { useEffect, useMemo, useState } from "react";

const keyFor = (type, id, code) => `${type}:${id}:${code}`;

export default function PermissionMatrix({ resource, users, groups, catalog, onSave, onDirtyChange, disabled }) {
  const [changes, setChanges] = useState({});
  const actions = useMemo(() => catalog.filter((item) => item.resource_type === "dataset" && item.enforced), [catalog]);
  const dirty = Object.keys(changes).length > 0;

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useEffect(() => {
    const warn = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const rows = [
    ...users.map((user) => ({ type: "user", id: user.id, name: user.name, groups: user.groups || [] })),
    ...groups.map((group) => ({ type: "group", id: group.id, name: group.name, groups: [] })),
  ];

  const cell = (row, permission) => {
    const source = row.type === "user" ? resource.users : resource.groups;
    const direct = source.find((grant) => (row.type === "user" ? grant.user_id === row.id : grant.group_id === row.id) && grant.permission === permission.code);
    const inherited = row.type === "user" && resource.groups.some((grant) => row.groups.some((membership) => membership.group_id === grant.group_id) && grant.permission === permission.code);
    const key = keyFor(row.type, row.id, permission.code);
    const selected = changes[key] ?? Boolean(direct);
    return { direct, inherited, selected, key };
  };

  const toggle = (row, permission) => {
    const current = cell(row, permission);
    setChanges((previous) => {
      const next = { ...previous };
      const selected = !current.selected;
      if (selected === Boolean(current.direct)) delete next[current.key];
      else next[current.key] = selected;
      return next;
    });
  };

  const save = async () => {
    const edits = [];
    for (const row of rows) for (const permission of actions) {
      const current = cell(row, permission);
      if (Object.hasOwn(changes, current.key)) {
        edits.push({ type: row.type, id: row.id, permission: permission.code,
                     selected: changes[current.key], grantId: current.direct?.id });
      }
    }
    const succeeded = await onSave(edits);
    if (succeeded) setChanges({});
  };

  return <div>
    <div className="overflow-x-auto border border-slate-200">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-100"><tr><th scope="col" className="sticky left-0 min-w-48 border-b border-r border-slate-200 bg-slate-100 px-3 py-2 text-left">User or group</th>{actions.map((action) => <th scope="col" key={action.code} className="min-w-24 border-b border-slate-200 px-2 py-2 text-center font-medium" title={action.code}>{action.name}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={`${row.type}-${row.id}`} className="border-b border-slate-100"><th scope="row" className="sticky left-0 border-r border-slate-100 bg-white px-3 py-2 text-left font-medium"><div className="max-w-44 truncate" title={row.name}>{row.name}</div><span className="text-xs font-normal text-slate-500">{row.type === "group" ? "Group" : "User"}</span></th>{actions.map((permission) => {
          const current = cell(row, permission);
          const source = current.selected && current.inherited ? "Direct + inherited" : current.selected ? "Direct" : current.inherited ? "Inherited" : "No access";
          return <td key={permission.code} className="px-2 py-2 text-center"><label className="inline-flex min-h-9 min-w-12 flex-col items-center justify-center gap-0.5" title={`${source}: ${permission.name}`}><input type="checkbox" aria-label={`${row.name}: direct ${permission.name}`} checked={current.selected} disabled={disabled} onChange={() => toggle(row, permission)} /><span className="text-[10px] leading-none text-slate-500">{current.selected && current.inherited ? "Both" : current.selected ? "Direct" : current.inherited ? "Group" : ""}</span></label></td>;
        })}</tr>)}</tbody>
      </table>
    </div>
    <div className="mt-3 flex items-center justify-end gap-2"><button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" disabled={!dirty || disabled} onClick={() => setChanges({})}>Cancel</button><button type="button" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={!dirty || disabled} onClick={save}>Save</button></div>
  </div>;
}
