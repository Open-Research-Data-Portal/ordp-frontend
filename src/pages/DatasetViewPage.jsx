import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Download,
  Share2,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getDatasetById } from "../api/datasets";
import { getDownloadUrl, requestShareAccess } from "../api/sharing";
import TopBar from "../layouts/TopBar";
import { getDatasetImage } from "../utils/datasetImage";
import { useAuth } from "../context/useAuth";
import { getDashboardPath } from "../utils/userRoles";

// ---------------------------------------------------------------------
// DatasetViewPage — the PUBLIC read-only view a researcher lands on when
// browsing someone else's dataset from BrowseDatasetsPage.jsx (via
// src/pages/, reached by /datasets/:id or similar).
//
// This is distinct from the existing DatasetDetailPage, which shows a
// researcher THEIR OWN dataset after upload/draft, with edit/manage
// controls. This page has no edit affordances — it's what any visitor
// sees when clicking into a published dataset from the browse list.
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Mock data — replace with the real API response once wired up.
// Shape mirrors what the design implies the dataset-detail endpoint
// should return: header info, about text + tags, a file preview table,
// a metadata accordion, and activity stats + time-series for charts.
// ---------------------------------------------------------------------
const MOCK_DATASET = {
  title: "Addis Ababa Urban Mobility Survey 2024",
  description:
    "Comprehensive dataset tracking commuting patterns and public transit usage across the metropolitan area.",
  author: { name: "Dr. Elias Tadesse", avatarUrl: null },
  updatedLabel: "Updated 2 days ago",
  thumbnailUrl: null,
  tags: ["Transportation", "Urban Planning", "GPS Data", "Ethiopia"],
  aboutText:
    "This dataset provides a detailed snapshot of urban mobility within Addis Ababa during the year 2024. Collected through a combination of GPS tracking devices provided to volunteers and anonymized public transit tap-in/tap-out data, the survey covers major commuting routes, peak travel times, and preferred modes of transport.\n\nResearchers can utilize this data to identify transit bottlenecks, analyze the impact of new infrastructure projects, and develop predictive models for future urban planning initiatives.",
  dataFile: {
    name: "aa_mobility_raw.csv",
    sizeLabel: "15.4 MB",
    columns: ["trip_id", "start_time", "end_time", "mode", "distance_km"],
    rows: [
      ["T-001", "07:15:00", "08:02:00", "Bus", "12.4"],
      ["T-002", "07:45:00", "08:30:00", "LRT", "8.1"],
      ["T-003", "08:10:00", "09:15:00", "Minibus", "15.2"],
    ],
  },
  dataExplorer: {
    version: "2.3",
    sizeLabel: "45.2 MB",
    fileCount: 12,
    columnCount: 48,
  },
  metadataSections: [
    {
      key: "collaborators",
      label: "Collaborators",
      content: "No external collaborators listed for this dataset yet.",
    },
    {
      key: "authors",
      label: "Authors",
      content: "Dr. Elias Tadesse — AASTU, Civil Engineering.",
    },
    {
      key: "coverage",
      label: "Coverage",
      content: "Addis Ababa metropolitan area, January–December 2024.",
    },
    {
      key: "doi-citation",
      label: "DOI Citation",
      content: "DOI pending — assigned upon publication approval.",
    },
  ],
  activity: {
    views: 4289,
    viewsDeltaPct: 12,
    downloads: 1394,
    downloadsDeltaPct: 8,
    topContributors: [
      { id: 1, initials: "ET", color: "#60a5fa" },
      { id: 2, initials: "SG", color: "#f472b6" },
      { id: 3, initials: "MC", color: "#fb923c" },
    ],
  },
  viewsSeries: [
    { date: "07/27", value: 118 }, { date: "07/29", value: 160 },
    { date: "07/31", value: 170 }, { date: "08/02", value: 140 },
    { date: "08/03", value: 150 }, { date: "08/05", value: 110 },
    { date: "08/06", value: 195 }, { date: "08/08", value: 145 },
    { date: "08/09", value: 205 }, { date: "08/10", value: 150 },
    { date: "08/11", value: 130 }, { date: "08/12", value: 165 },
    { date: "08/13", value: 150 }, { date: "08/14", value: 195 },
    { date: "08/15", value: 105 }, { date: "08/17", value: 150 },
    { date: "08/18", value: 165 }, { date: "08/19", value: 190 },
    { date: "08/20", value: 155 }, { date: "08/21", value: 105 },
  ],
  downloadsSeries: [
    { date: "07/27", value: 35 }, { date: "07/29", value: 63 },
    { date: "07/31", value: 48 }, { date: "08/02", value: 48 },
    { date: "08/03", value: 44 }, { date: "08/05", value: 47 },
    { date: "08/06", value: 37 }, { date: "08/08", value: 37 },
    { date: "08/09", value: 58 }, { date: "08/10", value: 40 },
    { date: "08/11", value: 38 }, { date: "08/12", value: 69 },
    { date: "08/13", value: 58 }, { date: "08/14", value: 62 },
    { date: "08/15", value: 39 }, { date: "08/16", value: 45 },
    { date: "08/17", value: 53 }, { date: "08/18", value: 46 },
    { date: "08/19", value: 78 }, { date: "08/20", value: 41 },
    { date: "08/21", value: 39 }, { date: "08/22", value: 51 },
    { date: "08/23", value: 55 }, { date: "08/24", value: 55 },
    { date: "08/25", value: 56 }, { date: "08/26", value: 40 },
    { date: "08/27", value: 33 },
  ],
};

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024, unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) { value /= 1024; unitIndex++; }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "Updated today";
  if (days === 1) return "Updated 1 day ago";
  if (days < 30) return `Updated ${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `Updated ${months} mo ago` : `Updated ${Math.floor(months / 12)}y ago`;
}

/**
 * Maps the real /api/datasets/<id>/ response (DatasetSerializer, with
 * nested MetadataSerializer under `.metadata`) into the shape this page's
 * components expect.
 *
 * Fields the backend doesn't return yet — per-dataset Views/Downloads
 * time series, a "Data Explorer" version/column breakdown, and a
 * Collaborators/Coverage/DOI-citation metadata accordion — fall back to
 * MOCK_DATASET's values so the page still renders something reasonable.
 * Swap these out once those endpoints exist; each fallback is marked
 * below with a comment so they're easy to find later.
 */
function normalizeDataset(raw) {
  if (!raw) return null;

  const meta = raw.metadata || {};
  const files = raw.files || [];
  const primaryFile = files[0];

  return {
    id: raw.id, // needed by download/share API calls
    visibility: raw.visibility, // ASSUMPTION: field name on DatasetSerializer — confirm/adjust if different
    title: raw.title,
    description: meta.description || raw.description || "",
    author: {
      name: raw.author || raw.owner_name || "Unknown",
      avatarUrl: null,
    },
    updatedLabel: formatRelativeDate(raw.updated_at) || "—",
    thumbnailUrl: getDatasetImage(raw),
    tags: meta.keywords || [],
    aboutText: meta.description || raw.description || "No description provided.",
    dataFile: primaryFile
      ? {
          name: primaryFile.original_filename || primaryFile.file_key || "data file",
          sizeLabel: formatBytes(primaryFile.file_size),
          // The backend doesn't return a row preview yet — this stays
          // empty until a "preview rows" endpoint exists, rather than
          // showing MOCK_DATASET's unrelated sample rows as if real.
          columns: primaryFile.columns || [],
          rows: primaryFile.preview_rows || [],
        }
      : MOCK_DATASET.dataFile, // FIXME: no files on this dataset yet — using mock as placeholder
    dataExplorer: {
      version: raw.version ? String(raw.version) : MOCK_DATASET.dataExplorer.version, // FIXME: no per-file version breakdown from backend yet
      sizeLabel: formatBytes(files.reduce((acc, f) => acc + (f.file_size || 0), 0)),
      fileCount: files.length,
      columnCount: primaryFile?.columns?.length || MOCK_DATASET.dataExplorer.columnCount, // FIXME: backend doesn't return column count yet
    },
    metadataSections: MOCK_DATASET.metadataSections, // FIXME: no Collaborators/Coverage/DOI-citation endpoint yet
    activity: {
      views: raw.view_count ?? 0,
      viewsDeltaPct: MOCK_DATASET.activity.viewsDeltaPct, // FIXME: no % change endpoint yet
      downloads: raw.download_count ?? 0,
      downloadsDeltaPct: MOCK_DATASET.activity.downloadsDeltaPct, // FIXME: no % change endpoint yet
      topContributors: MOCK_DATASET.activity.topContributors, // FIXME: no contributors-on-detail endpoint wired yet
    },
    viewsSeries: MOCK_DATASET.viewsSeries, // FIXME: no per-dataset views time-series endpoint yet
    downloadsSeries: MOCK_DATASET.downloadsSeries, // FIXME: no per-dataset downloads time-series endpoint yet
  };
}

function TagChip({ children }) {
  return (
    <span className="inline-block rounded-full bg-gold-light px-3 py-1 text-xs font-medium text-gold">
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
  const labels = {
    public: "Public",
    institutional: "Institutional",
    restricted: "Restricted",
  };

  const style = styles[visibility] || "bg-gray-50 text-gray-600 border-gray-200";
  const label = labels[visibility] || "Unknown";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function TimeRangeDropdown({ value = "Last month" }) {
  // Static for now — wire to real range filtering once the API is connected.
  return (
    <button
      type="button"
      className="flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300"
    >
      {value}
      <ChevronDown size={14} />
    </button>
  );
}

function StatDelta({ pct }) {
  const isUp = pct >= 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>
      <Icon size={12} />
      {Math.abs(pct)}% in the last 30 days
    </span>
  );
}

function ViewsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f1f1f1" />
        <XAxis
          dataKey="date"
          ticks={["07/27", "08/03", "08/10", "08/17"]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          domain={[0, 300]}
          ticks={[0, 100, 200, 300]}
        />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DownloadsChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f1f1f1" />
        <XAxis
          dataKey="date"
          ticks={["07/27", "08/03", "08/10", "08/17"]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          domain={[0, 100]}
          ticks={[0, 50, 100]}
        />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ShareAccessModal({ datasetId, onClose }) {
  const [purpose, setPurpose] = useState("");
  const [justification, setJustification] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await requestShareAccess(datasetId, {
        purpose,
        purpose_type: "read",
        justification,
        requested_duration_days: Number(durationDays) || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit access request:", err);
      setError(
        err.response?.data?.detail ||
          "Couldn't submit your request right now. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {submitted ? "Request Sent" : "Request Access"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Your access request has been submitted for review. You'll be notified once a decision is made.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="e.g. Research and academic evaluation of..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Justification (required for restricted datasets)
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="Why do you need access to this restricted data?"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Requested duration (days)
              </label>
              <input
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function DatasetViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedSections, setExpandedSections] = useState(() => new Set());
  const [detailViewOpen, setDetailViewOpen] = useState(true);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchDataset() {
      setLoading(true);
      setError(false);
      try {
        const raw = await getDatasetById(id);
        if (isMounted) setDataset(normalizeDataset(raw));
      } catch (err) {
        console.error("Failed to load dataset:", err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDataset();
    return () => { isMounted = false; };
  }, [id]);

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
          <p className="text-sm text-gray-500">
            {error
              ? "Couldn't load this dataset right now. Please try again shortly."
              : "This dataset couldn't be found."}
          </p>
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? getDashboardPath(user) : "/datasets")}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {isAuthenticated ? "Back to dashboard" : "Back to Datasets"}
          </button>
        </div>
      </div>
    );
  }

  const toggleSection = (key) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(dataset.metadataSections.map((s) => s.key)));
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const url = await getDownloadUrl(dataset.id);
      window.location.assign(url);
    } catch (err) {
      console.error("Failed to get download URL:", err);
      if (err.response?.status === 403) {
        setDownloadError("You don't have access to this dataset.");
      } else if (err.response?.status === 404) {
        setDownloadError("This dataset has no published file yet.");
      } else {
        setDownloadError("Couldn't start the download. Please try again.");
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (dataset.visibility === "restricted") {
      setShareModalOpen(true);
      return;
    }
    // public or institutional — just copy the link
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <TopBar />
      <div className="w-full px-6 lg:px-10 py-8 flex-1">
      {/* Back to Datasets navigation */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(isAuthenticated ? getDashboardPath(user) : "/")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-navy transition-colors"
        >
          ← Back to dashboard
        </button>
        <button
          type="button"
          onClick={() => navigate("/datasets")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-navy transition-colors"
        >
          ← Back to Datasets
        </button>
      </div>
      {/* Header & About Card restructured as requested:
          Left side: About datasets part + download button below it.
          Right side: Title at top, then image below it, with nothing below the image.
      */}
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Side: Title at top, then About dataset text & Download button below it */}
          <div className="flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 leading-tight">
                  {dataset.title}
                </h1>
                <VisibilityBadge visibility={dataset.visibility} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                  {dataset.author.name ? dataset.author.name.slice(0, 2).toUpperCase() : "AU"}
                </div>
                <span className="text-sm font-medium text-gray-700">{dataset.author.name}</span>
                <span className="text-xs text-gray-400">· {dataset.updatedLabel}</span>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-600">
                {dataset.aboutText}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {dataset.tags.map((tag) => (
                  <TagChip key={tag}>{tag}</TagChip>
                ))}
              </div>
            </div>

            <div className="mt-8">
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
                  {linkCopied
                    ? "Link Copied!"
                    : dataset.visibility === "restricted"
                    ? "Request Access"
                    : "Share"}
                </button>
              </div>
              {downloadError && (
                <p className="mt-2 text-xs text-red-500">{downloadError}</p>
              )}
            </div>
          </div>

          {/* Right Side: Only the image */}
          <div className="flex flex-col">
            <div className="h-64 w-full overflow-hidden rounded-xl bg-gray-100 shadow-md border border-gray-200">
              {dataset.thumbnailUrl ? (
                <img src={dataset.thumbnailUrl} alt={dataset.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white text-xs font-mono">
                  No Preview
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Data preview + Data Explorer */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{dataset.dataFile.name}</p>
              <p className="text-xs text-gray-400">{dataset.dataFile.sizeLabel}</p>
            </div>
            <button type="button" aria-label="Download file" className="text-gray-400 hover:text-slate-900">
              <Download size={16} />
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase text-gray-400">
                  {dataset.dataFile.columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-amber-700">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataset.dataFile.rows.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-gray-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-bold text-slate-900">Data Explorer</p>
          <p className="mt-2 text-xs font-semibold text-slate-800">
            Version {dataset.dataExplorer.version} ({dataset.dataExplorer.sizeLabel})
          </p>
          <div className="mt-3 space-y-1.5 text-xs text-gray-500">
            <p>{dataset.dataExplorer.fileCount} files</p>
            <p>{dataset.dataExplorer.columnCount} columns total</p>
          </div>
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
          {dataset.metadataSections.map((section) => {
            const isOpen = expandedSections.has(section.key);
            return (
              <div key={section.key}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.key)}
                  className="flex w-full items-center justify-between py-3 text-left"
                >
                  <span className="text-sm font-medium text-amber-700">{section.label}</span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <p className="pb-3 text-sm text-gray-500">{section.content}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Overview */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">Activity Overview</h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-400">Views</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {dataset.activity.views.toLocaleString()}
            </p>
            <StatDelta pct={dataset.activity.viewsDeltaPct} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Downloads</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {dataset.activity.downloads.toLocaleString()}
            </p>
            <StatDelta pct={dataset.activity.downloadsDeltaPct} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Top Contributors</p>
            <div className="mt-2 flex -space-x-2">
              {dataset.activity.topContributors.map((c) => (
                <div
                  key={c.id}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  {c.initials}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail View — collapsible Views + Downloads charts */}
        <div className="mt-6 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => setDetailViewOpen((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <span className="text-sm font-bold text-slate-900">Detail View</span>
            {detailViewOpen ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>

          {detailViewOpen && (
            <div className="mt-5 space-y-8">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Views</p>
                  <TimeRangeDropdown />
                </div>
                <ViewsChart data={dataset.viewsSeries} />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Downloads</p>
                  <TimeRangeDropdown />
                </div>
                <DownloadsChart data={dataset.downloadsSeries} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {shareModalOpen && (
      <ShareAccessModal
        datasetId={dataset.id}
        onClose={() => setShareModalOpen(false)}
      />
    )}
  </div>
);
}