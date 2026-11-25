import { useState } from "react";
import * as api from "../api/accessControl";
import { accessError } from "../utils/accessError";

const field = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const button = "inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50";
const primary = "inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50";

function hasCode(effective, code) {
  return (effective || []).some((row) => row.code === code);
}

export default function ResourceManagementPanel({ effective, users, projects, collections, onChanged, confirm }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [projectDraft, setProjectDraft] = useState({ name: "", description: "" });
  const [collectionDraft, setCollectionDraft] = useState({ name: "", description: "" });
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [memberId, setMemberId] = useState("");

  const run = async (action, success) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await onChanged?.();
    } catch (requestError) {
      setError(accessError(requestError));
    } finally {
      setBusy(false);
    }
  };

  const openProject = (id) => run(async () => {
    setSelectedProject(await api.getProject(id));
  }, "");

  const openCollection = (id) => run(async () => {
    setSelectedCollection(await api.getCollection(id));
  }, "");

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {error && <p role="alert" className="lg:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="lg:col-span-2 text-sm text-emerald-700">{notice}</p>}
      <section>
        <h2 className="text-base font-semibold text-slate-900">Projects</h2>
        {hasCode(effective, "project.create") && (
          <form className="mt-3 space-y-2" onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              await api.createProject(projectDraft);
              setProjectDraft({ name: "", description: "" });
            }, "Project created.");
          }}>
            <input required className={field} placeholder="Project name" value={projectDraft.name} onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))} />
            <textarea className={field} placeholder="Description" value={projectDraft.description} onChange={(event) => setProjectDraft((current) => ({ ...current, description: event.target.value }))} />
            <button type="submit" className={primary} disabled={busy}>Create project</button>
          </form>
        )}
        <ul className="mt-4 space-y-2">
          {projects.map((project) => (
            <li key={project.id}>
              <button type="button" className="text-left text-sm font-medium text-slate-800 hover:text-amber-800" onClick={() => openProject(project.id)}>{project.name}</button>
            </li>
          ))}
          {!projects.length && <li className="text-sm text-slate-500">No projects yet.</li>}
        </ul>
        {selectedProject && (
          <div className="mt-4 space-y-3 rounded-lg border border-slate-200 p-3">
            <h3 className="font-medium text-slate-900">{selectedProject.name}</h3>
            <p className="text-sm text-slate-600">{selectedProject.description}</p>
            {(hasCode(effective, "project.edit") || hasCode(effective, "user.manage")) && (
              <form className="space-y-2" onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                run(async () => {
                  await api.updateProject(selectedProject.id, { name: form.get("name"), description: form.get("description") });
                  setSelectedProject(await api.getProject(selectedProject.id));
                }, "Project updated.");
              }}>
                <input name="name" className={field} defaultValue={selectedProject.name} />
                <textarea name="description" className={field} defaultValue={selectedProject.description || ""} />
                <button type="submit" className={button} disabled={busy}>Save project</button>
              </form>
            )}
            {(hasCode(effective, "project.member.add") || hasCode(effective, "user.manage")) && (
              <form className="flex gap-2" onSubmit={(event) => {
                event.preventDefault();
                run(async () => {
                  await api.addProjectMember(selectedProject.id, memberId);
                  setMemberId("");
                  setSelectedProject(await api.getProject(selectedProject.id));
                }, "Member added.");
              }}>
                <select required className={field} value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                  <option value="">Add a member</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
                </select>
                <button type="submit" className={button} disabled={busy}>Add</button>
              </form>
            )}
            <ul className="space-y-1 text-sm">
              {(selectedProject.member_ids || []).map((id) => (
                <li key={id} className="flex items-center justify-between gap-2">
                  <span>{users.find((user) => String(user.id) === String(id))?.name || users.find((user) => String(user.id) === String(id))?.email || `User ${id}`}</span>
                  {(hasCode(effective, "project.member.remove") || hasCode(effective, "user.manage")) && (
                    <button type="button" className={button} disabled={busy} onClick={() => run(async () => {
                      await api.removeProjectMember(selectedProject.id, id);
                      setSelectedProject(await api.getProject(selectedProject.id));
                    }, "Member removed.")}>Remove</button>
                  )}
                </li>
              ))}
            </ul>
            {(hasCode(effective, "project.delete") || hasCode(effective, "user.manage")) && (
              <button type="button" className={button} disabled={busy} onClick={async () => {
                if (!(await confirm({ title: "Archive project", message: `Archive "${selectedProject.name}"? Members lose access inherited from it.`, confirmLabel: "Archive", variant: "danger" }))) return;
                run(async () => {
                  await api.archiveProject(selectedProject.id);
                  setSelectedProject(null);
                }, "Project archived.");
              }}>Archive project</button>
            )}
          </div>
        )}
      </section>
      <section>
        <h2 className="text-base font-semibold text-slate-900">Collections</h2>
        {hasCode(effective, "collection.create") && (
          <form className="mt-3 space-y-2" onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              await api.createCollection(collectionDraft);
              setCollectionDraft({ name: "", description: "" });
            }, "Collection created.");
          }}>
            <input required className={field} placeholder="Collection name" value={collectionDraft.name} onChange={(event) => setCollectionDraft((current) => ({ ...current, name: event.target.value }))} />
            <textarea className={field} placeholder="Description" value={collectionDraft.description} onChange={(event) => setCollectionDraft((current) => ({ ...current, description: event.target.value }))} />
            <button type="submit" className={primary} disabled={busy}>Create collection</button>
          </form>
        )}
        <ul className="mt-4 space-y-2">
          {collections.map((collection) => (
            <li key={collection.id}>
              <button type="button" className="text-left text-sm font-medium text-slate-800 hover:text-amber-800" onClick={() => openCollection(collection.id)}>{collection.name}</button>
            </li>
          ))}
          {!collections.length && <li className="text-sm text-slate-500">No collections yet.</li>}
        </ul>
        {selectedCollection && (
          <div className="mt-4 space-y-3 rounded-lg border border-slate-200 p-3">
            <h3 className="font-medium text-slate-900">{selectedCollection.name}</h3>
            <p className="text-sm text-slate-600">{selectedCollection.description}</p>
            {(hasCode(effective, "collection.edit") || hasCode(effective, "user.manage")) && (
              <form className="space-y-2" onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                run(async () => {
                  await api.updateCollection(selectedCollection.id, { name: form.get("name"), description: form.get("description") });
                  setSelectedCollection(await api.getCollection(selectedCollection.id));
                }, "Collection updated.");
              }}>
                <input name="name" className={field} defaultValue={selectedCollection.name} />
                <textarea name="description" className={field} defaultValue={selectedCollection.description || ""} />
                <button type="submit" className={button} disabled={busy}>Save collection</button>
              </form>
            )}
            {(hasCode(effective, "collection.delete") || hasCode(effective, "user.manage")) && (
              <button type="button" className={button} disabled={busy} onClick={async () => {
                if (!(await confirm({ title: "Archive collection", message: `Archive "${selectedCollection.name}"?`, confirmLabel: "Archive", variant: "danger" }))) return;
                run(async () => {
                  await api.archiveCollection(selectedCollection.id);
                  setSelectedCollection(null);
                }, "Collection archived.");
              }}>Archive collection</button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
