import { useEffect, useState } from "react";
import { Download, History, RotateCcw, Upload } from "lucide-react";
import * as datasetsApi from "../features/datasets/hooks/datasetsApi";
import { getSharedDataset } from "../api/accessControl";

const button = "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50";

export default function DatasetGrantActions({ datasetId, permissions = [], isOwner = false, files = [], loadVersions = false }) {
  const permissionKey = permissions.join(",");
  const allowed = new Set(permissions);
  const can = (code) => isOwner || allowed.has(code);
  const canSeeVersions = loadVersions || isOwner || can("dataset.view") || can("dataset.version.view");
  const canRestore = isOwner || can("dataset.edit") || can("dataset.version.restore");
  const canUpload = isOwner || can("dataset.upload") || can("dataset.version.create");
  const canDownloadFile = (file) => isOwner || can("dataset.download") || (file.permissions || []).includes("dataset_file.download") || can("dataset_file.download");
  const [loadedFiles, setLoadedFiles] = useState(files);
  const shownFiles = files.length ? files : loadedFiles;
  const [versions, setVersions] = useState([]);
  const [versionsHidden, setVersionsHidden] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!datasetId || files.length || !(isOwner || can("dataset.download") || can("dataset_file.download"))) return;
    let active = true;
    getSharedDataset(datasetId)
      .then((dataset) => { if (active) setLoadedFiles(dataset.files || []); })
      .catch(() => { if (active) setLoadedFiles([]); });
    return () => { active = false; };
  }, [datasetId, files.length, isOwner, permissionKey]);

  useEffect(() => {
    if (!datasetId || !canSeeVersions) return;
    let active = true;
    datasetsApi.getDatasetVersions(datasetId)
      .then((rows) => { if (active) setVersions(Array.isArray(rows) ? rows : []); })
      .catch((error) => { if (active && error?.response?.status === 403) setVersionsHidden(true); });
    return () => { active = false; };
  }, [datasetId, canSeeVersions]);

  const run = async (action) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (error) {
      setMessage(error?.response?.data?.detail || error?.message || "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  if (!canSeeVersions && !canUpload && !shownFiles.length) return null;

  return (
    <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
      {canUpload && (
        <label className={button}>
          <Upload size={15} /> {can("dataset.version.create") ? "New version" : "Upload"}
          <input
            type="file"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              run(async () => {
                await datasetsApi.uploadExistingDatasetFile(datasetId, file);
                setMessage("Upload sent.");
              });
            }}
          />
        </label>
      )}
      {shownFiles.length > 0 && (
        <ul className="space-y-2">
          {shownFiles.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{file.name || file.original_filename || "File"}</span>
              {canDownloadFile(file) && (
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  onClick={() => run(async () => {
                    const result = await datasetsApi.downloadDatasetFile(datasetId, file.id);
                    if (!result?.download_url) throw new Error("Download link unavailable.");
                    window.location.assign(result.download_url);
                  })}
                >
                  <Download size={15} /> Download file
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canSeeVersions && !versionsHidden && (
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-800"><History size={15} /> Versions</p>
          {!versions.length && <p className="text-sm text-slate-500">No versions yet.</p>}
          <ul className="space-y-2">
            {versions.map((version) => {
              const legacy = Boolean(version.version_number);
              const label = legacy ? version.version_number : version.version;
              const when = legacy ? version.created_at : version.published_at;
              return (
                <li key={version.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>Version {label || "—"}{when ? ` · ${new Date(when).toLocaleDateString()}` : ""}</span>
                  {canRestore && legacy && (
                    <button
                      type="button"
                      className={button}
                      disabled={busy}
                      onClick={() => run(async () => {
                        await datasetsApi.restoreDatasetVersion(datasetId, version.id);
                        const rows = await datasetsApi.getDatasetVersions(datasetId);
                        setVersions(Array.isArray(rows) ? rows : []);
                        setMessage("Version restored.");
                      })}
                    >
                      <RotateCcw size={15} /> Restore
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
