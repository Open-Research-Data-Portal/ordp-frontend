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
  Archive,
  Table,
  Loader2,
  Info,
} from "lucide-react";
import TopBar from "../../../layouts/TopBar";
import { useAuth } from "../../../context/useAuth";
import { useToast } from "../../../context/ToastContext";
import { getDashboardPath } from "../../../utils/userRoles";
import * as datasetsApi from "../hooks/datasetsApi";
import { getDownloadUrl } from "../../../api/sharing";
import { getDatasetImage } from "../../../utils/datasetImage";

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
// Data File Previews (Tabular CSV & Image)
// ---------------------------------------------------------------------
function TabularPreview({ columns, rows, filename }) {
  const [viewMode, setViewMode] = useState("detail"); // "detail" | "compact" | "column"

  const defaultCols = ["user_id", "user_name", "persona", "age", "fitness_goal", "weekly_sessions", "avg_heart_rate", "active_minutes"];
  const displayCols = Array.isArray(columns) && columns.length > 0 ? columns : defaultCols;

  const defaultRows = [
    ["U0363", "Emily Rivera", "low_stress", "53.0", "FAT_LOSS", "4", "138", "145"],
    ["U0280", "Aiden Perez", "high_stress_low_support", "46.0", "mobility", "3", "142", "120"],
    ["U0043", "Emma Lopez", "moderate_stress", "21.0", "endurance", "5", "155", "210"],
    ["U0007", "Ashley Campbell", "high_stress_low_support", "56.0", "mobility", "2", "128", "90"],
    ["U0112", "Marcus Vance", "low_stress", "34.0", "muscle_gain", "4", "148", "180"],
    ["U0421", "Sophia Martinez", "high_stress", "29.0", "endurance", "6", "162", "240"],
    ["U0589", "Daniel Kim", "moderate_stress", "41.0", "FAT_LOSS", "3", "135", "110"],
    ["U0632", "Olivia Taylor", "low_stress", "27.0", "mobility", "4", "140", "150"],
    ["U0714", "Ethan Wright", "moderate_stress", "38.0", "muscle_gain", "5", "152", "195"],
    ["U0825", "Ava Robinson", "low_stress", "31.0", "endurance", "4", "146", "165"],
    ["U0911", "Liam Thomas", "high_stress", "49.0", "FAT_LOSS", "2", "130", "85"],
    ["U1042", "Isabella Jackson", "moderate_stress", "24.0", "mobility", "5", "150", "200"],
    ["U1153", "Noah White", "low_stress", "36.0", "muscle_gain", "4", "144", "175"],
    ["U1264", "Mia Harris", "high_stress_low_support", "43.0", "endurance", "3", "138", "130"],
    ["U1375", "Lucas Martin", "moderate_stress", "30.0", "FAT_LOSS", "5", "158", "220"],
    ["U1486", "Charlotte Clark", "low_stress", "28.0", "mobility", "4", "141", "155"],
    ["U1597", "Benjamin Lewis", "high_stress", "52.0", "muscle_gain", "3", "132", "105"],
    ["U1708", "Amelia Walker", "moderate_stress", "33.0", "endurance", "4", "149", "170"],
    ["U1819", "James Hall", "low_stress", "45.0", "FAT_LOSS", "4", "137", "140"],
    ["U1930", "Harper Allen", "high_stress", "26.0", "mobility", "5", "154", "205"],
  ];

  const displayRows = Array.isArray(rows) && rows.length > 0 ? rows.slice(0, 20) : defaultRows;

  return (
    <div className="p-4 bg-white border-t border-gray-100">
      <div className="flex items-center justify-between gap-4 mb-3 pb-2 border-b border-gray-100 flex-wrap">
        <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
          <button
            type="button"
            onClick={() => setViewMode("detail")}
            className={`pb-1 border-b-2 transition-colors ${viewMode === "detail" ? "border-slate-900 text-slate-900 font-bold" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            Detail
          </button>
          <button
            type="button"
            onClick={() => setViewMode("compact")}
            className={`pb-1 border-b-2 transition-colors ${viewMode === "compact" ? "border-slate-900 text-slate-900 font-bold" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            Compact
          </button>
          <button
            type="button"
            onClick={() => setViewMode("column")}
            className={`pb-1 border-b-2 transition-colors ${viewMode === "column" ? "border-slate-900 text-slate-900 font-bold" : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            Column Summary
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
          <span>Showing 20 sample rows</span>
          <span>·</span>
          <span className="font-semibold text-slate-700 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
            {displayCols.length} columns
          </span>
        </div>
      </div>

      {viewMode === "column" ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1 font-mono text-xs">
          {displayCols.map((c, i) => (
            <div key={i} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col justify-between">
              <span className="font-bold text-slate-800 truncate">{c}</span>
              <span className="text-[10px] text-gray-400 mt-1">Text / Categorical</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-80 rounded-lg border border-gray-200 shadow-2xs">
          <table className={`w-full text-xs text-left border-collapse font-mono ${viewMode === "compact" ? "py-1" : ""}`}>
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-slate-700">
              <tr>
                <th className="px-3 py-2 border-r border-gray-200 w-10 text-center text-gray-400 bg-gray-100/50">#</th>
                {displayCols.map((col, idx) => (
                  <th key={idx} className="px-3 py-2 font-bold border-r border-gray-200 last:border-r-0 whitespace-nowrap bg-gray-50">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-slate-800 bg-white">
              {displayRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3 py-1.5 text-center text-gray-400 border-r border-gray-200 bg-gray-50/40 text-[10px]">
                    {rIdx + 1}
                  </td>
                  {(Array.isArray(row) ? row : Object.values(row)).map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 border-r border-gray-100 last:border-r-0 truncate max-w-[180px]">
                      {String(cell ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ImagePreview({ url, filename, fileType }) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <div className="p-4 bg-gray-900/5 border-t border-gray-100 flex flex-col items-center justify-center">
      {url ? (
        <div
          className={`relative max-h-96 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-transform cursor-pointer ${zoomed ? "scale-110" : ""}`}
          onClick={() => setZoomed(!zoomed)}
        >
          <img src={url} alt={filename || "Image Preview"} className="h-auto max-h-96 w-auto object-contain mx-auto" />
        </div>
      ) : (
        <div className="h-32 w-full flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-xs font-mono">
          Image preview unavailable
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-3 text-xs text-gray-500 font-medium">
        <span>Image File ({String(fileType || "IMAGE").toUpperCase()})</span>
        <span>·</span>
        <button
          type="button"
          onClick={() => setZoomed(!zoomed)}
          className="text-amber-800 hover:underline font-semibold"
        >
          {zoomed ? "Reset Zoom" : "Click image to expand view"}
        </button>
      </div>
    </div>
  );
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
    columns: f.columns || [],
    preview_rows: f.preview_rows || [],
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
    thumbnail_url: getDatasetImage(raw),

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
  const { addToast } = useToast();

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

  // Archival Request Modal state (5 form fields)
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveCategory, setArchiveCategory] = useState("superseded");
  const [archiveReason, setArchiveReason] = useState("");
  const [preservationPlan, setPreservationPlan] = useState("");
  const [impactLevel, setImpactLevel] = useState("no_impact");
  const [contactEmail, setContactEmail] = useState("");
  const [archiveConfirmed, setArchiveConfirmed] = useState(false);
  const [submittingArchive, setSubmittingArchive] = useState(false);
  const [isArchivingRequested, setIsArchivingRequested] = useState(false);
  const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
  const [unarchiveIntendedUse, setUnarchiveIntendedUse] = useState("research");
  const [unarchiveReason, setUnarchiveReason] = useState("");
  const [submittingUnarchive, setSubmittingUnarchive] = useState(false);
  const [isUnarchivingRequested, setIsUnarchivingRequested] = useState(false);


  // Sync user email when user object is loaded
  useEffect(() => {
    if (user?.email && !contactEmail) {
      setContactEmail(user.email);
    }
  }, [user, contactEmail]);

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
  const isApproved = dataset?.status === "approved" || dataset?.status === "published";
  const files = dataset?.files || [];

  async function handleArchiveSubmit(e) {
    e.preventDefault();
    if (!archiveReason.trim() || !preservationPlan.trim() || !contactEmail.trim() || !archiveConfirmed) return;
    setSubmittingArchive(true);
    try {
      const fullReason = `[Impact: ${impactLevel}] [Preservation: ${preservationPlan.trim()}] [Contact: ${contactEmail.trim()}] ${archiveReason.trim()}`;
      await datasetsApi.requestDatasetArchive(id, {
        reasonCategory: archiveCategory,
        reason: fullReason,
      });
      addToast(
        "Archival request submitted successfully! Sent to review committee for approval.",
        "success"
      );
      setShowArchiveModal(false);
      setArchiveReason("");
      setPreservationPlan("");
      setIsArchivingRequested(true);
    } catch (err) {
      console.error("Archive request error:", err);
      addToast(err?.response?.data?.detail || "Failed to submit archival request.", "error");
    } finally {
      setSubmittingArchive(false);
    }
  }
  async function handleUnarchiveSubmit(e) {
    e.preventDefault();
    if (!unarchiveReason.trim()) return;
    setSubmittingUnarchive(true);
    try {
      await datasetsApi.requestDatasetUnarchive(id, {
        intendedUse: unarchiveIntendedUse,
        reason: unarchiveReason.trim(),
      });
      addToast(
        "Unarchive request submitted successfully! Sent to admin for review.",
        "success"
      );
      setShowUnarchiveModal(false);
      setUnarchiveReason("");
      setIsUnarchivingRequested(true);
    } catch (err) {
      console.error("Unarchive request error:", err);
      addToast(err?.response?.data?.detail || "Failed to submit unarchive request.", "error");
    } finally {
      setSubmittingUnarchive(false);
    }
  }


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
            onClick={() => navigate(getDashboardPath(user))}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to dashboard
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
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(getDashboardPath(user))}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-slate-900 transition-colors"
          >
            ← Back to dashboard
          </button>
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
                  <div className="flex items-center gap-3 flex-wrap">
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
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => dataset.is_archived ? setShowUnarchiveModal(true) : setShowArchiveModal(true)}
                        disabled={dataset.is_archived ? isUnarchivingRequested : isArchivingRequested}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition shadow-2xs disabled:opacity-60"
                      >
                        <Archive size={16} />
                        {dataset.is_archived ? (isUnarchivingRequested ? "Unarchival Requested" : "Unarchive Dataset") : (isArchivingRequested ? "Archival Requested" : "Archive Dataset")}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Download, sharing, and archiving will be available once this dataset is approved.
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
          <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-6">
            <p className="text-sm font-bold text-slate-900">data file</p>
            {files.length === 0 ? (
              <p className="text-sm text-gray-400">No files uploaded yet.</p>
            ) : (
              files.map((f, idx) => {
                const fType = (f.file_type || "").toLowerCase();
                const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(fType);
                const isTabular = ["csv", "xlsx", "xls", "tsv", "json", "parquet", "sqlite"].includes(fType) || (f.preview_rows && f.preview_rows.length > 0);

                return (
                  <div key={f.id || idx} className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
                    <div className="p-4 flex items-center justify-between gap-4 border-b border-gray-100 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                          <HardDrive className="w-4 h-4 text-amber-700" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {f.filename || `File ${idx + 1}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatBytes(f.file_size)}
                          </p>
                        </div>
                      </div>
                      {f.download_url ? (
                        <a
                          href={f.download_url}
                          className="shrink-0 text-gray-400 hover:text-slate-900 transition-colors"
                          title="Download file"
                          aria-label="Download file"
                        >
                          <Download size={16} />
                        </a>
                      ) : null}
                    </div>

                    {/* Content View Based on Data Type */}
                    {isTabular && f.preview_rows && f.preview_rows.length > 0 ? (
                      <TabularPreview columns={f.columns} rows={f.preview_rows} />
                    ) : isImage && f.download_url ? (
                      <div className="p-4 flex flex-col items-center justify-center bg-gray-900/5">
                        <div className="max-h-96 max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                          <img src={f.download_url} alt={f.filename} className="h-auto max-h-96 w-auto object-contain mx-auto" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Image Preview ({f.file_type?.toUpperCase() || "IMAGE"})</p>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-gray-400">
                        Preview not available for this file format ({f.file_type || "unknown"}).
                      </div>
                    )}
                  </div>
                );
              })
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

      {/* Archival Request Form Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Request Dataset Archival</h3>
                  <p className="text-xs text-gray-500">Complete the 5 archival specification fields below to submit an archival request.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleArchiveSubmit} className="mt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Archival Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                    1. Archival Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={archiveCategory}
                    onChange={(e) => setArchiveCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-900"
                  >
                    <option value="superseded">Superseded by a Newer Dataset</option>
                    <option value="outdated">Outdated Data / Methodology</option>
                    <option value="duplicate">Duplicate Dataset Submission</option>
                    <option value="privacy_or_sensitive">Ethical, Privacy, or Sensitive Data</option>
                    <option value="low_quality">Low Quality / Sample Error</option>
                    <option value="no_longer_relevant">No Longer Relevant</option>
                    <option value="other">Other Administrative Reason</option>
                  </select>
                </div>

                {/* 2. Impact Assessment */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                    2. Research Impact Assessment <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={impactLevel}
                    onChange={(e) => setImpactLevel(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-900"
                  >
                    <option value="no_impact">No Active Citations / No Impact</option>
                    <option value="low_impact">Low Impact (Historical Reference Only)</option>
                    <option value="moderate_impact">Moderate Impact (Active Research Usage)</option>
                    <option value="high_impact">High Impact (Requires Redirection Notice)</option>
                  </select>
                </div>
              </div>

              {/* 3. Detailed Archival Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  3. Detailed Archival Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Describe the detailed rationale for archiving this dataset..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* 4. Data Preservation Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  4. Data Preservation & Backup Storage Plan <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={preservationPlan}
                  onChange={(e) => setPreservationPlan(e.target.value)}
                  placeholder="Specify where the raw files or future dataset versions are preserved (e.g., Institutional Cold Storage Server, Version 2 repository link, DOI mirror)..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* 5. Contact Email */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  5. Contact Email for Inquiries <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="email@institution.edu"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* Confirmation Checkbox */}
              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="confirmArchival"
                  required
                  checked={archiveConfirmed}
                  onChange={(e) => setArchiveConfirmed(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="confirmArchival" className="text-xs text-gray-700 leading-relaxed">
                  I confirm that all 5 archival specifications above are complete and accurate for this dataset request.
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingArchive || !archiveReason.trim() || !preservationPlan.trim() || !contactEmail.trim() || !archiveConfirmed}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submittingArchive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  Submit Archival Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unarchive Request Form Modal */}
      {showUnarchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 sm:p-8 animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Request Dataset Restoration (Unarchive)</h3>
                  <p className="text-xs text-gray-500">Provide your intended use and reason for restoring this archived dataset.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnarchiveModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUnarchiveSubmit} className="mt-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  Intended Use <span className="text-red-500">*</span>
                </label>
                <select
                  value={unarchiveIntendedUse}
                  onChange={(e) => setUnarchiveIntendedUse(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-900"
                >
                  <option value="research">Research</option>
                  <option value="audit">Audit</option>
                  <option value="verification">Verification</option>
                  <option value="legal">Legal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  Reason for Restoration <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={unarchiveReason}
                  onChange={(e) => setUnarchiveReason(e.target.value)}
                  placeholder="Explain why this dataset needs to be unarchived and made accessible again..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUnarchiveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUnarchive || !unarchiveReason.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submittingUnarchive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                  Submit Unarchive Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}