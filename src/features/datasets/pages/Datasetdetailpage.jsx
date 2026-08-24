import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Download,
  Share2,
  ChevronDown,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  User,
  HardDrive,
} from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import { useAuth } from "../../../context/useAuth";
import * as datasetsApi from "../hooks/datasetsApi";
import { getDownloadUrl } from "../../../api/sharing";

// ---------------------------------------------------------------------
// DatasetDetailPage — the OWNER'S view of their own dataset.
//
// Layout mirrors the public DatasetViewPage (header with title/tags/
// download/share, file + details panel, Metadata accordion). Editing is
// layered on top via pencil triggers + an edit-mode toggle.
//
// API integration follows the same pattern as DatasetViewPage's
// normalizeDataset(): the raw DatasetSerializer response nests most
// descriptive fields under `.metadata` (MetadataSerializer), so reads
// and writes both go through that shape. Fields marked FIXME below are
// guesses at field names — confirm against the real serializer and
// adjust normalizeDataset/buildPatch together if they differ.
// ---------------------------------------------------------------------

function formatRelativeDate(dateStr) {
  if (!dateStr) return "—";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Updated today";
  if (days === 1) return "Updated 1 day ago";
  if (days < 30) return `Updated ${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `Updated ${months} mo ago` : `Updated ${Math.floor(months / 12)}y ago`;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

// ---------------------------------------------------------------------
// Raw API -> UI shape. Keep this the single place that knows how the
// backend nests fields, same role as DatasetViewPage's normalizeDataset.
// ---------------------------------------------------------------------
function normalizeFile(f) {
  return {
    id: f.id,
    filename: f.original_filename || f.file_key || f.filename || "data file",
    file_type:
      f.file_type ||
      (f.original_filename ? f.original_filename.split(".").pop()?.toUpperCase() : null),
    file_size: f.file_size,
    download_url: f.download_url || f.file_key || null,
    // FIXME: confirm real field names for per-file instance/column counts —
    // backend may return these under a different key or not at all yet.
    item_count: f.item_count ?? f.row_count ?? null,
    column_count: f.column_count ?? (Array.isArray(f.columns) ? f.columns.length : null),
    has_missing_values: f.has_missing_values ?? null,
  };
}

function normalizeDataset(raw) {
  if (!raw) return null;
  const meta = raw.metadata || {};
  const files = (raw.files || []).map(normalizeFile);

  return {
    id: raw.id,
    title: raw.title,
    visibility: raw.visibility,
    status: raw.status,
    owner: raw.owner,
    is_owner: raw.is_owner,
    owner_name: raw.author || raw.owner_name || null,
    updated_at: raw.updated_at,
    thumbnail_url: raw.thumbnail_key || raw.thumbnail_url || null,

    description: meta.description ?? raw.description ?? "",
    keywords: meta.keywords ?? raw.keywords ?? [],

    subject_name: meta.subject_name ?? raw.subject_name ?? "",
    associated_tasks: meta.associated_tasks ?? raw.associated_tasks ?? "",
    feature_type: meta.feature_type ?? raw.feature_type ?? "",
    characteristics: meta.characteristics ?? raw.characteristics ?? [],
    // FIXME: dataset-level has_missing_values vs. per-file — backend may only
    // expose this on the file record. Falls back to the first file's value
    // in the render below if this is null.
    has_missing_values: meta.has_missing_values ?? raw.has_missing_values ?? null,

    creators: meta.creators ?? raw.creators ?? [],

    // FIXME: no confirmed backend field for these three yet — confirm with
    // backend and adjust the metadata key names here + in buildPatch.
    collaborators_note: meta.collaborators_note ?? raw.collaborators_note ?? "",
    coverage: meta.coverage ?? raw.coverage ?? "",
    doi: meta.doi ?? raw.doi ?? null,
    related_publication: meta.related_publication ?? raw.related_publication ?? "",
    citation_notes: meta.citation_notes ?? raw.citation_notes ?? "",

    files,
  };
}

// ---------------------------------------------------------------------
// UI draft -> API patch. `title` lives top-level on the dataset record;
// everything else editable here is read from `.metadata` in
// normalizeDataset above, so it's written back the same way. If your
// backend actually flattens these onto the dataset record instead of
// nesting under metadata, drop the `metadata: {...}` wrapper below.
// ---------------------------------------------------------------------
function buildPatch(section, draft) {
  switch (section) {
    case "header":
      return {
        title: draft.title,
        metadata: { description: draft.description },
      };
    case "keywords":
      return { metadata: { keywords: draft.keywords } };
    case "core":
      return {
        metadata: {
          subject_name: draft.subject_name,
          associated_tasks: draft.associated_tasks,
          feature_type: draft.feature_type,
          characteristics: draft.characteristics
            ? draft.characteristics
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          has_missing_values: !!draft.has_missing_values,
        },
        // item_count / column_count live on the file record, not metadata —
        // FIXME: confirm the right endpoint for editing per-file stats;
        // sending them here as a best-effort top-level patch for now.
        item_count: draft.item_count === "" ? null : Number(draft.item_count),
        column_count: draft.column_count === "" ? null : Number(draft.column_count),
      };
    case "creators":
      return { metadata: { creators: draft.creators } };
    case "collaborators":
      return { metadata: { collaborators_note: draft.collaborators_note } };
    case "coverage":
      return { metadata: { coverage: draft.coverage } };
    case "doi":
      return {
        metadata: {
          related_publication: draft.related_publication,
          citation_notes: draft.citation_notes,
        },
      };
    default:
      return draft;
  }
}

const inputClass =
  "w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:border-slate-900";

function EditTrigger({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-amber-700 hover:text-amber-900 transition-colors"
    >
      <Pencil className="w-3.5 h-3.5" />
    </button>
  );
}

function EditActions({ onSave, onCancel, saving }) {
  return (
    <div className="flex items-center gap-2 mt-3">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60"
      >
        <Check className="w-3.5 h-3.5" />
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="flex items-center gap-1.5 text-gray-500 hover:text-slate-900 rounded-md px-3 py-2 text-xs font-semibold transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        Cancel
      </button>
    </div>
  );
}

function TagChip({ children }) {
  return (
    <span className="inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-500">
      {children}
    </span>
  );
}

function VisibilityBadge({ visibility }) {
  const styles = {
    public: "bg-emerald-50 text-emerald-700 border-emerald-200",
    institutional: "bg-blue-50 text-blue-700 border-blue-200",
    restricted: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const labels = { public: "Public", institutional: "Institutional", restricted: "Restricted" };
  const style = styles[visibility] || "bg-gray-50 text-gray-600 border-gray-200";
  const label = labels[visibility] || "Unknown";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold capitalize text-gray-600">
      {String(status).replace("_", " ")}
    </span>
  );
}

export default function DatasetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [draft, setDraft] = useState({});

  const [expandedSections, setExpandedSections] = useState(() => new Set());

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const raw = await datasetsApi.getDatasetDetail(id);
        if (isMounted) setDataset(normalizeDataset(raw));
      } catch (err) {
        if (isMounted) setError(err.response?.data?.detail || "Failed to load this dataset.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const isOwner = dataset?.is_owner || String(dataset?.owner) === String(user?.id);
  const isApproved = dataset?.status === "approved";
  const files = dataset?.files || [];

  function startEditing(section, initialDraft) {
    setSaveError(null);
    setDraft(initialDraft);
    setEditingSection(section);
  }

  function cancelEditing() {
    setEditingSection(null);
    setDraft({});
    setSaveError(null);
  }

  async function saveSection(section, sectionDraft) {
    setSaving(true);
    setSaveError(null);
    try {
      const patch = buildPatch(section, sectionDraft);
      const updated = await datasetsApi.updateDataset(id, patch);

      setDataset((prev) => {
        // If the API returns the full raw record (has its own `.metadata`),
        // re-normalize it so we stay in sync with whatever the backend
        // actually persisted, rather than trusting our optimistic patch.
        if (updated && (updated.metadata || updated.title)) {
          return normalizeDataset(updated);
        }
        // Otherwise fall back to an optimistic merge of the normalized
        // draft values the user just edited.
        return { ...prev, ...sectionDraft };
      });
      setEditingSection(null);
      setDraft({});
    } catch (err) {
      setSaveError(err.response?.data?.detail || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  const toggleSection = (key) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(["authors", "collaborators", "coverage", "doi"]));
  };

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const url = await getDownloadUrl(id);
      window.location.assign(url);
    } catch (err) {
      console.error("Failed to get download URL:", err);
      setDownloadError(err.response?.data?.detail || "Couldn't start the download. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
        <TopBar />
        <div className="w-full px-6 lg:px-10 py-8 flex-1">
          <div className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          <div className="mt-6 h-32 animate-pulse rounded-2xl border border-gray-200 bg-white" />
          <div className="mt-6 h-64 animate-pulse rounded-2xl border border-gray-200 bg-white" />
        </div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
        <TopBar />
        <div className="w-full px-6 lg:px-10 py-16 text-center flex-1">
          <p className="text-sm text-gray-500">{error || "This dataset couldn't be found."}</p>
          <button
            type="button"
            onClick={() => navigate("/my-datasets")}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to My Datasets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <TopBar />
      <div className="w-full px-6 lg:px-10 py-8 flex-1">
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-2" aria-label="Breadcrumb">
          <Link to="/my-datasets" className="hover:text-slate-900 transition-colors">
            My Datasets
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-[200px] sm:max-w-md">
            {dataset.title}
          </span>
        </nav>
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate("/my-datasets")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-slate-900 transition-colors"
          >
            ← Back to My Datasets
          </button>
        </div>

        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-start justify-between gap-3">
                  {editingSection === "header" ? (
                    <div className="w-full">
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Title</label>
                      <input
                        type="text"
                        value={draft.title ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                        className={`${inputClass} mb-3 text-lg font-serif font-bold`}
                      />
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                      <textarea
                        value={draft.description ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                        rows={4}
                        className={`${inputClass} resize-y`}
                      />
                      {saveError && <p className="text-red-500 text-xs mt-2">{saveError}</p>}
                      <EditActions
                        saving={saving}
                        onCancel={cancelEditing}
                        onSave={() =>
                          saveSection("header", { title: draft.title, description: draft.description })
                        }
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 leading-tight">
                            {dataset.title}
                          </h1>
                          <VisibilityBadge visibility={dataset.visibility} />
                          <StatusBadge status={dataset.status} />
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                            {(dataset.owner_name || user?.username || "U").slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {dataset.owner_name || "You"}
                          </span>
                          <span className="text-xs text-gray-400">
                            · {formatRelativeDate(dataset.updated_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
                          {dataset.description || "No description provided."}
                        </p>
                      </div>
                      {isOwner && editMode && (
                        <EditTrigger
                          label="Edit title and description"
                          onClick={() =>
                            startEditing("header", {
                              title: dataset.title,
                              description: dataset.description,
                            })
                          }
                        />
                      )}
                    </>
                  )}
                </div>

                <div className="mt-4">
                  {editingSection === "keywords" ? (
                    <div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(draft.keywords || []).map((keyword, index) => (
                          <span
                            key={`${keyword}-${index}`}
                            className="flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-500"
                          >
                            {keyword}
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  keywords: d.keywords.filter((_, idx) => idx !== index),
                                }))
                              }
                              aria-label={`Remove ${keyword}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={draft.newKeyword || ""}
                          onChange={(e) => setDraft((d) => ({ ...d, newKeyword: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && draft.newKeyword?.trim()) {
                              e.preventDefault();
                              setDraft((d) => ({
                                ...d,
                                keywords: [...(d.keywords || []), d.newKeyword.trim()],
                                newKeyword: "",
                              }));
                            }
                          }}
                          placeholder="Add keyword"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!draft.newKeyword?.trim()) return;
                            setDraft((d) => ({
                              ...d,
                              keywords: [...(d.keywords || []), d.newKeyword.trim()],
                              newKeyword: "",
                            }));
                          }}
                          className="shrink-0 bg-rose-50 text-rose-500 rounded-md px-3 hover:bg-rose-100 transition-colors"
                          aria-label="Add keyword"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      {saveError && <p className="text-red-500 text-xs mt-2">{saveError}</p>}
                      <EditActions
                        saving={saving}
                        onCancel={cancelEditing}
                        onSave={() => saveSection("keywords", { keywords: draft.keywords })}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {(dataset.keywords || []).map((tag) => (
                        <TagChip key={tag}>{tag}</TagChip>
                      ))}
                      {(!dataset.keywords || dataset.keywords.length === 0) && (
                        <span className="text-xs text-gray-400">No keywords listed</span>
                      )}
                      {isOwner && editMode && (
                        <EditTrigger
                          label="Edit keywords"
                          onClick={() =>
                            startEditing("keywords", {
                              keywords: dataset.keywords ? [...dataset.keywords] : [],
                              newKeyword: "",
                            })
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8">
                {isApproved ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={downloading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      <Download size={16} />
                      {downloading ? "Preparing…" : "Download Dataset"}
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:border-gray-300 transition"
                    >
                      <Share2 size={16} />
                      {linkCopied ? "Link Copied!" : "Share"}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Download and sharing will be available once this dataset is approved.
                  </p>
                )}
                {downloadError && <p className="mt-2 text-xs text-red-500">{downloadError}</p>}

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editMode) cancelEditing();
                      setEditMode((v) => !v);
                    }}
                    className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                  >
                    {editMode ? "Done editing" : "Edit dataset"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="h-64 w-full overflow-hidden rounded-xl bg-gray-100 shadow-md border border-gray-200">
                {dataset.thumbnail_url ? (
                  <img
                    src={dataset.thumbnail_url}
                    alt={dataset.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white text-xs font-mono">
                    No Preview
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Files + Dataset Details */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-900 mb-3">Files</p>
            {files.length === 0 ? (
              <p className="text-sm text-gray-400">No files uploaded yet.</p>
            ) : (
              <ul className="space-y-3">
                {files.map((f, idx) => (
                  <li
                    key={f.id || idx}
                    className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        <HardDrive className="w-4 h-4 text-amber-700" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {f.filename || `File ${idx + 1}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {f.file_type || "—"} · {formatBytes(f.file_size)}
                        </p>
                      </div>
                    </div>
                    {f.download_url && isApproved ? (
                      <a
                        href={f.download_url}
                        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Dataset Details (editable core metadata) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-900">Dataset Details</p>
              {isOwner && editMode && editingSection !== "core" && (
                <EditTrigger
                  label="Edit dataset details"
                  onClick={() =>
                    startEditing("core", {
                      characteristics: (dataset.characteristics || []).join(", "),
                      subject_name: dataset.subject_name || "",
                      associated_tasks: dataset.associated_tasks || "",
                      feature_type: dataset.feature_type || "",
                      item_count: files[0]?.item_count ?? "",
                      column_count: files[0]?.column_count ?? "",
                      has_missing_values: !!(dataset.has_missing_values ?? files[0]?.has_missing_values),
                    })
                  }
                />
              )}
            </div>

            {editingSection === "core" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Subject Area</label>
                  <input
                    type="text"
                    value={draft.subject_name ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, subject_name: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Associated Tasks</label>
                  <input
                    type="text"
                    value={draft.associated_tasks ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, associated_tasks: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Feature Type</label>
                  <input
                    type="text"
                    value={draft.feature_type ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, feature_type: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Dataset Characteristics
                  </label>
                  <input
                    type="text"
                    value={draft.characteristics ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, characteristics: e.target.value }))}
                    placeholder="Comma-separated, e.g. Tabular, Multivariate"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1"># Instances</label>
                    <input
                      type="number"
                      value={draft.item_count ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, item_count: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1"># Features</label>
                    <input
                      type="number"
                      value={draft.column_count ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, column_count: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-900">
                  <input
                    type="checkbox"
                    checked={!!draft.has_missing_values}
                    onChange={(e) => setDraft((d) => ({ ...d, has_missing_values: e.target.checked }))}
                  />
                  Has Missing Values
                </label>
                {saveError && <p className="text-red-500 text-xs">{saveError}</p>}
                <EditActions saving={saving} onCancel={cancelEditing} onSave={() => saveSection("core", draft)} />
              </div>
            ) : (
              <div className="space-y-2.5 text-xs text-gray-600">
                <p>
                  <span className="font-semibold text-slate-800">Subject Area:</span> {dataset.subject_name || "—"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Associated Tasks:</span>{" "}
                  {dataset.associated_tasks || "—"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Feature Type:</span> {dataset.feature_type || "—"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Characteristics:</span>{" "}
                  {(dataset.characteristics || []).join(", ") || "—"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800"># Instances:</span> {files[0]?.item_count ?? "—"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800"># Features:</span> {files[0]?.column_count ?? "—"}
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Missing Values:</span>{" "}
                  {(dataset.has_missing_values ?? files[0]?.has_missing_values) ? "Yes" : "No"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Metadata accordion */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Metadata</h2>
            <button
              type="button"
              onClick={expandAll}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300"
            >
              Expand All
            </button>
          </div>

          <div className="mt-3 divide-y divide-gray-100">
            {/* Authors (Creators) */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("authors")}
                className="flex w-full items-center justify-between py-3 text-left"
              >
                <span className="text-sm font-medium text-amber-700">Authors</span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${
                    expandedSections.has("authors") ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedSections.has("authors") && (
                <div className="pb-4">
                  {editingSection === "authors" ? (
                    <div className="flex flex-col gap-3">
                      {(draft.creators || []).map((creator, index) => (
                        <div key={index} className="border border-gray-200 rounded-md p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">Author {index + 1}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  creators: d.creators.filter((_, idx) => idx !== index),
                                }))
                              }
                              aria-label="Remove author"
                              className="text-red-500 hover:opacity-70"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={creator.name || ""}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                creators: d.creators.map((item, idx) =>
                                  idx === index ? { ...item, name: e.target.value } : item
                                ),
                              }))
                            }
                            placeholder="Name"
                            className={inputClass}
                          />
                          <input
                            type="email"
                            value={creator.email || ""}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                creators: d.creators.map((item, idx) =>
                                  idx === index ? { ...item, email: e.target.value } : item
                                ),
                              }))
                            }
                            placeholder="Email"
                            className={inputClass}
                          />
                          <input
                            type="text"
                            value={creator.affiliation || ""}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                creators: d.creators.map((item, idx) =>
                                  idx === index ? { ...item, affiliation: e.target.value } : item
                                ),
                              }))
                            }
                            placeholder="Affiliation (optional)"
                            className={inputClass}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            creators: [...(d.creators || []), { name: "", email: "", affiliation: "" }],
                          }))
                        }
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 border border-dashed border-amber-200 rounded-md py-2 hover:bg-amber-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add author
                      </button>
                      {saveError && <p className="text-red-500 text-xs">{saveError}</p>}
                      <EditActions
                        saving={saving}
                        onCancel={cancelEditing}
                        onSave={() => saveSection("creators", { creators: draft.creators })}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {(dataset.creators || []).map((creator, index) => (
                          <div key={index} className="mb-2 last:mb-0">
                            <p className="text-sm font-semibold text-slate-900">{creator.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <User className="w-3 h-3" />
                              {creator.email}
                            </p>
                            {creator.affiliation && (
                              <p className="text-xs text-gray-500 ml-5">{creator.affiliation}</p>
                            )}
                          </div>
                        ))}
                        {(!dataset.creators || dataset.creators.length === 0) && (
                          <p className="text-sm text-gray-400">No authors listed</p>
                        )}
                      </div>
                      {isOwner && editMode && (
                        <EditTrigger
                          label="Edit authors"
                          onClick={() =>
                            startEditing("authors", {
                              creators: dataset.creators ? dataset.creators.map((c) => ({ ...c })) : [],
                            })
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Collaborators */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("collaborators")}
                className="flex w-full items-center justify-between py-3 text-left"
              >
                <span className="text-sm font-medium text-amber-700">Collaborators</span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${
                    expandedSections.has("collaborators") ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedSections.has("collaborators") && (
                <div className="pb-4">
                  {editingSection === "collaborators" ? (
                    <div>
                      <textarea
                        value={draft.collaborators_note ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, collaborators_note: e.target.value }))}
                        rows={2}
                        placeholder="List any external collaborators"
                        className={`${inputClass} resize-y`}
                      />
                      {saveError && <p className="text-red-500 text-xs mt-2">{saveError}</p>}
                      <EditActions
                        saving={saving}
                        onCancel={cancelEditing}
                        onSave={() => saveSection("collaborators", { collaborators_note: draft.collaborators_note })}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-500 flex-1">
                        {dataset.collaborators_note || "No external collaborators listed for this dataset yet."}
                      </p>
                      {isOwner && editMode && (
                        <EditTrigger
                          label="Edit collaborators"
                          onClick={() =>
                            startEditing("collaborators", {
                              collaborators_note: dataset.collaborators_note || "",
                            })
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coverage */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("coverage")}
                className="flex w-full items-center justify-between py-3 text-left"
              >
                <span className="text-sm font-medium text-amber-700">Coverage</span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${
                    expandedSections.has("coverage") ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedSections.has("coverage") && (
                <div className="pb-4">
                  {editingSection === "coverage" ? (
                    <div>
                      <textarea
                        value={draft.coverage ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, coverage: e.target.value }))}
                        rows={2}
                        placeholder="e.g. Addis Ababa metropolitan area, Jan–Dec 2024"
                        className={`${inputClass} resize-y`}
                      />
                      {saveError && <p className="text-red-500 text-xs mt-2">{saveError}</p>}
                      <EditActions
                        saving={saving}
                        onCancel={cancelEditing}
                        onSave={() => saveSection("coverage", { coverage: draft.coverage })}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-500 flex-1">{dataset.coverage || "Not specified."}</p>
                      {isOwner && editMode && (
                        <EditTrigger
                          label="Edit coverage"
                          onClick={() => startEditing("coverage", { coverage: dataset.coverage || "" })}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DOI Citation */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("doi")}
                className="flex w-full items-center justify-between py-3 text-left"
              >
                <span className="text-sm font-medium text-amber-700">DOI Citation</span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${
                    expandedSections.has("doi") ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedSections.has("doi") && (
                <div className="pb-4">
                  {editingSection === "doi" ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">
                        Related Publication (URL)
                      </label>
                      <input
                        type="text"
                        value={draft.related_publication ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, related_publication: e.target.value }))}
                        className={`${inputClass} mb-3`}
                      />
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Citation Notes</label>
                      <textarea
                        value={draft.citation_notes ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, citation_notes: e.target.value }))}
                        rows={2}
                        className={`${inputClass} resize-y`}
                      />
                      {saveError && <p className="text-red-500 text-xs mt-2">{saveError}</p>}
                      <EditActions
                        saving={saving}
                        onCancel={cancelEditing}
                        onSave={() =>
                          saveSection("doi", {
                            related_publication: draft.related_publication,
                            citation_notes: draft.citation_notes,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 text-sm text-gray-500">
                        <p>DOI: {dataset.doi || "Pending — assigned upon publication approval."}</p>
                        {dataset.related_publication && (
                          <p className="mt-1">
                            Related publication:{" "}
                            <a
                              href={dataset.related_publication}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#2C5AAE] hover:underline"
                            >
                              {dataset.related_publication}
                            </a>
                          </p>
                        )}
                        {dataset.citation_notes && <p className="mt-1">{dataset.citation_notes}</p>}
                      </div>
                      {isOwner && editMode && (
                        <EditTrigger
                          label="Edit citation details"
                          onClick={() =>
                            startEditing("doi", {
                              related_publication: dataset.related_publication || "",
                              citation_notes: dataset.citation_notes || "",
                            })
                          }
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}